// ============================================================
// CPA CONTROLLER - Tax Filing Review System
// ============================================================
// Location: backend/controllers/cpaController.js
// ✅ v1.0: Filter files by CPA's assigned ZIP codes
// ✅ v2.0: Returns form1040 data from TaxSession
// ✅ v2.0: Returns taxResult summary
// ✅ v2.0: Returns chat messages from session.messages
// ✅ v3.0: Only shows PAID users (Premium plan) for CPA review
// ✅ v3.1: Combines ZIP territory + Payment filters
//          CPA only sees users in their assigned ZIP codes WHO have paid
// ============================================================

import mongoose from 'mongoose';
import CPA from '../models/CPA.js';
import Payment from '../models/Payment.js';

// ============================================================
// UPLOADED FILE MODEL
// ============================================================
const UploadedFileSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  fileName: { type: String },
  originalName: { type: String },
  filePath: { type: String },
  fileType: { type: String },
  formType: { 
    type: String, 
    enum: ['W-2', 'W2', '1099-NEC', '1099-INT', '1099-DIV', '1099-MISC', '1099-G', '1099-R', 'SSA-1099', 'Other'],
    default: 'W-2'
  },
  taxYear: { type: Number, default: () => new Date().getFullYear() },
  extractedData: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending',
    index: true 
  },
  // ✅ User ZIP code for territory filtering
  userZip: { type: String, index: true },
  cpaReviewedBy: { type: String },
  cpaReviewedAt: { type: Date },
  cpaComments: { type: String },
  uploadedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// ✅ Indexes for ZIP code queries
UploadedFileSchema.index({ userZip: 1, status: 1 });
UploadedFileSchema.index({ 'extractedData.employee_zip': 1 });

const UploadedFile = mongoose.models.UploadedFile || mongoose.model('UploadedFile', UploadedFileSchema);
const TaxSession = mongoose.models.TaxSession;

// ============================================================
// HELPER: Get answers from TaxSession (handles Map or Object)
// ============================================================
function getAnswers(session) {
  if (!session) return {};
  
  // If answers is a Map
  if (session.answers instanceof Map) {
    const obj = {};
    session.answers.forEach((value, key) => {
      obj[key] = value;
    });
    return obj;
  }
  
  // If answers has .toObject() method
  if (session.answers?.toObject) {
    return session.answers.toObject();
  }
  
  // Regular object
  return session.answers || {};
}

// ============================================================
// ✅ HELPER: Get ZIP code from file
// ============================================================
function getFileZipcode(file) {
  return file.userZip || 
         file.extractedData?.employee_zip || 
         file.extractedData?.zip ||
         file.extractedData?.zipcode ||
         '';
}

// ============================================================
// ✅ HELPER: Build ZIP code filter query for CPA
// ============================================================
async function buildZipFilter(cpaId) {
  if (!cpaId) return {};
  
  const cpa = await CPA.findById(cpaId);
  
  if (!cpa) return {};
  
  // Admin with canViewAllZipcodes sees everything
  if (cpa.permissions?.canViewAllZipcodes || cpa.role === 'admin') {
    return {};
  }
  
  // If no ZIPs assigned, see all (legacy behavior / new CPA)
  if (!cpa.assignedZipcodes || cpa.assignedZipcodes.length === 0) {
    return {};
  }
  
  // Filter by assigned ZIP codes
  return {
    $or: [
      { userZip: { $in: cpa.assignedZipcodes } },
      { 'extractedData.employee_zip': { $in: cpa.assignedZipcodes } },
      // Include files without ZIP (legacy data) - optional, remove if you want strict filtering
      { 
        userZip: { $exists: false },
        'extractedData.employee_zip': { $exists: false }
      },
      {
        userZip: '',
        'extractedData.employee_zip': ''
      }
    ]
  };
}

