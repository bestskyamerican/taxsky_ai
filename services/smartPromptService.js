// ============================================================
// SMART PROMPT SERVICE v9.2 - FIXED STATE TAX CALCULATION
// ============================================================
// FIXED: State tax now uses caTax field from fullCalculator
// FIXED: AI must use EXACT numbers from context
// ============================================================

// ============================================================
// LANGUAGE INSTRUCTIONS
// ============================================================
const languageInstructions = {
  en: `IMPORTANT: Always respond in English.`,
  vi: `QUAN TRỌNG: Luôn trả lời bằng TIẾNG VIỆT. Sử dụng ngôn ngữ đơn giản, dễ hiểu.`,
  es: `IMPORTANTE: Siempre responde en ESPAÑOL. Usa un lenguaje simple y fácil de entender.`
};

// ============================================================
// TRANSLATIONS
// ============================================================
const translations = {
  en: {
    greeting: "Hi! I'm TaxSky AI. What's your name?",
    niceMeet: "Nice to meet you, {name}! Ready to file your {year} taxes?",
    uploadPrompt: "📤 Please upload your W-2 or 1099 - I'll extract all your info automatically!",
    uploadDetails: "📤 **Upload your W-2 or 1099** and I'll automatically extract:\n• Your name & SSN\n• Address\n• Income & withholding\n\nJust drop your document here!",
    w2Success: "✅ Got your W-2! Here's what I found:",
    name: "Name",
    ssn: "SSN",
    address: "Address",
    employer: "Employer",
    wages: "Wages",
    federalWithheld: "Federal Withheld",
    stateWithheld: "State Withheld",
    isCorrect: "Is this correct?",
    filingStatusQ: "What's your filing status?",
    single: "Single",
    mfj: "Married Filing Jointly",
    mfs: "Married Filing Separately",
    hoh: "Head of Household",
    dependentsQ: "Do you have any dependents (children or others you support)?",
    taxSummary: "📊 Your Tax Summary:",
    income: "Income",
    federalTax: "Federal Tax",
    withheld: "Withheld",
    childTaxCredit: "Child Tax Credit",
    refund: "Refund",
    owed: "Amount Owed",
    generate1040: "Would you like me to generate your Form 1040?",
    welcomeBack: "👋 Welcome back, {name}!",
  },
  vi: {
    greeting: "Xin chào! Tôi là TaxSky AI. Bạn tên gì?",
    niceMeet: "Rất vui được gặp bạn, {name}! Sẵn sàng khai thuế năm {year} chưa?",
    uploadPrompt: "📤 Vui lòng tải lên W-2 hoặc 1099 - Tôi sẽ tự động trích xuất thông tin!",
    uploadDetails: "📤 **Tải lên W-2 hoặc 1099** và tôi sẽ tự động trích xuất:\n• Tên & Số An Sinh\n• Địa chỉ\n• Thu nhập & khấu trừ\n\nChỉ cần kéo thả tài liệu vào đây!",
    w2Success: "✅ Đã nhận W-2! Đây là thông tin tôi tìm thấy:",
    name: "Họ tên",
    ssn: "Số An Sinh",
    address: "Địa chỉ",
    employer: "Công ty",
    wages: "Lương",
    federalWithheld: "Thuế LB đã khấu trừ",
    stateWithheld: "Thuế TB đã khấu trừ",
    isCorrect: "Thông tin này đúng không?",
    filingStatusQ: "Tình trạng khai thuế của bạn là gì?",
    single: "Độc thân",
    mfj: "Vợ chồng khai chung",
    mfs: "Vợ chồng khai riêng",
    hoh: "Chủ hộ",
    dependentsQ: "Bạn có người phụ thuộc nào không (con cái hoặc người bạn nuôi dưỡng)?",
    taxSummary: "📊 Tổng Kết Thuế:",
    income: "Thu nhập",
    federalTax: "Thuế liên bang",
    withheld: "Đã khấu trừ",
    childTaxCredit: "Tín dụng trẻ em",
    refund: "Hoàn thuế",
    owed: "Số tiền nợ",
    generate1040: "Bạn có muốn tôi tạo Mẫu 1040 không?",
    welcomeBack: "👋 Chào mừng trở lại, {name}!",
  },
  es: {
    greeting: "¡Hola! Soy TaxSky AI. ¿Cómo te llamas?",
    niceMeet: "¡Mucho gusto, {name}! ¿Listo para presentar tus impuestos {year}?",
    uploadPrompt: "📤 Por favor sube tu W-2 o 1099 - ¡Extraeré toda tu información automáticamente!",
    uploadDetails: "📤 **Sube tu W-2 o 1099** y extraeré automáticamente:\n• Tu nombre y SSN\n• Dirección\n• Ingresos y retenciones\n\n¡Solo arrastra tu documento aquí!",
    w2Success: "✅ ¡Recibí tu W-2! Esto es lo que encontré:",
    name: "Nombre",
    ssn: "Seguro Social",
    address: "Dirección",
    employer: "Empleador",
    wages: "Salarios",
    federalWithheld: "Imp. Fed. Retenido",
    stateWithheld: "Imp. Est. Retenido",
    isCorrect: "¿Es correcta esta información?",
    filingStatusQ: "¿Cuál es tu estado civil tributario?",
    single: "Soltero/a",
    mfj: "Casado/a declarando juntos",
    mfs: "Casado/a declarando separado",
    hoh: "Jefe/a de familia",
    dependentsQ: "¿Tienes dependientes (hijos u otras personas que mantienes)?",
    taxSummary: "📊 Tu Resumen de Impuestos:",
    income: "Ingresos",
    federalTax: "Impuesto federal",
    withheld: "Retenido",
    childTaxCredit: "Crédito por hijos",
    refund: "Reembolso",
    owed: "Cantidad adeudada",
    generate1040: "¿Quieres que genere tu Formulario 1040?",
    welcomeBack: "👋 ¡Bienvenido/a de nuevo, {name}!",
  }
};

