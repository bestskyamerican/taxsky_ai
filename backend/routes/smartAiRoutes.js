// ============================================================
// SMART TAX AI - ROUTES
// ============================================================
// Routes for fully AI-powered tax assistant
// ============================================================

import { Router } from "express";
import {
  handleSmartChat,
  getSmartWelcome,
  getAllData,
  updateFields,
  resetSession
} from "../controllers/smartAiController.js";

const router = Router();

// Main chat endpoint - AI handles everything
router.post("/chat", handleSmartChat);

// Welcome message
router.post("/welcome", getSmartWelcome);

// Get all user data
router.post("/data", getAllData);

// Update fields (batch)
router.post("/update", updateFields);

// Reset session
router.post("/reset", resetSession);

export default router;
