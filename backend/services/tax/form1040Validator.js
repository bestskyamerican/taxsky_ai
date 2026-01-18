// ============================================================
// FORM 1040 VALIDATOR - Centralized Validation & Requirements
// ============================================================
// Location: backend/tax/form1040Validator.js
// Exports: validateRequiredFields, getCompletionStatus, 
//          getIncomeSummary, INCOME_FORMS, REQUIRED_FIELDS
// ============================================================

// ============================================================
// ALL SUPPORTED INCOME FORMS
// ============================================================
export const INCOME_FORMS = {
  'W-2': {
    name: 'Wage and Tax Statement',
    line: '1a',
    category: 'employment',
    description: {
      en: 'Employment income from employer',
      vi: 'Thu nhập từ người sử dụng lao động',
      es: 'Ingresos de empleo del empleador'
    },
    fields: {
      wages_tips_other_comp: { box: '1', dbField: 'total_wages', aggregate: true },
      federal_income_tax_withheld: { box: '2', dbField: 'total_withheld', aggregate: true },
      social_security_wages: { box: '3' },
      social_security_tax_withheld: { box: '4' },
      medicare_wages: { box: '5' },
      medicare_tax_withheld: { box: '6' },
      state_wages: { box: '16' },
      state_income_tax: { box: '17', dbField: 'total_state_withheld', aggregate: true },
      employee_ssn: { dbField: 'ssn' },
      employee_first_name: { dbField: 'first_name' },
      employee_last_name: { dbField: 'last_name' },
      employee_address: { dbField: 'address' },
      employee_city: { dbField: 'city' },
      employee_state: { dbField: 'state' },
      employee_zip: { dbField: 'zip' }
    },
    provides: ['first_name', 'last_name', 'ssn', 'address', 'city', 'state', 'zip', 'total_wages', 'total_withheld', 'total_state_withheld'],
    incomeField: 'total_wages',
    multiple: true,
    canHave: ['taxpayer', 'spouse']
  },

  '1099-NEC': {
    name: 'Nonemployee Compensation',
    line: 'Schedule C/SE',
    category: 'self_employment',
    description: {
      en: 'Self-employment / contractor income',
      vi: 'Thu nhập tự kinh doanh / nhà thầu',
      es: 'Ingresos de trabajo independiente'
    },
    fields: {
      nonemployee_compensation: { box: '1', dbField: 'total_self_employment', aggregate: true },
      federal_income_tax_withheld: { box: '4', aggregate: true }
    },
    provides: ['total_self_employment'],
    incomeField: 'total_self_employment',
    multiple: true,
    canHave: ['taxpayer', 'spouse'],
    triggers: ['Schedule C', 'Schedule SE'],
    selfEmploymentTax: true
  },

  '1099-INT': {
    name: 'Interest Income',
    line: '2b',
    category: 'investment',
    description: {
      en: 'Interest from banks, CDs, bonds',
      vi: 'Tiền lãi từ ngân hàng, CD, trái phiếu',
      es: 'Intereses de bancos, CDs, bonos'
    },
    fields: {
      interest_income: { box: '1', dbField: 'total_interest', aggregate: true },
      early_withdrawal_penalty: { box: '2' },
      tax_exempt_interest: { box: '8', dbField: 'tax_exempt_interest', aggregate: true },
      federal_income_tax_withheld: { box: '4', aggregate: true }
    },
    provides: ['total_interest', 'tax_exempt_interest'],
    incomeField: 'total_interest',
    multiple: true,
    canHave: ['taxpayer', 'spouse', 'joint']
  },

  '1099-DIV': {
    name: 'Dividends and Distributions',
    line: '3b',
    category: 'investment',
    description: {
      en: 'Stock dividends and distributions',
      vi: 'Cổ tức và phân phối',
      es: 'Dividendos y distribuciones'
    },
    fields: {
      total_ordinary_dividends: { box: '1a', dbField: 'total_dividends', aggregate: true },
      qualified_dividends: { box: '1b', dbField: 'qualified_dividends', aggregate: true },
      total_capital_gain: { box: '2a', aggregate: true },
      federal_income_tax_withheld: { box: '4', aggregate: true },
      foreign_tax_paid: { box: '7' }
    },
    provides: ['total_dividends', 'qualified_dividends'],
    incomeField: 'total_dividends',
    multiple: true,
    canHave: ['taxpayer', 'spouse', 'joint']
  },

  '1099-B': {
    name: 'Proceeds from Broker',
    line: 'Schedule D',
    category: 'investment',
    description: {
      en: 'Stock sales, crypto, investments',
      vi: 'Bán cổ phiếu, crypto, đầu tư',
      es: 'Venta de acciones, cripto, inversiones'
    },
    fields: {
      proceeds: { dbField: 'stock_proceeds' },
      cost_basis: { dbField: 'stock_cost_basis' },
      gain_loss: { dbField: 'capital_gains', aggregate: true },
      federal_income_tax_withheld: { aggregate: true }
    },
    provides: ['capital_gains'],
    incomeField: 'capital_gains',
    multiple: true,
    canHave: ['taxpayer', 'spouse', 'joint'],
    triggers: ['Schedule D', 'Form 8949']
  },

  '1099-R': {
    name: 'Retirement Distributions',
    line: '4b/5b',
    category: 'retirement',
    description: {
      en: 'IRA, 401k, pension distributions',
      vi: 'Phân phối IRA, 401k, lương hưu',
      es: 'Distribuciones de IRA, 401k, pensión'
    },
    fields: {
      gross_distribution: { box: '1', dbField: 'retirement_gross', aggregate: true },
      taxable_amount: { box: '2a', dbField: 'retirement_income', aggregate: true },
      federal_income_tax_withheld: { box: '4', aggregate: true },
      distribution_code: { box: '7' },
      state_tax_withheld: { box: '12' }
    },
    provides: ['retirement_income', 'retirement_gross'],
    incomeField: 'retirement_income',
    multiple: true,
    canHave: ['taxpayer', 'spouse']
  },

  'SSA-1099': {
    name: 'Social Security Benefit Statement',
    line: '6a',
    category: 'social_security',
    description: {
      en: 'Social Security benefits',
      vi: 'Phúc lợi An Sinh Xã Hội',
      es: 'Beneficios del Seguro Social'
    },
    fields: {
      net_benefits: { box: '5', dbField: 'social_security_benefits' },
      benefits_paid: { box: '3' },
      federal_income_tax_withheld: { box: '6' }
    },
    provides: ['social_security_benefits'],
    incomeField: 'social_security_benefits',
    multiple: false,
    canHave: ['taxpayer', 'spouse'],
    taxableCalculation: 'special'
  },

  '1099-G': {
    name: 'Government Payments',
    line: 'Schedule 1',
    category: 'government',
    description: {
      en: 'Unemployment, state tax refunds',
      vi: 'Trợ cấp thất nghiệp, hoàn thuế',
      es: 'Desempleo, reembolsos de impuestos'
    },
    fields: {
      unemployment_compensation: { box: '1', dbField: 'unemployment_income', aggregate: true },
      state_tax_refund: { box: '2' },
      federal_income_tax_withheld: { box: '4', aggregate: true }
    },
    provides: ['unemployment_income'],
    incomeField: 'unemployment_income',
    multiple: true,
    canHave: ['taxpayer', 'spouse']
  },

  '1099-MISC': {
    name: 'Miscellaneous Income',
    line: 'Various',
    category: 'other',
    description: {
      en: 'Rents, royalties, prizes, awards',
      vi: 'Tiền thuê, bản quyền, giải thưởng',
      es: 'Alquileres, regalías, premios'
    },
    fields: {
      rents: { box: '1', dbField: 'rental_income', aggregate: true },
      royalties: { box: '2', dbField: 'royalty_income', aggregate: true },
      other_income: { box: '3', dbField: 'other_income', aggregate: true },
      federal_income_tax_withheld: { box: '4', aggregate: true }
    },
    provides: ['rental_income', 'royalty_income', 'other_income'],
    incomeField: 'other_income',
    multiple: true,
    canHave: ['taxpayer', 'spouse'],
    triggers: ['Schedule E']
  },

  '1099-K': {
    name: 'Payment Card Transactions',
    line: 'Schedule C',
    category: 'self_employment',
    description: {
      en: 'PayPal, Venmo, Stripe, etc.',
      vi: 'PayPal, Venmo, Stripe',
      es: 'PayPal, Venmo, Stripe'
    },
    fields: {
      gross_amount: { box: '1a', dbField: 'payment_card_income', aggregate: true }
    },
    provides: ['payment_card_income'],
    incomeField: 'payment_card_income',
    multiple: true,
    canHave: ['taxpayer', 'spouse'],
    triggers: ['Schedule C']
  },

  'W-2G': {
    name: 'Gambling Winnings',
    line: 'Schedule 1',
    category: 'other',
    description: {
      en: 'Gambling and lottery winnings',
      vi: 'Tiền thắng cờ bạc, xổ số',
      es: 'Ganancias de juegos de azar'
    },
    fields: {
      gross_winnings: { box: '1', dbField: 'gambling_income', aggregate: true },
      federal_income_tax_withheld: { box: '4', aggregate: true }
    },
    provides: ['gambling_income'],
    incomeField: 'gambling_income',
    multiple: true,
    canHave: ['taxpayer', 'spouse']
  }
};

