// verificationRoutes.js - Final verification and submission
// Works WITHOUT PDF generation and IRS submission (optional features)

import express from 'express';
import { getSession } from '../tax/sessionDB.js';
import { calculateFullTax } from '../tax/fullCalculator.js';

const router = express.Router();

/**
 * GET /api/verification/data
 * Get user data for final verification
 */
router.get('/data', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }
    
    const session = await getSession(userId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    // Get user's state
    const userState = session.answers.get('employee_state') || 'CA';
    
    // Calculate taxes using fullCalculator
    const taxResults = calculateFullTax(session, userState);
    
    // Build verification data
    const verificationData = {
      // Personal Info
      personalInfo: {
        name: session.answers.get('employee_name') || '',
        ssn: maskSSN(session.answers.get('employee_ssa_number') || ''),
        address: session.answers.get('employee_address') || '',
        city: session.answers.get('employee_city') || '',
        state: userState,
        zip: session.answers.get('employee_zip') || ''
      },
      
      // Filing Info
      filingInfo: {
        filingStatus: session.answers.get('filing_status') || '',
        dependents: parseInt(session.answers.get('dependents')) || 0
      },
      
      // Income Summary
      income: {
        w2Income: getFormIncome(session, 'W2'),
        selfEmployment: getFormIncome(session, '1099-NEC'),
        interest: getFormIncome(session, '1099-INT'),
        dividends: getFormIncome(session, '1099-DIV'),
        totalIncome: taxResults.federal?.totalIncome || 0
      },
      
      // Federal Tax Summary
      federal: extractFederalSummary(taxResults.federal),
      
      // State Tax Summary
      state: extractStateSummary(taxResults.state, userState),
      
      // Combined Totals
      totals: {
        totalRefund: taxResults.totalRefund || 0,
        totalTaxDue: taxResults.totalTaxDue || 0,
        netAmount: (taxResults.totalRefund || 0) - (taxResults.totalTaxDue || 0),
        readyToFile: taxResults.readyToFile || false
      },
      
      // Verification Status
      verificationStatus: {
        ssnVerified: session.answers.get('ssn_verified') || false,
        ssnVerifiedAt: session.answers.get('ssn_verified_at'),
        addressVerified: session.answers.get('address_verified') || false,
        addressVerifiedAt: session.answers.get('address_verified_at'),
        dataReviewed: session.answers.get('data_reviewed') || false,
        dataReviewedAt: session.answers.get('data_reviewed_at'),
        certifications: session.answers.get('certifications') || null,
        certifiedAt: session.answers.get('certified_at') || null
      },
      
      // Overall Status
      overallStatus: {
        interviewComplete: checkInterviewComplete(session),
        readyToFile: checkReadyToFile(session),
        filed: session.answers.get('filed') || false,
        filedAt: session.answers.get('filed_at') || null
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
    
    if (!userId || !field) {
      return res.status(400).json({
        success: false,
        message: 'userId and field are required'
      });
    }
    
    const session = await getSession(userId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    // Validate field
    const allowedFields = [
      'employee_name',
      'employee_address',
      'employee_city',
      'employee_state',
      'employee_zip'
    ];
    
    if (!allowedFields.includes(field)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid field'
      });
    }
    
    // Validate value
    const validationError = validateField(field, value);
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError
      });
    }
    
    // Update field
    session.answers.set(field, value);
    
    // Mark as needing re-verification if address changed
    if (field.startsWith('employee_address') || field === 'employee_city' || 
        field === 'employee_state' || field === 'employee_zip') {
      session.answers.set('address_verified', false);
    }
    
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
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }
    
    const session = await getSession(userId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    // Optional: Verify SSN matches
    if (ssn) {
      const storedSSN = session.answers.get('employee_ssa_number');
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
    const ssnValue = session.answers.get('employee_ssa_number');
    if (!validateSSN(ssnValue)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid SSN format'
      });
    }
    
    session.answers.set('ssn_verified', true);
    session.answers.set('ssn_verified_at', new Date().toISOString());
    
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
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }
    
    const session = await getSession(userId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    // Validate address is complete
    const address = session.answers.get('employee_address');
    const city = session.answers.get('employee_city');
    const state = session.answers.get('employee_state');
    const zip = session.answers.get('employee_zip');
    
    if (!address || !city || !state || !zip) {
      return res.status(400).json({
        success: false,
        message: 'Address is incomplete'
      });
    }
    
    session.answers.set('address_verified', true);
    session.answers.set('address_verified_at', new Date().toISOString());
    
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
 * POST /api/verification/review-data
 * Mark that user has reviewed all data
 */
router.post('/review-data', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }
    
    const session = await getSession(userId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    session.answers.set('data_reviewed', true);
    session.answers.set('data_reviewed_at', new Date().toISOString());
    
    await session.save();
    
    console.log(`✅ Data reviewed for ${userId}`);
    
    res.json({
      success: true,
      message: 'Data review confirmed'
    });
    
  } catch (err) {
    console.error('❌ Data review error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm data review',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

/**
 * POST /api/verification/certify
 * Save user certifications
 */
router.post('/certify', async (req, res) => {
  try {
    const { userId, certifications } = req.body;
    
    if (!userId || !certifications) {
      return res.status(400).json({
        success: false,
        message: 'userId and certifications are required'
      });
    }
    
    const session = await getSession(userId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    // Validate certifications
    const required = ['accuracy', 'electronicSignature', 'reviewed'];
    const allChecked = required.every(cert => certifications[cert] === true);
    
    if (!allChecked) {
      return res.status(400).json({
        success: false,
        message: 'All required certifications must be checked',
        missing: required.filter(cert => !certifications[cert])
      });
    }
    
    // Additional validation: ensure SSN and address verified
    if (!session.answers.get('ssn_verified')) {
      return res.status(400).json({
        success: false,
        message: 'SSN must be verified before certification'
      });
    }
    
    if (!session.answers.get('address_verified')) {
      return res.status(400).json({
        success: false,
        message: 'Address must be verified before certification'
      });
    }
    
    session.answers.set('certifications', certifications);
    session.answers.set('certified_at', new Date().toISOString());
    
    await session.save();
    
    console.log(`✅ Certifications saved for ${userId}`);
    
    res.json({
      success: true,
      message: 'Certifications saved successfully'
    });
    
  } catch (err) {
    console.error('❌ Certification error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to save certifications',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

/**
 * POST /api/verification/submit
 * Final submission - Calculate and store final tax results
 * PDF and IRS submission are optional (add later when ready)
 */
router.post('/submit', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }
    
    const session = await getSession(userId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    // Verify all requirements met
    const readyToFile = checkReadyToFile(session);
    
    if (!readyToFile.ready) {
      return res.status(400).json({
        success: false,
        message: 'Requirements not met for filing',
        missing: readyToFile.missing
      });
    }
    
    // Prevent duplicate filing
    if (session.answers.get('filed')) {
      return res.status(400).json({
        success: false,
        message: 'Tax return already filed',
        filedAt: session.answers.get('filed_at')
      });
    }
    
    // Calculate final taxes
    const userState = session.answers.get('employee_state') || 'CA';
    const taxResults = calculateFullTax(session, userState);
    
    // Check if tax calculation is ready
    if (!taxResults.readyToFile) {
      return res.status(400).json({
        success: false,
        message: 'Tax calculation has errors',
        errors: taxResults.federal?.errors || [],
        warnings: taxResults.federal?.warnings || []
      });
    }
    
    // Store final tax results
    session.answers.set('final_tax_calculation', {
      federal: taxResults.federal,
      state: taxResults.state,
      totals: {
        totalRefund: taxResults.totalRefund,
        totalTaxDue: taxResults.totalTaxDue
      },
      calculatedAt: new Date().toISOString()
    });
    
    // Mark as filed
    session.answers.set('filed', true);
    session.answers.set('filed_at', new Date().toISOString());
    session.answers.set('filing_method', 'digital_record');
    
    await session.save();
    
    console.log(`✅ Tax return filed for ${userId} (${userState})`);
    console.log(`   Federal Refund: $${taxResults.federal?.refund || 0}`);
    console.log(`   State Refund: $${taxResults.state?.refund || 0}`);
    console.log(`   Total Refund: $${taxResults.totalRefund || 0}`);
    
    res.json({
      success: true,
      message: 'Tax return filed successfully',
      filing: {
        state: userState,
        filedAt: new Date().toISOString(),
        method: 'digital_record',
        taxResults: {
          federal: {
            refund: taxResults.federal?.refund || 0,
            taxDue: taxResults.federal?.taxDue || 0
          },
          state: {
            state: userState,
            supported: taxResults.state?.supported || false,
            refund: taxResults.state?.refund || 0,
            taxDue: taxResults.state?.taxDue || 0
          },
          totals: {
            totalRefund: taxResults.totalRefund || 0,
            totalTaxDue: taxResults.totalTaxDue || 0
          }
        }
      },
      nextSteps: [
        'Your tax calculation has been saved',
        'You can download a summary using GET /api/verification/summary',
        'PDF generation will be available when form1040Generator is added',
        'IRS e-file will be available when efileSubmitter is added'
      ]
    });
    
  } catch (err) {
    console.error('❌ Submission error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to submit tax return',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

/**
 * GET /api/verification/status
 * Check verification and filing status
 */
router.get('/status', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }
    
    const session = await getSession(userId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    const readyToFile = checkReadyToFile(session);
    
    const status = {
      // Interview Progress
      interview: {
        complete: checkInterviewComplete(session),
        aiReviewComplete: session.answers.get('ai_review_complete') || false
      },
      
      // Verification Steps
      verification: {
        ssnVerified: session.answers.get('ssn_verified') || false,
        ssnVerifiedAt: session.answers.get('ssn_verified_at'),
        addressVerified: session.answers.get('address_verified') || false,
        addressVerifiedAt: session.answers.get('address_verified_at'),
        dataReviewed: session.answers.get('data_reviewed') || false,
        dataReviewedAt: session.answers.get('data_reviewed_at')
      },
      
      // Certifications
      certifications: {
        certified: !!session.answers.get('certifications'),
        certifiedAt: session.answers.get('certified_at'),
        details: session.answers.get('certifications')
      },
      
      // Filing Status
      filing: {
        readyToFile: readyToFile.ready,
        missing: readyToFile.missing,
        filed: session.answers.get('filed') || false,
        filedAt: session.answers.get('filed_at'),
        filingMethod: session.answers.get('filing_method')
      }
    };
    
    res.json({
      success: true,
      status: status
    });
    
  } catch (err) {
    console.error('❌ Status check error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve status',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

/**
 * GET /api/verification/summary
 * Get a printable summary of the tax return
 */
router.get('/summary', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
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
    const userState = session.answers.get('employee_state') || 'CA';
    const taxResults = calculateFullTax(session, userState);
    
    const summary = {
      taxYear: 2024,
      generatedAt: new Date().toISOString(),
      
      taxpayer: {
        name: session.answers.get('employee_name'),
        ssn: maskSSN(session.answers.get('employee_ssa_number')),
        address: {
          street: session.answers.get('employee_address'),
          city: session.answers.get('employee_city'),
          state: userState,
          zip: session.answers.get('employee_zip')
        },
        filingStatus: session.answers.get('filing_status'),
        dependents: parseInt(session.answers.get('dependents')) || 0
      },
      
      income: {
        w2Wages: getFormIncome(session, 'W2'),
        selfEmployment: getFormIncome(session, '1099-NEC'),
        interest: getFormIncome(session, '1099-INT'),
        dividends: getFormIncome(session, '1099-DIV'),
        total: taxResults.federal?.totalIncome || 0
      },
      
      federal: extractFederalSummary(taxResults.federal),
      state: extractStateSummary(taxResults.state, userState),
      
      totals: {
        totalRefund: taxResults.totalRefund || 0,
        totalTaxDue: taxResults.totalTaxDue || 0,
        netAmount: (taxResults.totalRefund || 0) - (taxResults.totalTaxDue || 0),
        outcome: (taxResults.totalRefund || 0) > 0 ? 'REFUND' : 
                 (taxResults.totalTaxDue || 0) > 0 ? 'TAX DUE' : 'EVEN'
      },
      
      filingInfo: {
        filed: session.answers.get('filed') || false,
        filedAt: session.answers.get('filed_at'),
        filingMethod: session.answers.get('filing_method')
      }
    };
    
    res.json({
      success: true,
      summary: summary
    });
    
  } catch (err) {
    console.error('❌ Summary generation error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to generate summary',
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
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
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
    const userState = session.answers.get('employee_state') || 'CA';
    const taxResults = calculateFullTax(session, userState);
    
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
function extractFederalSummary(federal) {
  if (!federal) {
    return {
      totalIncome: 0,
      taxableIncome: 0,
      federalIncomeTax: 0,
      selfEmploymentTax: 0,
      totalTax: 0,
      withholding: 0,
      refund: 0,
      taxDue: 0,
      errors: [],
      warnings: []
    };
  }
  
  return {
    totalIncome: federal.totalIncome || 0,
    taxableIncome: federal.taxableIncome || 0,
    federalIncomeTax: federal.federalTax || 0,
    selfEmploymentTax: federal.seTax || 0,
    totalTax: federal.totalTaxOwed || 0,
    withholding: federal.withholding || 0,
    refund: federal.refund || 0,
    taxDue: federal.taxDue || 0,
    errors: federal.errors || [],
    warnings: federal.warnings || []
  };
}

/**
 * Extract state tax summary (state-agnostic)
 */
function extractStateSummary(state, stateName) {
  if (!state) {
    return {
      state: stateName,
      supported: false,
      refund: 0,
      taxDue: 0,
      message: 'State not calculated'
    };
  }
  
  const summary = {
    state: state.state || stateName,
    supported: state.supported || false,
    refund: state.refund || 0,
    taxDue: state.taxDue || 0,
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
 * Get form income (works with any form type)
 */
function getFormIncome(session, formType) {
  const forms = session.forms || new Map();
  const formArray = forms instanceof Map ? forms.get(formType) || [] : forms[formType] || [];
  
  if (!Array.isArray(formArray) || formArray.length === 0) {
    const answerKeys = {
      'W2': 'w2_income',
      '1099-NEC': 'self_employed_income',
      '1099-INT': 'interest_income',
      '1099-DIV': 'dividend_income'
    };
    return Number(session.answers.get(answerKeys[formType])) || 0;
  }
  
  const fieldMappings = {
    'W2': ['Wages, Tips, Other Compensation', 'wages_tips_other_compensation', 'Box 1'],
    '1099-NEC': ['Nonemployee compensation', 'Box 1'],
    '1099-INT': ['Interest income', 'Box 1'],
    '1099-DIV': ['Total ordinary dividends', 'Box 1a']
  };
  
  const fields = fieldMappings[formType] || ['Box 1'];
  
  let total = 0;
  formArray.forEach(form => {
    for (const field of fields) {
      const value = Number(form[field]);
      if (value) {
        total += value;
        break;
      }
    }
  });
  
  return total;
}

/**
 * Validate field value
 */
function validateField(field, value) {
  if (!value || typeof value !== 'string') {
    return 'Value is required';
  }
  
  switch (field) {
    case 'employee_name':
      if (value.length < 2 || value.length > 100) {
        return 'Name must be between 2 and 100 characters';
      }
      break;
      
    case 'employee_address':
      if (value.length < 5 || value.length > 200) {
        return 'Address must be between 5 and 200 characters';
      }
      break;
      
    case 'employee_city':
      if (value.length < 2 || value.length > 50) {
        return 'City must be between 2 and 50 characters';
      }
      break;
      
    case 'employee_state':
      if (!/^[A-Z]{2}$/.test(value)) {
        return 'State must be a 2-letter code (e.g., CA, NY)';
      }
      break;
      
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
  const required = [
    'filing_status',
    'dependents',
    'employee_name',
    'employee_ssa_number',
    'employee_address',
    'employee_city',
    'employee_state',
    'employee_zip'
  ];
  
  return required.every(field => {
    const value = session.answers.get(field);
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
  
  if (!session.answers.get('ssn_verified')) {
    missing.push('Verify your Social Security Number');
  }
  
  if (!session.answers.get('address_verified')) {
    missing.push('Verify your address');
  }
  
  if (!session.answers.get('certifications')) {
    missing.push('Complete required certifications');
  }
  
  return {
    ready: missing.length === 0,
    missing: missing
  };
}

export default router;