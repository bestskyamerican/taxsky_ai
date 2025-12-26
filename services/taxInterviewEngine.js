// ============================================================
// IRS 1040 ROUTES - PDF GENERATION (v2.5 - WITH VALIDATION)
// ============================================================

import express from "express";
import fs from "fs";
import path from "path";
import { PDFDocument } from "pdf-lib";
import { getSession } from "../tax/sessionDB.js";

const router = express.Router();

// ============================================================
// REQUIRED FIELDS VALIDATION
// ============================================================
const REQUIRED_FIELDS = [
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'ssn', label: 'Social Security Number' },
  { key: 'address', label: 'Street Address' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'zip', label: 'ZIP Code' },
  { key: 'filing_status', label: 'Filing Status' },
];

const SPOUSE_REQUIRED_FIELDS = [
  { key: 'spouse_first_name', label: 'Spouse First Name' },
  { key: 'spouse_last_name', label: 'Spouse Last Name' },
];

function validateRequiredFields(answers, filingStatus) {
  const missing = [];
  
  const get = (key) => {
    if (answers instanceof Map) return answers.get(key);
    return answers[key];
  };
  
  // Check basic required fields
  for (const field of REQUIRED_FIELDS) {
    const value = get(field.key);
    if (!value || value === '' || value === null || value === undefined) {
      missing.push(field);
    }
  }
  
  // Check spouse fields if MFJ
  if (filingStatus === 'married_filing_jointly') {
    for (const field of SPOUSE_REQUIRED_FIELDS) {
      const value = get(field.key);
      if (!value || value === '' || value === null || value === undefined) {
        missing.push(field);
      }
    }
  }
  
  // Check for income
  const wages = parseFloat(get('total_wages')) || 0;
  const interest = parseFloat(get('total_interest')) || 0;
  const se = parseFloat(get('total_self_employment')) || 0;
  
  if (wages === 0 && interest === 0 && se === 0) {
    missing.push({ key: 'income', label: 'Income (W-2 or 1099)' });
  }
  
  return missing;
}

