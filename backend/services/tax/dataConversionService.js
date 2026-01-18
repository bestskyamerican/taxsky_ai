// ============================================================
// DATA CONVERSION SERVICE - CLEANED VERSION
// ============================================================
// PURPOSE: Parse OCR data, convert formats
// TAX CALCULATIONS: Use federalCalculator.js instead!
// ============================================================

// ============================================================
// PARSE HELPERS
// ============================================================
export function parseAmount(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value.amount !== undefined) {
    return Number(value.amount) || 0;
  }
  const cleaned = String(value).replace(/[$,\s]/g, '').trim();
  return parseFloat(cleaned) || 0;
}

// ============================================================
// PARSE W-2 DATA
// ============================================================
export function parseW2Data(rawData) {
  const fullName = rawData.employee_name || '';
  const nameParts = fullName.trim().split(/\s+/);
  
  // Better name parsing
  let firstName = '', lastName = '';
  if (nameParts.length === 1) {
    lastName = nameParts[0];
  } else if (nameParts.length === 2) {
    firstName = nameParts[0];
    lastName = nameParts[1];
  } else if (nameParts.length >= 3) {
    firstName = nameParts[0];
    lastName = nameParts[nameParts.length - 1];
  }
  
  // Parse address
  let street = '', city = '', state = 'CA', zip = '';
  if (rawData.employee_city && rawData.employee_state) {
    street = rawData.employee_address || '';
    city = rawData.employee_city || '';
    state = rawData.employee_state || 'CA';
    zip = rawData.employee_zip || '';
  } else {
    const fullAddr = rawData.employee_address || '';
    const addrMatch = fullAddr.match(/^(.+?),\s*(.+?),\s*([A-Z]{2})\s*(\d{5})/);
    if (addrMatch) {
      street = addrMatch[1].trim();
      city = addrMatch[2].trim();
      state = addrMatch[3];
      zip = addrMatch[4];
    } else {
      street = fullAddr;
    }
  }
  
  return {
    name: fullName,
    firstName,
    lastName,
    ssn: rawData.ssa_number || rawData.employee_ssn || rawData.ssn || '',
    address: street,
    city,
    state,
    zip,
    employerName: rawData.employer_name || '',
    employerEIN: rawData.employer_ein || rawData.employee_fed_id_number || '',
    wages: parseAmount(rawData.wages_tips_other_comp) || 
           parseAmount(rawData.reported_w2_wages) || 
           parseAmount(rawData.wages) || 0,
    federalWithheld: parseAmount(rawData.federal_income_tax_withheld) || 0,
    socialSecurityWages: parseAmount(rawData.social_security_wages) || 0,
    socialSecurityWithheld: parseAmount(rawData.social_security_tax_withheld) || 0,
    medicareWages: parseAmount(rawData.medicare_wages) || 0,
    medicareWithheld: parseAmount(rawData.medicare_tax_withheld) || 0,
    stateWages: parseAmount(rawData.state_wages_tips) || parseAmount(rawData.state_wages) || 0,
    stateWithheld: parseAmount(rawData.state_income_tax) || 0,
    localWages: parseAmount(rawData.local_wages_tips) || 0,
    localWithheld: parseAmount(rawData.local_income_tax) || 0
  };
}

// ============================================================
// PARSE 1099-NEC DATA
// ============================================================
export function parse1099NECData(rawData) {
  return {
    payerName: rawData.payer_name || rawData.payer || '',
    payerEIN: rawData.payer_tin || '',
    recipientName: rawData.recipient_name || '',
    recipientSSN: rawData.recipient_tin || '',
    nonemployeeCompensation: parseAmount(rawData.nonemployee_compensation) || 
                             parseAmount(rawData.box1) || 0,
    federalWithheld: parseAmount(rawData.federal_income_tax_withheld) || 
                     parseAmount(rawData.box4) || 0
  };
}

// ============================================================
// PARSE 1099-INT DATA
// ============================================================
export function parse1099INTData(rawData) {
  return {
    payerName: rawData.payer_name || rawData.payer || '',
    interestIncome: parseAmount(rawData.interest_income) || 
                    parseAmount(rawData.box1) || 0,
    taxExemptInterest: parseAmount(rawData.tax_exempt_interest) ||
                       parseAmount(rawData.box8) || 0,
    earlyWithdrawalPenalty: parseAmount(rawData.early_withdrawal_penalty) || 
                            parseAmount(rawData.box2) || 0,
    federalWithheld: parseAmount(rawData.federal_income_tax_withheld) || 
                     parseAmount(rawData.box4) || 0
  };
}

// ============================================================
// PARSE 1099-DIV DATA
// ============================================================
export function parse1099DIVData(rawData) {
  return {
    payerName: rawData.payer_name || rawData.payer || '',
    ordinaryDividends: parseAmount(rawData.ordinary_dividends) || 
                       parseAmount(rawData.box1a) || 0,
    qualifiedDividends: parseAmount(rawData.qualified_dividends) || 
                        parseAmount(rawData.box1b) || 0,
    federalWithheld: parseAmount(rawData.federal_income_tax_withheld) || 
                     parseAmount(rawData.box4) || 0
  };
}

