import express from "express";
import multer from "multer";
import FormData from "form-data";
import axios from "axios";
import path from "path";
import fs from "fs";
import { saveFormData, getSession, saveAnswer } from "../tax/sessionDB.js";
import mongoose from "mongoose";

const router = express.Router();

// ============================================================
// FILE STORAGE SETUP - Save files for CPA review
// ============================================================
const UPLOAD_DIR = path.join(process.cwd(), "uploads");

// Ensure upload directory exists
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
    // Format: 2024-W2-1703123456789.pdf
    const timestamp = Date.now();
    const taxYear = req.body.taxYear || new Date().getFullYear();
    const ext = path.extname(file.originalname);
    const safeName = `${taxYear}-UPLOAD-${timestamp}${ext}`;
    cb(null, safeName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
});

// Get TaxSession model
const TaxSession = mongoose.models.TaxSession;

// ============================================================
// UPLOADED FILES SCHEMA - Track files for CPA review
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
  owner: { type: String, enum: ["taxpayer", "spouse"], default: "taxpayer" },  // ✅ NEW: Track owner
  cpaReviewedBy: { type: String },
  cpaReviewedAt: { type: Date },
  cpaComments: { type: String },
  uploadedAt: { type: Date, default: Date.now }
});

const UploadedFile = mongoose.models.UploadedFile || mongoose.model("UploadedFile", uploadedFileSchema);

// ============================================================
// ✅ VALIDATE W-2 DATA - Check for OCR errors
// ============================================================
function validateW2Data(data) {
  const wages = Number(data.wages_tips_other_comp) || 0;
  const fedWithheld = Number(data.federal_income_tax_withheld) || 0;
  const ssWages = Number(data.social_security_wages) || 0;
  const ssTax = Number(data.social_security_tax_withheld) || 0;
  const medicareTax = Number(data.medicare_tax_withheld) || 0;
  const stateTax = Number(data.state_income_tax) || 0;
  
  const warnings = [];
  let correctedFedWithheld = fedWithheld;
  
  // Check 1: If fedWithheld > 35% of wages, it's suspicious
  if (wages > 0 && fedWithheld > wages * 0.35) {
    warnings.push(`Federal withheld (${fedWithheld}) is ${(fedWithheld/wages*100).toFixed(1)}% of wages - suspicious!`);
    
    // Check if it looks like SS + Medicare were added
    const combinedTaxes = ssTax + medicareTax;
    
    // Try to extract the actual federal withheld
    const possibleCorrect = fedWithheld - ssTax - medicareTax;
    if (possibleCorrect > 0 && possibleCorrect < wages * 0.35) {
      console.log(`⚠️ VALIDATION: Correcting fedWithheld from ${fedWithheld} to ${possibleCorrect}`);
      correctedFedWithheld = Math.round(possibleCorrect * 100) / 100;
      warnings.push(`Auto-corrected federal withheld from ${fedWithheld} to ${correctedFedWithheld}`);
    }
  }
  
  // Check 2: SS tax should be ~6.2% of SS wages
  if (ssWages > 0 && ssTax > 0) {
    const expectedSSTax = ssWages * 0.062;
    if (Math.abs(ssTax - expectedSSTax) > 100) {
      warnings.push(`SS tax (${ssTax}) doesn't match 6.2% of SS wages (${expectedSSTax.toFixed(2)})`);
    }
  }
  
  return {
    isValid: warnings.length === 0,
    warnings,
    correctedData: {
      ...data,
      federal_income_tax_withheld: correctedFedWithheld
    }
  };
}

// ============================================================
// ✅ CHECK FOR DUPLICATE W-2 - By employer EIN + employee SSN
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
      
      // Match by EIN + SSN + same owner type
      if (newEIN && existingEIN && newEIN === existingEIN &&
          newSSN && existingSSN && newSSN === existingSSN &&
          existingOwner === (isSpouse ? 'spouse' : 'taxpayer')) {
        console.log(`⚠️ DUPLICATE W-2 detected! EIN: ${newEIN}, SSN: ***${newSSN.slice(-4)}`);
        return { isDuplicate: true, existingIndex: i };
      }
    }
    
    return { isDuplicate: false, existingIndex: -1 };
  } catch (e) {
    console.log("Error checking duplicate:", e.message);
    return { isDuplicate: false, existingIndex: -1 };
  }
}

