// ============================================================
// TAX SYNC SERVICE - Works with existing Form1040.js
// ============================================================
// Location: backend/services/taxSyncService.js
// ✅ v2.0 FIXED: Removed TaxSession.findOrCreate (doesn't exist)
// ============================================================

import TaxSession from '../models/TaxSession.js';
import { Form1040, getOrCreateForm1040 } from '../models/Form1040.js';

// ============================================================
// HELPER: Parse number from various formats
// ============================================================
function parseNum(val) {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  return parseFloat(String(val).replace(/[$,]/g, '')) || 0;
}

// ============================================================
// HELPER: Get value from multiple possible keys
// ============================================================
function getValue(obj, ...keys) {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null && obj?.[key] !== '') {
      return obj[key];
    }
  }
  return null;
}

// ============================================================
// HELPER: Convert Map to Object
// ============================================================
function mapToObject(map) {
  const obj = {};
  if (map instanceof Map) {
    map.forEach((v, k) => { obj[k] = v; });
  } else if (map && typeof map === 'object') {
    Object.assign(obj, map);
  }
  return obj;
}

// ============================================================
// HELPER: Get raw data from session (inline)
// ============================================================
function getRawDataFromSession(session) {
  return {
    answers: mapToObject(session.answers),
    forms: mapToObject(session.forms),
    rawUploads: session.rawUploads || session.rawData?.uploads || [],
    normalizedData: session.normalizedData || {},
    chatPhase: session.chat?.phase || session.interviewState?.currentStep || 'welcome'
  };
}

// ============================================================
// MAIN SYNC FUNCTION
// ============================================================
export async function syncToForm1040(userId, taxYear = 2025) {
  console.log(`[SYNC] 🔄 Starting sync for ${userId}...`);
  
  // ✅ FIX: Use findOne + create instead of findOrCreate
  let session = await TaxSession.findOne({ userId });
  
  if (!session) {
    console.log(`[SYNC] Creating new session for ${userId}`);
    session = new TaxSession({
      userId,
      taxYear,
      answers: new Map(),
      normalizedData: {
        personal: {},
        income: {},
        adjustments: {},
        deductions: { type: 'standard' },
        dependents: [],
        credits: {},
        results: {}
      }
    });
    await session.save();
  }
  
  // 2. Get raw data (inline)
  const rawData = getRawDataFromSession(session);
  
  // 3. Get or create Form1040 (using YOUR existing function)
  const form = await getOrCreateForm1040(userId);
  
  // 4. Set tax year
  form.taxYear = taxYear;
  
  // 5. Sync personal info
  syncPersonalInfo(form, rawData);
  
  // 6. Sync income from all sources
  syncIncome(form, rawData);
  
  // 7. Sync dependents
  syncDependents(form, rawData);
  
  // 8. Recalculate totals
  recalculateForm(form);
  
  // 9. Save Form1040
  form.lastUpdated = new Date();
  await form.save();
  
  console.log(`[SYNC] ✅ Synced successfully:`, {
    wages: form.income?.wages?.total,
    interest: form.income?.interest?.total,
    totalIncome: form.income?.totalIncome,
    refund: form.refund
  });
  
  return form;
}

// ============================================================
// SYNC PERSONAL INFO
// ============================================================
function syncPersonalInfo(form, rawData) {
  const answers = rawData.answers || {};
  const normalizedPersonal = rawData.normalizedData?.personal || {};
  
  // Taxpayer
  if (!form.taxpayer) form.taxpayer = {};
  form.taxpayer.firstName = normalizedPersonal.first_name || getValue(answers, 'first_name', 'firstName') || form.taxpayer.firstName;
  form.taxpayer.lastName = normalizedPersonal.last_name || getValue(answers, 'last_name', 'lastName') || form.taxpayer.lastName;
  form.taxpayer.ssn = normalizedPersonal.ssn || getValue(answers, 'ssn') || form.taxpayer.ssn;
  form.taxpayer.dateOfBirth = getValue(answers, 'date_of_birth', 'dob') || form.taxpayer.dateOfBirth;
  
  // Spouse
  if (!form.spouse) form.spouse = {};
  form.spouse.firstName = normalizedPersonal.spouse_first_name || getValue(answers, 'spouse_first_name', 'spouseFirstName') || form.spouse.firstName;
  form.spouse.lastName = normalizedPersonal.spouse_last_name || getValue(answers, 'spouse_last_name', 'spouseLastName') || form.spouse.lastName;
  form.spouse.ssn = normalizedPersonal.spouse_ssn || getValue(answers, 'spouse_ssn', 'spouseSSN') || form.spouse.ssn;
  
  // Address
  if (!form.address) form.address = {};
  form.address.street = normalizedPersonal.address || getValue(answers, 'address', 'street') || form.address.street;
  form.address.city = normalizedPersonal.city || getValue(answers, 'city') || form.address.city;
  form.address.state = normalizedPersonal.state || getValue(answers, 'state') || form.address.state;
  form.address.zip = normalizedPersonal.zip || getValue(answers, 'zip') || form.address.zip;
  
  // Filing status
  form.filingStatus = normalizedPersonal.filing_status || getValue(answers, 'filing_status', 'filingStatus') || form.filingStatus || 'single';
}

