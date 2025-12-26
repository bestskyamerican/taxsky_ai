import { Router } from "express";
import axios from "axios";
import multer from "multer";
import FormData from "form-data";
import fs from "fs";

const router = Router();
const upload = multer({ dest: "uploads/" });

// OCR UPLOAD → sends file to Python FastAPI
router.post("/ocr", upload.single("file"), async (req, res) => {
  try {
    const filePath = req.file.path;

    const formData = new FormData();
    formData.append("file", fs.createReadStream(filePath));

    const response = await axios.post(
      "http://localhost:5001/ocr/extract",
      formData,
      {
        headers: formData.getHeaders(),
      }
    );

    // delete uploaded temp file
    fs.unlinkSync(filePath);

    res.json({ success: true, data: response.data });
  } catch (err) {
    console.error("OCR Error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// TAX CALCULATION → sends user input to python tax engine
router.post("/tax-calc", async (req, res) => {
  try {
    const pythonRes = await axios.post(
      "http://localhost:5001/tax/calc",
      req.body
    );

    res.json({ success: true, data: pythonRes.data });
  } catch (err) {
    console.error("Tax Engine Error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
