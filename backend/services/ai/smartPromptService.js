// ============================================================
// SMART PROMPT SERVICE v16.0 - Uses form1040Validator
// ============================================================
// Location: backend/services/smartPromptService.js
// ============================================================

import { t, getText, SUPPORTED_LANGUAGES } from './i18n.js';
export { formatFilingStatus } from './i18n.js';

export {
  validateRequiredFields,
  getCompletionStatus,
  getIncomeSummary,
  INCOME_FORMS,
  REQUIRED_FIELDS
} from '../tax/form1040Validator.js';

import {
  validateRequiredFields,
  getCompletionStatus,
  getIncomeSummary,
  INCOME_FORMS,
  REQUIRED_FIELDS,
  getFormDescription
} from '../tax/form1040Validator.js';

import { formatFilingStatus } from './i18n.js';

// ============================================================
// GET NEXT QUESTION - Based on what's missing
// ============================================================
export function getNextQuestion(userData, language = 'en') {
  const u = userData || {};
  const lang = language;
  const missing = validateRequiredFields(u, lang);
  const income = getIncomeSummary(u);
  
  if (missing.length === 0) {
    return {
      complete: true,
      message: lang === 'vi' ? "✅ Đầy đủ thông tin! Sẵn sàng tạo Form 1040." :
               lang === 'es' ? "✅ ¡Información completa! Listo para Form 1040." :
               "✅ All information complete! Ready for Form 1040."
    };
  }
  
  // ============================================================
  // PRIORITY 1: INCOME FIRST! (W-2, 1099, SSA-1099)
  // Name, SSN, address come FROM these forms
  // ============================================================
  if (!income.hasIncome) {
    return {
      complete: false,
      field: 'income',
      needsUpload: true,
      message: lang === 'vi' 
        ? `📤 Để bắt đầu, vui lòng tải lên tài liệu thu nhập của bạn:\n• W-2 (thu nhập từ việc làm)\n• 1099-NEC (tự kinh doanh)\n• 1099-INT (tiền lãi)\n• 1099-DIV (cổ tức)\n• SSA-1099 (An Sinh Xã Hội)\n• 1099-R (hưu trí)`
        : lang === 'es'
        ? `📤 Para comenzar, sube tus documentos de ingresos:\n• W-2 (empleo)\n• 1099-NEC (trabajo independiente)\n• 1099-INT (intereses)\n• 1099-DIV (dividendos)\n• SSA-1099 (Seguro Social)\n• 1099-R (jubilación)`
        : `📤 To get started, please upload your income documents:\n• W-2 (employment)\n• 1099-NEC (self-employment)\n• 1099-INT (interest)\n• 1099-DIV (dividends)\n• SSA-1099 (Social Security)\n• 1099-R (retirement)`
    };
  }
  
  // ============================================================
  // PRIORITY 2: If has income but missing name/SSN, ask for it
  // (This only happens if they uploaded 1099-INT/DIV without W-2)
  // ============================================================
  if (!u.first_name) {
    // Check if they have W-2 - if so, name should be extracted
    if (income.sources.w2.has) {
      // W-2 should have provided name - something went wrong
      return { complete: false, field: 'first_name', message: lang === 'vi' ? "Tên trên W-2 của bạn là gì?" : "What is the name on your W-2?" };
    }
    // No W-2, only 1099-INT/DIV - need to ask for name
    return { complete: false, field: 'first_name', message: lang === 'vi' ? "Tên của bạn là gì?" : lang === 'es' ? "¿Cuál es tu nombre?" : "What is your name?" };
  }
  
  // Priority 3: Filing status
  if (!u.filing_status) {
    return {
      complete: false,
      field: 'filing_status',
      message: lang === 'vi'
        ? "Tình trạng khai thuế của bạn?\n• Độc thân (Single)\n• Vợ chồng khai chung (MFJ)\n• Vợ chồng khai riêng (MFS)\n• Chủ hộ (HOH)"
        : lang === 'es'
        ? "¿Tu estado civil tributario?\n• Soltero\n• Casado en conjunto\n• Casado separado\n• Jefe de familia"
        : "What is your filing status?\n• Single\n• Married Filing Jointly\n• Married Filing Separately\n• Head of Household"
    };
  }
  
  // Priority 4: Spouse income (if MFJ) - ask BEFORE other spouse details
  if (u.filing_status === 'married_filing_jointly') {
    // Check if we've asked about spouse income yet
    if (u.spouse_has_income === undefined) {
      return {
        complete: false,
        field: 'spouse_income',
        message: lang === 'vi'
          ? "Vợ/chồng của bạn có thu nhập không? Nếu có, vui lòng tải lên W-2 hoặc 1099 của họ."
          : lang === 'es'
          ? "¿Tu cónyuge tiene ingresos? Si es así, sube su W-2 o 1099."
          : "Does your spouse have income? If yes, please upload their W-2 or other income documents."
      };
    }
    
    // Spouse has income but no W-2 uploaded for them - ask for name at minimum
    if (u.spouse_has_income === 'yes' && !u.spouse_first_name && !income.sources.w2.spouse) {
      return { 
        complete: false, 
        field: 'spouse_first_name', 
        message: lang === 'vi' ? "Tên vợ/chồng của bạn?" : lang === 'es' ? "¿Nombre de tu cónyuge?" : "What is your spouse's name?" 
      };
    }
  }
  
  // Priority 5: Dependents - BEFORE DOB (more important for tax calculation)
  if (u.has_dependents === undefined) {
    return {
      complete: false,
      field: 'has_dependents',
      message: lang === 'vi'
        ? "Bạn có người phụ thuộc không (con cái hoặc người thân đủ điều kiện)?"
        : lang === 'es'
        ? "¿Tienes dependientes (hijos o familiares que califiquen)?"
        : "Do you have any dependents (children or qualifying relatives)?"
    };
  }
  
  // Priority 6: Dependent details if they have dependents
  if (u.has_dependents === 'yes' && (!u.dependent_count || u.dependent_count < 1)) {
    return {
      complete: false,
      field: 'dependent_count',
      message: lang === 'vi'
        ? "Bạn có bao nhiêu người phụ thuộc?"
        : lang === 'es'
        ? "¿Cuántos dependientes tienes?"
        : "How many dependents do you have?"
    };
  }
  
  // Get dependent details
  if (u.has_dependents === 'yes' && u.dependent_count > 0) {
    for (let i = 1; i <= u.dependent_count; i++) {
      if (!u[`dependent_${i}_name`]) {
        return {
          complete: false,
          field: `dependent_${i}_name`,
          message: lang === 'vi'
            ? `Thông tin người phụ thuộc ${i}: Họ tên, tuổi, và số ASXH?\n(Ví dụ: "Nguyễn Văn A, 10, 123-45-6789")`
            : lang === 'es'
            ? `Info del dependiente ${i}: Nombre, edad y SSN?\n(Ej: "Juan Pérez, 10, 123-45-6789")`
            : `Dependent ${i} information: Name, age, and SSN?\n(Example: "John Smith, 10, 123-45-6789")`
        };
      }
    }
  }
  
  // Priority 7: Date of Birth (accepts multiple formats)
  if (!u.date_of_birth) {
    return {
      complete: false,
      field: 'date_of_birth',
      message: lang === 'vi'
        ? "Ngày sinh của bạn?\n(Ví dụ: 15/06/1985 hoặc 06/15/1985)"
        : lang === 'es'
        ? "¿Tu fecha de nacimiento?\n(Ejemplo: 15/06/1985 o 06/15/1985)"
        : "What is your date of birth?\n(Example: 06/15/1985 or 15/06/1985)"
    };
  }
  
  // Priority 8: Spouse SSN (if MFJ and spouse has income)
  if (u.filing_status === 'married_filing_jointly' && u.spouse_has_income === 'yes') {
    if (u.spouse_first_name && !u.spouse_ssn) {
      return { complete: false, field: 'spouse_ssn', message: lang === 'vi' ? `SSN của ${u.spouse_first_name}?` : lang === 'es' ? `¿SSN de ${u.spouse_first_name}?` : `What is ${u.spouse_first_name}'s SSN?` };
    }
  }
  
  // ✅ All required fields collected!
  // Default
  return { complete: false, field: missing[0]?.key || 'complete', message: missing[0] ? `Please provide: ${missing[0].label}` : "✅ All information complete!" };
}