// ============================================================
// INLINE TAX CALCULATOR (2024 Tax Year)
// ============================================================
function calculateFederalTax(session) {
  const answers = session?.answers || new Map();
  
  const get = (key) => {
    if (answers instanceof Map) return answers.get(key);
    return answers[key];
  };
  const num = (key) => parseFloat(get(key)) || 0;
  
  const filingStatus = get("filing_status") || "single";
  const standardDeduction = filingStatus === "married_filing_jointly" ? 29200 : 
                            filingStatus === "head_of_household" ? 21900 : 14600;
  
  const w2Income = num("total_wages") + num("spouse_total_wages");
  const interest = num("total_interest");
  const dividends = num("total_dividends");
  const selfEmployment = num("total_self_employment");
  const totalIncome = w2Income + interest + dividends + selfEmployment;
  
  const seTaxDeduction = selfEmployment > 0 ? selfEmployment * 0.9235 * 0.153 * 0.5 : 0;
  const agi = totalIncome - seTaxDeduction;
  const taxableIncome = Math.max(0, agi - standardDeduction);
  
  // Tax brackets (2024)
  let federalTax = 0;
  if (filingStatus === "married_filing_jointly") {
    if (taxableIncome <= 23200) federalTax = taxableIncome * 0.10;
    else if (taxableIncome <= 94300) federalTax = 2320 + (taxableIncome - 23200) * 0.12;
    else if (taxableIncome <= 201050) federalTax = 10852 + (taxableIncome - 94300) * 0.22;
    else if (taxableIncome <= 383900) federalTax = 34337 + (taxableIncome - 201050) * 0.24;
    else if (taxableIncome <= 487450) federalTax = 78221 + (taxableIncome - 383900) * 0.32;
    else if (taxableIncome <= 731200) federalTax = 111357 + (taxableIncome - 487450) * 0.35;
    else federalTax = 196669 + (taxableIncome - 731200) * 0.37;
  } else if (filingStatus === "head_of_household") {
    if (taxableIncome <= 16550) federalTax = taxableIncome * 0.10;
    else if (taxableIncome <= 63100) federalTax = 1655 + (taxableIncome - 16550) * 0.12;
    else if (taxableIncome <= 100500) federalTax = 7241 + (taxableIncome - 63100) * 0.22;
    else if (taxableIncome <= 191950) federalTax = 15469 + (taxableIncome - 100500) * 0.24;
    else if (taxableIncome <= 243700) federalTax = 37417 + (taxableIncome - 191950) * 0.32;
    else if (taxableIncome <= 609350) federalTax = 53977 + (taxableIncome - 243700) * 0.35;
    else federalTax = 181954 + (taxableIncome - 609350) * 0.37;
  } else {
    if (taxableIncome <= 11600) federalTax = taxableIncome * 0.10;
    else if (taxableIncome <= 47150) federalTax = 1160 + (taxableIncome - 11600) * 0.12;
    else if (taxableIncome <= 100525) federalTax = 5426 + (taxableIncome - 47150) * 0.22;
    else if (taxableIncome <= 191950) federalTax = 17168 + (taxableIncome - 100525) * 0.24;
    else if (taxableIncome <= 243725) federalTax = 39110 + (taxableIncome - 191950) * 0.32;
    else if (taxableIncome <= 609350) federalTax = 55678 + (taxableIncome - 243725) * 0.35;
    else federalTax = 183647 + (taxableIncome - 609350) * 0.37;
  }
  federalTax = Math.round(federalTax);
  
  // SE Tax
  const seTax = selfEmployment > 400 ? Math.round(selfEmployment * 0.9235 * 0.153) : 0;
  
  // Child Tax Credit
  const dependents = parseInt(get("dependent_count")) || 0;
  const earnedIncome = w2Income + selfEmployment;
  const potentialCTC = dependents * 2000;
  const totalTaxBeforeCredits = federalTax + seTax;
  const nonRefundableCTC = Math.min(potentialCTC, totalTaxBeforeCredits);
  
  // Additional Child Tax Credit (refundable)
  let additionalCTC = 0;
  if (earnedIncome > 2500 && dependents > 0) {
    const unusedCTC = potentialCTC - nonRefundableCTC;
    const maxRefundable = dependents * 1700;
    additionalCTC = Math.min(unusedCTC, maxRefundable);
    const earnedIncomeLimit = Math.round((earnedIncome - 2500) * 0.15);
    additionalCTC = Math.min(additionalCTC, earnedIncomeLimit);
  }
  
  const taxAfterCredits = Math.max(0, totalTaxBeforeCredits - nonRefundableCTC);
  const totalTaxOwed = taxAfterCredits;
  
  const withholding = num("total_withheld") + num("spouse_total_withheld");
  const totalPayments = withholding + additionalCTC;
  const estimatedRefund = totalPayments - totalTaxOwed;
  
  return {
    filingStatus, totalIncome, agi, standardDeduction, taxableIncome,
    federalTax, seTax,
    childTaxCredit: nonRefundableCTC,
    additionalChildTaxCredit: additionalCTC,
    totalTaxOwed,
    withholding, totalPayments, estimatedRefund,
    details: { 
      w2Income, 
      interestIncome: interest, 
      necIncome: selfEmployment, 
      dependentCount: dependents, 
      adjustments: seTaxDeduction,
      potentialCTC,
      earnedIncome
    }
  };
}