// ============================================================
// PARSE 1099-R DATA (Retirement)
// ============================================================
export function parse1099RData(rawData) {
  return {
    payerName: rawData.payer_name || rawData.payer || '',
    grossDistribution: parseAmount(rawData.gross_distribution) || 
                       parseAmount(rawData.box1) || 0,
    taxableAmount: parseAmount(rawData.taxable_amount) || 
                   parseAmount(rawData.box2a) || 0,
    federalWithheld: parseAmount(rawData.federal_income_tax_withheld) || 
                     parseAmount(rawData.box4) || 0,
    distributionCode: rawData.distribution_code || rawData.box7 || ''
  };
}

// ============================================================
// PARSE 1099-G DATA (Government)
// ============================================================
export function parse1099GData(rawData) {
  return {
    payerName: rawData.payer_name || rawData.payer || '',
    unemploymentCompensation: parseAmount(rawData.unemployment_compensation) || 
                              parseAmount(rawData.box1) || 0,
    stateRefund: parseAmount(rawData.state_refund) || 
                 parseAmount(rawData.box2) || 0,
    federalWithheld: parseAmount(rawData.federal_income_tax_withheld) || 
                     parseAmount(rawData.box4) || 0
  };
}

// ============================================================
// PARSE SSA-1099 DATA (Social Security)
// ============================================================
export function parseSSA1099Data(rawData) {
  return {
    totalBenefits: parseAmount(rawData.total_benefits) || 
                   parseAmount(rawData.box5) || 0,
    federalWithheld: parseAmount(rawData.federal_income_tax_withheld) || 
                     parseAmount(rawData.box4) || 0
  };
}

// ============================================================
// PARSE 1098 DATA (Mortgage)
// ============================================================
export function parse1098Data(rawData) {
  return {
    lenderName: rawData.lender_name || rawData.recipient_name || '',
    mortgageInterest: parseAmount(rawData.mortgage_interest) || 
                      parseAmount(rawData.box1) || 0,
    pointsPaid: parseAmount(rawData.points_paid) || 
                parseAmount(rawData.box6) || 0,
    propertyTax: parseAmount(rawData.property_tax) || 
                 parseAmount(rawData.box10) || 0
  };
}

// ============================================================
// CONVERT RAW OCR → NORMALIZED DATA
// ============================================================
export function convertRawToNormalized(rawData) {
  const normalized = {
    income: {
      w2: [],
      interest: [],
      dividends: [],
      self_employment: [],
      unemployment: [],
      social_security: [],
      retirement: []
    },
    deductions: {},
    personal: {},
    dependents: []
  };
  
  if (!rawData || !rawData.uploads) return normalized;
  
  for (const upload of rawData.uploads) {
    const extracted = upload.ocrExtracted || upload.rawData || {};
    
    switch (upload.formType) {
      case 'W2':
      case 'W-2':
        const w2 = parseW2Data(extracted);
        normalized.income.w2.push({
          employer: w2.employerName,
          wages: w2.wages,
          federal_withholding: w2.federalWithheld,
          state_wages: w2.stateWages,
          state_withholding: w2.stateWithheld
        });
        if (normalized.income.w2.length === 1) {
          normalized.personal = {
            first_name: w2.firstName,
            last_name: w2.lastName,
            ssn: w2.ssn,
            address: w2.address,
            city: w2.city,
            state: w2.state,
            zip: w2.zip
          };
        }
        break;
        
      case '1099-NEC':
      case '1099NEC':
        const nec = parse1099NECData(extracted);
        normalized.income.self_employment.push({
          payer: nec.payerName,
          nonemployee_compensation: nec.nonemployeeCompensation,
          federal_withholding: nec.federalWithheld
        });
        break;
        
      case '1099-INT':
      case '1099INT':
        const int = parse1099INTData(extracted);
        normalized.income.interest.push({
          payer: int.payerName,
          interest_income: int.interestIncome,
          federal_withholding: int.federalWithheld
        });
        break;
        
      case '1099-DIV':
      case '1099DIV':
        const div = parse1099DIVData(extracted);
        normalized.income.dividends.push({
          payer: div.payerName,
          ordinary_dividends: div.ordinaryDividends,
          qualified_dividends: div.qualifiedDividends,
          federal_withholding: div.federalWithheld
        });
        break;
        
      case '1099-R':
        const ret = parse1099RData(extracted);
        normalized.income.retirement.push({
          payer: ret.payerName,
          gross_distribution: ret.grossDistribution,
          taxable_amount: ret.taxableAmount,
          federal_withholding: ret.federalWithheld
        });
        break;
        
      case '1099-G':
        const gov = parse1099GData(extracted);
        normalized.income.unemployment.push({
          payer: gov.payerName,
          compensation: gov.unemploymentCompensation,
          federal_withholding: gov.federalWithheld
        });
        break;
        
      case 'SSA-1099':
        const ssa = parseSSA1099Data(extracted);
        normalized.income.social_security.push({
          benefits: ssa.totalBenefits,
          federal_withholding: ssa.federalWithheld
        });
        break;
        
      case '1098':
        const mort = parse1098Data(extracted);
        normalized.deductions.mortgage_interest = (normalized.deductions.mortgage_interest || 0) + mort.mortgageInterest;
        normalized.deductions.property_tax = (normalized.deductions.property_tax || 0) + mort.propertyTax;
        break;
    }
  }
  
  return normalized;
}

