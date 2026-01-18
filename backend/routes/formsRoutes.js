import express from "express";
import multer from "multer";
import FormData from "form-data";
import axios from "axios";
import path from "path";
import fs from "fs";
import { saveFormData, getSession, saveAnswer } from "../services/session/sessionDB.js";
import mongoose from "mongoose";

// ✅ Import from form1040Validator - single source of truth!
import { INCOME_FORMS, getIncomeSummary } from "../services/tax/form1040Validator.js";

const router = express.Router();

// ============================================================
// ✅ OCR SERVICE URL - Use Python Tax API (port 5002)
// ============================================================
const PYTHON_OCR_URL = process.env.PYTHON_TAX_API || "http://localhost:5002";
console.log(`📄 OCR Service configured: ${PYTHON_OCR_URL}`);

// ============================================================
// FILE STORAGE SETUP - Save files for CPA review
// ============================================================
const UPLOAD_DIR = path.join(process.cwd(), "uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  console.log("📁 Created uploads directory:", UPLOAD_DIR);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.body.userId || "unknown";
    const userDir = path.join(UPLOAD_DIR, String(userId));
    
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const taxYear = req.body.taxYear || new Date().getFullYear();
    const ext = path.extname(file.originalname);
    const safeName = `${taxYear}-UPLOAD-${timestamp}${ext}`;
    cb(null, safeName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 }
});

const TaxSession = mongoose.models.TaxSession;

// ============================================================
// UPLOADED FILES SCHEMA
// ============================================================
const uploadedFileSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  fileName: { type: String, required: true },
  originalName: { type: String, required: true },
  filePath: { type: String, required: true },
  fileSize: { type: Number },
  mimeType: { type: String },
  formType: { type: String, default: "UNKNOWN" },
  taxYear: { type: Number, default: new Date().getFullYear() },
  extractedData: { type: Object, default: {} },
  status: { type: String, enum: ["pending", "reviewed", "approved", "rejected"], default: "pending" },
  owner: { type: String, enum: ["taxpayer", "spouse"], default: "taxpayer" },
  cpaReviewedBy: { type: String },
  cpaReviewedAt: { type: Date },
  cpaComments: { type: String },
  uploadedAt: { type: Date, default: Date.now }
});

const UploadedFile = mongoose.models.UploadedFile || mongoose.model("UploadedFile", uploadedFileSchema);

// ============================================================
// ✅ NORMALIZE FORM TYPE - Map variations to standard names
// ============================================================
function normalizeFormType(detectedType) {
  const typeMap = {
    'W2': 'W-2',
    'W-2': 'W-2',
    '1099NEC': '1099-NEC',
    '1099-NEC': '1099-NEC',
    '1099INT': '1099-INT',
    '1099-INT': '1099-INT',
    '1099DIV': '1099-DIV',
    '1099-DIV': '1099-DIV',
    '1099B': '1099-B',
    '1099-B': '1099-B',
    '1099R': '1099-R',
    '1099-R': '1099-R',
    '1099G': '1099-G',
    '1099-G': '1099-G',
    '1099MISC': '1099-MISC',
    '1099-MISC': '1099-MISC',
    '1099K': '1099-K',
    '1099-K': '1099-K',
    'SSA1099': 'SSA-1099',
    'SSA-1099': 'SSA-1099',
    'W2G': 'W-2G',
    'W-2G': 'W-2G'
  };
  
  return typeMap[detectedType] || detectedType;
}

// ============================================================
// ✅ GET FORM INFO FROM INCOME_FORMS
// ============================================================
function getFormConfig(formType) {
  const normalized = normalizeFormType(formType);
  return INCOME_FORMS[normalized] || null;
}