// ============================================================
// MAIN SYSTEM PROMPT
// ============================================================
export function getTaxSystemPrompt(taxYear = 2024, language = 'en') {
  const lang = language || 'en';
  const txt = translations[lang] || translations.en;
  const langInstruction = languageInstructions[lang] || languageInstructions.en;
  
  return `You are TaxSky AI, a smart and efficient tax assistant for ${taxYear} US taxes.

## LANGUAGE INSTRUCTION - CRITICAL!
${langInstruction}

## YOUR FLOW:

### PHASE 1: GREETING (if no name yet)
Ask: "${txt.greeting}"

When user gives their name (e.g., "John", "Ngo", "Maria Garcia"):
- ALWAYS extract it: { "first_name": "John" } or { "first_name": "Ngo" }
- Respond: "${txt.niceMeet.replace('{name}', '[their name]').replace('{year}', taxYear)}"
- Then ask to upload W-2

### PHASE 2: DOCUMENT UPLOAD
After greeting, ask: "${txt.uploadPrompt}"

### PHASE 3: INTERVIEW
Ask for: Filing status, dependents, spouse (if MFJ)

### PHASE 4: COMPLETE
Show tax summary using EXACT numbers from context. DO NOT calculate your own!

## ⚠️ CRITICAL: NAME EXTRACTION EXAMPLES

When you asked "What's your name?" and user responds:

User: "Ngo"
→ { "message": "Nice to meet you, Ngo!...", "extracted": { "first_name": "Ngo" } }

User: "John Smith"
→ { "message": "Nice to meet you, John!...", "extracted": { "first_name": "John", "last_name": "Smith" } }

## RESPONSE FORMAT (ALWAYS JSON!)
{
  "message": "Your response IN ${lang === 'vi' ? 'VIETNAMESE' : lang === 'es' ? 'SPANISH' : 'ENGLISH'}",
  "extracted": { "field_name": "value" },
  "phase": "greeting|document_request|interview|complete"
}

## RULES:
1. ALWAYS respond in ${lang === 'vi' ? 'VIETNAMESE' : lang === 'es' ? 'SPANISH' : 'ENGLISH'}
2. ALWAYS extract data when user provides it
3. Ask ONE question at a time
4. NEVER ask for info already on W-2
5. ⚠️ WHEN SHOWING TAX SUMMARY: Use EXACT numbers from context! Do NOT calculate your own!
`;
}