// ============================================================
// BUILD DOCUMENT CONFIRMATION QUESTIONS
// ============================================================
export function buildDocumentQuestions(document, parsedData) {
  const questions = [];
  const type = document.documentType || document.formType;
  const num = document.documentNumber || 1;
  const owner = document.owner === 'spouse' ? '(Spouse) ' : '';
  
  if (type === 'W-2' || type === 'W2') {
    questions.push({
      field: 'wages',
      question: `${owner}**W-2 #${num}** - Wages: **$${parsedData.wages.toLocaleString()}**\n→ Line 1a\n\nCorrect?`,
      value: parsedData.wages,
      line: '1a'
    });
    questions.push({
      field: 'federalWithheld',
      question: `${owner}**W-2 #${num}** - Federal Withheld: **$${parsedData.federalWithheld.toLocaleString()}**\n→ Line 25a\n\nCorrect?`,
      value: parsedData.federalWithheld,
      line: '25a'
    });
  } else if (type === '1099-NEC') {
    questions.push({
      field: 'nonemployeeCompensation',
      question: `**1099-NEC #${num}** - Income: **$${parsedData.nonemployeeCompensation.toLocaleString()}**\n→ Schedule C\n⚠️ Subject to 15.3% SE tax\n\nCorrect?`,
      value: parsedData.nonemployeeCompensation,
      line: 'Schedule C'
    });
  } else if (type === '1099-INT') {
    questions.push({
      field: 'interestIncome',
      question: `**1099-INT #${num}** - Interest: **$${parsedData.interestIncome.toLocaleString()}**\n→ Line 2b\n\nCorrect?`,
      value: parsedData.interestIncome,
      line: '2b'
    });
  } else if (type === '1099-DIV') {
    questions.push({
      field: 'ordinaryDividends',
      question: `**1099-DIV #${num}** - Dividends: **$${parsedData.ordinaryDividends.toLocaleString()}**\n→ Line 3b\n\nCorrect?`,
      value: parsedData.ordinaryDividends,
      line: '3b'
    });
  }
  
  return questions;
}

// ============================================================
// BUILD 1040 SUMMARY MESSAGE
// ============================================================
export function build1040SummaryMessage(summary) {
  let msg = `\n📋 **FORM 1040 SUMMARY**\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  if (summary.income) {
    msg += `💰 **INCOME**\n`;
    if (summary.income.wages > 0) {
      msg += `   Wages: $${summary.income.wages.toLocaleString()}\n`;
    }
    if (summary.income.interest > 0) {
      msg += `   Interest: $${summary.income.interest.toLocaleString()}\n`;
    }
    if (summary.income.selfEmployment > 0) {
      msg += `   Self-Employment: $${summary.income.selfEmployment.toLocaleString()}\n`;
    }
    msg += `   **Total: $${(summary.income.total || 0).toLocaleString()}**\n\n`;
  }
  
  if (summary.tax) {
    msg += `🧮 **TAX**\n`;
    msg += `   Deduction: $${(summary.tax.deduction || 0).toLocaleString()}\n`;
    msg += `   Taxable: $${(summary.tax.taxable || 0).toLocaleString()}\n`;
    msg += `   Tax: $${(summary.tax.tax || 0).toLocaleString()}\n`;
    if (summary.tax.credits > 0) {
      msg += `   Credits: -$${summary.tax.credits.toLocaleString()}\n`;
    }
    msg += `   **Total Tax: $${(summary.tax.total || 0).toLocaleString()}**\n\n`;
  }
  
  msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  if (summary.refund > 0) {
    msg += `✅ **REFUND: $${summary.refund.toLocaleString()}** 🎉\n`;
  } else if (summary.owed > 0) {
    msg += `⚠️ **OWED: $${summary.owed.toLocaleString()}**\n`;
  } else {
    msg += `✅ **BALANCED: $0**\n`;
  }
  
  return msg;
}

// ============================================================
// EXPORTS
// ============================================================
export default {
  parseAmount,
  parseW2Data,
  parse1099NECData,
  parse1099INTData,
  parse1099DIVData,
  parse1099RData,
  parse1099GData,
  parseSSA1099Data,
  parse1098Data,
  convertRawToNormalized,
  buildDocumentQuestions,
  build1040SummaryMessage
};