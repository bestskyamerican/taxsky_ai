// ============================================================
// SESSION ADAPTER SERVICE
// ============================================================
// Bridges session.answers (Map) to normalizedData and form1040
// This allows validationService.js to work with our data
// ============================================================

import { 
  convertRawToNormalized, 
  convertNormalizedToForm1040,
  parseW2Data,
  parse1099NECData,
  parse1099INTData,
  parse1099DIVData,
  parse1099RData,
  parse1099GData,
  parseSSA1099Data,
  parse1098Data,
  parseAmount
} from './dataConversionService.js';

/**
 * Convert session.answers Map to the structure expected by validationService
 * @param {Object} session - The session object with answers Map
 * @returns {Object} - Session with form1040 and normalizedData attached
 */
export function prepareSessionForValidation(session) {
  const answers = session.answers || new Map();
  
  // Helper to get from Map or object
  const get = (key) => {
    if (answers instanceof Map) return answers.get(key);
    return answers[key];
  };
  
  const getNum = (key) => parseAmount(get(key));
  
  // ============================================================
  // BUILD UPLOADS ARRAY FROM SESSION ANSWERS
  // ============================================================
  const uploads = [];
  
  // Process W-2s
  const w2Count = parseInt(get('w2_count')) || 0;
  for (let i = 1; i <= w2Count; i++) {
    const rawJson = get(`w2_${i}_raw`);
    if (rawJson) {
      try {
        const rawData = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
        uploads.push({
          formType: 'W-2',
          documentNumber: i,
          owner: i > 1 && get('spouse_has_w2') ? 'spouse' : 'taxpayer',
          ocrExtracted: rawData
        });
      } catch (e) {
        console.error(`Error parsing W-2 #${i}:`, e);
      }
    }
  }
  
  // Process 1099-NECs
  const necCount = parseInt(get('nec_count')) || 0;
  for (let i = 1; i <= necCount; i++) {
    const rawJson = get(`nec_${i}_raw`);
    if (rawJson) {
      try {
        const rawData = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
        uploads.push({
          formType: '1099-NEC',
          documentNumber: i,
          ocrExtracted: rawData
        });
      } catch (e) {
        console.error(`Error parsing 1099-NEC #${i}:`, e);
      }
    }
  }
  
  // Process 1099-INTs
  const intCount = parseInt(get('int_count')) || 0;
  for (let i = 1; i <= intCount; i++) {
    const rawJson = get(`int_${i}_raw`);
    if (rawJson) {
      try {
        const rawData = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
        uploads.push({
          formType: '1099-INT',
          documentNumber: i,
          ocrExtracted: rawData
        });
      } catch (e) {
        console.error(`Error parsing 1099-INT #${i}:`, e);
      }
    }
  }
  
  // Process 1099-DIVs
  const divCount = parseInt(get('div_count')) || 0;
  for (let i = 1; i <= divCount; i++) {
    const rawJson = get(`div_${i}_raw`);
    if (rawJson) {
      try {
        const rawData = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
        uploads.push({
          formType: '1099-DIV',
          documentNumber: i,
          ocrExtracted: rawData
        });
      } catch (e) {
        console.error(`Error parsing 1099-DIV #${i}:`, e);
      }
    }
  }
  
  // Process 1099-Rs
  const rCount = parseInt(get('r_count')) || 0;
  for (let i = 1; i <= rCount; i++) {
    const rawJson = get(`r_${i}_raw`);
    if (rawJson) {
      try {
        const rawData = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
        uploads.push({
          formType: '1099-R',
          documentNumber: i,
          ocrExtracted: rawData
        });
      } catch (e) {
        console.error(`Error parsing 1099-R #${i}:`, e);
      }
    }
  }
  
  // Process 1099-Gs
  const gCount = parseInt(get('g_count')) || 0;
  for (let i = 1; i <= gCount; i++) {
    const rawJson = get(`g_${i}_raw`);
    if (rawJson) {
      try {
        const rawData = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
        uploads.push({
          formType: '1099-G',
          documentNumber: i,
          ocrExtracted: rawData
        });
      } catch (e) {
        console.error(`Error parsing 1099-G #${i}:`, e);
      }
    }
  }
  
  // Process SSA-1099
  const ssaCount = parseInt(get('ssa_count')) || 0;
  for (let i = 1; i <= ssaCount; i++) {
    const rawJson = get(`ssa_${i}_raw`);
    if (rawJson) {
      try {
        const rawData = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
        uploads.push({
          formType: 'SSA-1099',
          documentNumber: i,
          ocrExtracted: rawData
        });
      } catch (e) {
        console.error(`Error parsing SSA-1099 #${i}:`, e);
      }
    }
  }
  
  // Process 1098s
  const mortgageCount = parseInt(get('mortgage_count')) || 0;
  for (let i = 1; i <= mortgageCount; i++) {
    const rawJson = get(`mortgage_${i}_raw`);
    if (rawJson) {
      try {
        const rawData = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
        uploads.push({
          formType: '1098',
          documentNumber: i,
          ocrExtracted: rawData
        });
      } catch (e) {
        console.error(`Error parsing 1098 #${i}:`, e);
      }
    }
  }
  
  // ============================================================
  // BUILD RAW DATA STRUCTURE
  // ============================================================
  const rawData = {
    uploads,
    personal: {
      first_name: get('first_name'),
      last_name: get('last_name'),
      ssn: get('ssn'),
      date_of_birth: get('date_of_birth'),
      address: get('address'),
      city: get('city'),
      state: get('state'),
      zip: get('zip'),
      filing_status: get('filing_status')
    },
    spouse: get('filing_status') === 'married_filing_jointly' ? {
      first_name: get('spouse_first_name'),
      last_name: get('spouse_last_name'),
      ssn: get('spouse_ssn'),
      date_of_birth: get('spouse_date_of_birth')
    } : null,
    dependents: []
  };
  
  // Add dependents
  const depCount = parseInt(get('dependent_count')) || parseInt(get('dependents')) || 0;
  for (let i = 1; i <= depCount; i++) {
    rawData.dependents.push({
      first_name: get(`dependent_${i}_name`) || `Dependent ${i}`,
      ssn: get(`dependent_${i}_ssn`) || '',
      relationship: get(`dependent_${i}_relationship`) || 'Child',
      date_of_birth: get(`dependent_${i}_dob`) || ''
    });
  }
  
  // ============================================================
  // CONVERT TO NORMALIZED DATA
  // ============================================================
  let normalizedData;
  try {
    normalizedData = convertRawToNormalized(rawData);
  } catch (e) {
    console.error('Error converting to normalized data:', e);
    normalizedData = buildNormalizedDataFromAnswers(session);
  }
  
  // Add personal info to normalized
  normalizedData.personal = rawData.personal;
  normalizedData.dependents = rawData.dependents;
  
  // Ensure deductions exist
  if (!normalizedData.deductions) {
    normalizedData.deductions = {};
  }
  normalizedData.deductions.mortgage_interest = getNum('total_mortgage_interest');
  normalizedData.deductions.student_loan_interest = getNum('total_student_loan_interest');
  normalizedData.deductions.property_tax = getNum('total_property_tax');
  normalizedData.deductions.education_expenses = getNum('total_tuition');
  
  // ============================================================
  // CONVERT TO FORM 1040 STRUCTURE
  // ============================================================
  let form1040;
  try {
    form1040 = convertNormalizedToForm1040(normalizedData, get('filing_status'));
  } catch (e) {
    console.error('Error converting to Form 1040:', e);
    form1040 = buildForm1040FromAnswers(session);
  }
  
  // Override with our calculated totals (more reliable)
  form1040.income.line_1_wages = getNum('total_wages') + getNum('spouse_total_wages');
  form1040.income.line_2b_interest = getNum('total_interest');
  form1040.income.line_3b_dividends = getNum('total_dividends');
  form1040.income.line_3a_qualified_dividends = getNum('total_qualified_dividends');
  form1040.payments.line_25a_w2_withholding = getNum('total_withheld') + getNum('spouse_total_withheld');
  
  // ============================================================
  // RETURN ENHANCED SESSION
  // ============================================================
  return {
    ...session,
    rawData,
    normalizedData,
    form1040,
    preparedAt: new Date()
  };
}