// ============================================================
// REQUIRED FIELDS FOR FORM 1040
// ============================================================
export const REQUIRED_FIELDS = {
  personal: [
    { key: 'first_name', label: { en: 'First Name', vi: 'Tên', es: 'Nombre' }, fromForm: 'W-2' },
    { key: 'last_name', label: { en: 'Last Name', vi: 'Họ', es: 'Apellido' }, fromForm: 'W-2' },
    { key: 'ssn', label: { en: 'Social Security Number', vi: 'Số An Sinh', es: 'SSN' }, fromForm: 'W-2' },
    { key: 'address', label: { en: 'Street Address', vi: 'Địa chỉ', es: 'Dirección' }, fromForm: 'W-2' },
    { key: 'city', label: { en: 'City', vi: 'Thành phố', es: 'Ciudad' }, fromForm: 'W-2' },
    { key: 'state', label: { en: 'State', vi: 'Tiểu bang', es: 'Estado' }, fromForm: 'W-2' },
    { key: 'zip', label: { en: 'ZIP Code', vi: 'Mã bưu điện', es: 'Código postal' }, fromForm: 'W-2' },
    { key: 'filing_status', label: { en: 'Filing Status', vi: 'Tình trạng khai thuế', es: 'Estado civil' }, fromForm: null },
    { key: 'date_of_birth', label: { en: 'Date of Birth', vi: 'Ngày sinh', es: 'Fecha de nacimiento' }, fromForm: null }
  ],
  
  spouse: [
    { key: 'spouse_first_name', label: { en: 'Spouse First Name', vi: 'Tên vợ/chồng', es: 'Nombre del cónyuge' }, fromForm: 'W-2' },
    { key: 'spouse_last_name', label: { en: 'Spouse Last Name', vi: 'Họ vợ/chồng', es: 'Apellido del cónyuge' }, fromForm: 'W-2' },
    { key: 'spouse_ssn', label: { en: 'Spouse SSN', vi: 'SSN vợ/chồng', es: 'SSN del cónyuge' }, fromForm: 'W-2' }
  ],
  
  dependents: [
    { key: 'has_dependents', label: { en: 'Has Dependents', vi: 'Có người phụ thuộc', es: 'Tiene dependientes' } },
    { key: 'dependent_count', label: { en: 'Number of Dependents', vi: 'Số người phụ thuộc', es: 'Número de dependientes' } }
  ],
  
  dependent_details: [
    { key: 'dependent_X_name', label: { en: 'Dependent Name', vi: 'Tên', es: 'Nombre' } },
    { key: 'dependent_X_ssn', label: { en: 'Dependent SSN', vi: 'SSN', es: 'SSN' } },
    { key: 'dependent_X_age', label: { en: 'Age', vi: 'Tuổi', es: 'Edad' } },  // ✅ Just age, not DOB
    { key: 'dependent_X_relationship', label: { en: 'Relationship', vi: 'Quan hệ', es: 'Parentesco' } }
  ]
};

