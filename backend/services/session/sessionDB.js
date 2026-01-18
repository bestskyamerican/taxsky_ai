// ============================================================
// SESSION DB - MongoDB Session Storage
// ============================================================
// File: backend/services/session/sessionDB.js
//
// ✅ v5.1 FIXED:
//    - Fixed duplicate model error (line 136)
//    - Added getPersonalInfo() for taxRoutes.js
//    - Added updatePersonalInfo() for taxRoutes.js
//    - Added getDependents() for taxRoutes.js
//    - Added updateDependent() for taxRoutes.js
//    - Added getIncomeSummary() for taxRoutes.js
//    - All spouse fields properly returned
// ============================================================

import mongoose from 'mongoose';

// ============================================================
// SCHEMA
// ============================================================
const taxSessionSchema = new mongoose.Schema({
  odoo_id: { type: String, index: true },
  sessionId: { type: String, index: true },
  userId: { type: String, index: true },
  language: { type: String, default: 'en' },
  currentPhase: { type: String, default: 'GREETING' },
  answers: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
  normalizedData: {
    personal: {
      first_name: String,
      last_name: String,
      ssn: String,
      filing_status: String,
      taxpayer_dob: String,
      spouse_dob: String,
      taxpayer_65_plus: Boolean,
      spouse_65_plus: Boolean,
      taxpayer_blind: Boolean,
      spouse_blind: Boolean,
      taxpayer_50_plus: Boolean,
      spouse_50_plus: Boolean,
      spouse_first_name: String,
      spouse_last_name: String,
      spouse_ssn: String,
      address: String,
      city: String,
      state: String,
      zip: String,
      phone: String,
      email: String
    },
    income: {
      wages: { type: Number, default: 0 },
      spouse_wages: { type: Number, default: 0 },
      total_wages: { type: Number, default: 0 },
      federal_withholding: { type: Number, default: 0 },
      state_withholding: { type: Number, default: 0 },
      self_employment_income: { type: Number, default: 0 },
      interest_income: { type: Number, default: 0 },
      dividend_income: { type: Number, default: 0 },
      capital_gains: { type: Number, default: 0 },
      retirement_income: { type: Number, default: 0 },
      social_security_benefits: { type: Number, default: 0 },
      unemployment_income: { type: Number, default: 0 },
      other_income: { type: Number, default: 0 },
      w2s: { type: Array, default: [] },
      form1099s: { type: Array, default: [] }
    },
    adjustments: {
      ira_contributions: { type: Number, default: 0 },
      spouse_ira: { type: Number, default: 0 },
      hsa_contributions: { type: Number, default: 0 },
      spouse_hsa: { type: Number, default: 0 },
      student_loan_interest: { type: Number, default: 0 },
      educator_expenses: { type: Number, default: 0 },
      self_employment_tax_deduction: { type: Number, default: 0 },
      total_adjustments: { type: Number, default: 0 }
    },
    deductions: {
      type: { type: String, default: 'standard' },
      standard_deduction: { type: Number, default: 0 },
      itemized_total: { type: Number, default: 0 },
      medical_expenses: { type: Number, default: 0 },
      state_local_taxes: { type: Number, default: 0 },
      mortgage_interest: { type: Number, default: 0 },
      charitable_contributions: { type: Number, default: 0 }
    },
    dependents: [{
      first_name: String,
      last_name: String,
      name: String,
      ssn: String,
      date_of_birth: String,
      age: Number,
      relationship: String,
      qualifies_for_child_credit: Boolean,
      qualifies_for_other_dependent_credit: Boolean
    }],
    credits: {
      child_tax_credit: { type: Number, default: 0 },
      other_dependents_credit: { type: Number, default: 0 },
      earned_income_credit: { type: Number, default: 0 },
      education_credits: { type: Number, default: 0 }
    },
    results: {
      federal_refund: { type: Number, default: 0 },
      federal_owed: { type: Number, default: 0 },
      state_refund: { type: Number, default: 0 },
      state_owed: { type: Number, default: 0 },
      total_refund: { type: Number, default: 0 },
      total_owed: { type: Number, default: 0 }
    },
    has_dependents: Boolean,
    dependent_count: { type: Number, default: 0 },
    qualifying_children_under_17: { type: Number, default: 0 },
    children_under_6: { type: Number, default: 0 },
    other_dependents: { type: Number, default: 0 }
  },
  conversationHistory: [{
    role: String,
    content: String,
    timestamp: { type: Date, default: Date.now }
  }],
  metadata: {
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    lastActivity: { type: Date, default: Date.now },
    version: { type: String, default: '5.1' },
    source: { type: String, default: 'chat' }
  }
}, { timestamps: true });