/**
 * Fallback: Build normalized data directly from session.answers
 */
function buildNormalizedDataFromAnswers(session) {
  const answers = session.answers || new Map();
  const get = (key) => answers instanceof Map ? answers.get(key) : answers[key];
  const getNum = (key) => parseAmount(get(key));
  
  return {
    income: {
      w2: [{
        employer: get('w2_1_employer') || '',
        wages: getNum('total_wages'),
        federal_withholding: getNum('total_withheld'),
        state_withholding: getNum('total_state_withheld')
      }],
      interest: [{
        payer: 'Various',
        amount: getNum('total_interest')
      }],
      dividends: [{
        payer: 'Various',
        ordinary: getNum('total_dividends'),
        qualified: getNum('total_qualified_dividends')
      }],
      self_employment: [{
        payer: 'Various',
        nonemployee_compensation: getNum('total_self_employment')
      }],
      retirement: [{
        gross: getNum('total_retirement'),
        taxable: getNum('total_retirement')
      }],
      social_security: [{
        benefits: getNum('total_social_security')
      }],
      unemployment: [{
        compensation: getNum('total_unemployment')
      }],
      capital_gains: []
    },
    deductions: {
      mortgage_interest: getNum('total_mortgage_interest'),
      student_loan_interest: getNum('total_student_loan_interest'),
      property_tax: getNum('total_property_tax')
    },
    personal: {
      first_name: get('first_name'),
      last_name: get('last_name'),
      ssn: get('ssn'),
      filing_status: get('filing_status'),
      address: get('address'),
      city: get('city'),
      state: get('state'),
      zip: get('zip')
    },
    dependents: []
  };
}