// ============================================================
// GET MISSING FIELDS (alias for validateRequiredFields)
// ============================================================
export function getMissingFields(userData, language = 'en') {
  return validateRequiredFields(userData, language);
}

// ============================================================
// MAIN SYSTEM PROMPT
// ============================================================
export function getTaxSystemPrompt(taxYear = 2024, language = 'en') {
  const lang = SUPPORTED_LANGUAGES.includes(language) ? language : 'en';
  const langName = { en: 'ENGLISH', vi: 'TIẾNG VIỆT', es: 'ESPAÑOL' }[lang] || 'ENGLISH';
  
  let langEnforce = lang === 'vi' ? `🚨 BẮT BUỘC: TRẢ LỜI BẰNG TIẾNG VIỆT! 🚨` : lang === 'es' ? `🚨 ¡RESPONDE EN ESPAÑOL! 🚨` : '';
  
  const formList = Object.entries(INCOME_FORMS).map(([code, info]) => `• ${code} → Line ${info.line}`).join('\n');

  return `${langEnforce}

You are TaxSky AI for ${taxYear} US taxes. RESPOND IN ${langName} ONLY!

## 🚨 CRITICAL: INCOME DOCUMENTS FIRST! 🚨
ALWAYS ask for income documents (W-2, 1099, SSA-1099) BEFORE asking for name!
Name, SSN, and address come FROM the W-2. DO NOT ask for these manually.

## CORRECT FLOW:
1. Ask to upload income documents (W-2, 1099, SSA-1099)
2. Extract name, SSN, address, wages FROM uploaded forms
3. Ask for filing status (user must provide)
4. If MFJ, ask if spouse has income → upload spouse's W-2
5. Ask about dependents (for Child Tax Credit)
6. Complete → Show tax summary

## SUPPORTED INCOME FORMS:
${formList}

## WHAT FORMS PROVIDE (auto-extracted, DO NOT ask!):
• W-2: Name, SSN, address, wages, withholding
• 1099-NEC: Self-employment income (SE tax 15.3%)
• 1099-INT: Interest income
• 1099-DIV: Dividend income
• 1099-B: Capital gains/losses
• 1099-R: Retirement distributions
• SSA-1099: Social Security benefits
• 1099-G: Unemployment

## USER MUST PROVIDE (ask for these AFTER income uploaded):
• Filing status (single, MFJ, MFS, HOH)
• Dependents info (name, SSN, age for CTC)

## EXTRACTION FORMAT:
"married filing jointly" → { "extracted": { "filing_status": "married_filing_jointly" } }
"vợ chồng khai chung" → { "extracted": { "filing_status": "married_filing_jointly" } }
"yes 2 kids" → { "extracted": { "has_dependents": "yes", "dependent_count": 2 } }
"John, 5, SSN 123-45-6789" → { "extracted": { "dependent_1_name": "John", "dependent_1_age": 5, "dependent_1_ssn": "123456789", "dependent_1_under_17": "yes" } }

## FILING STATUS VALUES:
- single / độc thân / soltero
- married_filing_jointly / vợ chồng khai chung / casado en conjunto
- married_filing_separately / vợ chồng khai riêng / casado separado
- head_of_household / chủ hộ / jefe de familia

## CHILD TAX CREDIT: Under 17 = $2,000 per child. ALWAYS get age!

## RESPONSE FORMAT:
{ "message": "...", "extracted": {}, "phase": "document_request|collecting|complete" }

🚨 ALL RESPONSES IN ${langName}! 🚨`;
}