// ============================================================
// SYNC INCOME FROM ALL SOURCES
// ============================================================
function syncIncome(form, rawData) {
  const answers = rawData.answers || {};
  const forms = rawData.forms || {};
  const normalizedIncome = rawData.normalizedData?.income || {};
  
  // Initialize income structure
  if (!form.income) form.income = {};
  if (!form.income.wages) form.income.wages = { total: 0, sources: [] };
  if (!form.income.interest) form.income.interest = { total: 0, sources: [] };
  if (!form.income.dividends) form.income.dividends = { total: 0, qualifiedTotal: 0, sources: [] };
  if (!form.income.selfEmployment) form.income.selfEmployment = { total: 0, sources: [] };
  
  // Initialize withholding
  if (!form.withholding) form.withholding = {};
  if (!form.withholding.federalW2) form.withholding.federalW2 = { total: 0, sources: [] };
  if (!form.withholding.federal1099) form.withholding.federal1099 = { total: 0, sources: [] };
  if (!form.withholding.state) form.withholding.state = { total: 0, sources: [] };
  
  // ========== WAGES ==========
  let totalWages = 0;
  let totalFedWithheld = 0;
  let totalStateWithheld = 0;
  
  // Source 1: normalizedData.income.w2 array
  (normalizedIncome.w2 || []).forEach(w2 => {
    totalWages += parseNum(w2.wages);
    totalFedWithheld += parseNum(w2.federal_withholding);
    totalStateWithheld += parseNum(w2.state_withholding);
  });
  
  // Source 2: forms Map (W-2)
  const w2Form = forms['W-2'] || forms['W2'] || forms['w2'] || {};
  if (totalWages === 0 && Object.keys(w2Form).length > 0) {
    totalWages = parseNum(getValue(w2Form, 'wages', 'box1', 'wagesTipsOther'));
    totalFedWithheld = parseNum(getValue(w2Form, 'federal_withholding', 'federalWithheld', 'box2'));
    totalStateWithheld = parseNum(getValue(w2Form, 'state_withholding', 'stateWithheld', 'box17'));
  }
  
  // Source 3: answers Map
  if (totalWages === 0) {
    totalWages = parseNum(getValue(answers, 'wages', 'w2_wages', 'total_wages'));
  }
  if (totalFedWithheld === 0) {
    totalFedWithheld = parseNum(getValue(answers, 'federal_withheld', 'federal_withholding', 'total_withheld'));
  }
  if (totalStateWithheld === 0) {
    totalStateWithheld = parseNum(getValue(answers, 'state_withheld', 'state_withholding', 'total_state_withheld'));
  }
  
  form.income.wages.total = totalWages;
  form.withholding.federalW2.total = totalFedWithheld;
  form.withholding.state.total = totalStateWithheld;
  
  // ========== INTEREST ==========
  let totalInterest = 0;
  
  (normalizedIncome.interest || []).forEach(i => {
    totalInterest += parseNum(i.interest_income);
  });
  
  const int1099 = forms['1099-INT'] || forms['1099INT'] || {};
  if (totalInterest === 0 && Object.keys(int1099).length > 0) {
    totalInterest = parseNum(getValue(int1099, 'interest_income', 'interestIncome', 'box1'));
  }
  
  if (totalInterest === 0) {
    totalInterest = parseNum(getValue(answers, 'interest_income', 'interestIncome', 'total_interest'));
  }
  
  form.income.interest.total = totalInterest;
  
  // ========== DIVIDENDS ==========
  let totalDividends = 0;
  
  (normalizedIncome.dividends || []).forEach(d => {
    totalDividends += parseNum(d.ordinary_dividends);
  });
  
  const div1099 = forms['1099-DIV'] || forms['1099DIV'] || {};
  if (totalDividends === 0 && Object.keys(div1099).length > 0) {
    totalDividends = parseNum(getValue(div1099, 'ordinary_dividends', 'ordinaryDividends', 'box1a'));
  }
  
  if (totalDividends === 0) {
    totalDividends = parseNum(getValue(answers, 'dividend_income', 'dividendIncome', 'total_dividends'));
  }
  
  form.income.dividends.total = totalDividends;
  
  // ========== SELF-EMPLOYMENT ==========
  let totalSelfEmployment = 0;
  
  (normalizedIncome.self_employment || []).forEach(se => {
    totalSelfEmployment += parseNum(se.nonemployee_compensation);
  });
  
  const nec1099 = forms['1099-NEC'] || forms['1099NEC'] || {};
  if (totalSelfEmployment === 0 && Object.keys(nec1099).length > 0) {
    totalSelfEmployment = parseNum(getValue(nec1099, 'nonemployee_compensation', 'amount', 'box1'));
  }
  
  if (totalSelfEmployment === 0) {
    totalSelfEmployment = parseNum(getValue(answers, 'self_employment_income', 'selfEmploymentIncome', 'total_self_employment'));
  }
  
  form.income.selfEmployment.total = totalSelfEmployment;
  
  // ========== TOTAL INCOME ==========
  form.income.totalIncome = totalWages + totalInterest + totalDividends + totalSelfEmployment;
}