// ============================================================
// CHECK IF HAS ANY INCOME
// ============================================================
function hasAnyIncome(userData) {
  const u = userData || {};
  const incomeFields = [
    'total_wages', 'spouse_total_wages',
    'total_self_employment', 'spouse_total_self_employment',
    'total_interest', 'total_dividends',
    'capital_gains', 'retirement_income',
    'social_security_benefits', 'unemployment_income',
    'rental_income', 'royalty_income', 'other_income',
    'gambling_income', 'payment_card_income'
  ];
  return incomeFields.some(field => parseFloat(u[field]) > 0);
}

// ============================================================
// GET INCOME SUMMARY
// ============================================================
export function getIncomeSummary(userData) {
  const u = userData || {};
  
  const sources = {
    w2: { has: parseFloat(u.total_wages) > 0, amount: parseFloat(u.total_wages) || 0, form: 'W-2' },
    w2Spouse: { has: parseFloat(u.spouse_total_wages) > 0, amount: parseFloat(u.spouse_total_wages) || 0, form: 'W-2 (Spouse)' },
    selfEmployment: { has: parseFloat(u.total_self_employment) > 0, amount: parseFloat(u.total_self_employment) || 0, form: '1099-NEC' },
    interest: { has: parseFloat(u.total_interest) > 0, amount: parseFloat(u.total_interest) || 0, form: '1099-INT' },
    dividends: { has: parseFloat(u.total_dividends) > 0, amount: parseFloat(u.total_dividends) || 0, form: '1099-DIV' },
    capitalGains: { has: parseFloat(u.capital_gains) > 0, amount: parseFloat(u.capital_gains) || 0, form: '1099-B' },
    retirement: { has: parseFloat(u.retirement_income) > 0, amount: parseFloat(u.retirement_income) || 0, form: '1099-R' },
    socialSecurity: { has: parseFloat(u.social_security_benefits) > 0, amount: parseFloat(u.social_security_benefits) || 0, form: 'SSA-1099' },
    unemployment: { has: parseFloat(u.unemployment_income) > 0, amount: parseFloat(u.unemployment_income) || 0, form: '1099-G' },
    rental: { has: parseFloat(u.rental_income) > 0, amount: parseFloat(u.rental_income) || 0, form: '1099-MISC' },
    other: { has: parseFloat(u.other_income) > 0, amount: parseFloat(u.other_income) || 0, form: '1099-MISC' },
    gambling: { has: parseFloat(u.gambling_income) > 0, amount: parseFloat(u.gambling_income) || 0, form: 'W-2G' }
  };
  
  const totalIncome = Object.values(sources).reduce((sum, s) => sum + s.amount, 0);
  const activeSources = Object.entries(sources).filter(([k, v]) => v.has);
  
  return {
    sources,
    totalIncome,
    hasIncome: hasAnyIncome(u),
    activeSources: activeSources.map(([k, v]) => ({ key: k, ...v })),
    sourceCount: activeSources.length
  };
}