// Handle duplicate key error gracefully
taxSessionSchema.index({ odoo_id: 1, sessionId: 1 }, { unique: false });
taxSessionSchema.index({ userId: 1 }, { unique: false });

// ✅ FIX: Check if model exists before creating (prevents OverwriteModelError)
const TaxSession = mongoose.models.TaxSession || mongoose.model('TaxSession', taxSessionSchema);

// ============================================================
// FIELDS TO SYNC
// ============================================================
const personalFields = [
  'first_name', 'last_name', 'ssn', 'filing_status',
  'taxpayer_dob', 'spouse_dob',
  'taxpayer_65_plus', 'spouse_65_plus',
  'taxpayer_blind', 'spouse_blind',
  'taxpayer_50_plus', 'spouse_50_plus',
  'spouse_first_name', 'spouse_last_name', 'spouse_ssn',
  'address', 'city', 'state', 'zip', 'phone', 'email'
];

const incomeFields = [
  'wages', 'spouse_wages', 'total_wages',
  'federal_withholding', 'state_withholding',
  'self_employment_income', 'interest_income', 'dividend_income',
  'capital_gains', 'retirement_income', 'social_security_benefits',
  'unemployment_income', 'other_income'
];

const adjustmentFields = [
  'ira_contributions', 'spouse_ira',
  'hsa_contributions', 'spouse_hsa',
  'student_loan_interest', 'educator_expenses',
  'self_employment_tax_deduction', 'total_adjustments'
];

const deductionFields = [
  'deduction_type', 'standard_deduction', 'itemized_total',
  'medical_expenses', 'state_local_taxes', 
  'mortgage_interest', 'charitable_contributions'
];

const dependentCountFields = [
  'has_dependents', 'dependent_count', 
  'qualifying_children_under_17', 'children_under_6', 'other_dependents'
];

// ============================================================
// GET SESSION - Supports multiple lookup methods
// ============================================================
export async function getSession(identifier, sessionId = null) {
  try {
    let session = null;
    
    // If sessionId provided, use odoo_id + sessionId
    if (sessionId) {
      session = await TaxSession.findOne({ odoo_id: identifier, sessionId });
    } else {
      // Try by odoo_id first, then by sessionId, then by userId
      session = await TaxSession.findOne({ odoo_id: identifier }) ||
                await TaxSession.findOne({ sessionId: identifier }) ||
                await TaxSession.findOne({ userId: identifier });
    }
    
    if (!session) {
      session = new TaxSession({
        odoo_id: sessionId ? identifier : (identifier || 'default'),
        sessionId: sessionId || identifier || `session_${Date.now()}`,
        userId: identifier,
        answers: new Map(),
        normalizedData: {
          personal: {},
          income: {},
          adjustments: {},
          deductions: { type: 'standard' },
          dependents: [],
          credits: {},
          results: {}
        },
        conversationHistory: []
      });
      await session.save();
      console.log(`✅ [SessionDB] Created new session for: ${identifier}`);
    }
    
    return session;
  } catch (err) {
    console.error('[SessionDB] getSession error:', err);
    throw err;
  }
}

// ============================================================
// GET OR CREATE SESSION - Alias
// ============================================================
export async function getOrCreateSession(identifier, sessionId) {
  return getSession(identifier, sessionId);
}

// ============================================================
// SYNC TO NORMALIZED DATA
// ============================================================
function syncToNormalizedData(session, key, value) {
  if (!session.normalizedData) {
    session.normalizedData = {
      personal: {},
      income: {},
      adjustments: {},
      deductions: { type: 'standard' },
      dependents: [],
      credits: {},
      results: {}
    };
  }
  
  // Personal fields
  if (personalFields.includes(key)) {
    session.normalizedData.personal[key] = value;
  }
  
  // Income fields
  if (incomeFields.includes(key)) {
    session.normalizedData.income[key] = parseFloat(value) || 0;
  }
  
  // Adjustment fields
  if (adjustmentFields.includes(key)) {
    session.normalizedData.adjustments[key] = parseFloat(value) || 0;
  }
  
  // Deduction fields
  if (deductionFields.includes(key)) {
    if (key === 'deduction_type') {
      session.normalizedData.deductions.type = value;
    } else {
      session.normalizedData.deductions[key] = parseFloat(value) || 0;
    }
  }
  
  // Dependent count fields
  if (dependentCountFields.includes(key)) {
    if (key === 'has_dependents') {
      session.normalizedData.has_dependents = value === true || value === 'yes' || value === 'true';
    } else {
      session.normalizedData[key] = parseInt(value) || 0;
    }
  }
}

