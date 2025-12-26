// ============================================================
// AI MAPPING SERVICE - Parse Raw Data → Map to Form 1040
// ============================================================
//
// 1. Parse raw OCR data (clean values)
// 2. Map to correct 1040 line
// 3. Build confirmation questions for interview
//
// ============================================================

// ============================================================
// PARSE RAW W-2 DATA
// ============================================================
export function parseW2Data(rawData) {
  return {
    // Personal info
    name: rawData.employee_name || '',
    ssn: rawData.ssa_number || rawData.ssn || '',
    address: rawData.employee_address || '',
    
    // Employer
    employerName: rawData.employer_name || '',
    employerEIN: rawData.employee_fed_id_number || rawData.employer_ein || '',
    
    // Money (clean to numbers)
    wages: parseNumber(rawData.wages_tips_other_comp || rawData.reported_w2_wages),
    federalWithheld: parseNumber(rawData.federal_income_tax_withheld),
    socialSecurityWages: parseNumber(rawData.social_security_wages),
    socialSecurityWithheld: parseNumber(rawData.social_security_tax_withheld),
    medicareWages: parseNumber(rawData.medicare_wages),
    medicareWithheld: parseNumber(rawData.medicare_tax_withheld),
    stateWages: parseNumber(rawData.state_wages_tips),
    stateWithheld: parseNumber(rawData.state_income_tax),
    localWages: parseNumber(rawData.local_wages_tips),
    localWithheld: parseNumber(rawData.local_income_tax)
  };
}

// ============================================================
// PARSE RAW 1099-NEC DATA
// ============================================================
export function parse1099NECData(rawData) {
  return {
    payerName: rawData.payer_name || rawData.payer || '',
    payerEIN: rawData.payer_tin || '',
    recipientName: rawData.recipient_name || '',
    recipientSSN: rawData.recipient_tin || '',
    nonemployeeCompensation: parseNumber(rawData.nonemployee_compensation || rawData.box1),
    federalWithheld: parseNumber(rawData.federal_income_tax_withheld || rawData.box4)
  };
}

// ============================================================
// PARSE RAW 1099-INT DATA
// ============================================================
export function parse1099INTData(rawData) {
  return {
    payerName: rawData.payer_name || rawData.payer || '',
    interestIncome: parseNumber(rawData.interest_income || rawData.box1),
    earlyWithdrawalPenalty: parseNumber(rawData.early_withdrawal_penalty || rawData.box2),
    federalWithheld: parseNumber(rawData.federal_income_tax_withheld || rawData.box4)
  };
}

// ============================================================
// PARSE RAW 1099-DIV DATA
// ============================================================
export function parse1099DIVData(rawData) {
  return {
    payerName: rawData.payer_name || rawData.payer || '',
    ordinaryDividends: parseNumber(rawData.ordinary_dividends || rawData.box1a),
    qualifiedDividends: parseNumber(rawData.qualified_dividends || rawData.box1b),
    federalWithheld: parseNumber(rawData.federal_income_tax_withheld || rawData.box4)
  };
}

// ============================================================
// PARSE NUMBER HELPER
// ============================================================
function parseNumber(value) {
  if (value === null || value === undefined) return 0;
  const cleaned = String(value).replace(/[,$\s]/g, '');
  return parseFloat(cleaned) || 0;
}