// ============================================================
// BUILD CONTEXT PROMPT - ✅ FIXED STATE TAX FIELD NAME
// ============================================================
export function buildContextPrompt(userData, taxCalc, language = 'en') {
  const u = userData || {};
  const lang = language || 'en';
  const txt = translations[lang] || translations.en;
  
  const hasW2 = u.total_wages > 0;
  const hasFilingStatus = u.filing_status;
  const depCount = parseInt(u.dependent_count) || 0;
  
  let phase = "greeting";
  let nextAction = "Ask for user's name";
  
  if (!u.first_name) {
    phase = "greeting";
    nextAction = "Ask for user's name, then EXTRACT it from their response";
  } else if (!hasW2) {
    phase = "document_request";
    nextAction = "Ask user to upload W-2 or 1099";
  } else if (!hasFilingStatus) {
    phase = "interview";
    nextAction = "Ask for filing status";
  } else if (u.has_dependents === undefined) {
    phase = "interview";
    nextAction = "Ask if user has dependents";
  } else {
    phase = "complete";
    nextAction = "Show tax summary using EXACT numbers below";
  }
  
  // ============================================================
  // ✅ FIXED: Calculate federal refund/owed
  // Federal Withheld = ONLY Box 2 (total_withheld)
  // ============================================================
  const fedTax = taxCalc?.federalTax || 0;
  const fedWithheld = Number(u.total_withheld) || 0;  // Box 2 ONLY!
  const ctc = taxCalc?.childTaxCredit || 0;
  const fedNet = fedWithheld + ctc - fedTax;
  
  // ============================================================
  // ✅ FIXED: State tax uses caTax (from fullCalculator)
  // State Withheld = ONLY Box 17 (total_state_withheld)
  // ============================================================
  const stateTax = taxCalc?.caTax || taxCalc?.caTaxOwed || 0;
  const stateWithheld = Number(u.total_state_withheld) || 0;  // Box 17 ONLY!
  const stateNet = stateWithheld - stateTax;
  
  // Total
  const totalNet = fedNet + stateNet;
  
  return `
## ⚠️ RESPOND IN ${lang === 'vi' ? 'VIETNAMESE' : lang === 'es' ? 'SPANISH' : 'ENGLISH'}!

## CURRENT PHASE: ${phase.toUpperCase()}
## NEXT ACTION: ${nextAction}

## USER DATA:
- Name: ${u.first_name ? u.first_name + ' ' + (u.last_name || '') : '❌ NOT SET'}
- SSN: ${u.ssn ? '***-**-' + String(u.ssn).slice(-4) : '❌ NOT SET'}
- Filing Status: ${u.filing_status || '❌ Not set'}
- Dependents: ${u.has_dependents === 'yes' ? depCount : (u.has_dependents === 'no' ? 'None' : '❌ Not asked')}

## W-2 DATA (FROM OCR - THESE ARE CORRECT):
- Wages (Box 1): $${Number(u.total_wages || 0).toLocaleString()}
- Federal Withheld (Box 2): $${fedWithheld.toLocaleString()}
- State Withheld (Box 17): $${stateWithheld.toLocaleString()}

## ═══════════════════════════════════════════════════════════
## ⚠️ TAX CALCULATION - USE THESE EXACT NUMBERS IN YOUR RESPONSE!
## ═══════════════════════════════════════════════════════════

**FEDERAL:**
- Taxable Income: $${(taxCalc?.taxableIncome || 0).toLocaleString()}
- Federal Tax: $${fedTax.toLocaleString()}
- Federal Withheld: $${fedWithheld.toLocaleString()}
- Child Tax Credit: $${ctc.toLocaleString()}
- Federal ${fedNet >= 0 ? 'Refund' : 'Owed'}: ${fedNet >= 0 ? '💚' : '❌'} $${Math.abs(fedNet).toLocaleString()}

**STATE (${u.state || 'CA'}):**
- State Taxable Income: $${(taxCalc?.caTaxableIncome || 0).toLocaleString()}
- State Tax: $${stateTax.toLocaleString()}
- State Withheld: $${stateWithheld.toLocaleString()}
- State ${stateNet >= 0 ? 'Refund' : 'Owed'}: ${stateNet >= 0 ? '💚' : '❌'} $${Math.abs(stateNet).toLocaleString()}

**═══════════════════════════════════════════════════════════**
**TOTAL ${totalNet >= 0 ? 'REFUND' : 'OWED'}: ${totalNet >= 0 ? '💚' : '❌'} $${Math.abs(totalNet).toLocaleString()}**
**═══════════════════════════════════════════════════════════**

${phase === 'complete' ? `
⚠️⚠️⚠️ CRITICAL INSTRUCTION ⚠️⚠️⚠️
When showing tax summary, you MUST copy the EXACT numbers above!
DO NOT calculate your own numbers!
DO NOT add SS tax or Medicare tax to withholding!
Federal Withheld is ONLY Box 2 = $${fedWithheld.toLocaleString()}
State Tax is $${stateTax.toLocaleString()} (NOT $0!)
` : ''}

${!u.first_name ? `
⚠️ User has no name yet! If they gave their name, extract it.
` : ''}
`;
}

