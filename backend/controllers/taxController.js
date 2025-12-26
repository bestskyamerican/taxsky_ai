// ============================================================
// TAX CONTROLLER - FIXED VERSION
// ============================================================
// Exports: calculateTaxes, getTaxRefund, handleChat, handleFormUploaded
// Uses: federalCalculator.js + californiaEngine.js
// ============================================================

import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import {
  getSession,
  saveMessage,
  saveAnswer
} from "../tax/sessionDB.js";

import { calculateFederalTax } from "../tax/federal/federalCalculator.js";
import { calculateCalifornia } from "../tax/fedwral/californiaEngine.js";


//import { calculateFederalTax } from "../tax/federal/federalCalculator.js";
// ============================================================
// PARSE AMOUNT HELPER
// ============================================================
function parseAmount(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value.amount !== undefined) {
    return Number(value.amount) || 0;
  }
  const cleaned = String(value).replace(/[$,\s]/g, '').trim();
  return parseFloat(cleaned) || 0;
}

// ============================================================
// CALCULATE FULL TAX (Federal + State)
// ============================================================
function calculateFullTax(session, state = 'CA') {
  let federal, stateResult;
  
  try {
    federal = calculateFederalTax(session);
  } catch (err) {
    console.error('Federal calc error:', err.message);
    federal = {
      filingStatus: 'single',
      totalIncome: 0,
      agi: 0,
      standardDeduction: 14600,
      taxableIncome: 0,
      federalTax: 0,
      seTax: 0,
      childTaxCredit: 0,
      totalTaxOwed: 0,
      withholding: 0,
      totalPayments: 0,
      estimatedRefund: 0,
      details: {}
    };
  }
  
  try {
    stateResult = state === 'CA' ? calculateCalifornia(session) : { refund: 0, taxDue: 0, supported: false };
  } catch (err) {
    console.error('State calc error:', err.message);
    stateResult = { refund: 0, taxDue: 0, supported: false };
  }
  
  const federalRefund = federal.estimatedRefund > 0 ? federal.estimatedRefund : 0;
  const federalOwed = federal.estimatedRefund < 0 ? Math.abs(federal.estimatedRefund) : 0;
  
  return {
    federal: {
      ...federal,
      refund: federalRefund,
      taxDue: federalOwed
    },
    state: stateResult,
    totalRefund: federalRefund + (stateResult.refund || 0),
    totalTaxDue: federalOwed + (stateResult.taxDue || 0)
  };
}

