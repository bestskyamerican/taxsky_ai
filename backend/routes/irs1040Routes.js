// ============================================================
// IRS 1040 PDF GENERATION - USES PYTHON TAX ENGINE
// ✅ v2.0 - Added missing user data routes for SubmitFlow.jsx
// ============================================================
import express from "express";
import { PDFDocument } from "pdf-lib";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import axios from "axios";  // ✅ Use axios for Node.js compatibility

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Python Tax API URL
const PYTHON_TAX_API = process.env.PYTHON_TAX_API || "http://localhost:5002";
console.log(`🐍 Python Tax API URL: ${PYTHON_TAX_API}`);

// ============================================================
// VERIFIED PDF FIELD NAMES (from debug PDF)
// ============================================================
const FIELDS = {
  // === Personal Info (Page 1) ===
  firstName: "topmostSubform[0].Page1[0].f1_04[0]",
  lastName: "topmostSubform[0].Page1[0].f1_05[0]",
  ssn: "topmostSubform[0].Page1[0].f1_06[0]",
  spouseFirstName: "topmostSubform[0].Page1[0].f1_07[0]",
  spouseLastName: "topmostSubform[0].Page1[0].f1_08[0]",
  spouseSsn: "topmostSubform[0].Page1[0].f1_09[0]",
  
  // === Address ===
  address: "topmostSubform[0].Page1[0].Address_ReadOrder[0].f1_10[0]",
  aptNo: "topmostSubform[0].Page1[0].Address_ReadOrder[0].f1_11[0]",
  city: "topmostSubform[0].Page1[0].Address_ReadOrder[0].f1_12[0]",
  state: "topmostSubform[0].Page1[0].Address_ReadOrder[0].f1_13[0]",
  zip: "topmostSubform[0].Page1[0].Address_ReadOrder[0].f1_14[0]",
  
  // === Filing Status ===
  single: "topmostSubform[0].Page1[0].FilingStatus_ReadOrder[0].c1_3[0]",
  mfj: "topmostSubform[0].Page1[0].FilingStatus_ReadOrder[0].c1_3[1]",
  mfs: "topmostSubform[0].Page1[0].FilingStatus_ReadOrder[0].c1_3[2]",
  hoh: "topmostSubform[0].Page1[0].c1_4[0]",
  qss: "topmostSubform[0].Page1[0].c1_5[0]",
  
  // === Dependents ===
  dep1Name: "topmostSubform[0].Page1[0].Table_Dependents[0].Row1[0].f1_20[0]",
  dep1Ssn: "topmostSubform[0].Page1[0].Table_Dependents[0].Row1[0].f1_21[0]",
  dep1Relationship: "topmostSubform[0].Page1[0].Table_Dependents[0].Row1[0].f1_22[0]",
  dep1ChildCredit: "topmostSubform[0].Page1[0].Table_Dependents[0].Row1[0].c1_14[0]",
  dep1OtherCredit: "topmostSubform[0].Page1[0].Table_Dependents[0].Row1[0].c1_15[0]",
  dep2Name: "topmostSubform[0].Page1[0].Table_Dependents[0].Row2[0].f1_23[0]",
  dep2Ssn: "topmostSubform[0].Page1[0].Table_Dependents[0].Row2[0].f1_24[0]",
  dep2Relationship: "topmostSubform[0].Page1[0].Table_Dependents[0].Row2[0].f1_25[0]",
  dep2ChildCredit: "topmostSubform[0].Page1[0].Table_Dependents[0].Row2[0].c1_16[0]",
  dep2OtherCredit: "topmostSubform[0].Page1[0].Table_Dependents[0].Row2[0].c1_17[0]",
  
  // === Income (Page 1) ===
  line1a: "topmostSubform[0].Page1[0].f1_32[0]",
  line1z: "topmostSubform[0].Page1[0].f1_41[0]",
  line2b: "topmostSubform[0].Page1[0].f1_43[0]",
  line3b: "topmostSubform[0].Page1[0].f1_45[0]",
  line8: "topmostSubform[0].Page1[0].Line4a-11_ReadOrder[0].f1_53[0]",
  line9: "topmostSubform[0].Page1[0].Line4a-11_ReadOrder[0].f1_54[0]",
  line10: "topmostSubform[0].Page1[0].Line4a-11_ReadOrder[0].f1_55[0]",
  line11: "topmostSubform[0].Page1[0].Line4a-11_ReadOrder[0].f1_56[0]",
  line12: "topmostSubform[0].Page1[0].f1_57[0]",
  line14: "topmostSubform[0].Page1[0].f1_59[0]",
  line15: "topmostSubform[0].Page1[0].f1_60[0]",
  
  // === Page 2: Tax and Credits (SHIFTED +1) ===
  line16: "topmostSubform[0].Page2[0].f2_02[0]",
  line17: "topmostSubform[0].Page2[0].f2_03[0]",
  line18: "topmostSubform[0].Page2[0].f2_04[0]",
  line19: "topmostSubform[0].Page2[0].f2_05[0]",
  line20: "topmostSubform[0].Page2[0].f2_06[0]",
  line21: "topmostSubform[0].Page2[0].f2_07[0]",
  line22: "topmostSubform[0].Page2[0].f2_08[0]",
  line23: "topmostSubform[0].Page2[0].f2_09[0]",
  line24: "topmostSubform[0].Page2[0].f2_10[0]",
  line25a: "topmostSubform[0].Page2[0].f2_11[0]",
  line25b: "topmostSubform[0].Page2[0].f2_12[0]",
  line25c: "topmostSubform[0].Page2[0].f2_13[0]",
  line25d: "topmostSubform[0].Page2[0].f2_14[0]",
  line26: "topmostSubform[0].Page2[0].f2_15[0]",
  line27: "topmostSubform[0].Page2[0].f2_16[0]",  // EITC
  line28: "topmostSubform[0].Page2[0].f2_17[0]",  // Additional CTC
  line29: "topmostSubform[0].Page2[0].f2_18[0]",
  line31: "topmostSubform[0].Page2[0].f2_20[0]",
  line32: "topmostSubform[0].Page2[0].f2_21[0]",
  line33: "topmostSubform[0].Page2[0].f2_22[0]",
  line34: "topmostSubform[0].Page2[0].f2_23[0]",
  line35a: "topmostSubform[0].Page2[0].f2_24[0]",
  line37: "topmostSubform[0].Page2[0].f2_29[0]"
};