// ============================================================
// ✅ VALIDATE W-2 DATA
// ============================================================
function validateW2Data(data) {
  const wages = Number(data.wages_tips_other_comp) || 0;
  const fedWithheld = Number(data.federal_income_tax_withheld) || 0;
  const ssTax = Number(data.social_security_tax_withheld) || 0;
  const medicareTax = Number(data.medicare_tax_withheld) || 0;
  
  const warnings = [];
  let correctedFedWithheld = fedWithheld;
  
  if (wages > 0 && fedWithheld > wages * 0.35) {
    warnings.push(`Federal withheld (${fedWithheld}) is ${(fedWithheld/wages*100).toFixed(1)}% of wages - suspicious!`);
    
    const possibleCorrect = fedWithheld - ssTax - medicareTax;
    if (possibleCorrect > 0 && possibleCorrect < wages * 0.35) {
      console.log(`⚠️ VALIDATION: Correcting fedWithheld from ${fedWithheld} to ${possibleCorrect}`);
      correctedFedWithheld = Math.round(possibleCorrect * 100) / 100;
      warnings.push(`Auto-corrected federal withheld from ${fedWithheld} to ${correctedFedWithheld}`);
    }
  }
  
  return {
    isValid: warnings.length === 0,
    warnings,
    correctedData: { ...data, federal_income_tax_withheld: correctedFedWithheld }
  };
}

// ============================================================
// ✅ CHECK FOR DUPLICATE W-2
// ============================================================
async function isDuplicateW2(userId, newW2, isSpouse = false) {
  try {
    const session = await getSession(userId);
    const forms = session?.forms || new Map();
    const w2List = forms.get('W-2') || forms['W-2'] || [];
    
    if (!Array.isArray(w2List) || w2List.length === 0) {
      return { isDuplicate: false, existingIndex: -1 };
    }
    
    const newEIN = (newW2.employer_ein || '').replace(/[^0-9]/g, '');
    const newSSN = (newW2.employee_ssn || '').replace(/[^0-9]/g, '');
    
    for (let i = 0; i < w2List.length; i++) {
      const existing = w2List[i];
      const existingEIN = (existing.employer_ein || '').replace(/[^0-9]/g, '');
      const existingSSN = (existing.employee_ssn || '').replace(/[^0-9]/g, '');
      const existingOwner = existing.owner || 'taxpayer';
      
      if (newEIN && existingEIN && newEIN === existingEIN &&
          newSSN && existingSSN && newSSN === existingSSN &&
          existingOwner === (isSpouse ? 'spouse' : 'taxpayer')) {
        console.log(`⚠️ DUPLICATE W-2 detected! EIN: ${newEIN}`);
        return { isDuplicate: true, existingIndex: i };
      }
    }
    
    return { isDuplicate: false, existingIndex: -1 };
  } catch (e) {
    return { isDuplicate: false, existingIndex: -1 };
  }
}

// ============================================================
// ✅ SMART SPOUSE DETECTION
// ============================================================
async function detectIfSpouseDocument(userId, extractedFields) {
  try {
    const session = await getSession(userId);
    if (!session) return { isSpouse: false, reason: 'no session' };
    
    const answers = session.answers || new Map();
    const getValue = (key) => answers instanceof Map ? answers.get(key) : answers[key];
    
    const filingStatus = getValue('filing_status');
    const spouseHasW2 = getValue('spouse_has_w2');
    const spouseW2Done = getValue('spouse_w2_uploaded') === 'yes';
    const spouseWages = parseFloat(getValue('spouse_total_wages')) || 0;
    const taxpayerWages = parseFloat(getValue('total_wages')) || 0;
    const taxpayerSSN = (getValue('ssn') || '').replace(/[^0-9]/g, '');
    const spouseSSN = (getValue('spouse_ssn') || '').replace(/[^0-9]/g, '');
    const docSSN = (extractedFields.employee_ssn || '').replace(/[^0-9]/g, '');
    
    if (spouseSSN && docSSN && spouseSSN === docSSN) {
      console.log(`🔍 SPOUSE DETECTED: SSN matches spouse SSN on file`);
      return { isSpouse: true, reason: 'ssn_match' };
    }
    
    if (taxpayerSSN && docSSN && taxpayerSSN !== docSSN && filingStatus === 'married_filing_jointly') {
      console.log(`🔍 SPOUSE DETECTED: SSN different from taxpayer, filing MFJ`);
      return { isSpouse: true, reason: 'different_ssn_mfj' };
    }
    
    if (filingStatus === 'married_filing_jointly' && 
        spouseHasW2 === 'yes' && 
        taxpayerWages > 0 && 
        !spouseW2Done && 
        spouseWages === 0) {
      console.log(`🔍 SPOUSE DETECTED: MFJ, awaiting spouse W-2`);
      return { isSpouse: true, reason: 'awaiting_spouse_w2' };
    }
    
    return { isSpouse: false, reason: 'taxpayer' };
  } catch (e) {
    return { isSpouse: false, reason: 'error' };
  }
}