// ============================================================
// BUILD CONTEXT PROMPT
// ============================================================
export function buildContextPrompt(userData, taxCalc, language = 'en') {
  const u = userData || {};
  const lang = SUPPORTED_LANGUAGES.includes(language) ? language : 'en';
  const langName = { en: 'ENGLISH', vi: 'TIẾNG VIỆT', es: 'ESPAÑOL' }[lang] || 'ENGLISH';
  
  const status = getCompletionStatus(u, lang);
  const nextQ = getNextQuestion(u, lang);
  const income = status.incomeSummary;
  
  let phase = !income.hasIncome ? 'document_request' : status.isComplete ? 'complete' : 'collecting';
  let langRemind = lang === 'vi' ? '🚨 TRẢ LỜI BẰNG TIẾNG VIỆT! 🚨' : lang === 'es' ? '🚨 ¡RESPONDE EN ESPAÑOL! 🚨' : '';

  // Income lines
  const incomeLines = income.activeSources.map(s => `✅ ${s.form}: $${s.amount.toLocaleString()}`);

  return `${langRemind}

## PROGRESS: ${status.percent}% | PHASE: ${phase.toUpperCase()}

## 🚨 INCOME DOCUMENTS (MUST HAVE FIRST):
${incomeLines.length > 0 ? incomeLines.join('\n') : '❌ NO INCOME YET - Ask user to upload W-2, 1099, SSA-1099!'}
${income.hasIncome ? `Total: $${income.totalIncome.toLocaleString()}` : ''}

## PERSONAL INFO (from W-2):
- Name: ${u.first_name ? `${u.first_name} ${u.last_name || ''} ✅` : income.hasIncome ? '⚠️ Need to extract from form' : '⏳ Waiting for W-2'}
- SSN: ${u.ssn ? '✅' : income.hasIncome ? '⚠️ Need to extract' : '⏳ Waiting for W-2'}
- Address: ${u.address ? `${u.city}, ${u.state} ✅` : '⏳ Waiting for W-2'}

## USER-PROVIDED INFO:
- Filing Status: ${u.filing_status ? formatFilingStatus(u.filing_status, lang) + ' ✅' : income.hasIncome ? '❌ ASK NOW!' : '⏳ After income'}
- Dependents: ${u.has_dependents === 'yes' ? `✅ ${u.dependent_count || '?'}` : u.has_dependents === 'no' ? '✅ None' : income.hasIncome ? '❌ ASK!' : '⏳ After income'}

## TAX ESTIMATE:
- Tax: $${(taxCalc?.federalTax || 0).toLocaleString()}
- Withheld: $${(taxCalc?.withholding || 0).toLocaleString()}
- CTC: $${(taxCalc?.childTaxCredit || 0).toLocaleString()}
- ${(taxCalc?.estimatedRefund || 0) >= 0 ? '✅ REFUND' : '❌ OWED'}: $${Math.abs(taxCalc?.estimatedRefund || 0).toLocaleString()}

## 🎯 NEXT ACTION: ${nextQ.message}

${phase === 'document_request' ? '⚠️ DO NOT ask for name! Ask for income documents!' : ''}
${langRemind}`;
}

