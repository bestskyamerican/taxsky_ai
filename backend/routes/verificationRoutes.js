// ============================================================
// VERIFICATION ROUTES - Fixed with proper userId validation
// ============================================================
// Location: backend/routes/verificationRoutes.js
// 
// ✅ FIXED: Validates userId before any operation
// ✅ FIXED: Reads from ALL data sources (answers, forms, normalizedData)
// ✅ FIXED: Handles both old and new field names
// ============================================================

import express from 'express';
import { getSession, getOrCreateSession } from '../services/session/sessionDB.js';
//import { calculateFullTax } from '../services/tax/fullCalculator.js';
import { calculateFullTax } from '../services/tax/pythonCalculator.js';

const router = express.Router();

// ============================================================
// ✅ HELPER: Validate userId
// ============================================================
function validateUserId(userId) {
  if (!userId || userId === 'undefined' || userId === 'null' || userId === 'guest' || userId === '') {
    return { valid: false, error: `Invalid userId: "${userId}"` };
  }
  return { valid: true };
}

// ============================================================
// ✅ HELPER: Get value from session (checks all sources)
// ============================================================
function getSessionValue(session, ...keys) {
  // Check answers Map first
  for (const key of keys) {
    let val;
    if (session.answers instanceof Map) {
      val = session.answers.get(key);
    } else if (session.answers) {
      val = session.answers[key];
    }
    if (val !== undefined && val !== null && val !== '') return val;
  }
  
  // Check normalizedData.personal
  const personal = session.normalizedData?.personal || {};
  for (const key of keys) {
    if (personal[key] !== undefined && personal[key] !== null && personal[key] !== '') {
      return personal[key];
    }
  }
  
  // Check form1040.header
  const header = session.form1040?.header || {};
  for (const key of keys) {
    if (header[key] !== undefined && header[key] !== null && header[key] !== '') {
      return header[key];
    }
  }
  
  return '';
}

// ============================================================
// ✅ HELPER: Get income from session (checks all sources)
// ============================================================
function getIncomeValue(session, formType) {
  const forms = session.forms || new Map();
  const answers = session.answers || new Map();
  const normalizedIncome = session.normalizedData?.income || {};
  
  // Helper to get from Map or Object
  const getVal = (map, key) => {
    if (map instanceof Map) return map.get(key);
    return map?.[key];
  };
  
  // Helper to parse number
  const parseNum = (val) => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    return parseFloat(String(val).replace(/[$,]/g, '')) || 0;
  };
  
  let total = 0;
  
  switch (formType) {
    case 'W2':
    case 'W-2':
      // Check normalizedData.income.w2 array
      (normalizedIncome.w2 || []).forEach(w2 => {
        total += parseNum(w2.wages);
      });
      
      // Check forms Map
      if (total === 0) {
        const w2Form = getVal(forms, 'W-2') || getVal(forms, 'W2') || getVal(forms, 'w2') || {};
        total = parseNum(w2Form.wages) || parseNum(w2Form.box1) || parseNum(w2Form.wagesTipsOther) || parseNum(w2Form['Wages, Tips, Other Compensation']);
      }
      
      // Check answers Map
      if (total === 0) {
        total = parseNum(getVal(answers, 'wages')) || 
                parseNum(getVal(answers, 'w2_wages')) || 
                parseNum(getVal(answers, 'w2_income')) ||
                parseNum(getVal(answers, 'total_wages'));
      }
      break;
      
    case '1099-NEC':
      // Check normalizedData
      (normalizedIncome.self_employment || []).forEach(se => {
        total += parseNum(se.nonemployee_compensation);
      });
      
      // Check forms Map
      if (total === 0) {
        const necForm = getVal(forms, '1099-NEC') || getVal(forms, '1099NEC') || {};
        total = parseNum(necForm.nonemployee_compensation) || parseNum(necForm.amount) || parseNum(necForm.box1);
      }
      
      // Check answers
      if (total === 0) {
        total = parseNum(getVal(answers, 'self_employment_income')) || 
                parseNum(getVal(answers, 'self_employed_income')) ||
                parseNum(getVal(answers, '1099_income'));
      }
      break;
      
    case '1099-INT':
      // Check normalizedData
      (normalizedIncome.interest || []).forEach(i => {
        total += parseNum(i.interest_income);
      });
      
      // Check forms Map
      if (total === 0) {
        const intForm = getVal(forms, '1099-INT') || getVal(forms, '1099INT') || {};
        total = parseNum(intForm.interest_income) || parseNum(intForm.interestIncome) || parseNum(intForm.box1);
      }
      
      // Check answers
      if (total === 0) {
        total = parseNum(getVal(answers, 'interest_income')) || 
                parseNum(getVal(answers, 'interestIncome'));
      }
      break;
      
    case '1099-DIV':
      // Check normalizedData
      (normalizedIncome.dividends || []).forEach(d => {
        total += parseNum(d.ordinary_dividends);
      });
      
      // Check forms Map
      if (total === 0) {
        const divForm = getVal(forms, '1099-DIV') || getVal(forms, '1099DIV') || {};
        total = parseNum(divForm.ordinary_dividends) || parseNum(divForm.ordinaryDividends) || parseNum(divForm.box1a);
      }
      
      // Check answers
      if (total === 0) {
        total = parseNum(getVal(answers, 'dividend_income')) || 
                parseNum(getVal(answers, 'dividendIncome'));
      }
      break;
  }
  
  return total;
}

