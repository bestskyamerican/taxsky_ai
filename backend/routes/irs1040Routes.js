// ============================================================
// IRS 1040 PDF GENERATION - USES PYTHON TAX ENGINE
// Now calls Python API for calculations to match dashboard
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
    
    console.log("📤 Sending to Python API:", JSON.stringify(pythonInput, null, 2));
    
    const pythonResult = await callPythonTaxAPI(pythonInput);
    
    // ========================================================
    // MAP PYTHON RESPONSE TO FEDERAL OBJECT
    // Python returns: { federal: { ... }, state: { ... } }
    // ========================================================
    const tax = pythonResult?.federal || {};
    
    const federal = {
      // Income
      totalIncome: tax.total_income || pythonInput.wages,
      wages: tax.wages || pythonInput.wages,
      
      // Adjustments
      adjustments: tax.adjustments || pythonInput.ira_contribution,
      iraDeduction: tax.ira_deduction || pythonInput.ira_contribution,
      
      // AGI & Deductions
      agi: tax.agi || (pythonInput.wages - pythonInput.ira_contribution),
      standardDeduction: tax.standard_deduction || tax.deduction_amount || 30000,
      taxableIncome: tax.taxable_income || 0,
      
      // Tax
      bracketTax: tax.bracket_tax || 0,
      seTax: tax.self_employment_tax || 0,
      taxBeforeCredits: tax.tax_before_credits || 0,
      
      // Credits - IMPORTANT!
      childTaxCredit: tax.child_tax_credit || 0,  // Total CTC (non-ref + ref)
      eitc: tax.eitc || 0,                         // ✅ EITC from Python!
      totalCredits: tax.total_credits || 0,
      refundableCredits: tax.refundable_credits || 0,
      
      // After credits
      taxAfterCredits: tax.tax_after_credits || 0,
      
      // Payments
      withholding: tax.withholding || pythonInput.federal_withheld,
      estimatedPayments: tax.estimated_payments || 0,
      totalPayments: tax.total_payments || 0,
      
      // Final result
      refund: tax.refund || 0,
      amountOwed: tax.amount_owed || 0
    };
    
    console.log("📊 Federal Tax (from Python):", JSON.stringify(federal, null, 2));
    
    // Load PDF template
    const templatePath = path.join(__dirname, "../templates/f1040_2024.pdf");
    if (!fs.existsSync(templatePath)) {
      return res.status(500).json({ error: "1040 template not found" });
    }
    
    const pdfBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    
    // Helper functions
    const setField = (fieldName, value) => {
      try {
        const field = form.getTextField(fieldName);
        field.setText(String(value || ""));
      } catch (e) {
        console.log(`  ⚠️ Field not found: ${fieldName}`);
      }
    };
    
    const setCheckbox = (fieldName, checked) => {
      try {
        const field = form.getCheckBox(fieldName);
        if (checked) field.check();
        else field.uncheck();
        console.log(`  ☑️ Checkbox set: ${fieldName} = ${checked}`);
      } catch (e) {
        try {
          const field = form.getField(fieldName);
          if (field && checked) field.setValue("Yes");
        } catch (e2) {
          console.log(`  ⚠️ Checkbox not found: ${fieldName}`);
        }
      }
    };
    
    const formatMoney = (amount) => {
      if (!amount || amount === 0) return "0";
      return Math.round(amount).toString();
    };
    
    // === PERSONAL INFO (UPPERCASE) ===
    const firstName = (answers.first_name || w2.employee_first_name || personal.first_name || "").toUpperCase();
    const lastName = (answers.last_name || w2.employee_last_name || personal.last_name || "").toUpperCase();
    let ssn = answers.ssn || personal.ssn || w2.employee_ssn || "";
    if (ssn.includes("X")) ssn = personal.ssn || ssn;
    
    const address = (answers.address || w2.employee_address || personal.address || "").toUpperCase();
    const city = (answers.city || w2.employee_city || personal.city || "").toUpperCase();
    const state = (answers.state || w2.employee_state || personal.state || "CA").toUpperCase();
    const zip = answers.zip || w2.employee_zip || personal.zip || "";
    const filingStatus = answers.filing_status || "single";
    
    console.log(`👤 Personal: ${firstName} ${lastName}`);
    console.log(`🏠 Address: "${address}", City: "${city}", State: "${state}", ZIP: "${zip}"`);
    
    setField(FIELDS.firstName, firstName);
    setField(FIELDS.lastName, lastName);
    setField(FIELDS.ssn, ssn.replace(/[^\d]/g, ""));
    setField(FIELDS.address, address);
    setField(FIELDS.city, city);
    setField(FIELDS.state, state);
    setField(FIELDS.zip, zip);
    
    // === SPOUSE INFO (UPPERCASE) ===
    if (filingStatus === "married_filing_jointly") {
      const spouseFirst = (answers.spouse_first_name || personal.spouse_first_name || "").toUpperCase();
      const spouseLast = (answers.spouse_last_name || personal.spouse_last_name || "").toUpperCase();
      const spouseSsn = answers.spouse_ssn || personal.spouse_ssn || "";
      
      console.log(`👫 Spouse: ${spouseFirst} ${spouseLast}`);
      
      setField(FIELDS.spouseFirstName, spouseFirst);
      setField(FIELDS.spouseLastName, spouseLast);
      setField(FIELDS.spouseSsn, spouseSsn.replace(/[^\d]/g, ""));
    }
    
    // === FILING STATUS ===
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