// ============================================================
// GET WELCOME MESSAGE
// ============================================================
export function getWelcomeMessage(userData, language = 'en', taxYear = 2024) {
  const lang = SUPPORTED_LANGUAGES.includes(language) ? language : 'en';
  const txt = t(lang);
  const u = userData || {};
  const status = getCompletionStatus(u, lang);
  const nextQ = getNextQuestion(u, lang);
  
  // ============================================================
  // NEW USER - Always ask for income documents FIRST
  // ============================================================
  if (!status.hasIncome) {
    return {
      message: lang === 'vi' 
        ? "👋 Xin chào! Tôi là TaxSky AI.\n\n📤 Để bắt đầu, vui lòng tải lên tài liệu thu nhập của bạn:\n• W-2 (thu nhập từ việc làm)\n• 1099-NEC (tự kinh doanh)\n• 1099-INT (tiền lãi)\n• 1099-DIV (cổ tức)\n• SSA-1099 (An Sinh Xã Hội)\n• 1099-R (hưu trí)"
        : lang === 'es'
        ? "👋 ¡Hola! Soy TaxSky AI.\n\n📤 Para comenzar, sube tus documentos de ingresos:\n• W-2 (empleo)\n• 1099-NEC (trabajo independiente)\n• 1099-INT (intereses)\n• SSA-1099 (Seguro Social)"
        : "👋 Hi! I'm TaxSky AI.\n\n📤 To get started, please upload your income documents:\n• W-2 (employment)\n• 1099-NEC (self-employment)\n• 1099-INT (interest)\n• 1099-DIV (dividends)\n• SSA-1099 (Social Security)\n• 1099-R (retirement)",
      phase: 'document_request',
      completion: 0,
      needsUpload: true
    };
  }
  
  // Has income - check if complete
  if (status.isComplete) {
    return { message: `${txt.welcomeBack || '👋 Welcome'}, ${u.first_name}!`, phase: 'complete', completion: 100 };
  }
  
  // Has income but needs more info
  return {
    message: lang === 'vi' 
      ? `👋 Chào ${u.first_name || 'bạn'}! (${status.percent}%)\n\n${nextQ.message}` 
      : `👋 Hi ${u.first_name || 'there'}! (${status.percent}%)\n\n${nextQ.message}`,
    phase: 'collecting',
    completion: status.percent
  };
}

