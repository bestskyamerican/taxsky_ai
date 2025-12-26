// ============================================================
// CPA CONTROLLER - Tax Filing Review System
// ============================================================
// Location: backend/controllers/cpaController.js
// ============================================================

import mongoose from 'mongoose';

// Get models
const TaxSession = mongoose.models.TaxSession;
const UploadedFile = mongoose.models.UploadedFile;

// ============================================================
// GET PENDING FILES FOR REVIEW
// ============================================================
export async function getPendingReviews(req, res) {
  try {
    const { taxYear, limit = 50 } = req.query;
    
    const query = { status: 'pending' };
    if (taxYear) query.taxYear = parseInt(taxYear);
    
    const files = await UploadedFile.find(query)
      .sort({ uploadedAt: 1 })  // Oldest first
      .limit(parseInt(limit));
    
    // Get user info for each file
    const filesWithUserInfo = await Promise.all(files.map(async (file) => {
      const session = await TaxSession?.findOne({ userId: file.userId });
      return {
        ...file.toObject(),
        userName: session?.answers?.get?.('first_name') || 
                  session?.answers?.first_name || 
                  'Unknown',
        userEmail: session?.answers?.get?.('email') || 
                   session?.answers?.email || 
                   null
      };
    }));
    
    res.json({
      success: true,
      count: filesWithUserInfo.length,
      files: filesWithUserInfo
    });
  } catch (error) {
    console.error('❌ getPendingReviews error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// GET ALL FILES (with filter)
// ============================================================
export async function getAllFiles(req, res) {
  try {
    const { status, taxYear, userId, limit = 100, page = 1 } = req.query;
    
    const query = {};
    if (status && status !== 'all') query.status = status;
    if (taxYear) query.taxYear = parseInt(taxYear);
    if (userId) query.userId = userId;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [files, total] = await Promise.all([
      UploadedFile.find(query)
        .sort({ uploadedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      UploadedFile.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      count: files.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      files
    });
  } catch (error) {
    console.error('❌ getAllFiles error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// GET REVIEW STATS
// ============================================================
export async function getReviewStats(req, res) {
  try {
    const { taxYear } = req.query;
    
    const matchStage = taxYear ? { taxYear: parseInt(taxYear) } : {};
    
    const stats = await UploadedFile.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayStats = await UploadedFile.aggregate([
      { 
        $match: { 
          ...matchStage,
          uploadedAt: { $gte: today }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const result = {
      pending: 0,
      approved: 0,
      rejected: 0,
      total: 0,
      today: {
        uploaded: 0,
        reviewed: 0
      }
    };
    
    stats.forEach(s => {
      result[s._id] = s.count;
      result.total += s.count;
    });
    
    todayStats.forEach(s => {
      if (s._id === 'pending') result.today.uploaded += s.count;
      else result.today.reviewed += s.count;
    });
    
    res.json({ success: true, stats: result });
  } catch (error) {
    console.error('❌ getReviewStats error:', error);
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
    
    // Validate status
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid status. Must be: approved, rejected, or pending' 
      });
    }
    
    // Validate reviewer name
    if (!reviewedBy) {
      return res.status(400).json({ 
        success: false, 
        error: 'reviewedBy (CPA name) is required' 
      });
    }
    
    // Find the file
    const file = await UploadedFile.findById(fileId);
    if (!file) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }
    
    // Update file record
    const update = {
      status,
      cpaReviewedBy: reviewedBy,
      cpaReviewedAt: new Date(),
      cpaComments: comments || ''
    };
    
    // If CPA made corrections, update extracted data
    if (corrections && typeof corrections === 'object') {
      // Merge corrections with existing data
      update.extractedData = {
        ...file.extractedData,
        ...corrections,
        _cpaCorrections: corrections,  // Keep track of what was corrected
        _correctedAt: new Date()
      };
      
      // Also update the user's session with corrected values
      if (TaxSession) {
        const sessionUpdates = { updated_at: new Date() };
        
        if (file.formType === 'W-2' || file.formType === 'W2') {
          if (corrections.wages_tips_other_comp !== undefined) {
            sessionUpdates['answers.total_wages'] = Number(corrections.wages_tips_other_comp);
          }
          if (corrections.federal_income_tax_withheld !== undefined) {
            sessionUpdates['answers.total_withheld'] = Number(corrections.federal_income_tax_withheld);
          }
          if (corrections.state_income_tax !== undefined) {
            sessionUpdates['answers.total_state_withheld'] = Number(corrections.state_income_tax);
          }
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
    
    // Save the review
    const updatedFile = await UploadedFile.findByIdAndUpdate(
      fileId,
      { $set: update },
      { new: true }
    );
    
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
// GET SINGLE FILE DETAILS
// ============================================================
export async function getFileDetails(req, res) {
  try {
    const { fileId } = req.params;
    
    const file = await UploadedFile.findById(fileId);
    if (!file) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }
    
    // Get user's full session data
    const session = await TaxSession?.findOne({ userId: file.userId });
    
    res.json({
      success: true,
      file,
      userData: session ? {
        firstName: session.answers?.get?.('first_name') || session.answers?.first_name,
        lastName: session.answers?.get?.('last_name') || session.answers?.last_name,
        filingStatus: session.answers?.get?.('filing_status') || session.answers?.filing_status,
        totalWages: session.answers?.get?.('total_wages') || session.answers?.total_wages,
        totalWithheld: session.answers?.get?.('total_withheld') || session.answers?.total_withheld
      } : null
    });
  } catch (error) {
    console.error('❌ getFileDetails error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// GET USER'S ALL FILINGS (for CPA to see complete picture)
// ============================================================
export async function getUserFilings(req, res) {
  try {
    const { userId } = req.params;
    
    // Get all uploaded files for this user
    const files = await UploadedFile.find({ userId }).sort({ uploadedAt: -1 });
    
    // Get user's session
    const session = await TaxSession?.findOne({ userId });
    
    // Get forms from session
    const forms = session?.forms || {};
    
    res.json({
      success: true,
      userId,
      uploadedFiles: files,
      sessionForms: forms,
      userData: session?.answers || {},
      taxYear: files[0]?.taxYear || new Date().getFullYear()
    });
  } catch (error) {
    console.error('❌ getUserFilings error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// BULK APPROVE (for quick processing)
// ============================================================
export async function bulkApprove(req, res) {
  try {
    const { fileIds, reviewedBy } = req.body;
    
    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'fileIds array is required' 
      });
    }
    
    if (!reviewedBy) {
      return res.status(400).json({ 
        success: false, 
        error: 'reviewedBy (CPA name) is required' 
      });
    }
    
    const result = await UploadedFile.updateMany(
      { _id: { $in: fileIds }, status: 'pending' },
      {
        $set: {
          status: 'approved',
          cpaReviewedBy: reviewedBy,
          cpaReviewedAt: new Date(),
          cpaComments: 'Bulk approved'
        }
      }
    );
    
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
// EXPORT DEFAULT
// ============================================================
export default {
  getPendingReviews,
  getAllFiles,
  getReviewStats,
  submitReview,
  getFileDetails,
  getUserFilings,
  bulkApprove
};