// ============================================================
// ✅ SMART SPOUSE DETECTION (from fileRoutes.js)
// ============================================================
async function detectIfSpouseDocument(userId, extractedFields) {
  try {
    const session = await getSession(userId);
    if (!session) return { isSpouse: false, reason: 'no session' };
    
    const answers = session.answers || new Map();
    
    // Helper to get value from Map or Object
    const getValue = (key) => {
      if (answers instanceof Map) return answers.get(key);
      return answers[key];
    };
    
    const filingStatus = getValue('filing_status');
    const spouseHasW2 = getValue('spouse_has_w2');
    const spouseW2Done = getValue('spouse_w2_uploaded') === 'yes';
    const spouseWages = parseFloat(getValue('spouse_total_wages')) || 0;
    const taxpayerWages = parseFloat(getValue('total_wages')) || 0;
    const taxpayerSSN = (getValue('ssn') || '').replace(/[^0-9]/g, '');
    const spouseSSN = (getValue('spouse_ssn') || '').replace(/[^0-9]/g, '');
    
    // Get SSN from this document
    const docSSN = (extractedFields.employee_ssn || '').replace(/[^0-9]/g, '');
    
    // Check 1: If SSN matches spouse's SSN on file
    if (spouseSSN && docSSN && spouseSSN === docSSN) {
      console.log(`🔍 SPOUSE DETECTED: SSN matches spouse SSN on file`);
      return { isSpouse: true, reason: 'ssn_match' };
    }
    
    // Check 2: If SSN doesn't match taxpayer but we're MFJ
    if (taxpayerSSN && docSSN && taxpayerSSN !== docSSN && filingStatus === 'married_filing_jointly') {
      console.log(`🔍 SPOUSE DETECTED: SSN different from taxpayer, filing MFJ`);
      return { isSpouse: true, reason: 'different_ssn_mfj' };
    }
    
    // Check 3: MFJ + spouse said they have W-2 + taxpayer W-2 done + no spouse W-2 yet
    if (filingStatus === 'married_filing_jointly' && 
        spouseHasW2 === 'yes' && 
        taxpayerWages > 0 && 
        !spouseW2Done && 
        spouseWages === 0) {
      console.log(`🔍 SPOUSE DETECTED: MFJ, taxpayer has W-2, awaiting spouse W-2`);
      return { isSpouse: true, reason: 'awaiting_spouse_w2' };
    }
    
    return { isSpouse: false, reason: 'taxpayer' };
  } catch (e) {
    console.log("Error in spouse detection:", e.message);
    return { isSpouse: false, reason: 'error' };
  }
}