// ============================================================
// ✅ v3.0: HELPER: Check if user has paid for CPA service
// ============================================================
async function checkUserPayment(userId, taxYear = 2025) {
  try {
    // Check Payment collection for completed payment
    const payment = await Payment?.findOne({
      userId,
      taxYear: parseInt(taxYear),
      status: 'completed'
    });
    
    if (payment) {
      return {
        hasPaid: true,
        planId: payment.planId,
        planName: payment.planName,
        amount: payment.amount,
        paidAt: payment.paidAt,
        // Check if it's a CPA plan (premium)
        isCPAPlan: payment.planId === 'premium' || payment.planName?.toLowerCase().includes('cpa')
      };
    }
    
    // Also check TaxSession.answers.payment_status
    const TaxSession = mongoose.models.TaxSession;
    const session = await TaxSession?.findOne({ userId, taxYear: parseInt(taxYear) });
    
    if (session) {
      const answers = session.answers instanceof Map 
        ? Object.fromEntries(session.answers)
        : session.answers || {};
      
      if (answers.payment_status === 'paid') {
        return {
          hasPaid: true,
          planId: answers.payment_plan || 'unknown',
          planName: answers.payment_plan || 'Paid',
          paidAt: answers.payment_date,
          isCPAPlan: answers.payment_plan === 'premium'
        };
      }
    }
    
    return { hasPaid: false, isCPAPlan: false };
  } catch (error) {
    console.error('Error checking payment:', error);
    return { hasPaid: false, isCPAPlan: false };
  }
}

// ============================================================
// ✅ v3.0: HELPER: Get all paid users for CPA review
// ============================================================
async function getPaidUsersForCPA(taxYear = 2025) {
  try {
    // Get all users who paid for premium/CPA plan
    const payments = await Payment?.find({
      taxYear: parseInt(taxYear),
      status: 'completed',
      // Only premium plan includes CPA review
      $or: [
        { planId: 'premium' },
        { planName: { $regex: /cpa|premium/i } }
      ]
    }).select('userId email name planId planName paidAt').lean() || [];
    
    return payments.map(p => p.userId);
  } catch (error) {
    console.error('Error getting paid users:', error);
    return [];
  }
}