// ============================================================
// SAVE ANSWER
// ============================================================
export async function saveAnswer(identifier, sessionIdOrKey, keyOrValue, maybeValue) {
  try {
    let session, key, value;
    
    // Handle different call signatures
    if (maybeValue !== undefined) {
      // saveAnswer(odoo_id, sessionId, key, value)
      session = await getSession(identifier, sessionIdOrKey);
      key = keyOrValue;
      value = maybeValue;
    } else {
      // saveAnswer(identifier, key, value)
      session = await getSession(identifier);
      key = sessionIdOrKey;
      value = keyOrValue;
    }
    
    session.answers.set(key, value);
    syncToNormalizedData(session, key, value);
    
    session.metadata = session.metadata || {};
    session.metadata.updatedAt = new Date();
    session.markModified('answers');
    session.markModified('normalizedData');
    
    await session.save();
    console.log(`✅ [SessionDB] Saved: ${key} = ${JSON.stringify(value).substring(0, 50)}`);
    return session;
    
  } catch (err) {
    console.error('[SessionDB] saveAnswer error:', err);
    throw err;
  }
}

// ============================================================
// SAVE ANSWERS (Batch)
// ============================================================
export async function saveAnswers(identifier, sessionIdOrAnswers, maybeAnswers) {
  try {
    let session, answers;
    
    if (maybeAnswers !== undefined) {
      session = await getSession(identifier, sessionIdOrAnswers);
      answers = maybeAnswers;
    } else {
      session = await getSession(identifier);
      answers = sessionIdOrAnswers;
    }
    
    for (const [key, value] of Object.entries(answers)) {
      session.answers.set(key, value);
      syncToNormalizedData(session, key, value);
    }
    
    session.metadata = session.metadata || {};
    session.metadata.updatedAt = new Date();
    session.markModified('answers');
    session.markModified('normalizedData');
    
    await session.save();
    console.log(`✅ [SessionDB] Saved ${Object.keys(answers).length} answers`);
    return session;
    
  } catch (err) {
    console.error('[SessionDB] saveAnswers error:', err);
    throw err;
  }
}

// ============================================================
// GET ANSWER
// ============================================================
export async function getAnswer(identifier, sessionIdOrKey, maybeKey) {
  try {
    let session, key;
    
    if (maybeKey !== undefined) {
      session = await getSession(identifier, sessionIdOrKey);
      key = maybeKey;
    } else {
      session = await getSession(identifier);
      key = sessionIdOrKey;
    }
    
    return session.answers.get(key);
  } catch (err) {
    console.error('[SessionDB] getAnswer error:', err);
    return null;
  }
}

// ============================================================
// GET ALL ANSWERS
// ============================================================
export async function getAllAnswers(identifier, sessionId) {
  try {
    const session = await getSession(identifier, sessionId);
    return Object.fromEntries(session.answers);
  } catch (err) {
    console.error('[SessionDB] getAllAnswers error:', err);
    return {};
  }
}