/**
 * Fallback: Build Form 1040 structure directly from session.answers
 */
function buildForm1040FromAnswers(session) {
  const answers = session.answers || new Map();
  const get = (key) => answers instanceof Map ? answers.get(key) : answers[key];
  const getNum = (key) => parseAmount(get(key));
  
  const filingStatus = get('filing_status') || 'single';
  const wages = getNum('total_wages') + getNum('spouse_total_wages');
  const interest = getNum('total_interest');
  const dividends = getNum('total_dividends');
  const selfEmployment = getNum('total_self_employment');
  const retirement = getNum('total_retirement');
  const socialSecurity = getNum('total_social_security');
  const taxableSS = Math.round(socialSecurity * 0.85);
  const unemployment = getNum('total_unemployment');
  
  const totalIncome = wages + interest + dividends + selfEmployment + retirement + taxableSS + unemployment;
  
  const standardDeductions = {
    'single': 14600,
    'married_filing_jointly': 29200,
    'married_filing_separately': 14600,
    'head_of_household': 21900
  };
  const standardDeduction = standardDeductions[filingStatus] || 14600;
  
  const agi = totalIncome;
  const taxableIncome = Math.max(0, agi - standardDeduction);
  
  // Calculate tax
  let tax = 0;
  if (filingStatus === 'married_filing_jointly') {
    if (taxableIncome <= 23200) tax = taxableIncome * 0.10;
    else if (taxableIncome <= 94300) tax = 2320 + (taxableIncome - 23200) * 0.12;
    else if (taxableIncome <= 201050) tax = 10852 + (taxableIncome - 94300) * 0.22;
    else tax = 34337 + (taxableIncome - 201050) * 0.24;
  } else {
    if (taxableIncome <= 11600) tax = taxableIncome * 0.10;
    else if (taxableIncome <= 47150) tax = 1160 + (taxableIncome - 11600) * 0.12;
    else if (taxableIncome <= 100525) tax = 5426 + (taxableIncome - 47150) * 0.22;
    else tax = 17168 + (taxableIncome - 100525) * 0.24;
  }
  tax = Math.round(tax);
  
  const depCount = parseInt(get('dependent_count')) || 0;
  const childTaxCredit = Math.min(depCount * 2000, tax);
  
  const seTax = selfEmployment > 400 ? Math.round(selfEmployment * 0.9235 * 0.153) : 0;
  const totalTax = Math.max(0, tax - childTaxCredit) + seTax;
  
  const withholding = getNum('total_withheld') + getNum('spouse_total_withheld');
  const refund = Math.max(0, withholding - totalTax);
  const owed = Math.max(0, totalTax - withholding);
  
  return {
    header: {
      first_name: get('first_name'),
      last_name: get('last_name'),
      ssn: get('ssn'),
      filing_status: filingStatus,
      address: get('address'),
      city: get('city'),
      state: get('state'),
      zip: get('zip'),
      spouse_first_name: get('spouse_first_name'),
      spouse_last_name: get('spouse_last_name'),
      spouse_ssn: get('spouse_ssn')
    },
    income: {
      line_1_wages: wages,
      line_2b_interest: interest,
      line_3a_qualified_dividends: getNum('total_qualified_dividends'),
      line_3b_dividends: dividends,
      line_4b_ira_taxable: retirement,
      line_6a_social_security: socialSecurity,
      line_6b_social_security_taxable: taxableSS,
      line_8_schedule_1: selfEmployment + unemployment,
      line_9_total_income: totalIncome
    },
    adjustments: {
      line_10_adjustments: 0,
      line_11_agi: agi
    },
    deductions: {
      line_12_deduction: standardDeduction,
      line_12_standard_or_itemized: 'standard',
      line_14_total_deductions: standardDeduction,
      line_15_taxable_income: taxableIncome
    },
    tax_and_credits: {
      line_16_tax: tax,
      line_17_schedule_2_taxes: seTax,
      line_18_total_tax_before_credits: tax + seTax,
      line_19_child_credit: childTaxCredit,
      line_22_tax_after_credits: Math.max(0, tax - childTaxCredit),
      line_24_total_tax: totalTax
    },
    payments: {
      line_25a_w2_withholding: withholding,
      line_25d_total_withholding: withholding,
      line_33_total_payments: withholding
    },
    refund_or_owe: {
      line_34_overpaid: refund,
      line_35_refund: refund,
      line_37_amount_owe: owed
    }
  };
}