// ============================================================
// TAX SUMMARY MESSAGE
// ============================================================
export function getTaxSummaryMessage(taxCalc, userData, language = 'en', taxYear = 2024) {
  const lang = SUPPORTED_LANGUAGES.includes(language) ? language : 'en';
  const u = userData || {};
  const income = getIncomeSummary(u);
  
  const fedTax = taxCalc?.federalTax || 0;
  const stateTax = taxCalc?.caTax || taxCalc?.stateTax || 0;
  const fedWith = taxCalc?.withholding || 0;
  const stateWith = taxCalc?.stateWithholding || 0;
  const ctc = taxCalc?.childTaxCredit || 0;
  const fedNet = fedWith + ctc - fedTax;
  const stateNet = stateWith - stateTax;
  const total = fedNet + stateNet;
  
  const refund = lang === 'vi' ? 'Hoàn thuế' : lang === 'es' ? 'Reembolso' : 'Refund';
  const owed = lang === 'vi' ? 'Nợ' : lang === 'es' ? 'Adeudo' : 'Owed';
  
  let msg = `📊 **${taxYear} ${lang === 'vi' ? 'Tóm Tắt' : 'Tax Summary'}**\n\n`;
  
  // Income breakdown
  msg += `**${lang === 'vi' ? 'Thu nhập' : 'Income'}:**\n`;
  for (const src of income.activeSources) {
    msg += `• ${src.form}: $${src.amount.toLocaleString()}\n`;
  }
  msg += `• **Total**: $${income.totalIncome.toLocaleString()}\n\n`;
  
  // Federal
  msg += `**Federal:**\n• Tax: $${fedTax.toLocaleString()}\n• Withheld: $${fedWith.toLocaleString()}\n`;
  if (ctc > 0) msg += `• 👶 CTC: $${ctc.toLocaleString()}\n`;
  msg += `• ${fedNet >= 0 ? '✅ ' + refund : '❌ ' + owed}: $${Math.abs(fedNet).toLocaleString()}\n\n`;
  
  // State
  msg += `**State (${u.state || 'CA'}):**\n• Tax: $${stateTax.toLocaleString()}\n• Withheld: $${stateWith.toLocaleString()}\n`;
  msg += `• ${stateNet >= 0 ? '✅ ' + refund : '❌ ' + owed}: $${Math.abs(stateNet).toLocaleString()}\n\n`;
  
  // Total
  msg += `**TOTAL:** ${total >= 0 ? '✅' : '❌'} $${Math.abs(total).toLocaleString()} ${total >= 0 ? refund : owed}`;
  
  return msg;
}