// ============================================================
// VALIDATE REQUIRED FIELDS
// ============================================================
export function validateRequiredFields(userData, language = 'en') {
  const u = userData || {};
  const lang = language;
  const missing = [];
  
  const getLabel = (field) => {
    const label = field.label;
    return (typeof label === 'object') ? (label[lang] || label.en) : label;
  };
  
  // Check income FIRST
  if (!hasAnyIncome(u)) {
    missing.push({
      key: 'income',
      label: lang === 'vi' ? 'Tài liệu thu nhập' : lang === 'es' ? 'Documentos de ingresos' : 'Income Documents',
      category: 'income',
      needsUpload: true
    });
  }
  
  // Check personal fields
  for (const field of REQUIRED_FIELDS.personal) {
    if (!u[field.key] || u[field.key] === '') {
      missing.push({ key: field.key, label: getLabel(field), category: 'personal', fromForm: field.fromForm });
    }
  }
  
  // Check spouse fields if MFJ
  if (u.filing_status === 'married_filing_jointly') {
    for (const field of REQUIRED_FIELDS.spouse) {
      if (!u[field.key] || u[field.key] === '') {
        missing.push({ key: field.key, label: getLabel(field), category: 'spouse', fromForm: field.fromForm });
      }
    }
  }
  
  // Check dependents
  if (u.has_dependents === undefined) {
    missing.push({ key: 'has_dependents', label: lang === 'vi' ? 'Người phụ thuộc' : 'Dependents', category: 'dependents' });
  } else if (u.has_dependents === 'yes') {
    if (!u.dependent_count) {
      missing.push({ key: 'dependent_count', label: lang === 'vi' ? 'Số người phụ thuộc' : 'Number of Dependents', category: 'dependents' });
    } else {
      const depCount = parseInt(u.dependent_count) || 0;
      for (let i = 1; i <= depCount; i++) {
        if (!u[`dependent_${i}_name`]) missing.push({ key: `dependent_${i}_name`, label: `Dependent ${i} Name`, category: 'dependents' });
        if (!u[`dependent_${i}_ssn`]) missing.push({ key: `dependent_${i}_ssn`, label: `Dependent ${i} SSN`, category: 'dependents' });
        // ✅ Just check for AGE (for CTC: under 17 = $2,000)
        if (!u[`dependent_${i}_age`]) missing.push({ key: `dependent_${i}_age`, label: `Dependent ${i} Age`, category: 'dependents' });
      }
    }
  }
  
  return missing;
}

