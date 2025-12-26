// ============================================================
// SESSION ROUTES - Chat & Session Management
// ============================================================
// Fixed: Use correct export names from smartAiController.js
// ============================================================

import express from "express";
import { 
  handleSmartChat,    // ✅ Fixed: was handleChat
  getSmartWelcome,
  getAllData,
  updateFields,
  resetSession 
} from "../controllers/smartAiController.js";
import { getSession, saveAnswer } from "../tax/sessionDB.js";

const router = express.Router();

// ============================================================
// CHAT ENDPOINT - Main AI conversation
// ============================================================
router.post("/", handleSmartChat);  // POST /api/chat

// ============================================================
// WELCOME MESSAGE
// ============================================================
router.get("/welcome", getSmartWelcome);  // GET /api/chat/welcome

// ============================================================
// GET SESSION DATA
// ============================================================
router.get("/:userId", async (req, res) => {
  try {
    const session = await getSession(req.params.userId);
    res.json({ success: true, session });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// GET ALL DATA (for debugging/display)
// ============================================================
router.post("/data", getAllData);  // POST /api/chat/data

// ============================================================
// UPDATE FIELDS
// ============================================================
router.post("/update", updateFields);  // POST /api/chat/update

// ============================================================
// SAVE SINGLE ANSWER
// ============================================================
router.post("/save", async (req, res) => {
  try {
    const { userId, field, value } = req.body;
    if (!userId || !field) {
      return res.status(400).json({ success: false, error: "userId and field required" });
    }
    await saveAnswer(userId, field, value);
    res.json({ success: true, message: `Saved ${field}` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// RESET SESSION
// ============================================================
router.post("/reset", resetSession);  // POST /api/chat/reset

export default router;