// ============================================================
// SYNC DEPENDENTS
// ============================================================
function syncDependents(form, rawData) {
  const normalizedDependents = rawData.normalizedData?.dependents || [];
  
  if (normalizedDependents.length > 0) {
    form.dependents = normalizedDependents.map(d => {
      let age = d.age || null;
      const dob = d.date_of_birth || d.dateOfBirth;
      if (dob && !age) {
        const birthDate = new Date(dob);
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
      }
      
      return {
        firstName: d.first_name || d.firstName || '',
        lastName: d.last_name || d.lastName || '',
        ssn: d.ssn || '',
        relationship: d.relationship || '',
        childTaxCredit: age !== null && age < 17
      };
    });
  }
}

// ============================================================
// RECALCULATE TOTALS (2025 tax brackets)
// ============================================================
function recalculateForm(form) {
  // Total income
  form.income.totalIncome = 
    (form.income.wages?.total || 0) +
    (form.income.interest?.total || 0) +
    (form.income.dividends?.total || 0) +
    (form.income.selfEmployment?.total || 0);
  
  // Self-employment tax
  const seIncome = form.income.selfEmployment?.total || 0;
  form.selfEmploymentTax = seIncome > 0 ? Math.round(seIncome * 0.9235 * 0.153) : 0;
  
  // Standard deduction (2025 values)
  const deductions = {
    'single': 15000,
    'married_filing_jointly': 30000,
    'married_filing_separately': 15000,
    'head_of_household': 22500
  };
  form.standardDeduction = deductions[form.filingStatus] || 15000;
  
  // Taxable income
  form.taxableIncome = Math.max(0, form.income.totalIncome - form.standardDeduction);
  
  // Tax from tables (2025 brackets)
  form.taxFromTables = calculateTax2025(form.taxableIncome, form.filingStatus);
  
  // Child tax credit ($2000 per child under 17)
  const numChildren = (form.dependents || []).filter(d => d.childTaxCredit).length;
  form.childTaxCredit = Math.min(numChildren * 2000, form.taxFromTables);
  
  // Total tax
  form.totalTax = Math.max(0, form.taxFromTables + form.selfEmploymentTax - form.childTaxCredit);
  
  // Total withholding
  form.withholding.totalWithholding = 
    (form.withholding.federalW2?.total || 0) +
    (form.withholding.federal1099?.total || 0);
  
  // Refund or owed
  const diff = form.withholding.totalWithholding - form.totalTax;
  if (diff >= 0) {
    form.refund = diff;
    form.amountOwed = 0;
  } else {
    form.refund = 0;
    form.amountOwed = Math.abs(diff);
  }
}