// ============================================================
// WELCOME PROMPT
// ============================================================
export function getWelcomePrompt(userName, hasExistingData, userData, language = 'en') {
  const lang = language || 'en';
  const txt = translations[lang] || translations.en;
  
  if (!userName && !userData?.first_name) {
    return `👋 ${txt.greeting}`;
  }
  
  const name = userData?.first_name || userName || '';
  return `${txt.welcomeBack.replace('{name}', name)}

${txt.uploadDetails}`;
}

// ============================================================
// DOCUMENT UPLOAD RESPONSE
// ============================================================
export function getDocumentUploadPrompt(formType, extractedData, language = 'en') {
  const lang = language || 'en';
  const txt = translations[lang] || translations.en;
  const notFound = lang === 'vi' ? 'Không tìm thấy' : lang === 'es' ? 'No encontrado' : 'Not found';
  
  let name = extractedData.employee_name || '';
  if (!name && extractedData.employee_first_name) {
    name = extractedData.employee_first_name + ' ' + (extractedData.employee_last_name || '');
  }
  name = name.trim() || notFound;
  
  const ssn = extractedData.employee_ssn 
    ? '***-**-' + String(extractedData.employee_ssn).replace(/-/g, '').slice(-4) 
    : notFound;
  
  const wages = Number(extractedData.wages_tips_other_comp || 0);
  const fedWithheld = Number(extractedData.federal_income_tax_withheld || 0);
  const stateWithheld = Number(extractedData.state_income_tax || 0);
  
  return `✅ **${formType} Uploaded!**

👤 **${txt.name}:** ${name}
🔢 **${txt.ssn}:** ${ssn}
💰 **${txt.wages}:** $${wages.toLocaleString()}
💵 **${txt.federalWithheld}:** $${fedWithheld.toLocaleString()}
🏛️ **${txt.stateWithheld}:** $${stateWithheld.toLocaleString()}

**${txt.isCorrect}**`;
}

// ============================================================
// TAX RESULT PROMPT
// ============================================================
export function getTaxResultPrompt(taxCalc, userData, language = 'en') {
  const lang = language || 'en';
  const txt = translations[lang] || translations.en;
  
  const u = userData || {};
  const fedTax = taxCalc?.federalTax || 0;
  const fedWithheld = Number(u.total_withheld) || 0;
  const ctc = taxCalc?.childTaxCredit || 0;
  const fedNet = fedWithheld + ctc - fedTax;
  
  const stateTax = taxCalc?.caTax || 0;
  const stateWithheld = Number(u.total_state_withheld) || 0;
  const stateNet = stateWithheld - stateTax;
  
  const totalNet = fedNet + stateNet;
  
  return `${txt.taxSummary}

**Federal:**
• Taxable Income: $${(taxCalc?.taxableIncome || 0).toLocaleString()}
• ${txt.federalTax}: $${fedTax.toLocaleString()}
• ${txt.withheld}: $${fedWithheld.toLocaleString()}
${ctc > 0 ? `• ${txt.childTaxCredit}: $${ctc.toLocaleString()}\n` : ''}• Federal ${fedNet >= 0 ? txt.refund : txt.owed}: ${fedNet >= 0 ? '💚' : '❌'} $${Math.abs(fedNet).toLocaleString()}

**State (${u.state || 'CA'}):**
• State Tax: $${stateTax.toLocaleString()}
• State ${txt.withheld}: $${stateWithheld.toLocaleString()}
• State ${stateNet >= 0 ? txt.refund : txt.owed}: ${stateNet >= 0 ? '💚' : '❌'} $${Math.abs(stateNet).toLocaleString()}

**TOTAL ${totalNet >= 0 ? txt.refund.toUpperCase() : txt.owed.toUpperCase()}: ${totalNet >= 0 ? '💚' : '❌'} $${Math.abs(totalNet).toLocaleString()}**

${txt.generate1040}`;
}

// ============================================================
// FORMAT FILING STATUS
// ============================================================
export function formatFilingStatus(status, language = 'en') {
  const txt = translations[language] || translations.en;
  const map = {
    'single': txt.single,
    'married_filing_jointly': txt.mfj,
    'married_filing_separately': txt.mfs,
    'head_of_household': txt.hoh,
  };
  return map[status?.toLowerCase()] || status;
}

export default {
  getTaxSystemPrompt,
  buildContextPrompt,
  getWelcomePrompt,
  getDocumentUploadPrompt,
  getTaxResultPrompt,
  formatFilingStatus
};