// ============================================================
// UPLOAD ENDPOINT - Save file + OCR extract + Spouse Detection
// ============================================================
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const { userId, formType, taxYear, isSpouse: forceSpouse } = req.body;

    if (!req.file || !userId) {
      return res.status(400).json({ success: false, message: "File and userId required." });
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log(`📤 File Upload`);
    console.log(`   File: ${req.file.originalname}`);
    console.log(`   User: ${userId}`);
    console.log(`   Size: ${req.file.size} bytes`);
    console.log(`${"=".repeat(60)}`);

    // ✅ Use /ocr/auto - AUTO-DETECTS any form type!
    const pythonOCRUrl = "http://localhost:5001/ocr/auto";
    
    // Read the saved file for OCR
    const fileBuffer = fs.readFileSync(req.file.path);
    
    const ocrFormData = new FormData();
    ocrFormData.append("file", fileBuffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });

    // 🔍 Send to Python OCR for auto-detection and extraction
    const ocrResponse = await axios.post(pythonOCRUrl, ocrFormData, {
      headers: ocrFormData.getHeaders(),
      timeout: 60000
    });

    console.log("✅ Python OCR Response:", JSON.stringify(ocrResponse.data).substring(0, 300));

    const pythonData = ocrResponse.data;
    
    if (pythonData.status === "error") {
      return res.status(500).json({ 
        success: false, 
        error: pythonData.error || "OCR failed" 
      });
    }

    // Get extracted data and detected form type
    let extractedFields = pythonData.extracted || pythonData.data || {};
    const detectedType = pythonData.form_type || formType || "UNKNOWN";
    
    console.log(`📋 Detected Form Type: ${detectedType}`);

    // ============================================================
    // ✅ SPOUSE DETECTION (NEW!)
    // ============================================================
    let isSpouseDocument = forceSpouse === 'true' || forceSpouse === true;
    let spouseDetection = { isSpouse: false, reason: 'manual' };
    
    if (!isSpouseDocument && (detectedType === "W-2" || detectedType === "W2")) {
      spouseDetection = await detectIfSpouseDocument(userId, extractedFields);
      isSpouseDocument = spouseDetection.isSpouse;
      
      if (isSpouseDocument) {
        console.log(`🔍 AUTO-DETECTED AS SPOUSE DOCUMENT (reason: ${spouseDetection.reason})`);
      }
    }

    // ============================================================
    // ✅ W-2 VALIDATION & DUPLICATE CHECK
    // ============================================================
    let isDuplicate = false;
    let validationWarnings = [];
    
    if (detectedType === "W-2" || detectedType === "W2") {
      // Validate W-2 data
      const validation = validateW2Data(extractedFields);
      validationWarnings = validation.warnings;
      
      if (validation.warnings.length > 0) {
        console.log("⚠️ W-2 Validation Warnings:", validation.warnings);
        extractedFields = validation.correctedData;
      }
      
      // Check for duplicate
      const dupCheck = await isDuplicateW2(userId, extractedFields, isSpouseDocument);
      isDuplicate = dupCheck.isDuplicate;
      
      if (isDuplicate) {
        console.log(`⚠️ DUPLICATE W-2 - will REPLACE existing entry`);
      }
    }

    // ============================================================
    // ✅ SAVE FILE RECORD FOR CPA REVIEW
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
      owner: isSpouseDocument ? "spouse" : "taxpayer"  // ✅ Track owner
    });
    
    await fileRecord.save();
    console.log(`✅ File record saved for CPA review: ${fileRecord._id}`);

    // ============================================================
    // ✅ SAVE TO FORMS DATABASE (with duplicate handling)
    // ============================================================
    try {
      // Add owner to extracted fields for tracking
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
    // ✅ SAVE TOTALS TO SESSION.ANSWERS
    // ============================================================
    if (TaxSession) {
      const existingSession = await TaxSession.findOne({ userId: String(userId) });
      const existingAnswers = existingSession?.answers || new Map();
      
      const getExisting = (key) => {
        if (existingAnswers instanceof Map) return existingAnswers.get(key);
        return existingAnswers[key];
      };
      
      const updates = { updated_at: new Date() };
      
      if (detectedType === "W-2" || detectedType === "W2") {
        
        if (isSpouseDocument) {
          // ============================================================
          // ✅ SPOUSE W-2 HANDLING
          // ============================================================
          const spouseW2Count = (parseInt(getExisting('spouse_w2_count')) || 0) + (isDuplicate ? 0 : 1);
          
          if (isDuplicate) {
            // Replace spouse values
            updates["answers.spouse_total_wages"] = Number(extractedFields.wages_tips_other_comp) || 0;
            updates["answers.spouse_total_withheld"] = Number(extractedFields.federal_income_tax_withheld) || 0;
            updates["answers.spouse_total_state_withheld"] = Number(extractedFields.state_income_tax) || 0;
          } else {
            // Add to spouse totals
            const existingSpouseWages = Number(getExisting('spouse_total_wages')) || 0;
            const existingSpouseWithheld = Number(getExisting('spouse_total_withheld')) || 0;
            const existingSpouseState = Number(getExisting('spouse_total_state_withheld')) || 0;
            
            updates["answers.spouse_total_wages"] = existingSpouseWages + (Number(extractedFields.wages_tips_other_comp) || 0);
            updates["answers.spouse_total_withheld"] = existingSpouseWithheld + (Number(extractedFields.federal_income_tax_withheld) || 0);
            updates["answers.spouse_total_state_withheld"] = existingSpouseState + (Number(extractedFields.state_income_tax) || 0);
          }
          
          updates["answers.spouse_w2_count"] = spouseW2Count;
          updates["answers.spouse_w2_uploaded"] = "yes";
          updates["answers.spouse_employer_name"] = extractedFields.employer_name || "";
          
          // Save spouse SSN if not already saved
          if (!getExisting('spouse_ssn') && extractedFields.employee_ssn) {
            updates["answers.spouse_ssn"] = extractedFields.employee_ssn;
          }
          
          // Save spouse name if not already saved
          if (!getExisting('spouse_first_name')) {
            if (extractedFields.employee_first_name) updates["answers.spouse_first_name"] = extractedFields.employee_first_name;
            if (extractedFields.employee_last_name) updates["answers.spouse_last_name"] = extractedFields.employee_last_name;
          }
          
          console.log(`✅ SPOUSE W-2: wages=${extractedFields.wages_tips_other_comp}, withheld=${extractedFields.federal_income_tax_withheld}`);
          
        } else {
          // ============================================================
          // ✅ TAXPAYER W-2 HANDLING
          // ============================================================
          const existingFirstName = getExisting('first_name');
          
          if (!existingFirstName) {
            // First W-2 - save personal info
            if (extractedFields.employee_first_name) updates["answers.first_name"] = extractedFields.employee_first_name;
            if (extractedFields.employee_last_name) updates["answers.last_name"] = extractedFields.employee_last_name;
            if (extractedFields.employee_ssn) updates["answers.ssn"] = extractedFields.employee_ssn;
            if (extractedFields.employee_address) updates["answers.address"] = extractedFields.employee_address;
            if (extractedFields.employee_city) updates["answers.city"] = extractedFields.employee_city;
            if (extractedFields.employee_state) updates["answers.state"] = extractedFields.employee_state;
            if (extractedFields.employee_zip) updates["answers.zip"] = extractedFields.employee_zip;
            console.log(`✅ First W-2 - saving personal info for ${extractedFields.employee_first_name}`);
          }
          
          // Track W-2 count
          const w2Count = (parseInt(getExisting('w2_count')) || 0) + (isDuplicate ? 0 : 1);
          updates["answers.w2_count"] = w2Count;
          
          if (isDuplicate) {
            // Replace values
            updates["answers.total_wages"] = Number(extractedFields.wages_tips_other_comp) || 0;
            updates["answers.total_withheld"] = Number(extractedFields.federal_income_tax_withheld) || 0;
            updates["answers.total_state_withheld"] = Number(extractedFields.state_income_tax) || 0;
          } else {
            // Add to existing values
            const existingWages = Number(getExisting('total_wages')) || 0;
            const existingWithheld = Number(getExisting('total_withheld')) || 0;
            const existingStateWithheld = Number(getExisting('total_state_withheld')) || 0;
            
            updates["answers.total_wages"] = existingWages + (Number(extractedFields.wages_tips_other_comp) || 0);
            updates["answers.total_withheld"] = existingWithheld + (Number(extractedFields.federal_income_tax_withheld) || 0);
            updates["answers.total_state_withheld"] = existingStateWithheld + (Number(extractedFields.state_income_tax) || 0);
          }
          
          updates["answers.employer_name"] = extractedFields.employer_name || "";
          updates["answers.employer_ein"] = extractedFields.employer_ein || "";
          updates["answers.social_security_wages"] = Number(extractedFields.social_security_wages) || 0;
          updates["answers.social_security_tax"] = Number(extractedFields.social_security_tax_withheld) || 0;
          updates["answers.medicare_wages"] = Number(extractedFields.medicare_wages) || 0;
          updates["answers.medicare_tax"] = Number(extractedFields.medicare_tax_withheld) || 0;
          updates["answers.has_w2"] = "yes";
          
          console.log(`✅ TAXPAYER W-2: wages=${extractedFields.wages_tips_other_comp}, withheld=${extractedFields.federal_income_tax_withheld}`);
        }
        
      } else if (detectedType === "1099-NEC" || detectedType === "1099NEC") {
        const existing = Number(getExisting('total_self_employment')) || 0;
        updates["answers.total_self_employment"] = existing + (Number(extractedFields.nonemployee_compensation) || 0);
        updates["answers.has_1099nec"] = "yes";
        
      } else if (detectedType === "1099-INT" || detectedType === "1099INT") {
        const prefix = isSpouseDocument ? "spouse_" : "";
        const existing = Number(getExisting(`${prefix}total_interest`)) || 0;
        updates[`answers.${prefix}total_interest`] = existing + (Number(extractedFields.interest_income) || 0);
        updates["answers.has_1099int"] = "yes";
        
      } else if (detectedType === "1099-DIV" || detectedType === "1099DIV") {
        const prefix = isSpouseDocument ? "spouse_" : "";
        const existing = Number(getExisting(`${prefix}total_dividends`)) || 0;
        updates[`answers.${prefix}total_dividends`] = existing + (Number(extractedFields.ordinary_dividends) || 0);
        updates["answers.has_1099div"] = "yes";
      }
      
      await TaxSession.updateOne(
        { userId: String(userId) },
        { $set: updates },
        { upsert: true }
      );
      
      console.log(`✅ Session updated for user ${userId}`);
    }

    // ============================================================
    // ✅ BUILD RESPONSE
    // ============================================================
    const response = {
      success: true,
      fileId: fileRecord._id,
      formType: detectedType,
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
        console.log(`✅ Replaced ${newOwner} W-2 at index ${i}`);
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
  
  console.log(`✅ Form data replaced for ${formType}`);
}

// ============================================================
// GET UPLOAD STATUS - Shows taxpayer and spouse uploads
// ============================================================
router.get("/status/:userId", async (req, res) => {
  try {
    const session = await getSession(req.params.userId);
    const a = session?.answers || new Map();
    
    const getValue = (key) => {
      if (a instanceof Map) return a.get(key);
      return a[key];
    };
    
    res.json({
      success: true,
      taxpayer: {
        w2_count: parseInt(getValue('w2_count')) || 0,
        total_wages: parseFloat(getValue('total_wages')) || 0,
        total_withheld: parseFloat(getValue('total_withheld')) || 0,
        total_state_withheld: parseFloat(getValue('total_state_withheld')) || 0,
        interest: parseFloat(getValue('total_interest')) || 0,
        dividends: parseFloat(getValue('total_dividends')) || 0,
        self_employment: parseFloat(getValue('total_self_employment')) || 0
      },
      spouse: {
        w2_count: parseInt(getValue('spouse_w2_count')) || 0,
        total_wages: parseFloat(getValue('spouse_total_wages')) || 0,
        total_withheld: parseFloat(getValue('spouse_total_withheld')) || 0,
        total_state_withheld: parseFloat(getValue('spouse_total_state_withheld')) || 0,
        interest: parseFloat(getValue('spouse_total_interest')) || 0,
        dividends: parseFloat(getValue('spouse_total_dividends')) || 0
      },
      filing_status: getValue('filing_status')
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// GET USER'S UPLOADED FILES - For user or CPA to view
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
// DOWNLOAD FILE - For CPA to view original document
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
// CPA REVIEW ENDPOINTS
// ============================================================

// Get all pending reviews (for CPA dashboard)
router.get("/cpa/pending", async (req, res) => {
  try {
    const { taxYear } = req.query;
    
    const query = { status: "pending" };
    if (taxYear) query.taxYear = parseInt(taxYear);
    
    const files = await UploadedFile.find(query)
      .sort({ uploadedAt: 1 })
      .limit(100);
    
    res.json({
      success: true,
      count: files.length,
      files
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// CPA approve/reject a file
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
    
    // If CPA made corrections, update extracted data
    if (corrections && typeof corrections === "object") {
      update.extractedData = corrections;
      
      const fileRecord = await UploadedFile.findById(fileId);
      if (fileRecord && TaxSession) {
        const userId = fileRecord.userId;
        const formType = fileRecord.formType;
        const isSpouse = fileRecord.owner === "spouse";
        const prefix = isSpouse ? "spouse_" : "";
        
        const updates = { updated_at: new Date() };
        
        if (formType === "W-2" || formType === "W2") {
          if (corrections.wages_tips_other_comp !== undefined) {
            updates[`answers.${prefix}total_wages`] = Number(corrections.wages_tips_other_comp);
          }
          if (corrections.federal_income_tax_withheld !== undefined) {
            updates[`answers.${prefix}total_withheld`] = Number(corrections.federal_income_tax_withheld);
          }
          if (corrections.state_income_tax !== undefined) {
            updates[`answers.${prefix}total_state_withheld`] = Number(corrections.state_income_tax);
          }
        }
        
        await TaxSession.updateOne({ userId }, { $set: updates });
        console.log(`✅ CPA corrections applied for ${isSpouse ? 'spouse' : 'taxpayer'} - user ${userId}`);
      }
    }
    
    const fileRecord = await UploadedFile.findByIdAndUpdate(
      fileId,
      { $set: update },
      { new: true }
    );
    
    if (!fileRecord) {
      return res.status(404).json({ success: false, error: "File not found" });
    }
    
    res.json({
      success: true,
      message: `File ${status}`,
      file: fileRecord
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get review stats for CPA dashboard
router.get("/cpa/stats", async (req, res) => {
  try {
    const stats = await UploadedFile.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);
    
    const result = {
      pending: 0,
      reviewed: 0,
      approved: 0,
      rejected: 0,
      total: 0
    };
    
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