// ============================================================
// ✅ PROCESS FORM DATA - Maps extracted fields to DB fields
// Uses INCOME_FORMS configuration
// ============================================================
function processFormData(formType, extractedFields, isSpouse = false) {
  const normalized = normalizeFormType(formType);
  const formConfig = INCOME_FORMS[normalized];
  const prefix = isSpouse ? "spouse_" : "";
  const updates = {};
  
  if (!formConfig) {
    console.log(`⚠️ Unknown form type: ${formType}`);
    return updates;
  }
  
  // Process based on form type
  switch (normalized) {
    case 'W-2':
      // Income fields
      updates[`${prefix}total_wages`] = Number(extractedFields.wages_tips_other_comp) || 0;
      updates[`${prefix}total_withheld`] = Number(extractedFields.federal_income_tax_withheld) || 0;
      updates[`${prefix}total_state_withheld`] = Number(extractedFields.state_income_tax) || 0;
      updates[`${prefix}employer_name`] = extractedFields.employer_name || '';
      updates[`${prefix}employer_ein`] = extractedFields.employer_ein || '';
      updates[`${prefix}has_w2`] = 'yes';
      
      // Personal info (only for taxpayer, first W-2)
      if (!isSpouse) {
        updates._personal = {
          first_name: extractedFields.employee_first_name,
          last_name: extractedFields.employee_last_name,
          ssn: extractedFields.employee_ssn,
          address: extractedFields.employee_address,
          city: extractedFields.employee_city,
          state: extractedFields.employee_state,
          zip: extractedFields.employee_zip
        };
      } else {
        // Spouse personal info
        updates._spouse_personal = {
          spouse_first_name: extractedFields.employee_first_name,
          spouse_last_name: extractedFields.employee_last_name,
          spouse_ssn: extractedFields.employee_ssn
        };
      }
      break;
      
    case '1099-NEC':
      updates[`${prefix}total_self_employment`] = Number(extractedFields.nonemployee_compensation) || 0;
      updates[`${prefix}has_1099nec`] = 'yes';
      break;
      
    case '1099-INT':
      updates[`${prefix}total_interest`] = Number(extractedFields.interest_income) || 0;
      updates[`${prefix}tax_exempt_interest`] = Number(extractedFields.tax_exempt_interest) || 0;
      updates[`${prefix}has_1099int`] = 'yes';
      break;
      
    case '1099-DIV':
      updates[`${prefix}total_dividends`] = Number(extractedFields.total_ordinary_dividends) || 0;
      updates[`${prefix}qualified_dividends`] = Number(extractedFields.qualified_dividends) || 0;
      updates[`${prefix}has_1099div`] = 'yes';
      break;
      
    case '1099-B':
      updates[`${prefix}capital_gains`] = Number(extractedFields.gain_loss) || 0;
      updates[`${prefix}stock_proceeds`] = Number(extractedFields.proceeds) || 0;
      updates[`${prefix}stock_cost_basis`] = Number(extractedFields.cost_basis) || 0;
      updates[`${prefix}has_1099b`] = 'yes';
      break;
      
    case '1099-R':
      updates[`${prefix}retirement_gross`] = Number(extractedFields.gross_distribution) || 0;
      updates[`${prefix}retirement_income`] = Number(extractedFields.taxable_amount) || 0;
      updates[`${prefix}has_1099r`] = 'yes';
      break;
      
    case 'SSA-1099':
      updates[`${prefix}social_security_benefits`] = Number(extractedFields.net_benefits) || 0;
      updates[`${prefix}has_ssa1099`] = 'yes';
      break;
      
    case '1099-G':
      updates[`${prefix}unemployment_income`] = Number(extractedFields.unemployment_compensation) || 0;
      updates[`${prefix}state_tax_refund`] = Number(extractedFields.state_tax_refund) || 0;
      updates[`${prefix}has_1099g`] = 'yes';
      break;
      
    case '1099-MISC':
      updates[`${prefix}rental_income`] = Number(extractedFields.rents) || 0;
      updates[`${prefix}royalty_income`] = Number(extractedFields.royalties) || 0;
      updates[`${prefix}other_income`] = Number(extractedFields.other_income) || 0;
      updates[`${prefix}has_1099misc`] = 'yes';
      break;
      
    case '1099-K':
      updates[`${prefix}payment_card_income`] = Number(extractedFields.gross_amount) || 0;
      updates[`${prefix}has_1099k`] = 'yes';
      break;
      
    case 'W-2G':
      updates[`${prefix}gambling_income`] = Number(extractedFields.gross_winnings) || 0;
      updates[`${prefix}has_w2g`] = 'yes';
      break;
  }
  
  return updates;
}