// ============================================================
// HELPER: Get or create user session
// ============================================================
async function getOrCreateSession(userId) {
  const db = mongoose.connection.db;
  let session = await db.collection("taxsessions").findOne({ userId });
  
  if (!session) {
    session = {
      userId,
      created_at: new Date(),
      updated_at: new Date(),
      tax_year: 2025,
      filing_status: "single",
      answers: {},
      normalizedData: {
        personal: {},
        dependents: []
      },
      forms: {}
    };
    await db.collection("taxsessions").insertOne(session);
  }
  
  return session;
}

// ============================================================
// ✅ NEW: USER DATA ROUTES (fixes HTTP 500 error)
// ============================================================

// GET /api/tax/user/:userId - Get user tax data
router.get("/tax/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`[API] GET /api/tax/user/${userId}`);
    
    const session = await getOrCreateSession(userId);
    const answers = session.answers instanceof Map 
      ? Object.fromEntries(session.answers) 
      : (session.answers || {});
    
    const personal = session.normalizedData?.personal || {};
    const dependents = session.normalizedData?.dependents || [];
    
    res.json({
      success: true,
      userId,
      filing_status: session.filing_status || answers.filing_status || "single",
      personal: {
        first_name: personal.first_name || answers.first_name || "",
        last_name: personal.last_name || answers.last_name || "",
        ssn: personal.ssn || answers.ssn || "",
        address: personal.address || answers.address || "",
        city: personal.city || answers.city || "",
        state: personal.state || answers.state || "CA",
        zip: personal.zip || answers.zip || "",
        spouse_first_name: personal.spouse_first_name || answers.spouse_first_name || "",
        spouse_last_name: personal.spouse_last_name || answers.spouse_last_name || "",
        spouse_ssn: personal.spouse_ssn || answers.spouse_ssn || ""
      },
      dependents,
      answers,
      updated_at: session.updated_at
    });
  } catch (error) {
    console.error("[API] Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/tax/user/:userId - Update user tax data
router.put("/tax/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;
    console.log(`[API] PUT /api/tax/user/${userId}`);
    
    const db = mongoose.connection.db;
    const updateObj = { updated_at: new Date() };
    
    if (updates.personal) {
      updateObj["normalizedData.personal"] = updates.personal;
    }
    if (updates.dependents) {
      updateObj["normalizedData.dependents"] = updates.dependents;
    }
    if (updates.filing_status) {
      updateObj.filing_status = updates.filing_status;
    }
    if (updates.answers) {
      const session = await getOrCreateSession(userId);
      const existingAnswers = session.answers instanceof Map 
        ? Object.fromEntries(session.answers) 
        : (session.answers || {});
      updateObj.answers = { ...existingAnswers, ...updates.answers };
    }
    
    await db.collection("taxsessions").updateOne(
      { userId },
      { $set: updateObj },
      { upsert: true }
    );
    
    res.json({ success: true, message: "User data updated", userId });
  } catch (error) {
    console.error("[API] Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/tax/user/:userId/personal - Update personal info only
router.patch("/tax/user/:userId/personal", async (req, res) => {
  try {
    const { userId } = req.params;
    const personalUpdates = req.body;
    console.log(`[API] PATCH /api/tax/user/${userId}/personal`, personalUpdates);
    
    const db = mongoose.connection.db;
    const session = await getOrCreateSession(userId);
    const existingPersonal = session.normalizedData?.personal || {};
    const mergedPersonal = { ...existingPersonal, ...personalUpdates };
    
    await db.collection("taxsessions").updateOne(
      { userId },
      { $set: { "normalizedData.personal": mergedPersonal, updated_at: new Date() } }
    );
    
    res.json({ success: true, message: "Personal info updated", personal: mergedPersonal });
  } catch (error) {
    console.error("[API] Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/tax/user/:userId/dependents - Update dependents
router.put("/tax/user/:userId/dependents", async (req, res) => {
  try {
    const { userId } = req.params;
    const { dependents } = req.body;
    console.log(`[API] PUT /api/tax/user/${userId}/dependents`, dependents);
    
    const db = mongoose.connection.db;
    
    await db.collection("taxsessions").updateOne(
      { userId },
      { 
        $set: { 
          "normalizedData.dependents": dependents || [],
          "answers.dependents": dependents || [],
          updated_at: new Date()
        } 
      },
      { upsert: true }
    );
    
    res.json({ success: true, message: "Dependents updated", dependents: dependents || [] });
  } catch (error) {
    console.error("[API] Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/ai/data/:userId - Get AI session data (for SubmitFlow)
router.get("/ai/data/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { taxYear } = req.query;
    console.log(`[API] GET /api/ai/data/${userId}`);
    
    const session = await getOrCreateSession(userId);
    const answers = session.answers instanceof Map 
      ? Object.fromEntries(session.answers) 
      : (session.answers || {});
    
    const personal = session.normalizedData?.personal || {};
    const dependents = session.normalizedData?.dependents || [];
    
    res.json({
      success: true,
      session_id: userId,
      tax_year: taxYear || 2025,
      filing_status: session.filing_status || answers.filing_status || "single",
      answers: {
        first_name: personal.first_name || answers.first_name || answers.taxpayer_first_name || "",
        last_name: personal.last_name || answers.last_name || answers.taxpayer_last_name || "",
        ssn: personal.ssn || answers.ssn || answers.taxpayer_ssn || "",
        address: personal.address || answers.address || answers.street_address || "",
        city: personal.city || answers.city || "",
        state: personal.state || answers.state || "CA",
        zip: personal.zip || answers.zip || answers.zip_code || "",
        spouse_first_name: personal.spouse_first_name || answers.spouse_first_name || "",
        spouse_last_name: personal.spouse_last_name || answers.spouse_last_name || "",
        spouse_ssn: personal.spouse_ssn || answers.spouse_ssn || "",
        phone: personal.phone || answers.phone || "",
        email: personal.email || answers.email || "",
        occupation: personal.occupation || answers.occupation || "",
        filing_status: session.filing_status || answers.filing_status || "single",
        ...answers
      },
      dependents: dependents,
      income: session.income || {}
    });
  } catch (error) {
    console.error("[API] Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/ai/data/:userId - Save AI session data
router.post("/ai/data/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { answers, filing_status, dependents, income } = req.body;
    console.log(`[API] POST /api/ai/data/${userId}`);
    
    const db = mongoose.connection.db;
    const updateObj = { updated_at: new Date() };
    
    if (answers) {
      const session = await getOrCreateSession(userId);
      const existingAnswers = session.answers instanceof Map 
        ? Object.fromEntries(session.answers) 
        : (session.answers || {});
      
      updateObj.answers = { ...existingAnswers, ...answers };
      updateObj["normalizedData.personal"] = {
        first_name: answers.first_name || answers.taxpayer_first_name || "",
        last_name: answers.last_name || answers.taxpayer_last_name || "",
        ssn: answers.ssn || answers.taxpayer_ssn || "",
        address: answers.address || answers.street_address || "",
        city: answers.city || "",
        state: answers.state || "CA",
        zip: answers.zip || answers.zip_code || "",
        spouse_first_name: answers.spouse_first_name || "",
        spouse_last_name: answers.spouse_last_name || "",
        spouse_ssn: answers.spouse_ssn || "",
        phone: answers.phone || "",
        email: answers.email || "",
        occupation: answers.occupation || ""
      };
    }
    
    if (filing_status) updateObj.filing_status = filing_status;
    if (dependents) updateObj["normalizedData.dependents"] = dependents;
    if (income) updateObj.income = income;
    
    await db.collection("taxsessions").updateOne(
      { userId },
      { $set: updateObj },
      { upsert: true }
    );
    
    res.json({ success: true, message: "AI session data saved", session_id: userId });
  } catch (error) {
    console.error("[API] Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// CALL PYTHON TAX API (using axios for Node.js compatibility)
// ============================================================
async function callPythonTaxAPI(sessionData) {
  try {
    console.log(`📤 Calling Python API: ${PYTHON_TAX_API}/calculate/full`);
    
    const response = await axios.post(`${PYTHON_TAX_API}/calculate/full`, sessionData, {
      headers: { "Content-Type": "application/json" },
      timeout: 10000  // 10 second timeout
    });
    
    console.log("🐍 Python Tax API Response Status:", response.status);
    console.log("🐍 Python Tax API Response:", JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error("❌ Python Tax API failed:", error.message);
    if (error.response) {
      console.error("   Response status:", error.response.status);
      console.error("   Response data:", error.response.data);
    }
    console.log("⚠️ Will use fallback calculation");
    return null;
  }
}

// ============================================================
// PDF GENERATION - Uses Python Tax Results
// ============================================================
router.get("/generate/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    console.log(`\n📄 Generating 1040 PDF for session: ${sessionId}`);
    
    // Get session from MongoDB
    const db = mongoose.connection.db;
    const session = await db.collection("taxsessions").findOne({ userId: sessionId });
    
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    
    // Get answers and other data
    const answers = session.answers instanceof Map 
      ? Object.fromEntries(session.answers) 
      : (session.answers || {});
    
    const w2 = session.forms?.['W-2'] || {};
    const personal = session.normalizedData?.personal || {};
    const nameDependents = session.normalizedData?.dependents || [];
    
    // ========================================================
    // CALL PYTHON TAX API FOR CALCULATIONS
    // Field names must match what Python calculator expects
    // Python logs show it needs: wages, ira_contributions, dependents array, etc.
    // ========================================================
    const dependentsArray = answers.dependents || [];
    
    const pythonInput = {
      // Filing status
      filing_status: answers.filing_status || "single",
      state: answers.state || "CA",
      
      // Income
      wages: parseFloat(answers.total_wages) || 0,
      interest_income: parseFloat(answers.interest_income) || 0,
      dividend_income: parseFloat(answers.dividend_income) || 0,
      self_employment_income: parseFloat(answers.self_employment_income) || 0,
      
      // Withholding
      federal_withholding: parseFloat(answers.total_withheld) || 0,
      state_withholding: parseFloat(answers.total_state_withheld) || 0,
      
      // Adjustments
      ira_contributions: parseFloat(answers.ira_contributions) || 0,
      hsa_contributions: parseFloat(answers.hsa_contributions) || 0,
      student_loan_interest: parseFloat(answers.student_loan_interest) || 0,
      
      // Dependents - SEND THE FULL ARRAY so Python can count ages
      has_dependents: dependentsArray.length > 0,
      dependents: dependentsArray.map(d => ({
        name: d.name || "",
        age: parseInt(d.age) || 0,
        relationship: d.relationship || ""
      }))
    };
    
    console.log("📤 Python Input:", JSON.stringify(pythonInput, null, 2));
    
    // Call Python tax engine
    const pythonResult = await callPythonTaxAPI(pythonInput);
    
    // Get federal results (with fallbacks)
    const federal = pythonResult?.federal || {
      totalIncome: pythonInput.wages,
      adjustments: 0,
      agi: pythonInput.wages,
      standardDeduction: 14600,
      taxableIncome: Math.max(0, pythonInput.wages - 14600),
      bracketTax: 0,
      taxBeforeCredits: 0,
      childTaxCredit: 0,
      taxAfterCredits: 0,
      seTax: 0,
      withholding: pythonInput.federal_withholding,
      eitc: 0,
      refundableCredits: 0,
      totalPayments: pythonInput.federal_withholding,
      refund: pythonInput.federal_withholding,
      amountOwed: 0
    };
    
    console.log("📊 Federal Results:", JSON.stringify(federal, null, 2));
    
    // Load PDF template
    const templatePath = path.join(__dirname, "templates", "f1040_2024.pdf");
    const pdfBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    
    // Helper functions
    const setField = (fieldName, value) => {
      try {
        const field = form.getTextField(fieldName);
        field.setText(String(value || ""));
      } catch (e) {
        console.log(`   ⚠️ Field not found: ${fieldName}`);
      }
    };
    
    const setCheckbox = (fieldName, checked) => {
      try {
        const field = form.getCheckBox(fieldName);
        if (checked) field.check();
        else field.uncheck();
      } catch (e) {
        console.log(`   ⚠️ Checkbox not found: ${fieldName}`);
      }
    };
    
    const formatMoney = (value) => {
      const num = parseFloat(value) || 0;
      return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    };
    
    // ========================================================
    // PAGE 1: PERSONAL INFO
    // ========================================================
    const firstName = (personal.first_name || answers.first_name || "").toUpperCase();
    const lastName = (personal.last_name || answers.last_name || "").toUpperCase();
    const ssn = personal.ssn || answers.ssn || "";
    
    setField(FIELDS.firstName, firstName);
    setField(FIELDS.lastName, lastName);
    setField(FIELDS.ssn, ssn);
    
    console.log(`👤 Personal: ${firstName} ${lastName}`);
    
    // Spouse info
    if (personal.spouse_first_name || answers.spouse_first_name) {
      setField(FIELDS.spouseFirstName, (personal.spouse_first_name || answers.spouse_first_name || "").toUpperCase());
      setField(FIELDS.spouseLastName, (personal.spouse_last_name || answers.spouse_last_name || "").toUpperCase());
      setField(FIELDS.spouseSsn, personal.spouse_ssn || answers.spouse_ssn || "");
    }
    
    // Address
    setField(FIELDS.address, (personal.address || answers.address || "").toUpperCase());
    setField(FIELDS.city, (personal.city || answers.city || "").toUpperCase());
    setField(FIELDS.state, (personal.state || answers.state || "CA").toUpperCase());
    setField(FIELDS.zip, personal.zip || answers.zip || "");
    
    // Filing status
    const filingStatus = answers.filing_status || "single";
    if (filingStatus === "single") setCheckbox(FIELDS.single, true);
    else if (filingStatus === "married_filing_jointly") setCheckbox(FIELDS.mfj, true);
    else if (filingStatus === "married_filing_separately") setCheckbox(FIELDS.mfs, true);
    else if (filingStatus === "head_of_household") setCheckbox(FIELDS.hoh, true);
    
    // === DEPENDENTS ===
    const chatDependents = answers.dependents || [];
    console.log(`👶 Dependents:`, chatDependents);
    
    for (let i = 0; i < Math.min(chatDependents.length, 2); i++) {
      const dep = chatDependents[i];
      const nameDep = nameDependents[i] || {};
      
      const depFirst = (nameDep.first_name || dep.name || "").toUpperCase();
      const depLast = (nameDep.last_name || "").toUpperCase();
      const depFullName = `${depFirst} ${depLast}`.trim();
      const depSsn = nameDep.ssn || "";
      const depRelationship = (nameDep.relationship || "").toUpperCase();
      const age = parseInt(dep.age) || 99;
      
      if (i === 0) {
        setField(FIELDS.dep1Name, depFullName);
        setField(FIELDS.dep1Ssn, depSsn);
        setField(FIELDS.dep1Relationship, depRelationship);
        if (age < 17) setCheckbox(FIELDS.dep1ChildCredit, true);
        else setCheckbox(FIELDS.dep1OtherCredit, true);
        console.log(`   Dep1: "${depFullName}", SSN: ${depSsn}, age ${age}`);
      } else {
        setField(FIELDS.dep2Name, depFullName);
        setField(FIELDS.dep2Ssn, depSsn);
        setField(FIELDS.dep2Relationship, depRelationship);
        if (age < 17) setCheckbox(FIELDS.dep2ChildCredit, true);
        else setCheckbox(FIELDS.dep2OtherCredit, true);
        console.log(`   Dep2: "${depFullName}", SSN: ${depSsn}, age ${age}`);
      }
    }
    
    // ========================================================
    // PAGE 1: INCOME (from Python results)
    // ========================================================
    setField(FIELDS.line1a, formatMoney(pythonInput.wages));
    setField(FIELDS.line1z, formatMoney(pythonInput.wages));
    setField(FIELDS.line2b, formatMoney(pythonInput.interest_income));
    setField(FIELDS.line3b, formatMoney(pythonInput.dividend_income));
    setField(FIELDS.line8, formatMoney(pythonInput.self_employment_income));
    setField(FIELDS.line9, formatMoney(federal.totalIncome));
    setField(FIELDS.line10, formatMoney(federal.adjustments));
    setField(FIELDS.line11, formatMoney(federal.agi));
    setField(FIELDS.line12, formatMoney(federal.standardDeduction));
    setField(FIELDS.line14, formatMoney(federal.standardDeduction));
    setField(FIELDS.line15, formatMoney(federal.taxableIncome));
    
    // ========================================================
    // PAGE 2: TAX AND CREDITS (from Python results)
    // ========================================================
    // Line 16: Tax from tax tables
    setField(FIELDS.line16, formatMoney(federal.bracketTax));
    
    // Line 18: Total tax (bracket + SE tax)
    setField(FIELDS.line18, formatMoney(federal.taxBeforeCredits));
    
    // Line 19: Child tax credit (non-refundable portion)
    // Note: Python returns total CTC, but Form 1040 line 19 is the non-refundable part
    const nonRefCTC = Math.min(federal.childTaxCredit, federal.taxBeforeCredits);
    setField(FIELDS.line19, formatMoney(nonRefCTC));
    setField(FIELDS.line21, formatMoney(nonRefCTC));
    
    // Line 22: Tax after credits
    setField(FIELDS.line22, formatMoney(federal.taxAfterCredits));
    
    // Line 23: SE tax (already included in taxBeforeCredits, but show separately)
    setField(FIELDS.line23, formatMoney(federal.seTax));
    
    // Line 24: Total tax
    setField(FIELDS.line24, formatMoney(federal.taxAfterCredits));
    
    // ========================================================
    // PAGE 2: PAYMENTS (from Python results)
    // ========================================================
    setField(FIELDS.line25a, formatMoney(federal.withholding));
    setField(FIELDS.line25d, formatMoney(federal.withholding));
    
    // Line 27: EITC ✅ FROM PYTHON!
    setField(FIELDS.line27, formatMoney(federal.eitc));
    
    // Line 28: Additional CTC (refundable portion)
    // refundable_credits = CTC refundable + EITC, so subtract EITC to get just Additional CTC
    const additionalCTC = Math.max(0, federal.refundableCredits - federal.eitc);
    setField(FIELDS.line28, formatMoney(additionalCTC));
    
    // Line 32: Total other payments (EITC + Additional CTC)
    const totalOtherPayments = federal.eitc + additionalCTC;
    setField(FIELDS.line32, formatMoney(totalOtherPayments));
    
    // Line 33: Total payments
    setField(FIELDS.line33, formatMoney(federal.totalPayments));
    
    // ========================================================
    // REFUND OR OWE
    // ========================================================
    if (federal.refund > 0) {
      setField(FIELDS.line34, formatMoney(federal.refund));
      setField(FIELDS.line35a, formatMoney(federal.refund));
      console.log(`💰 REFUND: $${federal.refund}`);
    } else if (federal.amountOwed > 0) {
      setField(FIELDS.line37, formatMoney(federal.amountOwed));
      console.log(`💸 AMOUNT OWED: $${federal.amountOwed}`);
    }
    
    // Flatten and save
    form.flatten();
    const filledPdfBytes = await pdfDoc.save();
    
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=Form1040_${sessionId}.pdf`);
    res.send(Buffer.from(filledPdfBytes));
    
    console.log("✅ PDF generated successfully using Python tax engine!");
    
  } catch (error) {
    console.error("❌ PDF generation error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Summary endpoint - also uses Python
router.get("/summary/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const db = mongoose.connection.db;
    const session = await db.collection("taxsessions").findOne({ userId: sessionId });
    
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    
    const answers = session.answers instanceof Map 
      ? Object.fromEntries(session.answers) 
      : (session.answers || {});
    
    // Call Python API
    const dependentsArray = answers.dependents || [];
    
    const pythonInput = {
      filing_status: answers.filing_status || "single",
      state: answers.state || "CA",
      wages: parseFloat(answers.total_wages) || 0,
      federal_withholding: parseFloat(answers.total_withheld) || 0,
      state_withholding: parseFloat(answers.total_state_withheld) || 0,
      interest_income: parseFloat(answers.interest_income) || 0,
      dividend_income: parseFloat(answers.dividend_income) || 0,
      self_employment_income: parseFloat(answers.self_employment_income) || 0,
      ira_contributions: parseFloat(answers.ira_contributions) || 0,
      hsa_contributions: parseFloat(answers.hsa_contributions) || 0,
      student_loan_interest: parseFloat(answers.student_loan_interest) || 0,
      has_dependents: dependentsArray.length > 0,
      dependents: dependentsArray.map(d => ({
        name: d.name || "",
        age: parseInt(d.age) || 0,
        relationship: d.relationship || ""
      }))
    };
    
    const pythonResult = await callPythonTaxAPI(pythonInput);
    
    res.json({
      success: true,
      source: "python_tax_engine",
      federal: pythonResult?.federal || {},
      state: pythonResult?.state || {}
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;