// ============================================================
// GET COMPLETION STATUS
// ============================================================
export function getCompletionStatus(userData, language = 'en') {
  const u = userData || {};
  const missing = validateRequiredFields(u, language);
  const incomeSummary = getIncomeSummary(u);
  
  const coreFields = ['first_name', 'ssn', 'address', 'filing_status', 'has_dependents', 'income'];
  const coreMissing = missing.filter(m => coreFields.includes(m.key) || m.key === 'income');
  const coreFilled = coreFields.length - coreMissing.length;
  const percent = Math.round((coreFilled / coreFields.length) * 100);
  
  return {
    percent,
    filled: coreFilled,
    total: coreFields.length,
    isComplete: missing.length === 0,
    missingCount: missing.length,
    missing: missing.map(m => m.key),
    missingFields: missing,
    missingByCategory: {
      income: missing.filter(m => m.category === 'income'),
      personal: missing.filter(m => m.category === 'personal'),
      spouse: missing.filter(m => m.category === 'spouse'),
      dependents: missing.filter(m => m.category === 'dependents')
    },
    hasIncome: incomeSummary.hasIncome,
    incomeSummary,
    hasFilingStatus: !!u.filing_status,
    hasDependentInfo: u.has_dependents !== undefined,
    readyFor1040: missing.length === 0
  };
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================
export function getFormInfo(formType) {
  return INCOME_FORMS[formType] || null;
}

export function getAllFormTypes() {
  return Object.keys(INCOME_FORMS);
}

export function getFormDescription(formType, language = 'en') {
  const form = INCOME_FORMS[formType];
  if (!form) return formType;
  return form.description?.[language] || form.description?.en || form.name;
}

// ============================================================
// DEFAULT EXPORT
// ============================================================
export default {
  INCOME_FORMS,
  REQUIRED_FIELDS,
  validateRequiredFields,
  getCompletionStatus,
  getIncomeSummary,
  getFormInfo,
  getAllFormTypes,
  getFormDescription
};