// ============================================================
// ✅ HELPER: Get withholding from session
// ============================================================
function getWithholding(session) {
  const forms = session.forms || new Map();
  const answers = session.answers || new Map();
  const normalizedIncome = session.normalizedData?.income || {};
  
  const getVal = (map, key) => {
    if (map instanceof Map) return map.get(key);
    return map?.[key];
  };
  
  const parseNum = (val) => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    return parseFloat(String(val).replace(/[$,]/g, '')) || 0;
  };
  
  let federal = 0;
  let state = 0;
  
  // Check normalizedData.income.w2 array
  (normalizedIncome.w2 || []).forEach(w2 => {
    federal += parseNum(w2.federal_withholding);
    state += parseNum(w2.state_withholding);
  });
  
  // Check forms Map
  if (federal === 0) {
    const w2Form = getVal(forms, 'W-2') || getVal(forms, 'W2') || {};
    federal = parseNum(w2Form.federal_withholding) || parseNum(w2Form.federalWithheld) || parseNum(w2Form.box2);
    state = parseNum(w2Form.state_withholding) || parseNum(w2Form.stateWithheld) || parseNum(w2Form.box17);
  }
  
  // Check answers
  if (federal === 0) {
    federal = parseNum(getVal(answers, 'federal_withheld')) || 
              parseNum(getVal(answers, 'federal_withholding')) ||
              parseNum(getVal(answers, 'federalWithheld'));
  }
  if (state === 0) {
    state = parseNum(getVal(answers, 'state_withheld')) || 
            parseNum(getVal(answers, 'state_withholding')) ||
            parseNum(getVal(answers, 'stateWithheld'));
  }
  
  return { federal, state };
}

/**
 * GET /api/verification/data
 * Get user data for final verification
 */