// ============================================================
// ✅ GET PERSONAL INFO - For taxRoutes.js
// ============================================================
export async function getPersonalInfo(identifier, sessionId) {
  try {
    const session = await getSession(identifier, sessionId);
    const personal = session.normalizedData?.personal || {};
    const answers = session.answers || new Map();
    
    // Helper to get from answers Map
    const getAns = (key) => {
      if (answers instanceof Map) return answers.get(key);
      return answers[key];
    };
    
    return {
      first_name: personal.first_name || getAns('first_name') || '',
      last_name: personal.last_name || getAns('last_name') || '',
      ssn: personal.ssn || getAns('ssn') || '',
      filing_status: personal.filing_status || getAns('filing_status') || '',
      taxpayer_dob: personal.taxpayer_dob || getAns('taxpayer_dob') || '',
      spouse_dob: personal.spouse_dob || getAns('spouse_dob') || '',
      taxpayer_65_plus: personal.taxpayer_65_plus || false,
      spouse_65_plus: personal.spouse_65_plus || false,
      taxpayer_blind: personal.taxpayer_blind || false,
      spouse_blind: personal.spouse_blind || false,
      taxpayer_50_plus: personal.taxpayer_50_plus || false,
      spouse_50_plus: personal.spouse_50_plus || false,
      spouse_first_name: personal.spouse_first_name || getAns('spouse_first_name') || '',
      spouse_last_name: personal.spouse_last_name || getAns('spouse_last_name') || '',
      spouse_ssn: personal.spouse_ssn || getAns('spouse_ssn') || '',
      address: personal.address || getAns('address') || '',
      city: personal.city || getAns('city') || '',
      state: personal.state || getAns('state') || '',
      zip: personal.zip || getAns('zip') || '',
      phone: personal.phone || getAns('phone') || '',
      email: personal.email || getAns('email') || ''
    };
  } catch (err) {
    console.error('[SessionDB] getPersonalInfo error:', err);
    return {};
  }
}

// ============================================================
// ✅ UPDATE PERSONAL INFO - For taxRoutes.js
// ============================================================
export async function updatePersonalInfo(identifier, sessionIdOrData, maybeData) {
  try {
    let session, data;
    
    if (maybeData !== undefined) {
      session = await getSession(identifier, sessionIdOrData);
      data = maybeData;
    } else {
      session = await getSession(identifier);
      data = sessionIdOrData;
    }
    
    if (!session.normalizedData) session.normalizedData = {};
    if (!session.normalizedData.personal) session.normalizedData.personal = {};
    
    // Update personal fields
    for (const [key, value] of Object.entries(data)) {
      if (personalFields.includes(key)) {
        session.normalizedData.personal[key] = value;
        session.answers.set(key, value);
      }
    }
    
    session.metadata = session.metadata || {};
    session.metadata.updatedAt = new Date();
    session.markModified('normalizedData');
    session.markModified('answers');
    
    await session.save();
    console.log(`✅ [SessionDB] Updated personal info`);
    return session.normalizedData.personal;
    
  } catch (err) {
    console.error('[SessionDB] updatePersonalInfo error:', err);
    throw err;
  }
}

// ============================================================
// ✅ GET DEPENDENTS - For taxRoutes.js
// ============================================================
export async function getDependents(identifier, sessionId) {
  try {
    const session = await getSession(identifier, sessionId);
    return session.normalizedData?.dependents || [];
  } catch (err) {
    console.error('[SessionDB] getDependents error:', err);
    return [];
  }
}

// ============================================================
// ✅ UPDATE DEPENDENT - For taxRoutes.js
// ============================================================
export async function updateDependent(identifier, sessionIdOrIndex, indexOrData, maybeData) {
  try {
    let session, index, data;
    
    if (maybeData !== undefined) {
      session = await getSession(identifier, sessionIdOrIndex);
      index = indexOrData;
      data = maybeData;
    } else {
      session = await getSession(identifier);
      index = sessionIdOrIndex;
      data = indexOrData;
    }
    
    if (!session.normalizedData) session.normalizedData = {};
    if (!session.normalizedData.dependents) session.normalizedData.dependents = [];
    
    // Calculate age from date_of_birth
    let age = data.age;
    if (data.date_of_birth && !age) {
      const dob = new Date(data.date_of_birth);
      const today = new Date();
      age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    }
    
    const dependent = {
      first_name: data.first_name || '',
      last_name: data.last_name || '',
      name: data.name || `${data.first_name || ''} ${data.last_name || ''}`.trim(),
      ssn: data.ssn || '',
      date_of_birth: data.date_of_birth || '',
      age: age,
      relationship: data.relationship || '',
      qualifies_for_child_credit: age !== null && age < 17,
      qualifies_for_other_dependent_credit: age !== null && age >= 17
    };
    
    if (index !== undefined && index < session.normalizedData.dependents.length) {
      session.normalizedData.dependents[index] = dependent;
    } else {
      session.normalizedData.dependents.push(dependent);
    }
    
    // Update dependent counts
    const deps = session.normalizedData.dependents;
    session.normalizedData.dependent_count = deps.length;
    session.normalizedData.has_dependents = deps.length > 0;
    session.normalizedData.qualifying_children_under_17 = deps.filter(d => d.age !== null && d.age < 17).length;
    session.normalizedData.children_under_6 = deps.filter(d => d.age !== null && d.age < 6).length;
    session.normalizedData.other_dependents = deps.filter(d => d.age !== null && d.age >= 17).length;
    
    session.metadata = session.metadata || {};
    session.metadata.updatedAt = new Date();
    session.markModified('normalizedData');
    
    await session.save();
    console.log(`✅ [SessionDB] Updated dependent: ${dependent.name}`);
    return dependent;
    
  } catch (err) {
    console.error('[SessionDB] updateDependent error:', err);
    throw err;
  }
}