// ============================================================
// BUILD CONFIRMATION QUESTIONS FOR DOCUMENT
// ============================================================
export function buildDocumentQuestions(document, parsedData) {
  const questions = [];
  const type = document.documentType;
  const num = document.documentNumber;
  const owner = document.owner === 'spouse' ? '(Spouse) ' : '';
  
  if (type === 'W-2') {
    // Name
    if (parsedData.name) {
      questions.push({
        field: 'name',
        question: `${owner}**W-2 #${num}** - Name: **${parsedData.name}**\n\nIs this correct?`,
        value: parsedData.name,
        line: 'Personal Info'
      });
    }
    
    // SSN
    if (parsedData.ssn) {
      const last4 = parsedData.ssn.slice(-4);
      questions.push({
        field: 'ssn',
        question: `${owner}**W-2 #${num}** - SSN ends in: **${last4}**\n\nIs this correct?`,
        value: parsedData.ssn,
        line: 'Personal Info'
      });
    }
    
    // Employer
    if (parsedData.employerName) {
      questions.push({
        field: 'employer',
        question: `${owner}**W-2 #${num}** - Employer: **${parsedData.employerName}**\n\nIs this correct?`,
        value: parsedData.employerName,
        line: 'Employer'
      });
    }
    
    // Wages (Line 1a)
    questions.push({
      field: 'wages',
      question: `${owner}**W-2 #${num}** - Wages (Box 1): **$${parsedData.wages.toLocaleString()}**\n\n→ Goes to Form 1040 **Line 1a**\n\nIs this correct?`,
      value: parsedData.wages,
      line: '1a'
    });
    
    // Federal Withheld (Line 25a)
    questions.push({
      field: 'federalWithheld',
      question: `${owner}**W-2 #${num}** - Federal Withheld (Box 2): **$${parsedData.federalWithheld.toLocaleString()}**\n\n→ Goes to Form 1040 **Line 25a**\n\nIs this correct?`,
      value: parsedData.federalWithheld,
      line: '25a'
    });
    
    // State withheld
    if (parsedData.stateWithheld > 0) {
      questions.push({
        field: 'stateWithheld',
        question: `${owner}**W-2 #${num}** - State Tax Withheld (Box 17): **$${parsedData.stateWithheld.toLocaleString()}**\n\nIs this correct?`,
        value: parsedData.stateWithheld,
        line: 'State'
      });
    }
    
  } else if (type === '1099-NEC') {
    // Payer
    if (parsedData.payerName) {
      questions.push({
        field: 'payer',
        question: `**1099-NEC #${num}** - Payer: **${parsedData.payerName}**\n\nIs this correct?`,
        value: parsedData.payerName,
        line: 'Payer'
      });
    }
    
    // Self-employment income (Schedule C)
    questions.push({
      field: 'nonemployeeCompensation',
      question: `**1099-NEC #${num}** - Income: **$${parsedData.nonemployeeCompensation.toLocaleString()}**\n\n→ Goes to **Schedule C** (Self-Employment)\n⚠️ Subject to ~15.3% self-employment tax\n\nIs this correct?`,
      value: parsedData.nonemployeeCompensation,
      line: 'Schedule C'
    });
    
  } else if (type === '1099-INT') {
    // Payer
    if (parsedData.payerName) {
      questions.push({
        field: 'payer',
        question: `**1099-INT #${num}** - Bank/Payer: **${parsedData.payerName}**\n\nIs this correct?`,
        value: parsedData.payerName,
        line: 'Payer'
      });
    }
    
    // Interest income (Line 2b)
    questions.push({
      field: 'interestIncome',
      question: `**1099-INT #${num}** - Interest: **$${parsedData.interestIncome.toLocaleString()}**\n\n→ Goes to Form 1040 **Line 2b**\n\nIs this correct?`,
      value: parsedData.interestIncome,
      line: '2b'
    });
    
  } else if (type === '1099-DIV') {
    // Payer
    if (parsedData.payerName) {
      questions.push({
        field: 'payer',
        question: `**1099-DIV #${num}** - Payer: **${parsedData.payerName}**\n\nIs this correct?`,
        value: parsedData.payerName,
        line: 'Payer'
      });
    }
    
    // Ordinary dividends (Line 3b)
    questions.push({
      field: 'ordinaryDividends',
      question: `**1099-DIV #${num}** - Ordinary Dividends: **$${parsedData.ordinaryDividends.toLocaleString()}**\n\n→ Goes to Form 1040 **Line 3b**\n\nIs this correct?`,
      value: parsedData.ordinaryDividends,
      line: '3b'
    });
    
    // Qualified dividends (Line 3a)
    if (parsedData.qualifiedDividends > 0) {
      questions.push({
        field: 'qualifiedDividends',
        question: `**1099-DIV #${num}** - Qualified Dividends: **$${parsedData.qualifiedDividends.toLocaleString()}**\n\n→ Goes to Form 1040 **Line 3a** (lower tax rate)\n\nIs this correct?`,
        value: parsedData.qualifiedDividends,
        line: '3a'
      });
    }
  }
  
  return questions;
}