// ============================================================
// PDF FIELD MAPPINGS
// ============================================================
const FIELDS = {
  firstName: "topmostSubform[0].Page1[0].f1_04[0]",
  lastName: "topmostSubform[0].Page1[0].f1_05[0]",
  ssn: "topmostSubform[0].Page1[0].f1_06[0]",
  spouseFirstName: "topmostSubform[0].Page1[0].f1_07[0]",
  spouseLastName: "topmostSubform[0].Page1[0].f1_08[0]",
  spouseSSN: "topmostSubform[0].Page1[0].f1_09[0]",
  address: "topmostSubform[0].Page1[0].Address_ReadOrder[0].f1_10[0]",
  apt: "topmostSubform[0].Page1[0].Address_ReadOrder[0].f1_11[0]",
  city: "topmostSubform[0].Page1[0].Address_ReadOrder[0].f1_12[0]",
  state: "topmostSubform[0].Page1[0].Address_ReadOrder[0].f1_13[0]",
  zip: "topmostSubform[0].Page1[0].Address_ReadOrder[0].f1_14[0]",
  single: "topmostSubform[0].Page1[0].FilingStatus_ReadOrder[0].c1_3[0]",
  mfj: "topmostSubform[0].Page1[0].FilingStatus_ReadOrder[0].c1_3[1]",
  mfs: "topmostSubform[0].Page1[0].FilingStatus_ReadOrder[0].c1_3[2]",
  hoh: "topmostSubform[0].Page1[0].c1_4[0]",
  digitalAssetsNo: "topmostSubform[0].Page1[0].c1_5[1]",
  dep1Relation: "topmostSubform[0].Page1[0].Table_Dependents[0].Row1[0].f1_22[0]",
  dep1CTC: "topmostSubform[0].Page1[0].Table_Dependents[0].Row1[0].c1_14[0]",
  dep2Relation: "topmostSubform[0].Page1[0].Table_Dependents[0].Row2[0].f1_25[0]",
  dep2CTC: "topmostSubform[0].Page1[0].Table_Dependents[0].Row2[0].c1_16[0]",
  line1a: "topmostSubform[0].Page1[0].f1_32[0]",
  line1z: "topmostSubform[0].Page1[0].f1_41[0]",
  line2b: "topmostSubform[0].Page1[0].f1_43[0]",
  line8: "topmostSubform[0].Page1[0].Line4a-11_ReadOrder[0].f1_53[0]",
  line9: "topmostSubform[0].Page1[0].Line4a-11_ReadOrder[0].f1_54[0]",
  line10: "topmostSubform[0].Page1[0].Line4a-11_ReadOrder[0].f1_55[0]",
  line11: "topmostSubform[0].Page1[0].Line4a-11_ReadOrder[0].f1_56[0]",
  line12: "topmostSubform[0].Page1[0].f1_57[0]",
  line14: "topmostSubform[0].Page1[0].f1_59[0]",
  line15: "topmostSubform[0].Page1[0].f1_60[0]",
  line16: "topmostSubform[0].Page2[0].f2_02[0]",
  line18: "topmostSubform[0].Page2[0].f2_04[0]",
  line19: "topmostSubform[0].Page2[0].f2_05[0]",
  line21: "topmostSubform[0].Page2[0].f2_07[0]",
  line22: "topmostSubform[0].Page2[0].f2_08[0]",
  line23: "topmostSubform[0].Page2[0].f2_09[0]",
  line24: "topmostSubform[0].Page2[0].f2_10[0]",
  line25a: "topmostSubform[0].Page2[0].f2_11[0]",
  line25d: "topmostSubform[0].Page2[0].f2_14[0]",
  line28: "topmostSubform[0].Page2[0].f2_17[0]",
  line32: "topmostSubform[0].Page2[0].f2_21[0]",
  line33: "topmostSubform[0].Page2[0].f2_22[0]",
  line34: "topmostSubform[0].Page2[0].f2_23[0]",
  line35a: "topmostSubform[0].Page2[0].f2_24[0]",
  line37: "topmostSubform[0].Page2[0].f2_28[0]",
  thirdPartyNo: "topmostSubform[0].Page2[0].c2_6[1]",
  firmName: "topmostSubform[0].Page2[0].f2_40[0]",
};

// Helpers
function setField(form, name, value) {
  try {
    if (value === null || value === undefined || value === '' || value === 0) return;
    const field = form.getTextField(name);
    if (field) field.setText(String(value));
  } catch (e) {}
}

function checkBox(form, name) {
  try {
    const field = form.getCheckBox(name);
    if (field) field.check();
  } catch (e) {}
}

function fmt(num) {
  if (!num || num === 0) return '';
  return Math.round(num).toLocaleString('en-US');
}

function get(answers, key) {
  if (!answers) return null;
  return answers instanceof Map ? answers.get(key) : answers[key];
}