/**
 * Get a quick summary of what data we have
 */
export function getDataSummary(session) {
  const answers = session.answers || new Map();
  const get = (key) => answers instanceof Map ? answers.get(key) : answers[key];
  const getNum = (key) => parseAmount(get(key));
  
  return {
    personal: {
      name: `${get('first_name') || ''} ${get('last_name') || ''}`.trim() || 'Not provided',
      ssn: get('ssn') ? '***-**-' + get('ssn').slice(-4) : 'Not provided',
      address: get('address') ? `${get('address')}, ${get('city')}, ${get('state')} ${get('zip')}` : 'Not provided',
      filingStatus: get('filing_status') || 'Not selected',
      dependents: parseInt(get('dependent_count')) || 0
    },
    income: {
      wages: getNum('total_wages'),
      spouseWages: getNum('spouse_total_wages'),
      interest: getNum('total_interest'),
      dividends: getNum('total_dividends'),
      selfEmployment: getNum('total_self_employment'),
      retirement: getNum('total_retirement'),
      socialSecurity: getNum('total_social_security'),
      unemployment: getNum('total_unemployment'),
      total: getNum('total_wages') + getNum('spouse_total_wages') + getNum('total_interest') + 
             getNum('total_dividends') + getNum('total_self_employment') + getNum('total_retirement') +
             getNum('total_unemployment')
    },
    withholding: {
      federal: getNum('total_withheld') + getNum('spouse_total_withheld'),
      state: getNum('total_state_withheld')
    },
    documents: {
      w2: parseInt(get('w2_count')) || 0,
      nec: parseInt(get('nec_count')) || 0,
      int: parseInt(get('int_count')) || 0,
      div: parseInt(get('div_count')) || 0
    }
  };
}

export default {
  prepareSessionForValidation,
  getDataSummary
};
