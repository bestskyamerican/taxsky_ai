// ============================================================
// CA FORM 540 PDF GENERATION - USES PYTHON TAX ENGINE
// California Resident Income Tax Return
// Location: routes/state/ca540Routes.js
// Template: templates/state/ca540_2024.pdf
// ============================================================
import express from "express";
import { PDFDocument } from "pdf-lib";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Python Tax API URL
const PYTHON_TAX_API = process.env.PYTHON_TAX_API || "http://localhost:5002";

// ============================================================
// CA 540 FIELD MAPPING
// Format: 540-XYYY where X=page, YYY=field number
// ============================================================
const FIELDS = {
  // === Page 1 (Side 1): Personal Info ===
  firstName: "540-1002",
  initial: "540-1003",
  lastName: "540-1004",
  suffix: "540-1005",
  ssn: "540-1006",
  
  spouseFirstName: "540-1007",
  spouseInitial: "540-1008",
  spouseLastName: "540-1009",
  spouseSuffix: "540-1010",
  spouseSsn: "540-1011",
  
  additionalInfo: "540-1012",
  pbaCode: "540-1013",
  
  address: "540-1014",
  aptNo: "540-1015",
  pmbBox: "540-1016",
  city: "540-1017",
  state: "540-1018",
  zip: "540-1019",
  
  foreignCountry: "540-1020",
  foreignProvince: "540-1021",
  foreignPostal: "540-1022",
  
  yourDOB: "540-1023",
  spouseDOB: "540-1024",
  
  yourPriorName: "540-1025",
  spousePriorName: "540-1026",
  
  county: "540-1027",
  
  // Filing Status (radio buttons)
  filingStatus: "540-1036 RB",
  mfsSpouseName: "540-1037",
  qssYearDied: "540-1038",
  
  // Line 7: Personal exemptions
  line7Count: "540-1041",
  line7Amount: "540-1042",
  
  // Line 8: Blind exemptions
  line8Count: "540-1043",
  line8Amount: "540-1044",
  
  // Line 9: Senior exemptions  
  line9Count: "540-1045",
  line9Amount: "540-1046",
  
  // === Page 2 (Side 2): Income & Tax ===
  dep1FirstName: "540-2003",
  dep1LastName: "540-2004",
  dep1Ssn: "540-2005",
  dep1Relationship: "540-2006",
  
  dep2FirstName: "540-2007",
  dep2LastName: "540-2008",
  dep2Ssn: "540-2009",
  dep2Relationship: "540-2010",
  
  dep3FirstName: "540-2011",
  dep3LastName: "540-2012",
  dep3Ssn: "540-2013",
  dep3Relationship: "540-2014",
  
  line10Count: "540-2015",
  line10Amount: "540-2016",
  line11: "540-2017",
  line12: "540-2018",
  line13: "540-2019",
  line14: "540-2020",
  line15: "540-2021",
  line16: "540-2022",
  line17: "540-2023",
  line18: "540-2024",
  line19: "540-2025",
  line31: "540-2030",
  line32: "540-2031",
  line33: "540-2032",
  line34: "540-2035",
  line35: "540-2036",
  line40: "540-2037",
  credit43Name: "540-2038",
  credit43Code: "540-2039",
  credit43Amount: "540-2040",
  credit44Name: "540-2041",
  credit44Code: "540-2042",
  credit44Amount: "540-2043",
  
  // === Page 3 (Side 3): Credits & Payments ===
  line45: "540-3003",
  line46: "540-3004",
  line47: "540-3005",
  line48: "540-3006",
  line61: "540-3007",
  line62: "540-3008",
  line63: "540-3009",
  line64: "540-3010",
  line71: "540-3011",
  line72: "540-3012",
  line73: "540-3013",
  line74: "540-3014",
  line75: "540-3015",  // CalEITC ✅
  line76: "540-3016",  // YCTC
  line77: "540-3017",  // FYTC
  line78: "540-3018",
  line91: "540-3022",
  line92: "540-3023",
  line93: "540-3024",
  line94: "540-3025",
  line95: "540-3026",
  line96: "540-3027",
  line97: "540-4003",
  
  // === Page 4 & 5 ===
  line98: "540-4004",
  line99: "540-4005",
  line100: "540-4006",
  line111: "540-5002",
  line112: "540-5003",
  line113: "540-5005",
  line114: "540-5006",
  line115: "540-5007",  // REFUND ✅
  routingNumber1: "540-5008",
  accountNumber1: "540-5009",
  depositAmount1: "540-5011",
  routingNumber2: "540-5012",
  accountNumber2: "540-5013",
  depositAmount2: "540-5015"
};