// ============================================================
// GET /validate - Check if ready for PDF export
// ============================================================
router.get("/validate", async (req, res) => {
  try {
    const userId = req.query.userId || "user1";
    const session = await getSession(userId);
    const answers = session.answers || new Map();
    
    const getValue = (key) => {
      if (answers instanceof Map) return answers.get(key);
      return answers[key];
    };
    
    const filingStatus = getValue('filing_status') || 'single';
    const missing = validateRequiredFields(answers, filingStatus);
    
    if (missing.length > 0) {
      return res.json({
        ready: false,
        missingCount: missing.length,
        missingFields: missing.map(f => f.label),
        missingKeys: missing.map(f => f.key),
        message: `Please provide: ${missing.map(f => f.label).join(', ')}`
      });
    }
    
    return res.json({
      ready: true,
      message: "All required fields present. Ready to generate 1040."
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /fields - List PDF field names
// ============================================================
router.get("/fields", async (req, res) => {
  try {
    const pdfPaths = [
      path.join(process.cwd(), "pdf", "f1040.pdf"),
      path.join(process.cwd(), "uploads", "f1040.pdf"),
      path.join(process.cwd(), "forms", "f1040.pdf"),
      path.join(process.cwd(), "f1040.pdf"),
    ];
    
    let pdfPath = pdfPaths.find(p => fs.existsSync(p));
    if (!pdfPath) return res.status(404).json({ error: "f1040.pdf not found" });
    
    const pdfDoc = await PDFDocument.load(fs.readFileSync(pdfPath));
    const fields = pdfDoc.getForm().getFields();
    
    res.json({
      success: true,
      totalFields: fields.length,
      fields: fields.map(f => f.getName()).sort()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// ROUTES - Generate PDF
// ============================================================
router.get("/", async (req, res) => generate1040(req.query.userId, res));
router.post("/", async (req, res) => generate1040(req.body.userId, res));

async function generate1040(userId, res) {
  console.log("\n[1040] ========== PDF Generation Request ==========");
  console.log("[1040] User:", userId);
  
  try {
    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }
    
    const session = await getSession(userId);
    const answers = session.answers || new Map();
    
    const getValue = (key) => {
      if (answers instanceof Map) return answers.get(key);
      return answers[key];
    };
    
    const filingStatus = getValue('filing_status') || 'single';
    
    // ========== VALIDATION - CHECK REQUIRED FIELDS ==========
    const missing = validateRequiredFields(answers, filingStatus);
    
    if (missing.length > 0) {
      console.log("[1040] ❌ Missing required fields:", missing.map(f => f.key));
      return res.status(400).json({
        error: "Missing required information",
        ready: false,
        missingCount: missing.length,
        missingFields: missing.map(f => f.label),
        missingKeys: missing.map(f => f.key),
        message: `Cannot generate 1040. Please provide: ${missing.map(f => f.label).join(', ')}`,
        hint: "Complete the interview to provide all required information."
      });
    }
    
    console.log("[1040] ✅ All required fields present");
    
    // Calculate tax
    const tax = calculateFederalTax(session);
    console.log("[1040] Tax calculated:", JSON.stringify(tax, null, 2));
    
    // Find PDF
    const pdfPaths = [
      path.join(process.cwd(), "pdf", "f1040.pdf"),
      path.join(process.cwd(), "uploads", "f1040.pdf"),
      path.join(process.cwd(), "forms", "f1040.pdf"),
      path.join(process.cwd(), "f1040.pdf"),
    ];
    
    let pdfPath = pdfPaths.find(p => fs.existsSync(p));
    if (!pdfPath) {
      return res.status(404).json({ error: "f1040.pdf template not found" });
    }
    
    const pdfDoc = await PDFDocument.load(fs.readFileSync(pdfPath));
    const form = pdfDoc.getForm();
    
    // ========== FILL PERSONAL INFO ==========
    setField(form, FIELDS.firstName, getValue('first_name'));
    setField(form, FIELDS.lastName, getValue('last_name'));
    setField(form, FIELDS.ssn, getValue('ssn'));
    setField(form, FIELDS.address, getValue('address'));
    setField(form, FIELDS.city, getValue('city'));
    setField(form, FIELDS.state, getValue('state'));
    setField(form, FIELDS.zip, getValue('zip'));
    
    // Spouse
    if (filingStatus === 'married_filing_jointly') {
      setField(form, FIELDS.spouseFirstName, getValue('spouse_first_name'));
      setField(form, FIELDS.spouseLastName, getValue('spouse_last_name'));
      const spSSN = getValue('spouse_ssn');
      if (spSSN) setField(form, FIELDS.spouseSSN, spSSN);
    }
    
    // Filing Status
    if (filingStatus === 'single') checkBox(form, FIELDS.single);
    else if (filingStatus === 'married_filing_jointly') checkBox(form, FIELDS.mfj);
    else if (filingStatus === 'married_filing_separately') checkBox(form, FIELDS.mfs);
    else if (filingStatus === 'head_of_household') checkBox(form, FIELDS.hoh);
    
    checkBox(form, FIELDS.digitalAssetsNo);
    
    // Dependents
    const deps = tax.details?.dependentCount || 0;
    if (deps >= 1) { setField(form, FIELDS.dep1Relation, 'Child'); checkBox(form, FIELDS.dep1CTC); }
    if (deps >= 2) { setField(form, FIELDS.dep2Relation, 'Child'); checkBox(form, FIELDS.dep2CTC); }
    
    // ========== INCOME ==========
    const wages = tax.details?.w2Income || 0;
    const interest = tax.details?.interestIncome || 0;
    const se = tax.details?.necIncome || 0;
    
    if (wages > 0) {
      setField(form, FIELDS.line1a, fmt(wages));
      setField(form, FIELDS.line1z, fmt(wages));
    }
    if (interest > 0) setField(form, FIELDS.line2b, fmt(interest));
    if (se > 0) setField(form, FIELDS.line8, fmt(se));
    setField(form, FIELDS.line9, fmt(tax.totalIncome));
    if (tax.details?.adjustments > 0) setField(form, FIELDS.line10, fmt(tax.details.adjustments));
    setField(form, FIELDS.line11, fmt(tax.agi));
    setField(form, FIELDS.line12, fmt(tax.standardDeduction));
    setField(form, FIELDS.line14, fmt(tax.standardDeduction));
    if (tax.taxableIncome > 0) setField(form, FIELDS.line15, fmt(tax.taxableIncome));
    
    // ========== TAX ==========
    if (tax.federalTax > 0) {
      setField(form, FIELDS.line16, fmt(tax.federalTax));
      setField(form, FIELDS.line18, fmt(tax.federalTax));
    }
    if (tax.childTaxCredit > 0) {
      setField(form, FIELDS.line19, fmt(tax.childTaxCredit));
      setField(form, FIELDS.line21, fmt(tax.childTaxCredit));
    }
    const taxAfterCredits = Math.max(0, (tax.federalTax || 0) - (tax.childTaxCredit || 0));
    if (taxAfterCredits > 0) setField(form, FIELDS.line22, fmt(taxAfterCredits));
    if (tax.seTax > 0) setField(form, FIELDS.line23, fmt(tax.seTax));
    if (tax.totalTaxOwed > 0) setField(form, FIELDS.line24, fmt(tax.totalTaxOwed));
    
    // ========== PAYMENTS ==========
    if (tax.withholding > 0) {
      setField(form, FIELDS.line25a, fmt(tax.withholding));
      setField(form, FIELDS.line25d, fmt(tax.withholding));
    }
    if (tax.additionalChildTaxCredit > 0) {
      setField(form, FIELDS.line28, fmt(tax.additionalChildTaxCredit));
      setField(form, FIELDS.line32, fmt(tax.additionalChildTaxCredit));
    }
    setField(form, FIELDS.line33, fmt(tax.totalPayments));
    
    // ========== REFUND/OWED ==========
    if (tax.estimatedRefund > 0) {
      setField(form, FIELDS.line34, fmt(tax.estimatedRefund));
      setField(form, FIELDS.line35a, fmt(tax.estimatedRefund));
    } else if (tax.estimatedRefund < 0) {
      setField(form, FIELDS.line37, fmt(Math.abs(tax.estimatedRefund)));
    }
    
    checkBox(form, FIELDS.thirdPartyNo);
    setField(form, FIELDS.firmName, "TaxSky AI");
    
    // Generate PDF
    const finalPdf = await pdfDoc.save();
    
    console.log(`[1040] ✅ PDF Generated Successfully!`);
    console.log(`[1040] 💰 Result: ${tax.estimatedRefund > 0 ? 'Refund $' + tax.estimatedRefund : 'Owed $' + Math.abs(tax.estimatedRefund)}`);
    
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=Form_1040_2024_${userId}.pdf`);
    return res.send(Buffer.from(finalPdf));
    
  } catch (err) {
    console.error("[1040] Error:", err);
    return res.status(500).json({ error: err.message });
  }
}

// ============================================================
// DEBUG ENDPOINT
// ============================================================
router.get("/debug", async (req, res) => {
  try {
    const userId = req.query.userId || "user1";
    const session = await getSession(userId);
    const answers = session.answers || new Map();
    
    const getValue = (key) => {
      if (answers instanceof Map) return answers.get(key);
      return answers[key];
    };
    
    const data = {};
    if (answers instanceof Map) {
      for (const [k, v] of answers) { 
        if (!k.startsWith('_') && !k.endsWith('_raw')) data[k] = v; 
      }
    }
    
    const filingStatus = getValue('filing_status') || 'single';
    const missing = validateRequiredFields(answers, filingStatus);
    
    res.json({ 
      success: true, 
      userId, 
      ready: missing.length === 0,
      missingFields: missing.map(f => f.label),
      data, 
      tax: calculateFederalTax(session) 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/test", (req, res) => {
  res.json({ success: true, message: "1040 routes OK", version: "2.5-validation" });
});

export default router;