// ============================================================
// DOCUMENT UPLOAD MESSAGE
// ============================================================
export function getDocumentUploadMessage(formType, data, language = 'en') {
  const lang = SUPPORTED_LANGUAGES.includes(language) ? language : 'en';
  const formInfo = INCOME_FORMS[formType] || { name: formType };
  
  let msg = lang === 'vi' ? `✅ **${formType} đã tải lên!**\n\n` : `✅ **${formType} Uploaded!**\n\n`;
  
  if (formType === 'W-2') {
    const name = data.employee_name || `${data.employee_first_name || ''} ${data.employee_last_name || ''}`.trim();
    const ssn = data.employee_ssn ? '***-**-' + String(data.employee_ssn).replace(/-/g, '').slice(-4) : 'N/A';
    msg += `👤 ${name}\n🔢 SSN: ${ssn}\n💰 Wages: $${Number(data.wages_tips_other_comp || 0).toLocaleString()}\n💵 Withheld: $${Number(data.federal_income_tax_withheld || 0).toLocaleString()}`;
  } else if (formType === '1099-NEC') {
    msg += `💼 Self-Employment: $${Number(data.nonemployee_compensation || 0).toLocaleString()}\n⚠️ SE Tax: 15.3%`;
  } else if (formType === '1099-INT') {
    msg += `🏦 Interest: $${Number(data.interest_income || 0).toLocaleString()}`;
  } else if (formType === '1099-DIV') {
    msg += `📈 Dividends: $${Number(data.total_ordinary_dividends || 0).toLocaleString()}`;
  } else if (formType === 'SSA-1099') {
    msg += `🏛️ Social Security: $${Number(data.net_benefits || 0).toLocaleString()}`;
  } else if (formType === '1099-R') {
    msg += `🏦 Retirement: $${Number(data.taxable_amount || data.gross_distribution || 0).toLocaleString()}`;
  } else if (formType === '1099-G') {
    msg += `📋 Unemployment: $${Number(data.unemployment_compensation || 0).toLocaleString()}`;
  } else if (formType === '1099-B') {
    msg += `📈 Capital Gains: $${Number(data.gain_loss || 0).toLocaleString()}`;
  }
  
  msg += lang === 'vi' ? '\n\n✅ Đúng chưa?' : '\n\n✅ Is this correct?';
  return msg;
}

// ============================================================
// GET POST-UPLOAD PROMPT - After document is confirmed
// ============================================================
export function getPostUploadPrompt(userData, language = 'en') {
  const u = userData || {};
  const lang = language;
  const income = getIncomeSummary(u);
  
  // If user just confirmed a document and has income, move to next step
  if (income.hasIncome) {
    const nextQ = getNextQuestion(u, lang);
    
    if (nextQ.complete) {
      return {
        message: lang === 'vi' ? "✅ Đầy đủ thông tin! Sẵn sàng tạo Form 1040." :
                 lang === 'es' ? "✅ ¡Información completa!" :
                 "✅ All information complete! Ready to generate Form 1040.",
        phase: 'complete'
      };
    }
    
    // Don't ask for income again - we have it!
    if (nextQ.field === 'income' || nextQ.needsUpload) {
      // Skip to filing status if we have income
      if (!u.filing_status) {
        return {
          message: lang === 'vi'
            ? `✅ Tuyệt vời! Tôi đã nhận được thông tin thu nhập của bạn.\n\nBây giờ, tình trạng khai thuế của bạn là gì?\n• Độc thân (Single)\n• Vợ chồng khai chung (Married Filing Jointly)\n• Vợ chồng khai riêng (Married Filing Separately)\n• Chủ hộ (Head of Household)`
            : lang === 'es'
            ? `✅ ¡Excelente! Tengo tu información de ingresos.\n\n¿Cuál es tu estado civil tributario?\n• Soltero\n• Casado declarando en conjunto\n• Casado declarando por separado\n• Jefe de familia`
            : `✅ Great! I have your income information.\n\nNow, what is your filing status?\n• Single\n• Married Filing Jointly\n• Married Filing Separately\n• Head of Household`,
          field: 'filing_status',
          phase: 'collecting'
        };
      }
    }
    
    return {
      message: nextQ.message,
      field: nextQ.field,
      phase: 'collecting'
    };
  }
  
  // No income yet - ask for upload
  return getWelcomeMessage(u, lang);
}

// ============================================================
// DEFAULT EXPORT
// ============================================================
export default {
  getTaxSystemPrompt,
  buildContextPrompt,
  getWelcomeMessage,
  getTaxSummaryMessage,
  getDocumentUploadMessage,
  getMissingFields,
  getNextQuestion,
  getCompletionStatus,
  getIncomeSummary,
  validateRequiredFields,
  getPostUploadPrompt,  // ✅ NEW!
  INCOME_FORMS,
  REQUIRED_FIELDS,
  formatFilingStatus
};