// ============================================================
// CALL PYTHON TAX API
// ============================================================
async function callPythonTaxAPI(sessionData) {
  try {
    console.log(`📤 Calling Python API: ${PYTHON_TAX_API}/calculate/full`);
    const response = await axios.post(`${PYTHON_TAX_API}/calculate/full`, sessionData, {
      headers: { "Content-Type": "application/json" },
      timeout: 10000
    });
    return response.data;
  } catch (error) {
    console.error("❌ Python Tax API failed:", error.message);
    return null;
  }
}

// ============================================================
// CA 540 PDF GENERATION
// ============================================================
router.get("/generate/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    console.log(`\n🌴 Generating CA 540 PDF for session: ${sessionId}`);
    
    const db = mongoose.connection.db;
    const session = await db.collection("taxsessions").findOne({ userId: sessionId });
    
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    
    const answers = session.answers instanceof Map 
      ? Object.fromEntries(session.answers) 
      : (session.answers || {});
    
    const w2 = session.forms?.['W-2'] || {};
    const personal = session.normalizedData?.personal || {};
    const nameDependents = session.normalizedData?.dependents || [];
    
    // ========================================================
    // CALL PYTHON TAX API
    // ========================================================
    const dependentsArray = answers.dependents || [];
    
    const pythonInput = {
      filing_status: answers.filing_status || "single",
      state: "CA",
      wages: parseFloat(answers.total_wages) || 0,
      interest_income: parseFloat(answers.interest_income) || 0,
      dividend_income: parseFloat(answers.dividend_income) || 0,
      self_employment_income: parseFloat(answers.self_employment_income) || 0,
      federal_withholding: parseFloat(answers.total_withheld) || 0,
      state_withholding: parseFloat(answers.total_state_withheld) || 0,
      ira_contributions: parseFloat(answers.ira_contributions) || 0,
      hsa_contributions: parseFloat(answers.hsa_contributions) || 0,
      has_dependents: dependentsArray.length > 0,
      dependents: dependentsArray.map(d => ({
        name: d.name || "",
        age: parseInt(d.age) || 0,
        relationship: d.relationship || ""
      }))
    };
    
    const pythonResult = await callPythonTaxAPI(pythonInput);
    const ca = pythonResult?.state || {};
    const federal = pythonResult?.federal || {};
    
    console.log("🌴 CA Tax:", JSON.stringify(ca, null, 2));
    
    // Load PDF template - now in templates/state folder
    const templatePath = path.join(__dirname, "../../templates/state/ca540_2024.pdf");
    if (!fs.existsSync(templatePath)) {
      return res.status(500).json({ error: "CA 540 template not found at " + templatePath });
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
        // Field not found - skip
      }
    };
    
    const formatMoney = (amount) => {
      if (!amount || amount === 0) return "0";
      return Math.round(amount).toString();
    };
    
    // === PERSONAL INFO ===
    const firstName = (answers.first_name || w2.employee_first_name || personal.first_name || "").toUpperCase();
    const lastName = (answers.last_name || w2.employee_last_name || personal.last_name || "").toUpperCase();
    let ssn = answers.ssn || personal.ssn || w2.employee_ssn || "";
    if (ssn.includes("X")) ssn = personal.ssn || ssn;
    
    const address = (answers.address || w2.employee_address || personal.address || "").toUpperCase();
    const city = (answers.city || w2.employee_city || personal.city || "").toUpperCase();
    const zip = answers.zip || w2.employee_zip || personal.zip || "";
    const filingStatus = answers.filing_status || "single";
    
    setField(FIELDS.firstName, firstName);
    setField(FIELDS.lastName, lastName);
    setField(FIELDS.ssn, ssn.replace(/[^\d]/g, ""));
    setField(FIELDS.address, address);
    setField(FIELDS.city, city);
    setField(FIELDS.state, "CA");
    setField(FIELDS.zip, zip);
    
    // === SPOUSE ===
    if (filingStatus === "married_filing_jointly") {
      const spouseFirst = (answers.spouse_first_name || personal.spouse_first_name || "").toUpperCase();
      const spouseLast = (answers.spouse_last_name || personal.spouse_last_name || "").toUpperCase();
      const spouseSsn = answers.spouse_ssn || personal.spouse_ssn || "";
      setField(FIELDS.spouseFirstName, spouseFirst);
      setField(FIELDS.spouseLastName, spouseLast);
      setField(FIELDS.spouseSsn, spouseSsn.replace(/[^\d]/g, ""));
    }
    
    // === EXEMPTIONS ===
    const exemptionCount = filingStatus === "married_filing_jointly" ? 2 : 1;
    const exemptionAmount = exemptionCount * 149;
    setField(FIELDS.line7Count, exemptionCount.toString());
    setField(FIELDS.line7Amount, exemptionAmount.toString());
    
    // === DEPENDENTS ===
    const numDependents = dependentsArray.length;
    for (let i = 0; i < Math.min(numDependents, 3); i++) {
      const dep = dependentsArray[i];
      const nameDep = nameDependents[i] || {};
      const depFirst = (nameDep.first_name || dep.name || "").toUpperCase();
      const depLast = (nameDep.last_name || "").toUpperCase();
      const depSsn = nameDep.ssn || "";
      const depRel = (nameDep.relationship || "").toUpperCase();
      
      if (i === 0) {
        setField(FIELDS.dep1FirstName, depFirst);
        setField(FIELDS.dep1LastName, depLast);
        setField(FIELDS.dep1Ssn, depSsn);
        setField(FIELDS.dep1Relationship, depRel);
      } else if (i === 1) {
        setField(FIELDS.dep2FirstName, depFirst);
        setField(FIELDS.dep2LastName, depLast);
        setField(FIELDS.dep2Ssn, depSsn);
        setField(FIELDS.dep2Relationship, depRel);
      } else if (i === 2) {
        setField(FIELDS.dep3FirstName, depFirst);
        setField(FIELDS.dep3LastName, depLast);
        setField(FIELDS.dep3Ssn, depSsn);
        setField(FIELDS.dep3Relationship, depRel);
      }
    }
    
    const depExemptionAmount = numDependents * 461;
    setField(FIELDS.line10Count, numDependents.toString());
    setField(FIELDS.line10Amount, depExemptionAmount.toString());
    
    const totalExemption = exemptionAmount + depExemptionAmount;
    setField(FIELDS.line11, totalExemption.toString());
    
    // === INCOME ===
    setField(FIELDS.line12, formatMoney(pythonInput.wages));
    setField(FIELDS.line13, formatMoney(federal.agi || ca.federal_agi));
    setField(FIELDS.line14, "0");
    setField(FIELDS.line15, formatMoney(federal.agi || ca.federal_agi));
    setField(FIELDS.line16, "0");
    setField(FIELDS.line17, formatMoney(ca.ca_agi || ca.federal_agi));
    setField(FIELDS.line18, formatMoney(ca.standard_deduction || ca.deduction_used));
    setField(FIELDS.line19, formatMoney(ca.taxable_income));
    
    // === TAX ===
    setField(FIELDS.line31, formatMoney(ca.base_tax || ca.total_tax));
    setField(FIELDS.line32, totalExemption.toString());
    const taxAfterExemption = Math.max(0, (ca.base_tax || 0) - totalExemption);
    setField(FIELDS.line33, formatMoney(taxAfterExemption));
    setField(FIELDS.line34, "0");
    setField(FIELDS.line35, formatMoney(taxAfterExemption));
    setField(FIELDS.line47, "0");
    setField(FIELDS.line48, formatMoney(ca.tax_after_credits || taxAfterExemption));
    setField(FIELDS.line62, formatMoney(ca.mental_health_tax || 0));
    setField(FIELDS.line64, formatMoney(ca.total_tax || taxAfterExemption));
    
    // === PAYMENTS ===
    setField(FIELDS.line71, formatMoney(ca.withholding || pythonInput.state_withholding));
    setField(FIELDS.line75, formatMoney(ca.caleitc));  // CalEITC ✅
    setField(FIELDS.line76, formatMoney(ca.yctc || 0));
    setField(FIELDS.line77, "0");
    
    const totalPayments = (ca.withholding || 0) + (ca.refundable_credits || 0);
    setField(FIELDS.line78, formatMoney(totalPayments));
    setField(FIELDS.line91, "0");
    setField(FIELDS.line93, formatMoney(totalPayments));
    setField(FIELDS.line95, formatMoney(totalPayments));
    setField(FIELDS.line97, formatMoney(ca.refund));
    setField(FIELDS.line99, formatMoney(ca.refund));
    
    // === REFUND ===
    setField(FIELDS.line115, formatMoney(ca.refund));
    console.log(`🌴 CA REFUND: $${ca.refund}`);
    
    if (ca.amount_owed > 0) {
      setField(FIELDS.line100, formatMoney(ca.amount_owed));
      setField(FIELDS.line111, formatMoney(ca.amount_owed));
    }
    
    form.flatten();
    const filledPdfBytes = await pdfDoc.save();
    
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=CA540_${sessionId}.pdf`);
    res.send(Buffer.from(filledPdfBytes));
    
    console.log("✅ CA 540 PDF generated successfully!");
    
  } catch (error) {
    console.error("❌ CA 540 PDF generation error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