// ============================================================
// UPLOAD ENDPOINT
// ============================================================
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const { userId, formType, taxYear, isSpouse: forceSpouse } = req.body;

    if (!req.file || !userId) {
      return res.status(400).json({ success: false, message: "File and userId required." });
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log(`📤 File Upload: ${req.file.originalname} | User: ${userId}`);
    console.log(`${"=".repeat(60)}`);

    // ============================================================
    // ✅ SEND TO PYTHON OCR SERVICE (port 5002)
    // ============================================================
    const fileBuffer = fs.readFileSync(req.file.path);
    
    const ocrFormData = new FormData();
    ocrFormData.append("file", fileBuffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });

    let pythonData;
    
    try {
      // Try the Python Tax API OCR endpoint
      const ocrResponse = await axios.post(`${PYTHON_OCR_URL}/ocr/auto`, ocrFormData, {
        headers: ocrFormData.getHeaders(),
        timeout: 60000
      });
      pythonData = ocrResponse.data;
    } catch (ocrError) {
      // If OCR endpoint doesn't exist, create mock data for demo
      console.log(`⚠️ OCR service not available: ${ocrError.message}`);
      console.log(`📝 Using filename-based detection as fallback...`);
      
      // Detect form type from filename
      const filename = req.file.originalname.toLowerCase();
      let detectedType = "UNKNOWN";
      
      if (filename.includes("w2") || filename.includes("w-2")) {
        detectedType = "W-2";
      } else if (filename.includes("1099-nec") || filename.includes("1099nec")) {
        detectedType = "1099-NEC";
      } else if (filename.includes("1099-int") || filename.includes("1099int")) {
        detectedType = "1099-INT";
      } else if (filename.includes("1099-div") || filename.includes("1099div")) {
        detectedType = "1099-DIV";
      } else if (filename.includes("1099-r") || filename.includes("1099r")) {
        detectedType = "1099-R";
      } else if (filename.includes("ssa-1099") || filename.includes("ssa1099")) {
        detectedType = "SSA-1099";
      }
      
      pythonData = {
        status: "success",
        form_type: detectedType,
        extracted: {},
        message: "OCR service unavailable - manual entry required"
      };
    }
    
    if (pythonData.status === "error") {
      return res.status(500).json({ success: false, error: pythonData.error || "OCR failed" });
    }

    let extractedFields = pythonData.extracted || pythonData.data || {};
    const detectedType = normalizeFormType(pythonData.form_type || formType || "UNKNOWN");
    
    console.log(`📋 Detected Form Type: ${detectedType}`);
    
    // Get form configuration
    const formConfig = INCOME_FORMS[detectedType];
    if (formConfig) {
      console.log(`   → Line: ${formConfig.line}`);
      console.log(`   → Category: ${formConfig.category}`);
    }

    // ============================================================
    // SPOUSE DETECTION
    // ============================================================
    let isSpouseDocument = forceSpouse === 'true' || forceSpouse === true;
    let spouseDetection = { isSpouse: false, reason: 'manual' };
    
    // Only auto-detect for forms that can have spouse versions
    if (!isSpouseDocument && formConfig?.canHave?.includes('spouse')) {
      spouseDetection = await detectIfSpouseDocument(userId, extractedFields);
      isSpouseDocument = spouseDetection.isSpouse;
      
      if (isSpouseDocument) {
        console.log(`🔍 AUTO-DETECTED AS SPOUSE DOCUMENT (reason: ${spouseDetection.reason})`);
      }
    }

    // ============================================================
    // W-2 VALIDATION & DUPLICATE CHECK
    // ============================================================
    let isDuplicate = false;
    let validationWarnings = [];
    
    if (detectedType === "W-2") {
      const validation = validateW2Data(extractedFields);
      validationWarnings = validation.warnings;
      
      if (validation.warnings.length > 0) {
        console.log("⚠️ W-2 Validation Warnings:", validation.warnings);
        extractedFields = validation.correctedData;
      }
      
      const dupCheck = await isDuplicateW2(userId, extractedFields, isSpouseDocument);
      isDuplicate = dupCheck.isDuplicate;
      
      if (isDuplicate) {
        console.log(`⚠️ DUPLICATE W-2 - will REPLACE existing entry`);
      }
    }

    // ============================================================
    // SAVE FILE RECORD FOR CPA REVIEW
    // ============================================================
    const fileRecord = new UploadedFile({
      userId: String(userId),
      fileName: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      formType: detectedType,
      taxYear: taxYear || new Date().getFullYear(),
      extractedData: extractedFields,
      status: "pending",
      owner: isSpouseDocument ? "spouse" : "taxpayer"
    });
    
    await fileRecord.save();
    console.log(`✅ File record saved: ${fileRecord._id}`);

    // ============================================================
    // SAVE TO FORMS DATABASE
    // ============================================================
    try {
      extractedFields.owner = isSpouseDocument ? "spouse" : "taxpayer";
      
      if (isDuplicate) {
        await replaceFormData(userId, detectedType, extractedFields);
      } else {
        await saveFormData(userId, detectedType, extractedFields);
      }
    } catch (dbErr) {
      console.log("⚠️ saveFormData error (non-fatal):", dbErr.message);
    }

    // ============================================================
    // UPDATE SESSION ANSWERS
    // ============================================================
    if (TaxSession) {
      const existingSession = await TaxSession.findOne({ userId: String(userId) });
      const existingAnswers = existingSession?.answers || new Map();
      
      const getExisting = (key) => {
        if (existingAnswers instanceof Map) return existingAnswers.get(key);
        return existingAnswers[key];
      };
      
      // Process form data using the unified function
      const formData = processFormData(detectedType, extractedFields, isSpouseDocument);
      const updates = { updated_at: new Date() };
      
      // Handle aggregation for multiple forms
      for (const [key, value] of Object.entries(formData)) {
        if (key === '_personal') {
          // Personal info - only save if not already present
          for (const [pKey, pValue] of Object.entries(value)) {
            if (!getExisting(pKey) && pValue) {
              updates[`answers.${pKey}`] = pValue;
              console.log(`   → Saving ${pKey}: ${pKey === 'ssn' ? '***' : pValue}`);
            }
          }
        } else if (key === '_spouse_personal') {
          // Spouse personal info
          for (const [pKey, pValue] of Object.entries(value)) {
            if (!getExisting(pKey) && pValue) {
              updates[`answers.${pKey}`] = pValue;
            }
          }
        } else if (typeof value === 'number' && formConfig?.fields) {
          // Check if this field should aggregate (multiple forms)
          const shouldAggregate = formConfig.multiple && !isDuplicate;
          
          if (shouldAggregate) {
            const existing = Number(getExisting(key)) || 0;
            updates[`answers.${key}`] = existing + value;
          } else {
            updates[`answers.${key}`] = value;
          }
        } else {
          updates[`answers.${key}`] = value;
        }
      }
      
      // Track form count
      const countKey = isSpouseDocument ? `spouse_${detectedType.toLowerCase().replace(/-/g, '')}_count` : `${detectedType.toLowerCase().replace(/-/g, '')}_count`;
      const currentCount = parseInt(getExisting(countKey)) || 0;
      updates[`answers.${countKey}`] = currentCount + (isDuplicate ? 0 : 1);
      
      await TaxSession.updateOne(
        { userId: String(userId) },
        { $set: updates },
        { upsert: true }
      );
      
      console.log(`✅ Session updated for user ${userId}`);
      
      // Log income summary after update
      const updatedSession = await getSession(userId);
      const incomeSummary = getIncomeSummary(updatedSession?.answers || {});
      console.log(`📊 Income Summary: ${incomeSummary.sourceCount} sources, $${incomeSummary.totalIncome.toLocaleString()} total`);
    }

    // ============================================================
    // BUILD RESPONSE
    // ============================================================
    const response = {
      success: true,
      fileId: fileRecord._id,
      formType: detectedType,
      formLine: formConfig?.line || 'Unknown',
      formCategory: formConfig?.category || 'other',
      owner: isSpouseDocument ? "spouse" : "taxpayer",
      isSpouse: isSpouseDocument,
      spouseDetectionReason: spouseDetection.reason,
      isDuplicate,
      validationWarnings,
      extractedFields,
      message: `${detectedType} uploaded successfully${isSpouseDocument ? ' (Spouse)' : ''}`
    };

    return res.json(response);

  } catch (err) {
    console.error("❌ Upload Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// REPLACE FORM DATA (for duplicates)
// ============================================================
async function replaceFormData(userId, formType, newData) {
  const session = await getSession(userId);
  if (!session) return;
  
  let forms = session.forms || new Map();
  if (forms instanceof Map) {
    forms = Object.fromEntries(forms);
  }
  
  const existingList = forms[formType] || [];
  
  if (!Array.isArray(existingList) || existingList.length === 0) {
    forms[formType] = [newData];
  } else {
    const newEIN = (newData.employer_ein || '').replace(/[^0-9]/g, '');
    const newSSN = (newData.employee_ssn || '').replace(/[^0-9]/g, '');
    const newOwner = newData.owner || 'taxpayer';
    
    let replaced = false;
    for (let i = 0; i < existingList.length; i++) {
      const existing = existingList[i];
      const existingEIN = (existing.employer_ein || '').replace(/[^0-9]/g, '');
      const existingSSN = (existing.employee_ssn || '').replace(/[^0-9]/g, '');
      const existingOwner = existing.owner || 'taxpayer';
      
      if (newEIN === existingEIN && newSSN === existingSSN && newOwner === existingOwner) {
        existingList[i] = newData;
        replaced = true;
        console.log(`✅ Replaced ${newOwner} ${formType} at index ${i}`);
        break;
      }
    }
    
    if (!replaced) {
      existingList.push(newData);
    }
    
    forms[formType] = existingList;
  }
  
  await TaxSession.updateOne(
    { userId: String(userId) },
    { $set: { forms: forms } }
  );
}

// ============================================================
// GET SUPPORTED FORMS - From INCOME_FORMS
// ============================================================
router.get("/supported-forms", (req, res) => {
  const { language } = req.query;
  const lang = language || 'en';
  
  const forms = Object.entries(INCOME_FORMS).map(([code, info]) => ({
    code,
    name: info.name,
    line: info.line,
    category: info.category,
    description: info.description[lang] || info.description.en,
    canHaveSpouse: info.canHave?.includes('spouse') || false,
    multiple: info.multiple || false,
    triggers: info.triggers || []
  }));
  
  res.json({ success: true, forms });
});

// ============================================================
// GET UPLOAD STATUS
// ============================================================
router.get("/status/:userId", async (req, res) => {
  try {
    const session = await getSession(req.params.userId);
    const answers = session?.answers || {};
    
    // Use getIncomeSummary from form1040Validator
    const incomeSummary = getIncomeSummary(answers);
    
    res.json({
      success: true,
      incomeSummary,
      taxpayer: {
        w2_count: parseInt(answers.w2_count) || 0,
        total_wages: parseFloat(answers.total_wages) || 0,
        total_withheld: parseFloat(answers.total_withheld) || 0,
        total_state_withheld: parseFloat(answers.total_state_withheld) || 0,
        interest: parseFloat(answers.total_interest) || 0,
        dividends: parseFloat(answers.total_dividends) || 0,
        self_employment: parseFloat(answers.total_self_employment) || 0,
        capital_gains: parseFloat(answers.capital_gains) || 0,
        retirement: parseFloat(answers.retirement_income) || 0,
        social_security: parseFloat(answers.social_security_benefits) || 0
      },
      spouse: {
        w2_count: parseInt(answers.spouse_w2_count) || 0,
        total_wages: parseFloat(answers.spouse_total_wages) || 0,
        total_withheld: parseFloat(answers.spouse_total_withheld) || 0,
        total_state_withheld: parseFloat(answers.spouse_total_state_withheld) || 0,
        interest: parseFloat(answers.spouse_total_interest) || 0,
        dividends: parseFloat(answers.spouse_total_dividends) || 0
      },
      filing_status: answers.filing_status
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// GET USER'S UPLOADED FILES
// ============================================================
router.get("/files/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, taxYear, owner } = req.query;
    
    const query = { userId: String(userId) };
    if (status) query.status = status;
    if (taxYear) query.taxYear = parseInt(taxYear);
    if (owner) query.owner = owner;
    
    const files = await UploadedFile.find(query).sort({ uploadedAt: -1 });
    
    res.json({
      success: true,
      count: files.length,
      files: files.map(f => ({
        id: f._id,
        fileName: f.fileName,
        originalName: f.originalName,
        formType: f.formType,
        taxYear: f.taxYear,
        status: f.status,
        owner: f.owner,
        uploadedAt: f.uploadedAt,
        extractedData: f.extractedData,
        cpaReviewedBy: f.cpaReviewedBy,
        cpaReviewedAt: f.cpaReviewedAt,
        cpaComments: f.cpaComments
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// DOWNLOAD FILE
// ============================================================
router.get("/download/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;
    const fileRecord = await UploadedFile.findById(fileId);
    
    if (!fileRecord) {
      return res.status(404).json({ success: false, error: "File not found" });
    }
    
    if (!fs.existsSync(fileRecord.filePath)) {
      return res.status(404).json({ success: false, error: "File missing from disk" });
    }
    
    res.download(fileRecord.filePath, fileRecord.originalName);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// CPA ENDPOINTS
// ============================================================
router.get("/cpa/pending", async (req, res) => {
  try {
    const { taxYear } = req.query;
    const query = { status: "pending" };
    if (taxYear) query.taxYear = parseInt(taxYear);
    
    const files = await UploadedFile.find(query).sort({ uploadedAt: 1 }).limit(100);
    res.json({ success: true, count: files.length, files });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/cpa/review/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;
    const { status, comments, reviewedBy, corrections } = req.body;
    
    if (!["approved", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid status" });
    }
    
    const update = {
      status,
      cpaReviewedBy: reviewedBy || "CPA",
      cpaReviewedAt: new Date(),
      cpaComments: comments || ""
    };
    
    if (corrections && typeof corrections === "object") {
      update.extractedData = corrections;
      
      const fileRecord = await UploadedFile.findById(fileId);
      if (fileRecord && TaxSession) {
        const formData = processFormData(fileRecord.formType, corrections, fileRecord.owner === "spouse");
        const updates = { updated_at: new Date() };
        
        for (const [key, value] of Object.entries(formData)) {
          if (!key.startsWith('_')) {
            updates[`answers.${key}`] = value;
          }
        }
        
        await TaxSession.updateOne({ userId: fileRecord.userId }, { $set: updates });
        console.log(`✅ CPA corrections applied for user ${fileRecord.userId}`);
      }
    }
    
    const fileRecord = await UploadedFile.findByIdAndUpdate(fileId, { $set: update }, { new: true });
    
    if (!fileRecord) {
      return res.status(404).json({ success: false, error: "File not found" });
    }
    
    res.json({ success: true, message: `File ${status}`, file: fileRecord });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/cpa/stats", async (req, res) => {
  try {
    const stats = await UploadedFile.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);
    
    const result = { pending: 0, reviewed: 0, approved: 0, rejected: 0, total: 0 };
    stats.forEach(s => {
      result[s._id] = s.count;
      result.total += s.count;
    });
    
    res.json({ success: true, stats: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;