// ============================================================
// ✅ GET INCOME SUMMARY - For taxRoutes.js
// ============================================================
export async function getIncomeSummary(identifier, sessionId) {
  try {
    const session = await getSession(identifier, sessionId);
    const income = session.normalizedData?.income || {};
    const adjustments = session.normalizedData?.adjustments || {};
    
    return {
      wages: income.wages || 0,
      spouse_wages: income.spouse_wages || 0,
      total_wages: income.total_wages || (income.wages || 0) + (income.spouse_wages || 0),
      federal_withholding: income.federal_withholding || 0,
      state_withholding: income.state_withholding || 0,
      self_employment_income: income.self_employment_income || 0,
      interest_income: income.interest_income || 0,
      dividend_income: income.dividend_income || 0,
      capital_gains: income.capital_gains || 0,
      retirement_income: income.retirement_income || 0,
      social_security_benefits: income.social_security_benefits || 0,
      unemployment_income: income.unemployment_income || 0,
      other_income: income.other_income || 0,
      ira_contributions: adjustments.ira_contributions || 0,
      spouse_ira: adjustments.spouse_ira || 0,
      hsa_contributions: adjustments.hsa_contributions || 0,
      student_loan_interest: adjustments.student_loan_interest || 0,
      w2s: income.w2s || [],
      form1099s: income.form1099s || []
    };
  } catch (err) {
    console.error('[SessionDB] getIncomeSummary error:', err);
    return {};
  }
}

// ============================================================
// UPDATE PHASE
// ============================================================
export async function updatePhase(identifier, sessionIdOrPhase, maybePhase) {
  try {
    let session, phase;
    
    if (maybePhase !== undefined) {
      session = await getSession(identifier, sessionIdOrPhase);
      phase = maybePhase;
    } else {
      session = await getSession(identifier);
      phase = sessionIdOrPhase;
    }
    
    session.currentPhase = phase;
    session.metadata = session.metadata || {};
    session.metadata.updatedAt = new Date();
    
    await session.save();
    console.log(`✅ [SessionDB] Phase updated: ${phase}`);
    return session;
    
  } catch (err) {
    console.error('[SessionDB] updatePhase error:', err);
    throw err;
  }
}

// ============================================================
// ADD TO HISTORY
// ============================================================
export async function addToHistory(identifier, sessionIdOrRole, roleOrContent, maybeContent) {
  try {
    let session, role, content;
    
    if (maybeContent !== undefined) {
      session = await getSession(identifier, sessionIdOrRole);
      role = roleOrContent;
      content = maybeContent;
    } else {
      session = await getSession(identifier);
      role = sessionIdOrRole;
      content = roleOrContent;
    }
    
    session.conversationHistory.push({
      role,
      content,
      timestamp: new Date()
    });
    
    session.metadata = session.metadata || {};
    session.metadata.lastActivity = new Date();
    session.markModified('conversationHistory');
    
    await session.save();
    return session;
    
  } catch (err) {
    console.error('[SessionDB] addToHistory error:', err);
    throw err;
  }
}

// ============================================================
// GET NORMALIZED DATA
// ============================================================
export async function getNormalizedData(identifier, sessionId) {
  try {
    const session = await getSession(identifier, sessionId);
    return session.normalizedData || {
      personal: {},
      income: {},
      adjustments: {},
      deductions: { type: 'standard' },
      dependents: [],
      credits: {},
      results: {}
    };
  } catch (err) {
    console.error('[SessionDB] getNormalizedData error:', err);
    return {};
  }
}