// ============================================================
// 2025 TAX BRACKETS
// ============================================================
function calculateTax2025(taxableIncome, filingStatus) {
  if (filingStatus === 'married_filing_jointly') {
    if (taxableIncome <= 23850) return Math.round(taxableIncome * 0.10);
    if (taxableIncome <= 96950) return Math.round(2385 + (taxableIncome - 23850) * 0.12);
    if (taxableIncome <= 206700) return Math.round(11157 + (taxableIncome - 96950) * 0.22);
    if (taxableIncome <= 394600) return Math.round(35302 + (taxableIncome - 206700) * 0.24);
    return Math.round(80398 + (taxableIncome - 394600) * 0.32);
  } else if (filingStatus === 'head_of_household') {
    if (taxableIncome <= 17000) return Math.round(taxableIncome * 0.10);
    if (taxableIncome <= 64850) return Math.round(1700 + (taxableIncome - 17000) * 0.12);
    if (taxableIncome <= 103350) return Math.round(7442 + (taxableIncome - 64850) * 0.22);
    if (taxableIncome <= 197300) return Math.round(15912 + (taxableIncome - 103350) * 0.24);
    return Math.round(38460 + (taxableIncome - 197300) * 0.32);
  } else {
    // Single, MFS
    if (taxableIncome <= 11925) return Math.round(taxableIncome * 0.10);
    if (taxableIncome <= 48475) return Math.round(1193 + (taxableIncome - 11925) * 0.12);
    if (taxableIncome <= 103350) return Math.round(5579 + (taxableIncome - 48475) * 0.22);
    if (taxableIncome <= 197300) return Math.round(17651 + (taxableIncome - 103350) * 0.24);
    return Math.round(40199 + (taxableIncome - 197300) * 0.32);
  }
}

// ============================================================
// GET SUMMARY (for SubmitFlow)
// ============================================================
export async function getSummary(userId, taxYear = 2025) {
  // First sync
  const form = await syncToForm1040(userId, taxYear);
  
  // Return formatted summary
  return {
    success: true,
    
    personal: {
      first_name: form.taxpayer?.firstName || '',
      last_name: form.taxpayer?.lastName || '',
      ssn: form.taxpayer?.ssn || '',
      date_of_birth: form.taxpayer?.dateOfBirth || '',
      address: form.address?.street || '',
      city: form.address?.city || '',
      state: form.address?.state || '',
      zip: form.address?.zip || '',
      filing_status: form.filingStatus || 'single',
      spouse_first_name: form.spouse?.firstName || '',
      spouse_last_name: form.spouse?.lastName || '',
      spouse_ssn: form.spouse?.ssn || ''
    },
    
    dependents: (form.dependents || []).map((d, i) => ({
      index: i,
      first_name: d.firstName,
      last_name: d.lastName,
      ssn: d.ssn,
      relationship: d.relationship,
      qualifies_child_credit: d.childTaxCredit
    })),
    
    income: {
      wages: form.income?.wages?.total || 0,
      interest_income: form.income?.interest?.total || 0,
      dividend_income: form.income?.dividends?.total || 0,
      self_employment: form.income?.selfEmployment?.total || 0,
      total_income: form.income?.totalIncome || 0
    },
    
    deductions: {
      type: 'standard',
      amount: form.standardDeduction || 0
    },
    
    withholding: {
      federal_withheld: form.withholding?.totalWithholding || 0,
      state_withheld: form.withholding?.state?.total || 0
    },
    
    tax: {
      taxable_income: form.taxableIncome || 0,
      federal_tax: form.taxFromTables || 0,
      self_employment_tax: form.selfEmploymentTax || 0,
      child_tax_credit: form.childTaxCredit || 0,
      total_tax: form.totalTax || 0
    },
    
    result: {
      refund: form.refund || 0,
      amount_owed: form.amountOwed || 0
    }
  };
}

// ============================================================
// EXPORT
// ============================================================
export default {
  syncToForm1040,
  getSummary
};