// ============================================================
// GET PENDING FILES FOR REVIEW (✅ ZIP + PAID filters)
// ============================================================
// ✅ v2.0: Includes session status and form1040 availability
// ✅ v3.0: Only shows users who PAID for Premium/CPA plan
// ✅ v3.1: Combines ZIP territory + Payment filters
// ============================================================
export async function getPendingReviews(req, res) {
  try {
    const { taxYear = 2025, limit = 50 } = req.query;
    const cpaId = req.cpa?._id || req.cpa?.id;
    
    // ✅ v3.0: Get list of paid users (Premium plan)
    const paidUserIds = await getPaidUsersForCPA(taxYear);
    console.log(`💰 Found ${paidUserIds.length} paid CPA users for ${taxYear}`);
    
    // If no paid users, return empty
    if (paidUserIds.length === 0) {
      return res.json({
        success: true,
        count: 0,
        files: [],
        message: 'No users have paid for CPA review yet'
      });
    }
    
    // Base query - only pending files from PAID users
    const query = { 
      status: 'pending',
      userId: { $in: paidUserIds }  // ✅ Only paid users
    };
    if (taxYear) query.taxYear = parseInt(taxYear);
    
    // ✅ v3.1: Add ZIP code filter based on CPA's assigned territories
    const zipFilter = await buildZipFilter(cpaId);
    const finalQuery = Object.keys(zipFilter).length > 0 
      ? { $and: [query, zipFilter] }  // ✅ PAID + ZIP filter
      : query;
    
    console.log('📍 CPA ID:', cpaId);
    console.log('📍 ZIP Filter applied:', Object.keys(zipFilter).length > 0);
    console.log('💰 Paid users filter applied: true');
    
    const files = await UploadedFile.find(finalQuery)
      .sort({ uploadedAt: 1 })
      .limit(parseInt(limit));
    
    const filesWithUserInfo = await Promise.all(files.map(async (file) => {
      // ✅ Get session with form1040 status
      const session = await TaxSession?.findOne({ 
        userId: file.userId,
        taxYear: parseInt(taxYear)
      });
      const answers = getAnswers(session);
      
      // ✅ Check if user has completed interview
      const hasForm1040 = !!(session?.form1040?.header);
      const hasIncome = !!(session?.form1040?.income?.line_9_total_income > 0);
      const sessionStatus = session?.status || 'no_session';
      
      // ✅ v3.0: Get payment info
      const paymentInfo = await checkUserPayment(file.userId, taxYear);
      
      return {
        ...file.toObject(),
        userName: file.extractedData?.employee_name ||
                  `${answers.first_name || ''} ${answers.last_name || ''}`.trim() ||
                  'Unknown',
        userEmail: answers.email || null,
        userZip: getFileZipcode(file) || answers.zip || '',
        // ✅ Session/Interview status
        sessionStatus,
        hasForm1040,
        hasCompletedInterview: hasForm1040,
        ragVerified: session?.ragVerified || false,
        // ✅ v3.0: Payment status
        hasPaid: paymentInfo.hasPaid,
        paymentPlan: paymentInfo.planName,
        paidAt: paymentInfo.paidAt,
        // ✅ Ready for CPA review = has documents + has completed interview + PAID
        readyForCPA: hasForm1040 && paymentInfo.hasPaid,
        // ✅ Warning message if incomplete
        warning: !hasForm1040 
          ? 'User has not completed interview' 
          : null
      };
    }));
    
    res.json({
      success: true,
      count: filesWithUserInfo.length,
      paidUsersCount: paidUserIds.length,
      files: filesWithUserInfo
    });
  } catch (error) {
    console.error('❌ getPendingReviews error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// GET ALL FILES (with filter, ✅ ZIP filtered + Payment status)
// ============================================================
// ✅ v2.0: Includes session status and form1040 availability
// ✅ v3.0: Includes payment status
// ============================================================
export async function getAllFiles(req, res) {
  try {
    const { status, taxYear = 2025, userId, zipcode, limit = 100, page = 1, paidOnly = false } = req.query;
    const cpaId = req.cpa?._id || req.cpa?.id;
    
    const query = {};
    if (status && status !== 'all') query.status = status;
    if (taxYear) query.taxYear = parseInt(taxYear);
    if (userId) query.userId = userId;
    
    // ✅ v3.0: Filter by paid users only if requested
    if (paidOnly === 'true' || paidOnly === true) {
      const paidUserIds = await getPaidUsersForCPA(taxYear);
      if (paidUserIds.length > 0) {
        query.userId = { $in: paidUserIds };
      }
    }
    
    // ✅ Manual ZIP code filter from query parameter
    if (zipcode) {
      query.$or = [
        { userZip: zipcode },
        { 'extractedData.employee_zip': zipcode }
      ];
    } else {
      // ✅ Auto ZIP filter based on CPA's assignments
      const zipFilter = await buildZipFilter(cpaId);
      if (Object.keys(zipFilter).length > 0) {
        query.$and = query.$and || [];
        query.$and.push(zipFilter);
      }
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [files, total] = await Promise.all([
      UploadedFile.find(query)
        .sort({ uploadedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      UploadedFile.countDocuments(query)
    ]);
    
    // ✅ Get unique userIds to fetch their session status
    const userIds = [...new Set(files.map(f => f.userId))];
    
    // ✅ Fetch TaxSessions for these users
    const sessions = await TaxSession?.find({
      userId: { $in: userIds },
      taxYear: parseInt(taxYear) || 2025
    }).select('userId status form1040 ragVerified').lean() || [];
    
    // ✅ v3.0: Fetch payments for these users
    const payments = await Payment?.find({
      userId: { $in: userIds },
      taxYear: parseInt(taxYear) || 2025,
      status: 'completed'
    }).select('userId planId planName paidAt').lean() || [];
    
    // ✅ Create lookup maps
    const sessionMap = {};
    sessions.forEach(s => {
      sessionMap[s.userId] = {
        sessionStatus: s.status,
        hasForm1040: !!(s.form1040?.header),
        hasIncome: !!(s.form1040?.income?.line_9_total_income > 0),
        ragVerified: s.ragVerified
      };
    });
    
    const paymentMap = {};
    payments.forEach(p => {
      paymentMap[p.userId] = {
        hasPaid: true,
        planId: p.planId,
        planName: p.planName,
        paidAt: p.paidAt,
        isCPAPlan: p.planId === 'premium'
      };
    });
    
    // ✅ Add session and payment info to each file
    const filesWithInfo = files.map(f => {
      const sessionInfo = sessionMap[f.userId] || {};
      const paymentInfo = paymentMap[f.userId] || { hasPaid: false };
      
      return {
        ...f.toObject(),
        userName: f.extractedData?.employee_name || f.extractedData?.recipient_name || 'Unknown',
        userZip: getFileZipcode(f),
        // Session status
        sessionStatus: sessionInfo.sessionStatus || 'no_session',
        hasForm1040: sessionInfo.hasForm1040 || false,
        hasCompletedInterview: sessionInfo.hasForm1040 || false,
        ragVerified: sessionInfo.ragVerified || false,
        // ✅ v3.0: Payment status
        hasPaid: paymentInfo.hasPaid,
        paymentPlan: paymentInfo.planName,
        paidAt: paymentInfo.paidAt,
        isCPAPlan: paymentInfo.isCPAPlan,
        // Ready for CPA = has documents + form1040 + paid
        readyForCPA: (sessionInfo.hasForm1040 || false) && paymentInfo.hasPaid
      };
    });
    
    res.json({
      success: true,
      count: filesWithInfo.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      files: filesWithInfo
    });
  } catch (error) {
    console.error('❌ getAllFiles error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// GET REVIEW STATS (✅ ZIP filtered)
// ============================================================
export async function getReviewStats(req, res) {
  try {
    const { taxYear } = req.query;
    const cpaId = req.cpa?._id || req.cpa?.id;
    
    // Base match
    const matchStage = taxYear ? { taxYear: parseInt(taxYear) } : {};
    
    // ✅ Add ZIP filter
    const zipFilter = await buildZipFilter(cpaId);
    const finalMatch = Object.keys(zipFilter).length > 0
      ? { ...matchStage, ...zipFilter }
      : matchStage;
    
    const stats = await UploadedFile.aggregate([
      { $match: finalMatch },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayStats = await UploadedFile.aggregate([
      { $match: { ...finalMatch, uploadedAt: { $gte: today } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    const result = {
      pending: 0,
      approved: 0,
      rejected: 0,
      total: 0,
      today: { uploaded: 0, reviewed: 0 }
    };
    
    stats.forEach(s => {
      result[s._id] = s.count;
      result.total += s.count;
    });
    
    todayStats.forEach(s => {
      if (s._id === 'pending') result.today.uploaded += s.count;
      else result.today.reviewed += s.count;
    });
    
    // ✅ Include CPA's assigned ZIP codes in response
    let assignedZipcodes = [];
    if (cpaId) {
      const cpa = await CPA.findById(cpaId).select('assignedZipcodes');
      assignedZipcodes = cpa?.assignedZipcodes || [];
    }
    
    res.json({ 
      success: true, 
      stats: result,
      assignedZipcodes  // ✅ Send to frontend
    });
  } catch (error) {
    console.error('❌ getReviewStats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// GET SINGLE FILE DETAILS (with full user data)
// ============================================================
export async function getFileDetails(req, res) {
  try {
    const { fileId } = req.params;
    const cpaId = req.cpa?._id || req.cpa?.id;
    
    const file = await UploadedFile.findById(fileId);
    if (!file) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }
    
    // ✅ Check if CPA can access this file's ZIP
    if (cpaId) {
      const cpa = await CPA.findById(cpaId);
      const fileZip = getFileZipcode(file);
      
      if (cpa && fileZip && !cpa.canAccessZipcode(fileZip)) {
        return res.status(403).json({ 
          success: false, 
          error: 'You do not have access to files in this ZIP code territory' 
        });
      }
    }
    
    // Get user's session
    const session = await TaxSession?.findOne({ userId: file.userId });
    const answers = getAnswers(session);
    
    // Get chat history
    const chatHistory = answers.conversation_history || [];
    
    res.json({
      success: true,
      file: {
        ...file.toObject(),
        userZip: getFileZipcode(file)
      },
      userData: {
        firstName: answers.first_name,
        lastName: answers.last_name,
        filingStatus: answers.filing_status,
        totalWages: answers.total_wages,
        totalWithheld: answers.total_withheld,
        state: answers.state,
        zip: answers.zip || getFileZipcode(file),
        dependents: answers.dependent_count,
        language: answers.preferred_language
      },
      chatHistory: chatHistory,
      sessionForms: session?.forms || {}
    });
  } catch (error) {
    console.error('❌ getFileDetails error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// GET USER'S ALL FILINGS (includes chat history & form1040)
// ============================================================
// ✅ v2.0: Returns form1040 calculated data from TaxSession
// ✅ v2.0: Returns taxResult summary
// ✅ v2.0: Returns chat messages from session.messages
// ✅ v3.0: Includes payment status
// ============================================================
export async function getUserFilings(req, res) {
  try {
    const { userId } = req.params;
    const { taxYear = 2025 } = req.query;
    
    console.log('📁 Getting filings for user:', userId, 'taxYear:', taxYear);
    
    // Get uploaded files for this user
    const files = await UploadedFile.find({ userId }).sort({ uploadedAt: -1 });
    
    // Get user's session with form1040 data
    const session = await TaxSession?.findOne({ 
      userId,
      taxYear: parseInt(taxYear)
    });
    
    // ✅ v3.0: Get payment info
    const paymentInfo = await checkUserPayment(userId, taxYear);
    
    // Extract answers properly
    const answers = getAnswers(session);
    
    // ✅ Get chat history from session.messages (primary) or answers (fallback)
    const chatHistory = session?.messages || answers.conversation_history || [];
    
    // ✅ Add ZIP to each file
    const filesWithZip = files.map(f => ({
      ...f.toObject(),
      userZip: getFileZipcode(f) || answers.zip || ''
    }));
    
    // ✅ Build userData from multiple sources
    let userData = { ...answers };
    
    // Merge from session.normalizedData.personal
    if (session?.normalizedData?.personal) {
      const personal = session.normalizedData.personal;
      userData = {
        ...userData,
        first_name: userData.first_name || personal.first_name || '',
        last_name: userData.last_name || personal.last_name || '',
        ssn: personal.ssn || '',
        address: personal.address || '',
        city: personal.city || '',
        state: personal.state || userData.state || '',
        zip: personal.zip || userData.zip || (files[0] ? getFileZipcode(files[0]) : ''),
        filing_status: userData.filing_status || personal.filing_status || '',
        taxpayer_dob: personal.date_of_birth || personal.taxpayer_dob || '',
        taxpayer_age: personal.age || personal.taxpayer_age || 0,
        spouse_first_name: personal.spouse_first_name || '',
        spouse_last_name: personal.spouse_last_name || '',
        spouse_ssn: personal.spouse_ssn || '',
        spouse_dob: personal.spouse_date_of_birth || personal.spouse_dob || '',
        spouse_age: personal.spouse_age || 0,
        dependents: session?.normalizedData?.dependents || userData.dependents || [],
        dependent_count: session?.normalizedData?.dependents?.length || userData.dependent_count || 0
      };
    }
    
    // ✅ Merge from session.form1040.header (highest priority)
    if (session?.form1040?.header) {
      const header = session.form1040.header;
      userData = {
        ...userData,
        filing_status: header.filing_status || userData.filing_status,
        state: header.state || userData.state,
        taxpayer_dob: header.taxpayer_dob || userData.taxpayer_dob,
        taxpayer_age: header.taxpayer_age || userData.taxpayer_age,
        spouse_name: header.spouse_name || `${userData.spouse_first_name} ${userData.spouse_last_name}`.trim(),
        spouse_dob: header.spouse_dob || userData.spouse_dob,
        spouse_age: header.spouse_age || userData.spouse_age
      };
      
      // Split spouse_name if we don't have first/last
      if (header.spouse_name && !userData.spouse_first_name) {
        const parts = header.spouse_name.trim().split(/\s+/);
        userData.spouse_first_name = parts[0] || '';
        userData.spouse_last_name = parts.slice(1).join(' ') || '';
      }
    }
    
    console.log('💬 Chat history messages:', chatHistory.length);
    console.log('📋 Has form1040:', !!session?.form1040);
    console.log('📊 Has taxResult:', !!session?.taxResult);
    console.log('💰 Has paid:', paymentInfo.hasPaid, paymentInfo.planName);
    
    res.json({
      success: true,
      userId,
      taxYear: parseInt(taxYear),
      
      // All uploaded documents
      uploadedFiles: filesWithZip,
      
      // Session forms/answers
      sessionForms: {
        form1040: session?.form1040 || null,
        answers: answers,
        normalizedData: session?.normalizedData || {}
      },
      
      // ✅ Form 1040 calculated data (from Python extraction)
      form1040: session?.form1040 || null,
      
      // ✅ Tax result summary
      taxResult: session?.taxResult || null,
      
      // User personal info (merged from all sources)
      userData,
      
      // Chat history
      chatHistory,
      
      // Session metadata
      sessionStatus: session?.status || 'not_started',
      ragVerified: session?.ragVerified || false,
      extractedAt: session?.extractedAt || null,
      
      // ✅ Has completed interview?
      hasCompletedInterview: !!(session?.form1040?.header),
      
      // ✅ v3.0: Payment status
      payment: {
        hasPaid: paymentInfo.hasPaid,
        planId: paymentInfo.planId,
        planName: paymentInfo.planName,
        paidAt: paymentInfo.paidAt,
        isCPAPlan: paymentInfo.isCPAPlan
      },
      
      // Summary stats
      stats: {
        totalDocuments: filesWithZip.length,
        pendingDocuments: filesWithZip.filter(f => f.status === 'pending').length,
        approvedDocuments: filesWithZip.filter(f => f.status === 'approved').length,
        rejectedDocuments: filesWithZip.filter(f => f.status === 'rejected').length,
        chatMessages: chatHistory.length
      }
    });
  } catch (error) {
    console.error('❌ getUserFilings error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// SUBMIT CPA REVIEW
// ============================================================
export async function submitReview(req, res) {
  try {
    const { fileId } = req.params;
    const { status, reviewedBy, comments, corrections } = req.body;
    const cpaId = req.cpa?._id || req.cpa?.id;
    
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid status' 
      });
    }
    
    if (!reviewedBy) {
      return res.status(400).json({ 
        success: false, 
        error: 'reviewedBy is required' 
      });
    }
    
    const file = await UploadedFile.findById(fileId);
    if (!file) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }
    
    // ✅ Check ZIP access
    if (cpaId) {
      const cpa = await CPA.findById(cpaId);
      const fileZip = getFileZipcode(file);
      
      if (cpa && fileZip && !cpa.canAccessZipcode(fileZip)) {
        return res.status(403).json({ 
          success: false, 
          error: 'You do not have permission to review files in this ZIP code territory' 
        });
      }
    }
    
    const update = {
      status,
      cpaReviewedBy: reviewedBy,
      cpaReviewedAt: new Date(),
      cpaComments: comments || ''
    };
    
    if (corrections && typeof corrections === 'object') {
      update.extractedData = {
        ...file.extractedData,
        ...corrections,
        _cpaCorrections: corrections,
        _correctedAt: new Date()
      };
      
      // Update user session with corrections
      if (TaxSession && (file.formType === 'W-2' || file.formType === 'W2')) {
        const sessionUpdates = { updated_at: new Date() };
        
        if (corrections.wages_tips_other_comp !== undefined) {
          sessionUpdates['answers.total_wages'] = Number(corrections.wages_tips_other_comp);
        }
        if (corrections.federal_income_tax_withheld !== undefined) {
          sessionUpdates['answers.total_withheld'] = Number(corrections.federal_income_tax_withheld);
        }
        if (corrections.state_income_tax !== undefined) {
          sessionUpdates['answers.total_state_withheld'] = Number(corrections.state_income_tax);
        }
        
        if (Object.keys(sessionUpdates).length > 1) {
          await TaxSession.updateOne(
            { userId: file.userId },
            { $set: sessionUpdates }
          );
          console.log(`✅ CPA corrections applied to session for user ${file.userId}`);
        }
      }
    }
    
    const updatedFile = await UploadedFile.findByIdAndUpdate(
      fileId,
      { $set: update },
      { new: true }
    );
    
    // ✅ Update CPA stats
    if (cpaId && status !== 'pending') {
      await CPA.updateOne(
        { _id: cpaId },
        {
          $inc: { 
            'stats.totalReviewed': 1,
            [`stats.total${status.charAt(0).toUpperCase() + status.slice(1)}`]: 1
          },
          $set: { 'stats.lastReviewAt': new Date() }
        }
      );
    }
    
    console.log(`✅ CPA Review: ${fileId} → ${status} by ${reviewedBy}`);
    
    res.json({
      success: true,
      message: `File ${status} successfully`,
      file: updatedFile
    });
  } catch (error) {
    console.error('❌ submitReview error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// BULK APPROVE (✅ ZIP filtered)
// ============================================================
export async function bulkApprove(req, res) {
  try {
    const { fileIds, reviewedBy } = req.body;
    const cpaId = req.cpa?._id || req.cpa?.id;
    
    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ success: false, error: 'fileIds required' });
    }
    
    if (!reviewedBy) {
      return res.status(400).json({ success: false, error: 'reviewedBy required' });
    }
    
    // ✅ Build query with ZIP filter
    const baseQuery = { 
      _id: { $in: fileIds }, 
      status: 'pending'
    };
    
    const zipFilter = await buildZipFilter(cpaId);
    const finalQuery = Object.keys(zipFilter).length > 0
      ? { $and: [baseQuery, zipFilter] }
      : baseQuery;
    
    const result = await UploadedFile.updateMany(
      finalQuery,
      {
        $set: {
          status: 'approved',
          cpaReviewedBy: reviewedBy,
          cpaReviewedAt: new Date(),
          cpaComments: 'Bulk approved'
        }
      }
    );
    
    // ✅ Update CPA stats
    if (cpaId && result.modifiedCount > 0) {
      await CPA.updateOne(
        { _id: cpaId },
        {
          $inc: { 
            'stats.totalReviewed': result.modifiedCount,
            'stats.totalApproved': result.modifiedCount
          },
          $set: { 'stats.lastReviewAt': new Date() }
        }
      );
    }
    
    console.log(`✅ Bulk approved ${result.modifiedCount} files by ${reviewedBy}`);
    
    res.json({
      success: true,
      message: `${result.modifiedCount} files approved`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('❌ bulkApprove error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// CREATE TEST FILE (for testing)
// ============================================================
export async function createTestFile(req, res) {
  try {
    const { userId, formType = 'W-2', zipcode = '95122' } = req.body;
    
    const testFile = await UploadedFile.create({
      userId: userId || `test_user_${Date.now()}`,
      fileName: `test_${formType.toLowerCase().replace('-', '')}.pdf`,
      filePath: '/uploads/test.pdf',
      formType: formType,
      taxYear: 2025,
      status: 'pending',
      userZip: zipcode,  // ✅ Added ZIP code
      extractedData: {
        employee_name: 'Test User',
        employer_name: 'Test Company',
        wages_tips_other_comp: 65000,
        federal_income_tax_withheld: 7800,
        employee_zip: zipcode  // ✅ Added ZIP code
      },
      uploadedAt: new Date()
    });
    
    res.json({ success: true, file: testFile });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// EXPORT
// ============================================================
export default {
  getPendingReviews,
  getAllFiles,
  getReviewStats,
  getFileDetails,
  getUserFilings,
  submitReview,
  bulkApprove,
  createTestFile
};