// ============================================================
// BUILD 1040 SUMMARY MESSAGE
// ============================================================
export function build1040SummaryMessage(summary) {
  let msg = `\n📋 **FORM 1040 SUMMARY**\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  // Documents
  msg += `📄 **DOCUMENTS (${summary.documents.total})**\n`;
  if (summary.documents.w2 > 0) msg += `   W-2s: ${summary.documents.w2}\n`;
  if (summary.documents.nec1099 > 0) msg += `   1099-NECs: ${summary.documents.nec1099}\n`;
  if (summary.documents.int1099 > 0) msg += `   1099-INTs: ${summary.documents.int1099}\n`;
  
  // Income
  msg += `\n💰 **INCOME**\n`;
  if (summary.income.wages.total > 0) {
    msg += `   Line 1a - Wages: $${summary.income.wages.total.toLocaleString()}`;
    if (summary.income.wages.count > 1) msg += ` (${summary.income.wages.count} W-2s)`;
    msg += `\n`;
  }
  if (summary.income.interest.total > 0) {
    msg += `   Line 2b - Interest: $${summary.income.interest.total.toLocaleString()}\n`;
  }
  if (summary.income.dividends.total > 0) {
    msg += `   Line 3b - Dividends: $${summary.income.dividends.total.toLocaleString()}\n`;
  }
  if (summary.income.selfEmployment.total > 0) {
    msg += `   Schedule C - Self-Employment: $${summary.income.selfEmployment.total.toLocaleString()}\n`;
  }
  msg += `   **Line 9 - Total Income: $${summary.income.totalIncome.toLocaleString()}**\n`;
  
  // Tax calculation
  msg += `\n🧮 **TAX CALCULATION**\n`;
  msg += `   Standard Deduction: $${summary.tax.standardDeduction.toLocaleString()}\n`;
  msg += `   Taxable Income: $${summary.tax.taxableIncome.toLocaleString()}\n`;
  msg += `   Tax: $${summary.tax.taxFromTables.toLocaleString()}\n`;
  if (summary.tax.selfEmploymentTax > 0) {
    msg += `   Self-Employment Tax: $${summary.tax.selfEmploymentTax.toLocaleString()}\n`;
  }
  if (summary.tax.childTaxCredit > 0) {
    msg += `   Child Tax Credit: -$${summary.tax.childTaxCredit.toLocaleString()}\n`;
  }
  msg += `   **Total Tax: $${summary.tax.totalTax.toLocaleString()}**\n`;
  
  // Payments
  msg += `\n💵 **PAYMENTS**\n`;
  msg += `   Line 25a - W-2 Withholding: $${summary.withholding.federalW2.toLocaleString()}\n`;
  if (summary.withholding.federal1099 > 0) {
    msg += `   Line 25b - 1099 Withholding: $${summary.withholding.federal1099.toLocaleString()}\n`;
  }
  msg += `   **Total Payments: $${summary.withholding.total.toLocaleString()}**\n`;
  
  // Result
  msg += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  if (summary.result.refund > 0) {
    msg += `✅ **YOUR REFUND: $${summary.result.refund.toLocaleString()}** 🎉\n`;
  } else if (summary.result.owed > 0) {
    msg += `⚠️ **AMOUNT OWED: $${summary.result.owed.toLocaleString()}**\n`;
  } else {
    msg += `✅ **BALANCED: $0**\n`;
  }
  msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  
  return msg;
}

// ============================================================
// PARSE ADDRESS STRING
// ============================================================
export function parseAddress(addressString) {
  if (!addressString) return { street: '', city: '', state: '', zip: '' };
  
  // Try to parse "123 MAIN ST, ANYTOWN, CA 12345"
  const match = addressString.match(/^(.+?),\s*(.+?),\s*([A-Z]{2})\s*(\d{5})/);
  
  if (match) {
    return {
      street: match[1].trim(),
      city: match[2].trim(),
      state: match[3],
      zip: match[4]
    };
  }
  
  return { street: addressString, city: '', state: '', zip: '' };
}

export default {
  parseW2Data,
  parse1099NECData,
  parse1099INTData,
  parse1099DIVData,
  buildDocumentQuestions,
  build1040SummaryMessage,
  parseAddress
};