// ============================================================
// BUILD TAX INPUT - For Python tax calculator
// ============================================================
export async function buildTaxInput(identifier, sessionId) {
  try {
    const session = await getSession(identifier, sessionId);
    const nd = session.normalizedData || {};
    const personal = nd.personal || {};
    const income = nd.income || {};
    const adjustments = nd.adjustments || {};
    const deductions = nd.deductions || {};
    
    return {
      // Personal Info
      first_name: personal.first_name || '',
      last_name: personal.last_name || '',
      ssn: personal.ssn || '',
      filing_status: personal.filing_status || 'single',
      address: personal.address || '',
      city: personal.city || '',
      zip: personal.zip || '',
      
      // Income
      wages: income.wages || 0,
      spouse_wages: income.spouse_wages || 0,
      total_wages: income.total_wages || (income.wages || 0) + (income.spouse_wages || 0),
      self_employment_income: income.self_employment_income || 0,
      interest_income: income.interest_income || 0,
      dividend_income: income.dividend_income || 0,
      capital_gains: income.capital_gains || 0,
      retirement_income: income.retirement_income || 0,
      social_security_benefits: income.social_security_benefits || 0,
      unemployment_income: income.unemployment_income || 0,
      other_income: income.other_income || 0,
      
      // Withholding
      federal_withholding: income.federal_withholding || 0,
      state_withholding: income.state_withholding || 0,
      ira_contributions: adjustments.ira_contributions || 0,
      spouse_ira: adjustments.spouse_ira || 0,
      hsa_contributions: adjustments.hsa_contributions || 0,
      spouse_hsa: adjustments.spouse_hsa || 0,
      student_loan_interest: adjustments.student_loan_interest || 0,
      itemized_deductions: deductions.type === 'itemized' ? deductions.itemized_total : 0,
      has_dependents: nd.has_dependents,
      dependents: nd.dependents || [],
      qualifying_children_under_17: nd.qualifying_children_under_17 || 0,
      children_under_6: nd.children_under_6 || 0,
      other_dependents: nd.other_dependents || 0,
      // Spouse info for Form 1040
      spouse_first_name: personal.spouse_first_name || '',
      spouse_last_name: personal.spouse_last_name || '',
      spouse_ssn: personal.spouse_ssn || '',
      taxpayer_dob: personal.taxpayer_dob || null,
      spouse_dob: personal.spouse_dob || null,
      taxpayer_65_plus: personal.taxpayer_65_plus || false,
      spouse_65_plus: personal.spouse_65_plus || false,
      taxpayer_blind: personal.taxpayer_blind || false,
      spouse_blind: personal.spouse_blind || false,
      taxpayer_50_plus: personal.taxpayer_50_plus || false,
      spouse_50_plus: personal.spouse_50_plus || false,
      state: personal.state || 'CA'
    };
    
  } catch (err) {
    console.error('[SessionDB] buildTaxInput error:', err);
    throw err;
  }
}

// ============================================================
// SAVE FORM DATA - For form submissions (W-2, 1099, etc.)
// ============================================================
export async function saveFormData(identifier, sessionIdOrFormType, formTypeOrData, maybeFormData) {
  try {
    let session, formType, formData;
    
    if (maybeFormData !== undefined) {
      session = await getSession(identifier, sessionIdOrFormType);
      formType = formTypeOrData;
      formData = maybeFormData;
    } else {
      session = await getSession(identifier);
      formType = sessionIdOrFormType;
      formData = formTypeOrData;
    }
    
    const formKey = `${formType.toLowerCase().replace(/-/g, '_')}_data`;
    session.answers.set(formKey, formData);
    
    if (!session.normalizedData) session.normalizedData = {};
    if (!session.normalizedData.income) session.normalizedData.income = {};
    
    if (formType === 'W-2' || formType === 'W2') {
      const wages = parseFloat(formData.wages) || 0;
      const fedWithholding = parseFloat(formData.federal_withholding || formData.federalWithholding) || 0;
      const stateWithholding = parseFloat(formData.state_withholding || formData.stateWithholding) || 0;
      
      session.normalizedData.income.wages = (session.normalizedData.income.wages || 0) + wages;
      session.normalizedData.income.total_wages = (session.normalizedData.income.total_wages || 0) + wages;
      session.normalizedData.income.federal_withholding = (session.normalizedData.income.federal_withholding || 0) + fedWithholding;
      session.normalizedData.income.state_withholding = (session.normalizedData.income.state_withholding || 0) + stateWithholding;
    }
    
    if (formType === '1099-NEC' || formType === '1099NEC') {
      const amount = parseFloat(formData.nonemployee_compensation || formData.amount) || 0;
      session.normalizedData.income.self_employment_income = (session.normalizedData.income.self_employment_income || 0) + amount;
    }
    
    if (formType === '1099-INT' || formType === '1099INT') {
      const amount = parseFloat(formData.interest_income || formData.amount) || 0;
      session.normalizedData.income.interest_income = (session.normalizedData.income.interest_income || 0) + amount;
    }
    
    if (formType === '1099-DIV' || formType === '1099DIV') {
      const amount = parseFloat(formData.ordinary_dividends || formData.amount) || 0;
      session.normalizedData.income.dividend_income = (session.normalizedData.income.dividend_income || 0) + amount;
    }
    
    session.metadata = session.metadata || {};
    session.metadata.updatedAt = new Date();
    session.markModified('answers');
    session.markModified('normalizedData');
    
    await session.save();
    console.log(`✅ [SessionDB] Saved form data: ${formType}`);
    return session;
    
  } catch (err) {
    console.error('[SessionDB] saveFormData error:', err);
    throw err;
  }
}