// ============================================================
// POST /api/tax/calculate - Calculate taxes
// ============================================================
export async function calculateTaxes(req, res) {
  try {
    const { userId = "user1", state = "CA" } = req.body;
    
    console.log(`🧮 Calculating taxes for ${userId}`);
    
    const session = await getSession(userId);
    const tax = calculateFullTax(session, state);
    
    console.log(`💰 Results: Refund=$${tax.totalRefund}, Owed=$${tax.totalTaxDue}`);
    
    return res.json({
      success: true,
      userId,
      tax,
      federal: tax.federal,
      state: tax.state,
      totalRefund: tax.totalRefund,
      totalTaxDue: tax.totalTaxDue
    });
    
  } catch (err) {
    console.error("❌ Calculate error:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}

// ============================================================
// GET /api/tax/refund - Get current refund estimate
// ============================================================
export async function getTaxRefund(req, res) {
  try {
    const userId = req.query.userId || "user1";
    
    const session = await getSession(userId);
    const tax = calculateFullTax(session, "CA");
    
    return res.json({
      success: true,
      userId,
      federalRefund: tax.federal.refund || 0,
      federalOwed: tax.federal.taxDue || 0,
      stateRefund: tax.state?.refund || 0,
      stateOwed: tax.state?.taxDue || 0,
      totalRefund: tax.totalRefund,
      totalOwed: tax.totalTaxDue,
      estimatedRefund: tax.totalRefund - tax.totalTaxDue
    });
    
  } catch (err) {
    console.error("❌ Refund error:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}

// ============================================================
// REQUIRED FIELDS
// ============================================================
const REQUIRED_FIELDS = [
  "first_name",
  "last_name",
  "ssn",
  "filing_status",
  "dependents"
];

// ============================================================
// GET MISSING FIELDS
// ============================================================
function getMissing(session) {
  const ans = session.answers || new Map();
  
  const getValue = (key) => {
    if (ans instanceof Map) return ans.get(key);
    return ans[key];
  };
  
  const missing = REQUIRED_FIELDS.filter(field => {
    const value = getValue(field);
    return !value || value === '' || value === null;
  });
  
  // Check income
  const wages = getValue('total_wages') || getValue('w2_income') || 0;
  const interest = getValue('total_interest') || getValue('interest_income') || 0;
  const se = getValue('total_self_employment') || getValue('self_employed_income') || 0;
  
  if (wages === 0 && interest === 0 && se === 0) {
    missing.push('w2_income');
  }
  
  return missing;
}

// ============================================================
// QUESTION TEXT
// ============================================================
function questionFor(field) {
  const questions = {
    first_name: "What is your first name?",
    last_name: "What is your last name?",
    ssn: "What is your Social Security Number?",
    filing_status: "What is your filing status?\n• Single\n• Married Filing Jointly\n• Married Filing Separately\n• Head of Household",
    dependents: "How many dependents do you have? (Enter 0 if none)",
    w2_income: "How much W-2 wage income did you earn? (You can also upload your W-2)",
    self_employed_income: "How much 1099/self-employment income? (Enter 0 if none)",
    interest_income: "How much interest income? (Enter 0 if none)",
    withholding: "How much federal tax was withheld?"
  };
  return questions[field] || `Please provide your ${field.replace(/_/g, ' ')}`;
}

// ============================================================
// NORMALIZE FILING STATUS
// ============================================================
function normalizeFilingStatus(value) {
  if (!value || typeof value !== 'string') return 'single';
  
  const v = value.toLowerCase().trim().replace(/\s+/g, '_');
  
  const map = {
    'single': 'single', 's': 'single',
    'married': 'married_filing_jointly',
    'married_filing_jointly': 'married_filing_jointly',
    'mfj': 'married_filing_jointly', 'joint': 'married_filing_jointly',
    'married_filing_separately': 'married_filing_separately',
    'mfs': 'married_filing_separately', 'separate': 'married_filing_separately',
    'head_of_household': 'head_of_household',
    'hoh': 'head_of_household', 'head': 'head_of_household'
  };
  
  return map[v] || 'single';
}

// ============================================================
// W-2 PARSER (handles all formats)
// ============================================================
function parseW2(w2Data) {
  // Wages
  const wages = parseAmount(
    w2Data['Wages, tips, other compensation'] ||
    w2Data['Wages, tips, other comp.'] ||
    w2Data.wages_tips_other_comp ||
    w2Data.wages || 0
  );
  
  // Withholding
  const withheld = parseAmount(
    w2Data['Federal Income Tax Withheld'] ||
    w2Data['Federal income tax withheld'] ||
    w2Data.federal_income_tax_withheld || 0
  );
  
  // State
  const stateWages = parseAmount(
    w2Data['State Wages, Tips, Etc.'] ||
    w2Data.state_wages_tips || w2Data.state_wages || 0
  );
  const stateWithheld = parseAmount(
    w2Data['State income tax'] ||
    w2Data.state_income_tax || 0
  );
  
  // Name
  let employeeName = w2Data["Employee's Name"] ||
    w2Data["Employee's name"] ||
    w2Data["Employee's name, address, and ZIP code"]?.name ||
    w2Data.employee_name || '';
  
  let firstName = '', lastName = '';
  if (employeeName) {
    const parts = employeeName.trim().split(/\s+/);
    firstName = parts[0] || '';
    lastName = parts.slice(1).join(' ') || '';
  }
  
  // SSN
  const ssn = w2Data["Employee's SSA Number"] ||
    w2Data.employee_ssa_number ||
    w2Data.employee_ssn || w2Data.ssn || '';
  
  // Address
  let address = '', city = '', state = '', zip = '';
  if (w2Data["Employee's name, address, and ZIP code"]?.address) {
    const addr = w2Data["Employee's name, address, and ZIP code"];
    address = addr.address || '';
    city = addr.city || '';
    state = addr.state || '';
    zip = addr.zip || '';
  } else if (w2Data.employee_address) {
    const match = w2Data.employee_address.match(/^(.+?),\s*(.+?),\s*([A-Z]{2})\s*(\d{5})/);
    if (match) {
      address = match[1]; city = match[2]; state = match[3]; zip = match[4];
    } else {
      address = w2Data.employee_address;
    }
  }
  city = city || w2Data.employee_city || '';
  state = state || w2Data.employee_state || '';
  zip = zip || w2Data.employee_zip || '';
  
  return {
    first_name: firstName, last_name: lastName, ssn,
    address, city, state, zip,
    total_wages: wages, total_withheld: withheld,
    w2_income: wages, withholding: withheld,
    state_wages: stateWages, total_state_withheld: stateWithheld,
    employer_name: w2Data["Employer's Name"] || w2Data.employer_name || ''
  };
}

// ============================================================
// MAP FORMS TO ANSWERS
// ============================================================
function mapFormsToAnswers(session) {
  const forms = session.forms || new Map();
  let mapped = {};
  
  const process = (type, data) => {
    if (type === 'W2' || type === 'W-2') {
      mapped = { ...mapped, ...parseW2(data) };
    } else if (type === '1099-NEC') {
      mapped.self_employed_income = parseAmount(data.nonemployee_compensation || data.box1 || 0);
      mapped.total_self_employment = mapped.self_employed_income;
    } else if (type === '1099-INT') {
      mapped.interest_income = parseAmount(data.interest_income || data.box1 || 0);
      mapped.total_interest = mapped.interest_income;
    }
  };
  
  if (forms instanceof Map) {
    forms.forEach((arr, type) => {
      if (Array.isArray(arr)) arr.forEach(d => process(type, d));
      else process(type, arr);
    });
  }
  
  return mapped;
}

// ============================================================
// GENERATE SUMMARY
// ============================================================
function generateSummary(tax) {
  const fed = tax.federal || {};
  const state = tax.state || {};
  
  let s = `📊 **Tax Summary**\n\n`;
  s += `**Federal:**\n`;
  s += `• Income: $${(fed.totalIncome || 0).toLocaleString()}\n`;
  s += `• Taxable: $${(fed.taxableIncome || 0).toLocaleString()}\n`;
  s += `• Tax: $${(fed.federalTax || 0).toLocaleString()}\n`;
  s += `• Withheld: $${(fed.withholding || 0).toLocaleString()}\n`;
  
  if (fed.childTaxCredit > 0) s += `• Child Credit: -$${fed.childTaxCredit.toLocaleString()}\n`;
  if (fed.seTax > 0) s += `• SE Tax: $${fed.seTax.toLocaleString()}\n`;
  
  s += `\n**California:**\n`;
  s += `• CA Tax: $${(state.caTax || 0).toLocaleString()}\n`;
  if (state.calEitc > 0) s += `• CalEITC: $${state.calEitc.toLocaleString()}\n`;
  
  s += `\n━━━━━━━━━━━━━━━━━━━━━━\n`;
  if (tax.totalRefund > 0) {
    s += `✅ **Refund: $${tax.totalRefund.toLocaleString()}** 🎉\n`;
  } else if (tax.totalTaxDue > 0) {
    s += `⚠️ **Owed: $${tax.totalTaxDue.toLocaleString()}**\n`;
  }
  
  return s;
}

// ============================================================
// MAIN CHAT HANDLER
// ============================================================
export async function handleChat(req, res) {
  try {
    const { userId = "user1", message = "" } = req.body;
    
    console.log(`💬 Chat from ${userId}: "${message}"`);
    
    let session = await getSession(userId);
    await saveMessage(userId, "user", message);
    
    const trimmed = message.trim();
    const lastField = session.lastQuestionField || null;
    
    // Save answer
    if (lastField && trimmed) {
      let value = trimmed;
      if (lastField === 'filing_status') value = normalizeFilingStatus(value);
      else if (['dependents', 'w2_income', 'self_employed_income', 'interest_income', 'withholding'].includes(lastField)) {
        value = parseAmount(value);
      }
      
      await saveAnswer(userId, lastField, value);
      session.lastQuestionField = null;
      await session.save();
    }
    
    session = await getSession(userId);
    
    // Map forms
    const formData = mapFormsToAnswers(session);
    for (const [k, v] of Object.entries(formData)) {
      if (v !== null && v !== '' && v !== 0) {
        await saveAnswer(userId, k, v);
      }
    }
    
    session = await getSession(userId);
    const missing = getMissing(session);
    
    if (missing.length > 0) {
      const next = missing[0];
      const q = questionFor(next);
      session.lastQuestionField = next;
      await session.save();
      await saveMessage(userId, "ai", q);
      
      return res.json({
        reply: q,
        refund: 0,
        missingFields: missing,
        suggestions: ["Continue", "Upload W-2"]
      });
    }
    
    // Calculate
    const tax = calculateFullTax(session, "CA");
    const summary = generateSummary(tax);
    await saveMessage(userId, "ai", summary);
    
    return res.json({
      reply: summary,
      refund: tax.totalRefund || 0,
      taxCalculation: tax,
      suggestions: ["Download 1040", "Start Over"]
    });
    
  } catch (err) {
    console.error("❌ Chat error:", err);
    return res.status(500).json({ error: err.message });
  }
}

// ============================================================
// HANDLE FORM UPLOAD
// ============================================================
export async function handleFormUploaded(req, res) {
  try {
    const { userId = "user1", formType, extractedData } = req.body;
    
    let mapped = {};
    if (formType === 'W-2' || formType === 'W2') {
      mapped = parseW2(extractedData);
    } else if (formType === '1099-NEC') {
      mapped = { self_employed_income: parseAmount(extractedData.nonemployee_compensation || 0) };
    } else if (formType === '1099-INT') {
      mapped = { interest_income: parseAmount(extractedData.interest_income || 0) };
    }
    
    for (const [k, v] of Object.entries(mapped)) {
      if (v !== null && v !== '' && v !== 0) {
        await saveAnswer(userId, k, v);
      }
    }
    
    const session = await getSession(userId);
    const missing = getMissing(session);
    
    let reply = `✅ ${formType} processed!\n\n`;
    if (missing.length > 0) {
      reply += `Still need: ${missing.join(', ')}\n\n${questionFor(missing[0])}`;
      session.lastQuestionField = missing[0];
      await session.save();
    } else {
      reply += `Ready to calculate taxes!`;
    }
    
    await saveMessage(userId, "ai", reply);
    res.json({ success: true, reply, mapped, missingFields: missing });
    
  } catch (err) {
    console.error("❌ Upload error:", err);
    res.status(500).json({ error: err.message });
  }
}

// ============================================================
// EXPORTS
// ============================================================
export { calculateFullTax, parseW2, parseAmount, normalizeFilingStatus };

export default {
  calculateTaxes,
  getTaxRefund,
  handleChat,
  handleFormUploaded,
  calculateFullTax
};