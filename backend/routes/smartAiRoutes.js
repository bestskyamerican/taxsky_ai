/**
 * TaxSky Smart AI Routes
 * Version: 5.2 - One Tax Return Per Year
 * 
 * ✅ v5.2: Added start-fresh and session-status endpoints
 * ✅ v5.1: Python API Access Fixed
 */

import express from 'express';
import {
  handleSmartChat,
  getSmartWelcome,
  getAllData,
  resetSession,
  saveSecureData,
  updateFromPython,
  startFreshSession,      // ← NEW
  getSessionStatus        // ← NEW
} from '../controllers/smartAiController.js';

// Import auth middleware
import { authenticateToken } from './authRoutes.js';

const router = express.Router();

// ============================================================
// ✅ PUBLIC ROUTES (NO AUTH) - For Python API access
// ============================================================

// GET /api/ai/data/:userId - Python reads messages
router.get('/data/:userId', getAllData);

// POST /api/ai/status/:userId - Python updates session
router.post('/status/:userId', updateFromPython);

// Health check - no auth needed
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'TaxSky AI',
    model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
    promptId: process.env.OPENAI_PROMPT_ID,
    database: 'MongoDB TaxSession',
    version: '5.2',
    note: 'One tax return per year',
    timestamp: new Date().toISOString()
  });
});

// ============================================================
// 🔒 PROTECTED ROUTES (AUTH REQUIRED) - For frontend
// ============================================================

// POST /api/ai/chat - Main chat endpoint
router.post('/chat', authenticateToken, handleSmartChat);

// POST /api/ai/welcome - Get welcome message
router.post('/welcome', authenticateToken, getSmartWelcome);

// DELETE /api/ai/session/:userId - Reset session
router.delete('/session/:userId', authenticateToken, resetSession);

// POST /api/ai/reset/:userId - Reset session (alternative)
router.post('/reset/:userId', authenticateToken, resetSession);

// POST /api/ai/secure/:userId - Save SSN, address, bank
router.post('/secure/:userId', authenticateToken, saveSecureData);

// GET /api/ai/history/:userId - Get chat history
router.get('/history/:userId', authenticateToken, (req, res) => {
  // Redirect to getAllData for history
  getAllData(req, res);
});

// ════════════════════════════════════════════════════════════
// 🆕 NEW: One Tax Return Per Year
// ════════════════════════════════════════════════════════════

// POST /api/ai/start-fresh - Clear old session, start new interview
router.post('/start-fresh', authenticateToken, startFreshSession);

// GET /api/ai/session-status/:userId - Check if user has existing return
router.get('/session-status/:userId', authenticateToken, getSessionStatus);

export default router;