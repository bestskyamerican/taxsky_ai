import { processFileUpload } from "../services/fileServices.js";
import { saveFormData } from "../services/sessionServices.js";

/**
 * POST /file/upload
 * Handle file upload for W-2, 1099 forms.
 */
export async function uploadTaxForm(req, res) {
  try {
    const { userId, formType } = req.body;

    if (!userId || !formType || !req.file) {
      return res
        .status(400)
        .json({ success: false, message: "userId, formType, and file are required." });
    }

    console.log(`📤 User ${userId} uploaded ${formType}`);

    // Process file (OCR logic)
    const extractedFields = await processFileUpload(req.file.buffer, formType);

    // Save extracted fields to session
    await saveFormData(userId, formType, extractedFields);

    return res.json({
      success: true,
      formType,
      extractedFields,
      message: `Form uploaded and processed: ${formType}`,
    });
  } catch (err) {
    console.error("❌ Upload Form Error:", err.message || err);
    res.status(500).json({
      success: false,
      message: "Failed to upload or process the form.",
      error: err.message,
    });
  }
}

/**
 * GET /file/status
 * Check uploaded file status.
 */
export async function getUploadedForms(req, res) {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, message: "userId is required." });
    }

    const session = await getSession(userId);
    return res.json({ success: true, forms: session.forms });
  } catch (err) {
    console.error("❌ Get Uploaded Forms Error:", err.message || err);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve uploaded forms.",
      error: err.message,
    });
  }
}