router.get('/data', async (req, res) => {
  try {
    const { userId } = req.query;
    
    // ✅ Validate userId
    const validation = validateUserId(userId);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.error
      });
    }
    
    const session = await getSession(userId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    // Get user's state (check multiple field names)
    const userState = getSessionValue(session, 'state', 'employee_state') || 'CA';
    
    // Calculate taxes using fullCalculator
    let taxResults = {};
    try {
      taxResults = calculateFullTax(session, userState);
    } catch (err) {
      console.error('Tax calculation error:', err);
      taxResults = { federal: {}, state: {}, totalRefund: 0, totalTaxDue: 0 };
    }
    
    // Get withholding
    const withholding = getWithholding(session);
    
    // Build verification data
    const verificationData = {
      // Personal Info - ✅ Check both old and new field names
      personalInfo: {
        name: getSessionValue(session, 'first_name', 'employee_name') + ' ' + getSessionValue(session, 'last_name'),
        firstName: getSessionValue(session, 'first_name', 'employee_name'),
        lastName: getSessionValue(session, 'last_name'),
        ssn: maskSSN(getSessionValue(session, 'ssn', 'employee_ssa_number', 'employee_ssn')),
        address: getSessionValue(session, 'address', 'employee_address'),
        city: getSessionValue(session, 'city', 'employee_city'),
        state: userState,
        zip: getSessionValue(session, 'zip', 'employee_zip')
      },
      
      // Filing Info
      filingInfo: {
        filingStatus: getSessionValue(session, 'filing_status'),
        dependents: session.normalizedData?.dependents?.length || parseInt(getSessionValue(session, 'dependents')) || 0
      },
      
      // Income Summary - ✅ Uses new helper that checks all sources
      income: {
        w2Income: getIncomeValue(session, 'W2'),
        selfEmployment: getIncomeValue(session, '1099-NEC'),
        interest: getIncomeValue(session, '1099-INT'),
        dividends: getIncomeValue(session, '1099-DIV'),
        totalIncome: taxResults.federal?.totalIncome || 
                     (getIncomeValue(session, 'W2') + getIncomeValue(session, '1099-NEC') + 
                      getIncomeValue(session, '1099-INT') + getIncomeValue(session, '1099-DIV'))
      },
      
      // Withholding
      withholding: {
        federal: withholding.federal,
        state: withholding.state,
        total: withholding.federal + withholding.state
      },
      
      // Federal Tax Summary
      federal: extractFederalSummary(taxResults.federal, withholding.federal),
      
      // State Tax Summary
      state: extractStateSummary(taxResults.state, userState, withholding.state),
      
      // Combined Totals
      totals: {
        totalRefund: taxResults.totalRefund || 0,
        totalTaxDue: taxResults.totalTaxDue || 0,
        netAmount: (taxResults.totalRefund || 0) - (taxResults.totalTaxDue || 0),
        readyToFile: taxResults.readyToFile || false
      },
      
      // Verification Status
      verificationStatus: {
        ssnVerified: getSessionValue(session, 'ssn_verified') === true || getSessionValue(session, 'ssn_verified') === 'true',
        ssnVerifiedAt: getSessionValue(session, 'ssn_verified_at'),
        addressVerified: getSessionValue(session, 'address_verified') === true || getSessionValue(session, 'address_verified') === 'true',
        addressVerifiedAt: getSessionValue(session, 'address_verified_at'),
        dataReviewed: getSessionValue(session, 'data_reviewed') === true || getSessionValue(session, 'data_reviewed') === 'true',
        dataReviewedAt: getSessionValue(session, 'data_reviewed_at'),
        certifications: getSessionValue(session, 'certifications') || null,
        certifiedAt: getSessionValue(session, 'certified_at') || null
      },
      
      // Overall Status
      overallStatus: {
        interviewComplete: checkInterviewComplete(session),
        readyToFile: checkReadyToFile(session),
        filed: getSessionValue(session, 'filed') === true || getSessionValue(session, 'filed') === 'true',
        filedAt: getSessionValue(session, 'filed_at') || null
      },
      
      // Tax Calculation Metadata
      calculationInfo: {
        calculatedAt: new Date().toISOString(),
        federalErrors: taxResults.federal?.errors || [],
        federalWarnings: taxResults.federal?.warnings || [],
        stateSupported: taxResults.state?.supported || false,
        stateMessage: taxResults.state?.message || null
      }
    };
    
    console.log(`[VERIFICATION] ✅ Data for ${userId}:`, {
      income: verificationData.income,
      withholding: verificationData.withholding
    });
    
    res.json({
      success: true,
      data: verificationData
    });
    
  } catch (err) {
    console.error('❌ Verification data error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve verification data',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

/**
 * POST /api/verification/update
 * Update personal information during verification
 */
router.post('/update', async (req, res) => {
  try {
    const { userId, field, value } = req.body;
    
    // ✅ Validate userId
    const validation = validateUserId(userId);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.error
      });
    }
    
    if (!field) {
      return res.status(400).json({
        success: false,
        message: 'field is required'
      });
    }
    
    const session = await getSession(userId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    // ✅ Map old field names to new ones
    const fieldMapping = {
      'employee_name': 'first_name',
      'employee_ssa_number': 'ssn',
      'employee_ssn': 'ssn',
      'employee_address': 'address',
      'employee_city': 'city',
      'employee_state': 'state',
      'employee_zip': 'zip'
    };
    
    const normalizedField = fieldMapping[field] || field;
    
    // Validate field
    const allowedFields = [
      'first_name', 'last_name', 'ssn', 'address', 'city', 'state', 'zip',
      'employee_name', 'employee_address', 'employee_city', 'employee_state', 'employee_zip'
    ];
    
    if (!allowedFields.includes(field)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid field'
      });
    }
    
    // Validate value
    const validationError = validateField(normalizedField, value);
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError
      });
    }
    
    // Update field in answers Map
    if (session.answers instanceof Map) {
      session.answers.set(field, value);
      session.answers.set(normalizedField, value); // Also set normalized name
    } else {
      session.answers = session.answers || {};
      session.answers[field] = value;
      session.answers[normalizedField] = value;
    }
    
    // Also update normalizedData.personal
    if (!session.normalizedData) session.normalizedData = {};
    if (!session.normalizedData.personal) session.normalizedData.personal = {};
    session.normalizedData.personal[normalizedField] = value;
    
    // Mark as needing re-verification if address changed
    if (['address', 'city', 'state', 'zip', 'employee_address', 'employee_city', 'employee_state', 'employee_zip'].includes(field)) {
      if (session.answers instanceof Map) {
        session.answers.set('address_verified', false);
      } else {
        session.answers.address_verified = false;
      }
    }
    
    session.markModified('answers');
    session.markModified('normalizedData.personal');
    await session.save();
    
    console.log(`✅ Updated ${field} for ${userId}`);
    
    res.json({
      success: true,
      message: 'Updated successfully',
      field: field,
      value: value
    });
    
  } catch (err) {
    console.error('❌ Update error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to update field',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

/**
 * POST /api/verification/verify-ssn
 * Mark SSN as verified by user
 */
router.post('/verify-ssn', async (req, res) => {
  try {
    const { userId, ssn } = req.body;
    
    // ✅ Validate userId
    const validation = validateUserId(userId);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.error
      });
    }
    
    const session = await getSession(userId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    // Get stored SSN (check multiple field names)
    const storedSSN = getSessionValue(session, 'ssn', 'employee_ssa_number', 'employee_ssn');
    
    // Optional: Verify SSN matches
    if (ssn) {
      const cleanSSN = ssn.replace(/\D/g, '');
      const cleanStoredSSN = storedSSN ? storedSSN.replace(/\D/g, '') : '';
      
      if (cleanSSN !== cleanStoredSSN) {
        return res.status(400).json({
          success: false,
          message: 'SSN does not match'
        });
      }
    }
    
    // Validate SSN format
    if (!validateSSN(storedSSN)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid SSN format'
      });
    }
    
    // Update verification status
    if (session.answers instanceof Map) {
      session.answers.set('ssn_verified', true);
      session.answers.set('ssn_verified_at', new Date().toISOString());
    } else {
      session.answers = session.answers || {};
      session.answers.ssn_verified = true;
      session.answers.ssn_verified_at = new Date().toISOString();
    }
    
    session.markModified('answers');
    await session.save();
    
    console.log(`✅ SSN verified for ${userId}`);
    
    res.json({
      success: true,
      message: 'SSN verified successfully'
    });
    
  } catch (err) {
    console.error('❌ SSN verification error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to verify SSN',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

/**
 * POST /api/verification/verify-address
 * Mark address as verified by user
 */
router.post('/verify-address', async (req, res) => {
  try {
    const { userId } = req.body;
    
    // ✅ Validate userId
    const validation = validateUserId(userId);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.error
      });
    }
    
    const session = await getSession(userId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    // Validate address is complete (check both old and new field names)
    const address = getSessionValue(session, 'address', 'employee_address');
    const city = getSessionValue(session, 'city', 'employee_city');
    const state = getSessionValue(session, 'state', 'employee_state');
    const zip = getSessionValue(session, 'zip', 'employee_zip');
    
    if (!address || !city || !state || !zip) {
      return res.status(400).json({
        success: false,
        message: 'Address is incomplete',
        missing: {
          address: !address,
          city: !city,
          state: !state,
          zip: !zip
        }
      });
    }
    
    // Update verification status
    if (session.answers instanceof Map) {
      session.answers.set('address_verified', true);
      session.answers.set('address_verified_at', new Date().toISOString());
    } else {
      session.answers = session.answers || {};
      session.answers.address_verified = true;
      session.answers.address_verified_at = new Date().toISOString();
    }
    
    session.markModified('answers');
    await session.save();
    
    console.log(`✅ Address verified for ${userId}`);
    
    res.json({
      success: true,
      message: 'Address verified successfully'
    });
    
  } catch (err) {
    console.error('❌ Address verification error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to verify address',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

/**
 * POST /api/verification/certify
 * User certifies their return
 */
router.post('/certify', async (req, res) => {
  try {
    const { userId, certifications, signature } = req.body;
    
    // ✅ Validate userId
    const validation = validateUserId(userId);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.error
      });
    }
    
    if (!certifications || !signature) {
      return res.status(400).json({
        success: false,
        message: 'certifications and signature are required'
      });
    }
    
    const session = await getSession(userId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    // Update certification status
    if (session.answers instanceof Map) {
      session.answers.set('certifications', certifications);
      session.answers.set('signature', signature);
      session.answers.set('certified_at', new Date().toISOString());
    } else {
      session.answers = session.answers || {};
      session.answers.certifications = certifications;
      session.answers.signature = signature;
      session.answers.certified_at = new Date().toISOString();
    }
    
    session.markModified('answers');
    await session.save();
    
    console.log(`✅ Return certified for ${userId}`);
    
    res.json({
      success: true,
      message: 'Return certified successfully'
    });
    
  } catch (err) {
    console.error('❌ Certification error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to certify return',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

/**
 * GET /api/verification/calculate
 * Calculate taxes on demand (without filing)
 */
router.get('/calculate', async (req, res) => {
  try {
    const { userId } = req.query;
    
    // ✅ Validate userId
    const validation = validateUserId(userId);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.error
      });
    }
    
    const session = await getSession(userId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    // Get user's state and calculate
    const userState = getSessionValue(session, 'state', 'employee_state') || 'CA';
    
    let taxResults = {};
    try {
      taxResults = calculateFullTax(session, userState);
    } catch (err) {
      console.error('Tax calculation error:', err);
      taxResults = { error: err.message };
    }
    
    res.json({
      success: true,
      state: userState,
      calculation: taxResults
    });
    
  } catch (err) {
    console.error('❌ Tax calculation error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate taxes',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract federal tax summary
 */
function extractFederalSummary(federal, withholding = 0) {
  if (!federal) {
    return {
      totalIncome: 0,
      taxableIncome: 0,
      federalIncomeTax: 0,
      selfEmploymentTax: 0,
      totalTax: 0,
      withholding: withholding,
      refund: 0,
      taxDue: 0,
      errors: [],
      warnings: []
    };
  }
  
  const fedWithholding = federal.withholding || withholding;
  
  return {
    totalIncome: federal.totalIncome || 0,
    taxableIncome: federal.taxableIncome || 0,
    federalIncomeTax: federal.federalTax || 0,
    selfEmploymentTax: federal.seTax || 0,
    totalTax: federal.totalTaxOwed || 0,
    withholding: fedWithholding,
    refund: federal.refund || Math.max(0, fedWithholding - (federal.totalTaxOwed || 0)),
    taxDue: federal.taxDue || Math.max(0, (federal.totalTaxOwed || 0) - fedWithholding),
    errors: federal.errors || [],
    warnings: federal.warnings || []
  };
}

/**
 * Extract state tax summary (state-agnostic)
 */
function extractStateSummary(state, stateName, withholding = 0) {
  if (!state) {
    return {
      state: stateName,
      supported: false,
      refund: 0,
      taxDue: 0,
      withholding: withholding,
      message: 'State not calculated'
    };
  }
  
  const stateWithholding = state.withholding || withholding;
  
  const summary = {
    state: state.state || stateName,
    supported: state.supported || false,
    refund: state.refund || 0,
    taxDue: state.taxDue || 0,
    withholding: stateWithholding,
    message: state.message || null
  };
  
  if (state.supported && state.details) {
    summary.details = state.details;
    
    // Extract common fields if they exist
    if (state.details.caAgi !== undefined) {
      summary.agi = state.details.caAgi;
    }
    if (state.details.caTaxableIncome !== undefined) {
      summary.taxableIncome = state.details.caTaxableIncome;
    }
    if (state.details.caTaxOwed !== undefined) {
      summary.tax = state.details.caTaxOwed;
    }
    if (state.details.caWithholding !== undefined) {
      summary.withholding = state.details.caWithholding;
    }
    if (state.details.totalCredits !== undefined) {
      summary.credits = state.details.totalCredits;
    }
  }
  
  return summary;
}

/**
 * Validate field value
 */
function validateField(field, value) {
  if (!value || typeof value !== 'string') {
    return 'Value is required';
  }
  
  switch (field) {
    case 'first_name':
    case 'last_name':
    case 'employee_name':
      if (value.length < 1 || value.length > 100) {
        return 'Name must be between 1 and 100 characters';
      }
      break;
      
    case 'address':
    case 'employee_address':
      if (value.length < 5 || value.length > 200) {
        return 'Address must be between 5 and 200 characters';
      }
      break;
      
    case 'city':
    case 'employee_city':
      if (value.length < 2 || value.length > 50) {
        return 'City must be between 2 and 50 characters';
      }
      break;
      
    case 'state':
    case 'employee_state':
      if (!/^[A-Z]{2}$/.test(value)) {
        return 'State must be a 2-letter code (e.g., CA, NY)';
      }
      break;
      
    case 'zip':
    case 'employee_zip':
      if (!/^\d{5}(-\d{4})?$/.test(value)) {
        return 'ZIP code must be in format 12345 or 12345-6789';
      }
      break;
  }
  
  return null;
}

/**
 * Validate SSN format
 */
function validateSSN(ssn) {
  if (!ssn) return false;
  
  const cleanSSN = ssn.replace(/\D/g, '');
  
  if (cleanSSN.length !== 9) return false;
  if (cleanSSN === '000000000') return false;
  if (cleanSSN.startsWith('000')) return false;
  if (cleanSSN.substring(3, 5) === '00') return false;
  if (cleanSSN.substring(5) === '0000') return false;
  
  return true;
}

/**
 * Mask SSN for display
 */
function maskSSN(ssn) {
  if (!ssn) return '';
  
  const cleanSSN = ssn.replace(/\D/g, '');
  if (cleanSSN.length !== 9) return '***-**-****';
  
  return `***-**-${cleanSSN.substring(5)}`;
}

/**
 * Check if interview is complete
 */
function checkInterviewComplete(session) {
  // Check for new OR old field names
  const requiredGroups = [
    ['filing_status'],
    ['first_name', 'employee_name'],
    ['ssn', 'employee_ssa_number', 'employee_ssn'],
    ['address', 'employee_address'],
    ['city', 'employee_city'],
    ['state', 'employee_state'],
    ['zip', 'employee_zip']
  ];
  
  return requiredGroups.every(group => {
    const value = getSessionValue(session, ...group);
    return value !== undefined && value !== null && value !== '';
  });
}

/**
 * Check if ready to file
 */
function checkReadyToFile(session) {
  const missing = [];
  
  if (!checkInterviewComplete(session)) {
    missing.push('Complete the tax interview');
  }
  
  const ssnVerified = getSessionValue(session, 'ssn_verified');
  if (ssnVerified !== true && ssnVerified !== 'true') {
    missing.push('Verify your Social Security Number');
  }
  
  const addressVerified = getSessionValue(session, 'address_verified');
  if (addressVerified !== true && addressVerified !== 'true') {
    missing.push('Verify your address');
  }
  
  const certifications = getSessionValue(session, 'certifications');
  if (!certifications) {
    missing.push('Complete required certifications');
  }
  
  return {
    ready: missing.length === 0,
    missing: missing
  };
}

export default router;