// ============================================================
// RESET SESSION
// ============================================================
export async function resetSession(identifier, sessionId) {
  try {
    if (sessionId) {
      await TaxSession.deleteOne({ odoo_id: identifier, sessionId });
    } else {
      await TaxSession.deleteOne({ 
        $or: [
          { odoo_id: identifier },
          { sessionId: identifier },
          { userId: identifier }
        ]
      });
    }
    console.log(`✅ [SessionDB] Session reset: ${identifier}`);
    return true;
  } catch (err) {
    console.error('[SessionDB] resetSession error:', err);
    return false;
  }
}

// ============================================================
// CLEAR SESSION - Alias for resetSession
// ============================================================
export async function clearSession(identifier, sessionId) {
  return resetSession(identifier, sessionId);
}

// ============================================================
// UPDATE SESSION - Generic update
// ============================================================
export async function updateSession(identifier, sessionIdOrUpdates, maybeUpdates) {
  try {
    let session, updates;
    
    if (maybeUpdates !== undefined) {
      session = await getSession(identifier, sessionIdOrUpdates);
      updates = maybeUpdates;
    } else {
      session = await getSession(identifier);
      updates = sessionIdOrUpdates;
    }
    
    for (const [key, value] of Object.entries(updates)) {
      if (key === 'answers' && typeof value === 'object') {
        for (const [answerKey, answerValue] of Object.entries(value)) {
          session.answers.set(answerKey, answerValue);
          syncToNormalizedData(session, answerKey, answerValue);
        }
      } else {
        session[key] = value;
      }
    }
    
    session.metadata = session.metadata || {};
    session.metadata.updatedAt = new Date();
    session.markModified('answers');
    session.markModified('normalizedData');
    
    await session.save();
    return session;
  } catch (err) {
    console.error('[SessionDB] updateSession error:', err);
    throw err;
  }
}

// ============================================================
// GET SESSION DATA - Returns full session object
// ============================================================
export async function getSessionData(identifier, sessionId) {
  try {
    const session = await getSession(identifier, sessionId);
    return {
      odoo_id: session.odoo_id,
      sessionId: session.sessionId,
      userId: session.userId,
      language: session.language,
      currentPhase: session.currentPhase,
      answers: Object.fromEntries(session.answers),
      normalizedData: session.normalizedData,
      conversationHistory: session.conversationHistory,
      metadata: session.metadata
    };
  } catch (err) {
    console.error('[SessionDB] getSessionData error:', err);
    return null;
  }
}

// ============================================================
// EXPORTS - All functions
// ============================================================
export default {
  getSession,
  getOrCreateSession,
  saveAnswer,
  saveAnswers,
  getAnswer,
  getAllAnswers,
  getPersonalInfo,      // ✅ NEW
  updatePersonalInfo,   // ✅ NEW
  getDependents,        // ✅ NEW
  updateDependent,      // ✅ NEW
  getIncomeSummary,     // ✅ NEW
  updatePhase,
  addToHistory,
  getNormalizedData,
  buildTaxInput,
  saveFormData,
  resetSession,
  clearSession,
  updateSession,
  getSessionData
};