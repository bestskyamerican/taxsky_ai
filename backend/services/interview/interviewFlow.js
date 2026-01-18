// ============================================================
// INTERVIEW FLOW v3.0 - Complete Step Definitions
// ============================================================
// File: backend/services/interview/interviewFlow.js
//
// This file defines ALL interview steps in order.
// The controller uses this to determine what to ask next.
// ============================================================

// ============================================================
// INTERVIEW STEPS - Complete Definition
// ============================================================
export const INTERVIEW_STEPS = [
  // ══════════════════════════════════════════════════════════
  // SECTION 1: FILING STATUS
  // ══════════════════════════════════════════════════════════
  {
    key: "filing_status",
    section: "filing",
    phase: "filing_status",
    question: {
      en: `📋 **What is your filing status for 2025?**\n\n• Single\n• Married Filing Jointly (MFJ)\n• Married Filing Separately (MFS)\n• Head of Household (HOH)\n• Qualifying Surviving Spouse`,
      vi: `📋 **Tình trạng khai thuế của bạn năm 2025?**\n\n• Độc thân\n• Vợ chồng khai chung (MFJ)\n• Vợ chồng khai riêng (MFS)\n• Chủ hộ (HOH)`,
      es: `📋 **¿Cuál es su estado civil para 2025?**\n\n• Soltero\n• Casado declarando en conjunto\n• Casado declarando por separado\n• Cabeza de familia`
    },
    required: true,
    validation: {
      type: "filing_status",
      values: ["single", "married_filing_jointly", "married_filing_separately", "head_of_household", "qualifying_widow"]
    },
    extractor: "extractFilingStatus"
  },

  // ══════════════════════════════════════════════════════════
  // SECTION 2: TAXPAYER DOB
  // ══════════════════════════════════════════════════════════
  {
    key: "taxpayer_dob",
    section: "personal",
    phase: "taxpayer_dob",
    question: {
      en: `📅 **What is your date of birth?**\n\n(Format: MM/DD/YYYY, e.g., 09/16/1971)`,
      vi: `📅 **Ngày sinh của bạn là gì?**\n\n(Định dạng: MM/DD/YYYY)`,
      es: `📅 **¿Cuál es su fecha de nacimiento?**\n\n(Formato: MM/DD/AAAA)`
    },
    required: true,
    validation: { type: "date" },
    extractor: "parseDate",
    postProcess: "calculateAge",
    saveExtra: [
      { key: "taxpayer_65_plus", condition: (age) => age >= 65 },
      { key: "taxpayer_50_plus", condition: (age) => age >= 50 }
    ]
  },

  // ══════════════════════════════════════════════════════════
  // SECTION 3: SPOUSE INFO (MFJ only)
  // ══════════════════════════════════════════════════════════
  {
    key: "spouse_first_name",
    section: "spouse",
    phase: "spouse_name",
    question: {
      en: `👫 **What is your spouse's full name?**\n\n(First name and last name - required for Form 1040)`,
      vi: `👫 **Họ và tên đầy đủ của vợ/chồng bạn là gì?**`,
      es: `👫 **¿Cuál es el nombre completo de su cónyuge?**`
    },
    required: true,
    skipIf: (data) => data.filing_status !== "married_filing_jointly",
    validation: { type: "name" },
    extractor: "parseName",
    saveExtra: [
      { key: "spouse_last_name", from: "lastName" }
    ]
  },
  {
    key: "spouse_dob",
    section: "spouse",
    phase: "spouse_dob",
    question: {
      en: `📅 **What is your spouse's date of birth?**\n\n(Format: MM/DD/YYYY)`,
      vi: `📅 **Ngày sinh của vợ/chồng bạn là gì?**`,
      es: `📅 **¿Cuál es la fecha de nacimiento de su cónyuge?**`
    },
    required: true,
    skipIf: (data) => data.filing_status !== "married_filing_jointly",
    validation: { type: "date" },
    extractor: "parseDate",
    postProcess: "calculateAge",
    saveExtra: [
      { key: "spouse_65_plus", condition: (age) => age >= 65 },
      { key: "spouse_50_plus", condition: (age) => age >= 50 }
    ]
  },

  // ══════════════════════════════════════════════════════════
  // SECTION 4: DEPENDENTS
  // ══════════════════════════════════════════════════════════
  {
    key: "has_dependents",
    section: "dependents",
    phase: "dependents",
    question: {
      en: `👶 **Do you have any dependents?**\n\n(Children or other qualifying relatives)\n\nAnswer **Yes** or **No**`,
      vi: `👶 **Bạn có người phụ thuộc không?**\n\n(Con cái hoặc người thân đủ điều kiện)\n\nTrả lời **Có** hoặc **Không**`,
      es: `👶 **¿Tiene dependientes?**\n\n(Hijos u otros familiares calificados)\n\nResponda **Sí** o **No**`
    },
    required: true,
    validation: { type: "yesno" },
    extractor: "extractYesNo",
    onNo: {
      setFields: { 
        dependents_done: true, 
        dependent_count: 0,
        qualifying_children_under_17: 0,
        other_dependents: 0
      }
    }
  },
  {
    key: "dependent_count",
    section: "dependents",
    phase: "dependent_count",
    question: {
      en: `👶 **How many dependents do you have?**\n\nPlease enter a number (e.g., 1, 2, 3)`,
      vi: `👶 **Bạn có bao nhiêu người phụ thuộc?**\n\nVui lòng nhập một số (ví dụ: 1, 2, 3)`,
      es: `👶 **¿Cuántos dependientes tiene?**\n\nPor favor ingrese un número`
    },
    required: true,
    skipIf: (data) => data.has_dependents === false || data.has_dependents === "NO",
    validation: { type: "number", min: 1, max: 20 },
    extractor: "extractNumber",
    onValue: {
      initLoop: { 
        key: "dependents", 
        value: [],
        startCollection: true
      }
    }
  },
  {
    key: "dependent_info",
    section: "dependents",
    phase: "dependent_details",
    type: "loop",
    loopKey: "dependents",
    loopCount: (data) => data.dependent_count || 0,
    skipIf: (data) => !data.has_dependents || !data.dependent_count,
    subSteps: [
      {
        key: "name",
        question: {
          en: (index) => `👤 **Dependent #${index + 1}: What is their name?**`,
          vi: (index) => `👤 **Người phụ thuộc #${index + 1}: Tên của họ là gì?**`,
          es: (index) => `👤 **Dependiente #${index + 1}: ¿Cuál es su nombre?**`
        },
        validation: { type: "name" }
      },
      {
        key: "dob",
        question: {
          en: (index, name) => `📅 **What is ${name}'s date of birth?**\n\n(Or just enter their age, e.g., "10")`,
          vi: (index, name) => `📅 **Ngày sinh của ${name} là gì?**`,
          es: (index, name) => `📅 **¿Cuál es la fecha de nacimiento de ${name}?**`
        },
        validation: { type: "date_or_age" }
      },
      {
        key: "relationship",
        question: {
          en: (index, name) => `👨‍👩‍👧 **What is ${name}'s relationship to you?**\n\n(e.g., son, daughter, stepchild, grandchild, etc.)`,
          vi: (index, name) => `👨‍👩‍👧 **${name} có quan hệ gì với bạn?**`,
          es: (index, name) => `👨‍👩‍👧 **¿Cuál es la relación de ${name} con usted?**`
        },
        validation: { 
          type: "enum",
          values: ["son", "daughter", "stepson", "stepdaughter", "foster_child", "grandchild", "brother", "sister", "niece", "nephew", "other"]
        }
      }
    ],
    onComplete: {
      calculate: "countDependentsByAge",
      setFields: { dependents_done: true }
    }
  },

  // ══════════════════════════════════════════════════════════
  // SECTION 5: INCOME REVIEW (W-2 already uploaded)
  // ══════════════════════════════════════════════════════════
  {
    key: "income_confirmed",
    section: "income",
    phase: "income_review",
    question: {
      en: (data) => `📊 **Income Summary (Tax Year 2025)**\n\n• W-2 Wages: **$${(data.total_wages || 0).toLocaleString()}**\n• Federal Withheld: **$${(data.total_withheld || 0).toLocaleString()}**\n• State Withheld: **$${(data.total_state_withheld || 0).toLocaleString()}**\n\n**Is this correct?** (Yes/No)`,
      vi: (data) => `📊 **Tóm tắt thu nhập (Năm thuế 2025)**\n\n• Lương W-2: **$${(data.total_wages || 0).toLocaleString()}**\n• Thuế liên bang đã khấu trừ: **$${(data.total_withheld || 0).toLocaleString()}**\n\n**Đúng không?** (Có/Không)`,
      es: (data) => `📊 **Resumen de ingresos (Año fiscal 2025)**\n\n• Salarios W-2: **$${(data.total_wages || 0).toLocaleString()}**\n• Retención federal: **$${(data.total_withheld || 0).toLocaleString()}**\n\n**¿Es correcto?** (Sí/No)`
    },
    required: true,
    skipIf: (data) => !data.total_wages,
    validation: { type: "yesno" },
    extractor: "extractYesNo",
    onYes: {
      setFields: { income_confirmed: true }
    },
    onNo: {
      nextPhase: "income_correction"
    }
  },

  // ══════════════════════════════════════════════════════════
  // SECTION 6: SPOUSE INCOME (MFJ only) ⭐ CRITICAL
  // ══════════════════════════════════════════════════════════
  {
    key: "spouse_has_income",
    section: "spouse_income",
    phase: "spouse_income",
    question: {
      en: `💼 **Does your spouse have any income?**\n\n• W-2 wages from employment\n• 1099 self-employment\n• Other income\n\nAnswer **Yes** or **No**, or enter the amount directly (e.g., "wife W2 $50000")`,
      vi: `💼 **Vợ/chồng của bạn có thu nhập không?**\n\nTrả lời **Có** hoặc **Không**, hoặc nhập số tiền trực tiếp`,
      es: `💼 **¿Su cónyuge tiene ingresos?**\n\nResponda **Sí** o **No**, o ingrese el monto directamente`
    },
    required: true,
    skipIf: (data) => data.filing_status !== "married_filing_jointly" || !data.income_confirmed,
    validation: { type: "yesno_or_amount" },
    extractor: "extractSpouseIncomeComplete",
    onNo: {
      setFields: { 
        spouse_income_done: true,
        spouse_wages: 0,
        spouse_federal_withholding: 0,
        spouse_state_withholding: 0
      }
    },
    onAmount: {
      saveField: "spouse_wages",
      nextStep: "spouse_federal_withholding"
    }
  },
  {
    key: "spouse_wages",
    section: "spouse_income",
    phase: "spouse_income_amount",
    question: {
      en: `💰 **How much did your spouse earn in W-2 wages?**\n\n(Enter the amount, e.g., "$50,000" or "50k")`,
      vi: `💰 **Vợ/chồng của bạn kiếm được bao nhiêu lương W-2?**`,
      es: `💰 **¿Cuánto ganó su cónyuge en salarios W-2?**`
    },
    required: true,
    skipIf: (data) => data.filing_status !== "married_filing_jointly" || data.spouse_has_income === false || data.spouse_wages > 0,
    validation: { 
      type: "money",
      min: 0,
      max: 10000000
    },
    extractor: "extractSpouseIncomeComplete"
  },
  {
    key: "spouse_federal_withholding",  // ⭐ THIS WAS MISSING!
    section: "spouse_income",
    phase: "spouse_federal_withholding",
    question: {
      en: (data) => `💳 **How much federal tax was withheld from your spouse's W-2?**\n\n_(Look at **Box 2** on the W-2 form. For $${(data.spouse_wages || 0).toLocaleString()} income, typical withholding is around $${Math.round((data.spouse_wages || 0) * 0.12).toLocaleString()})_`,
      vi: (data) => `💳 **Bao nhiêu thuế liên bang đã được khấu trừ từ W-2 của vợ/chồng?**\n\n_(Xem **Ô 2** trên mẫu W-2)_`,
      es: (data) => `💳 **¿Cuánto impuesto federal fue retenido del W-2 de su cónyuge?**\n\n_(Mire la **Casilla 2** en el formulario W-2)_`
    },
    required: true,  // ⭐ REQUIRED!
    skipIf: (data) => data.filing_status !== "married_filing_jointly" || !data.spouse_wages || data.spouse_wages <= 0,
    validation: { 
      type: "money",
      min: 0,
      maxPercent: 50,  // Can't be more than 50% of wages
      relatedTo: "spouse_wages"
    },
    extractor: "extractWithholdingAmount"
  },
  {
    key: "spouse_state_withholding",  // ⭐ THIS WAS MISSING!
    section: "spouse_income",
    phase: "spouse_state_withholding",
    question: {
      en: `🏛️ **How much state tax was withheld from your spouse's W-2?**\n\n_(Look at **Box 17** on the W-2 form, or type '0' if none)_`,
      vi: `🏛️ **Bao nhiêu thuế tiểu bang đã được khấu trừ từ W-2 của vợ/chồng?**\n\n_(Xem **Ô 17** trên W-2, hoặc nhập '0' nếu không có)_`,
      es: `🏛️ **¿Cuánto impuesto estatal fue retenido del W-2 de su cónyuge?**\n\n_(Mire la **Casilla 17** en el W-2, o escriba '0' si no hay)_`
    },
    required: true,
    skipIf: (data) => data.filing_status !== "married_filing_jointly" || !data.spouse_wages || data.spouse_wages <= 0,
    validation: { 
      type: "money",
      min: 0,
      allowZero: true
    },
    extractor: "extractWithholdingAmount",
    onComplete: {
      setFields: { spouse_income_done: true }
    }
  },

  // ══════════════════════════════════════════════════════════
  // SECTION 7: ADJUSTMENTS
  // ══════════════════════════════════════════════════════════
  {
    key: "adjustments_response",
    section: "adjustments",
    phase: "adjustments",
    question: {
      en: `📋 **Adjustments to Income**\n\nDo you have any of these?\n• **IRA Contributions** (up to $7,000 or $8,000 if 50+)\n• **Student Loan Interest** (up to $2,500)\n• **HSA Contributions** ($4,300 individual / $8,550 family)\n\nType the amount (e.g., "IRA $5000") or say **'None'** to skip.`,
      vi: `📋 **Điều chỉnh thu nhập**\n\nBạn có các khoản sau không?\n• **Đóng góp IRA** (tối đa $7,000 hoặc $8,000 nếu 50+)\n• **Lãi vay sinh viên** (tối đa $2,500)\n• **Đóng góp HSA**\n\nNhập số tiền hoặc nói **'Không có'** để bỏ qua.`,
      es: `📋 **Ajustes a los ingresos**\n\n¿Tiene alguno de estos?\n• **Contribuciones IRA** (hasta $7,000 o $8,000 si tiene 50+)\n• **Intereses de préstamos estudiantiles** (hasta $2,500)\n• **Contribuciones HSA**\n\nEscriba el monto o diga **'Ninguno'** para omitir.`
    },
    required: false,
    validation: { type: "adjustment" },
    extractor: "extractAdjustmentData",
    limits: {
      ira: { under50: 7000, over50: 8000 },
      hsa: { individual: 4300, family: 8550 },
      student_loan: 2500
    },
    onSkip: {
      setFields: { adjustments_done: true }
    },
    allowMultiple: true,  // Can add multiple adjustments
    doneKeywords: ["done", "no more", "that's all", "finish", "none", "no", "skip", "xong", "không", "listo"]
  },
  {
    key: "spouse_ira",
    section: "adjustments",
    phase: "spouse_adjustments",
    question: {
      en: `💰 **Did your spouse contribute to an IRA?**\n\n(Up to $7,000 or $8,000 if 50+)\n\nEnter the amount or say **'No'**`,
      vi: `💰 **Vợ/chồng của bạn có đóng góp IRA không?**\n\nNhập số tiền hoặc nói **'Không'**`,
      es: `💰 **¿Su cónyuge contribuyó a una IRA?**\n\nIngrese el monto o diga **'No'**`
    },
    required: false,
    skipIf: (data) => data.filing_status !== "married_filing_jointly" || !data.adjustments_done,
    validation: { type: "money_or_no", max: 8000 },
    extractor: "extractAdjustmentData",
    onComplete: {
      setFields: { spouse_adjustments_done: true }
    }
  },

  // ══════════════════════════════════════════════════════════
  // SECTION 8: DEDUCTIONS
  // ══════════════════════════════════════════════════════════
  {
    key: "deduction_choice",
    section: "deductions",
    phase: "deductions",
    question: {
      en: (data) => {
        const stdDed = getStandardDeduction(data.filing_status);
        return `📋 **Deductions**\n\nWould you like to:\n• Take the **Standard Deduction** ($${stdDed.toLocaleString()})\n• **Itemize** your deductions\n\n_(Most people benefit from the standard deduction)_`;
      },
      vi: (data) => {
        const stdDed = getStandardDeduction(data.filing_status);
        return `📋 **Khấu trừ**\n\nBạn muốn:\n• Sử dụng **Khấu trừ tiêu chuẩn** ($${stdDed.toLocaleString()})\n• **Chi tiết** các khoản khấu trừ`;
      },
      es: (data) => {
        const stdDed = getStandardDeduction(data.filing_status);
        return `📋 **Deducciones**\n\n¿Desea:\n• Tomar la **Deducción Estándar** ($${stdDed.toLocaleString()})\n• **Detallar** sus deducciones`;
      }
    },
    required: true,
    validation: { type: "deduction_choice" },
    extractor: "extractDeductionChoice",
    onStandard: {
      setFields: { use_standard_deduction: true, deductions_done: true }
    },
    onItemize: {
      nextPhase: "itemized_deductions"
    }
  },

  // ══════════════════════════════════════════════════════════
  // SECTION 9: FINAL REVIEW & CALCULATE
  // ══════════════════════════════════════════════════════════
  {
    key: "ready_to_calculate",
    section: "review",
    phase: "review",
    question: {
      en: `✅ **Ready to calculate your taxes?**\n\nSay **'Yes'** to see your refund estimate!`,
      vi: `✅ **Sẵn sàng tính thuế?**\n\nNói **'Có'** để xem ước tính hoàn thuế!`,
      es: `✅ **¿Listo para calcular sus impuestos?**\n\n¡Diga **'Sí'** para ver su estimación de reembolso!`
    },
    required: true,
    validation: { type: "yesno" },
    extractor: "extractYesNo",
    onYes: {
      action: "calculate"
    }
  }
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get standard deduction for filing status (2025 values)
 */
export function getStandardDeduction(filingStatus) {
  const deductions = {
    single: 14800,
    married_filing_jointly: 29600,
    married_filing_separately: 14800,
    head_of_household: 22200,
    qualifying_widow: 29600,
    qualifying_surviving_spouse: 29600
  };
  return deductions[filingStatus] || 14800;
}

/**
 * Get the next unanswered step
 */
export function getNextStep(data) {
  for (const step of INTERVIEW_STEPS) {
    // Skip loop sub-steps (handled separately)
    if (step.type === "loop") {
      // Check if loop is in progress
      if (data.collecting_dependent_info && !data.dependents_done) {
        return step;
      }
      // Check if loop should start
      if (step.skipIf && step.skipIf(data)) continue;
      if (!data[step.onComplete?.setFields ? Object.keys(step.onComplete.setFields)[0] : 'dependents_done']) {
        return step;
      }
      continue;
    }
    
    // Check skipIf condition
    if (step.skipIf && typeof step.skipIf === 'function') {
      if (step.skipIf(data)) continue;
    }
    
    // Check if already answered
    if (data[step.key] !== undefined && data[step.key] !== null && data[step.key] !== '') {
      continue;
    }
    
    // Check if marked as done
    if (step.onComplete?.setFields) {
      const doneKey = Object.keys(step.onComplete.setFields)[0];
      if (data[doneKey]) continue;
    }
    
    return step;
  }
  return null;  // All steps complete
}

/**
 * Get step by key
 */
export function getStepByKey(key) {
  return INTERVIEW_STEPS.find(s => s.key === key);
}

/**
 * Get question text for language (handles both static and dynamic questions)
 */
export function getQuestion(step, lang = "en", data = {}, index = 0) {
  const questionDef = step.question;
  
  if (!questionDef) return "";
  
  // Get language-specific question
  const q = questionDef[lang] || questionDef.en;
  
  // If it's a function, call it with data
  if (typeof q === 'function') {
    return q(data, index);
  }
  
  return q;
}

/**
 * Check if interview is complete
 */
export function isInterviewComplete(data) {
  return getNextStep(data) === null;
}

/**
 * Get all required fields that are missing
 */
export function getMissingRequired(data) {
  const missing = [];
  for (const step of INTERVIEW_STEPS) {
    if (!step.required) continue;
    if (step.type === "loop") continue;
    
    // Check skipIf
    if (step.skipIf && typeof step.skipIf === 'function') {
      if (step.skipIf(data)) continue;
    }
    
    if (data[step.key] === undefined || data[step.key] === null || data[step.key] === '') {
      missing.push(step.key);
    }
  }
  return missing;
}

/**
 * Get progress percentage
 */
export function getProgress(data) {
  let total = 0;
  let completed = 0;
  
  for (const step of INTERVIEW_STEPS) {
    if (step.type === "loop") continue;
    
    // Check skipIf
    if (step.skipIf && typeof step.skipIf === 'function') {
      if (step.skipIf(data)) continue;
    }
    
    total++;
    if (data[step.key] !== undefined && data[step.key] !== null && data[step.key] !== '') {
      completed++;
    }
  }
  
  return total > 0 ? Math.round((completed / total) * 100) : 0;
}

/**
 * Get all steps in a section
 */
export function getStepsBySection(section) {
  return INTERVIEW_STEPS.filter(s => s.section === section);
}

// ============================================================
// EXPORTS
// ============================================================
export default {
  INTERVIEW_STEPS,
  getNextStep,
  getStepByKey,
  getQuestion,
  isInterviewComplete,
  getMissingRequired,
  getProgress,
  getStandardDeduction,
  getStepsBySection
};