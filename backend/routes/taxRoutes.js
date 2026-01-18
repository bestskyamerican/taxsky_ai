// ============================================================
// TAX ROUTES - Uses TaxSession (raw) + Form1040 (calculated)
// ============================================================
// Location: backend/routes/taxRoutes.js
// 
// ✅ All session operations go through sessionDB service
// ✅ Validates userId before any operation
// ✅ NEW: /api/tax/summary/:userId for SubmitFlow
// ✅ NEW: Syncs TaxSession → Form1040
// ============================================================

import express from 'express';
import sessionDB from '../services/session/sessionDB.js';
import TaxSession from '../models/TaxSession.js';
import Form1040 from '../models/Form1040.js';
import { syncToForm1040, getSummary } from '../services/taxSyncService.js';

const router = express.Router();

// Python Tax API URL
const PYTHON_API = process.env.PYTHON_TAX_API || 'http://localhost:5002';
console.log(`🐍 Python Tax API: ${PYTHON_API}`);

// ============================================================
// HELPER: Proxy to Python API
// ============================================================
async function proxyToPython(endpoint, method = 'GET', body = null, query = '') {
  const url = `${PYTHON_API}${endpoint}${query}`;
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || data.error || `HTTP ${response.status}`);
  }
  return data;
}

// ============================================================
// HELPER: Validate userId from request
// ============================================================
function getUserId(req) {
  const { userId } = req.params;
  
  if (!userId || userId === 'undefined' || userId === 'null' || userId === '') {
    return { valid: false, error: `Invalid userId: "${userId}"` };
  }
  
  return { valid: true, odtUserId: userId };
}

// ============================================================
// ✅ NEW: SUMMARY ENDPOINT - Returns ALL data for SubmitFlow
// ============================================================

/**
 * GET /api/tax/summary/:userId
 * Returns complete tax data summary for SubmitFlow
 * This is the MAIN endpoint SubmitFlow should use!
 */
router.get('/summary/:userId', async (req, res) => {
  try {
    const { valid, odtUserId, error } = getUserId(req);
    if (!valid) {
      return res.status(400).json({ success: false, error });
    }
    
    const taxYear = parseInt(req.query.taxYear) || 2025;
    
    // Sync TaxSession → Form1040 and get summary
    const summary = await getSummary(odtUserId, taxYear);
    
    console.log(`[SUMMARY] ✅ ${odtUserId}:`, {
      wages: summary.income?.wages,
      totalIncome: summary.income?.total_income,
      fedWithheld: summary.withholding?.federal_withheld,
      refund: summary.result?.refund
    });
    
    res.json(summary);
    
  } catch (error) {
    console.error('[SUMMARY] ❌ Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// USER & PERSONAL INFO ROUTES
// ============================================================

/**
 * GET /api/tax/user/:userId
 * Get user personal info for SubmitFlow Step 1
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { valid, odtUserId, error } = getUserId(req);
    if (!valid) {
      return res.status(400).json({ success: false, error });
    }
    
    const personalInfo = await sessionDB.getPersonalInfo(odtUserId);
    
    console.log(`[GET USER] ${odtUserId}:`, Object.keys(personalInfo).filter(k => personalInfo[k]));
    
    res.json(personalInfo);
    
  } catch (error) {
    console.error('[GET USER] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/tax/user/:userId
 * Update user personal info (taxpayer + spouse)
 */
router.put('/user/:userId', async (req, res) => {
  try {
    const { valid, odtUserId, error } = getUserId(req);
    if (!valid) {
      return res.status(400).json({ success: false, error });
    }
    
    await sessionDB.updatePersonalInfo(odtUserId, req.body);
    
    // Sync to Form1040
    await syncToForm1040(odtUserId);
    
    console.log(`[UPDATE USER] ${odtUserId}:`, Object.keys(req.body));
    
    res.json({ 
      success: true, 
      message: 'User information updated',
      updated: Object.keys(req.body)
    });
    
  } catch (error) {
    console.error('[UPDATE USER] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// DEPENDENT ROUTES
// ============================================================

/**
 * GET /api/tax/dependents/:userId
 */
router.get('/dependents/:userId', async (req, res) => {
  try {
    const { valid, odtUserId, error } = getUserId(req);
    if (!valid) {
      return res.status(400).json({ success: false, error });
    }
    
    const dependents = await sessionDB.getDependents(odtUserId);
    
    console.log(`[GET DEPENDENTS] ${odtUserId}: ${dependents.length} dependents`);
    
    res.json({ 
      success: true, 
      dependents,
      count: dependents.length
    });
    
  } catch (error) {
    console.error('[GET DEPENDENTS] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/tax/dependent/:userId
 * Update existing dependent
 */
router.put('/dependent/:userId', async (req, res) => {
  try {
    const { valid, odtUserId, error } = getUserId(req);
    if (!valid) {
      return res.status(400).json({ success: false, error });
    }
    
    const { index, ...data } = req.body;
    const dependent = await sessionDB.updateDependent(odtUserId, index, data);
    
    // Sync to Form1040
    await syncToForm1040(odtUserId);
    
    console.log(`[UPDATE DEPENDENT] ${odtUserId} #${index}`);
    
    res.json({ 
      success: true, 
      message: 'Dependent updated',
      dependent
    });
    
  } catch (error) {
    console.error('[UPDATE DEPENDENT] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/tax/dependent/:userId
 * Add new dependent
 */
router.post('/dependent/:userId', async (req, res) => {
  try {
    const { valid, odtUserId, error } = getUserId(req);
    if (!valid) {
      return res.status(400).json({ success: false, error });
    }
    
    const dependent = await sessionDB.updateDependent(odtUserId, undefined, req.body);
    
    // Sync to Form1040
    await syncToForm1040(odtUserId);
    
    console.log(`[ADD DEPENDENT] ${odtUserId}`);
    
    res.json({ 
      success: true, 
      message: 'Dependent added',
      dependent
    });
    
  } catch (error) {
    console.error('[ADD DEPENDENT] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/tax/dependent/:userId/:index
 */
router.delete('/dependent/:userId/:index', async (req, res) => {
  try {
    const { valid, odtUserId, error } = getUserId(req);
    if (!valid) {
      return res.status(400).json({ success: false, error });
    }
    
    const { index } = req.params;
    const idx = parseInt(index);
    
    const session = await sessionDB.getOrCreateSession(odtUserId);
    if (session.normalizedData?.dependents) {
      session.normalizedData.dependents.splice(idx, 1);
      session.markModified('normalizedData.dependents');
      await session.save();
    }
    
    // Sync to Form1040
    await syncToForm1040(odtUserId);
    
    res.json({ 
      success: true, 
      message: 'Dependent deleted'
    });
    
  } catch (error) {
    console.error('[DELETE DEPENDENT] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// INCOME ROUTES
// ============================================================

/**
 * GET /api/tax/income/:userId
 * Get income summary for SubmitFlow Step 2
 */
router.get('/income/:userId', async (req, res) => {
  try {
    const { valid, odtUserId, error } = getUserId(req);
    if (!valid) {
      return res.status(400).json({ success: false, error });
    }
    
    const income = await sessionDB.getIncomeSummary(odtUserId);
    
    console.log(`[GET INCOME] ${odtUserId}:`, income);
    
    res.json({
      success: true,
      ...income
    });
    
  } catch (error) {
    console.error('[GET INCOME] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ✅ NEW: CHAT SAVE ENDPOINT - Save answer from SmartChatInterface
// ============================================================

/**
 * POST /api/tax/chat/:userId
 * Save a single answer from chat interview
 */
router.post('/chat/:userId', async (req, res) => {
  try {
    const { valid, odtUserId, error } = getUserId(req);
    if (!valid) {
      return res.status(400).json({ success: false, error });
    }
    
    const { key, value } = req.body;
    
    if (!key) {
      return res.status(400).json({ success: false, error: 'key is required' });
    }
    
    const session = await TaxSession.findOne({ userId: odtUserId }) || 
                    new TaxSession({ userId: odtUserId, taxYear: 2025 });
    
    // Save to answers Map
    if (!session.answers) session.answers = new Map();
    if (session.answers instanceof Map) {
      session.answers.set(key, value);
    } else {
      session.answers[key] = value;
    }
    
    session.markModified('answers');
    await session.save();
    
    console.log(`[CHAT] 💬 ${odtUserId}: ${key} = ${typeof value === 'object' ? JSON.stringify(value) : value}`);
    
    res.json({ success: true, message: `Saved ${key}` });
    
  } catch (error) {
    console.error('[CHAT] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ✅ NEW: OCR UPLOAD ENDPOINT - Save from document upload
// ============================================================

/**
 * POST /api/tax/upload/:userId
 * Save OCR extracted data from document upload
 */
router.post('/upload/:userId', async (req, res) => {
  try {
    const { valid, odtUserId, error } = getUserId(req);
    if (!valid) {
      return res.status(400).json({ success: false, error });
    }
    
    const { formType, ocrData, owner, fileName } = req.body;
    
    if (!formType || !ocrData) {
      return res.status(400).json({ success: false, error: 'formType and ocrData are required' });
    }
    
    const session = await TaxSession.findOne({ userId: odtUserId }) || 
                    new TaxSession({ userId: odtUserId, taxYear: 2025 });
    
    // Initialize rawUploads if needed
    if (!session.rawUploads) session.rawUploads = [];
    
    // Get next document number
    const existingCount = session.rawUploads.filter(u => 
      u.formType === formType && u.owner === (owner || 'taxpayer')
    ).length;
    
    // Add to rawUploads
    session.rawUploads.push({
      formType,
      documentNumber: existingCount + 1,
      owner: owner || 'taxpayer',
      fileName: fileName || '',
      uploadedAt: new Date(),
      ocrRaw: ocrData,
      ocrStatus: 'success',
      isConfirmed: false
    });
    
    // Also save to forms Map for legacy support
    if (!session.forms) session.forms = new Map();
    if (session.forms instanceof Map) {
      session.forms.set(formType, ocrData);
    } else {
      session.forms[formType] = ocrData;
    }
    
    session.markModified('rawUploads');
    session.markModified('forms');
    await session.save();
    
    // Sync to Form1040
    const form = await syncToForm1040(odtUserId);
    
    console.log(`[UPLOAD] 📄 ${odtUserId}: ${formType} #${existingCount + 1}`);
    
    res.json({ 
      success: true, 
      message: `Saved ${formType}`,
      documentNumber: existingCount + 1,
      income: {
        wages: form.income?.wages || 0,
        interest: form.income?.interest || 0,
        totalIncome: form.income?.totalIncome || 0
      }
    });
    
  } catch (error) {
    console.error('[UPLOAD] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// DEBUG ROUTES
// ============================================================

/**
 * GET /api/tax/debug/:userId
 * View full session data for debugging - SHOWS ALL DATA SOURCES
 */
router.get('/debug/:userId', async (req, res) => {
  try {
    const { valid, odtUserId, error } = getUserId(req);
    if (!valid) {
      return res.status(400).json({ success: false, error });
    }
    
    const session = await TaxSession.findOne({ userId: odtUserId });
    const form = await Form1040.findOne({ userId: odtUserId });
    
    if (!session && !form) {
      return res.json({ error: 'No data found', odtUserId });
    }
    
    // Convert Maps to objects for display
    const answersObj = {};
    if (session?.answers instanceof Map) {
      session.answers.forEach((v, k) => { answersObj[k] = v; });
    } else if (session?.answers) {
      Object.assign(answersObj, session.answers);
    }
    
    const formsObj = {};
    if (session?.forms instanceof Map) {
      session.forms.forEach((v, k) => { formsObj[k] = v; });
    } else if (session?.forms) {
      Object.assign(formsObj, session.forms);
    }
    
    res.json({
      // TaxSession (raw data)
      taxSession: session ? {
        userId: session.userId,
        taxYear: session.taxYear,
        answers: answersObj,
        forms: formsObj,
        rawUploads: session.rawUploads || [],
        normalizedData: session.normalizedData,
        status: session.status
      } : null,
      
      // Form1040 (calculated data)
      form1040: form ? form.getSummary() : null,
      
      // Quick income debug
      incomeDebug: {
        fromAnswers: {
          wages: answersObj.wages || answersObj.w2_wages || 0,
          federal_withheld: answersObj.federal_withheld || answersObj.federalWithheld || 0,
          interest: answersObj.interest_income || answersObj.interestIncome || 0
        },
        fromForms: {
          w2: formsObj['W-2'] || formsObj['w2'] || null,
          int1099: formsObj['1099-INT'] || null
        },
        calculated: form ? {
          wages: form.income?.wages,
          interest: form.income?.interest,
          totalIncome: form.income?.totalIncome,
          refund: form.result?.refund
        } : null
      }
    });
    
  } catch (error) {
    console.error('[DEBUG] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/tax/sync/:userId
 * Force sync TaxSession → Form1040
 */
router.post('/sync/:userId', async (req, res) => {
  try {
    const { valid, odtUserId, error } = getUserId(req);
    if (!valid) {
      return res.status(400).json({ success: false, error });
    }
    
    const form = await syncToForm1040(odtUserId);
    
    res.json({ 
      success: true, 
      message: 'Data synced to Form1040',
      summary: form.getSummary()
    });
    
  } catch (error) {
    console.error('[SYNC] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/tax/fix-income/:userId
 * Manually fix income data
 */
router.post('/fix-income/:userId', async (req, res) => {
  try {
    const { valid, odtUserId, error } = getUserId(req);
    if (!valid) {
      return res.status(400).json({ success: false, error });
    }
    
    const { wages, federal_withheld, state_withheld, interest_income, dividend_income } = req.body;
    
    const session = await TaxSession.findOne({ userId: odtUserId });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Initialize normalizedData if needed
    if (!session.normalizedData) session.normalizedData = {};
    if (!session.normalizedData.income) session.normalizedData.income = {};
    
    // Update W-2 array
    if (wages !== undefined || federal_withheld !== undefined || state_withheld !== undefined) {
      session.normalizedData.income.w2 = [{
        employer: 'Corrected Entry',
        wages: parseFloat(wages) || 0,
        federal_withholding: parseFloat(federal_withheld) || 0,
        state_withholding: parseFloat(state_withheld) || 0
      }];
    }
    
    // Update interest if provided
    if (interest_income !== undefined) {
      session.normalizedData.income.interest = [{
        payer: 'Corrected Entry',
        interest_income: parseFloat(interest_income) || 0
      }];
    }
    
    // Update dividends if provided
    if (dividend_income !== undefined) {
      session.normalizedData.income.dividends = [{
        payer: 'Corrected Entry',
        ordinary_dividends: parseFloat(dividend_income) || 0
      }];
    }
    
    // Also update answers Map for consistency
    if (session.answers instanceof Map) {
      if (wages !== undefined) session.answers.set('wages', parseFloat(wages) || 0);
      if (federal_withheld !== undefined) session.answers.set('federal_withheld', parseFloat(federal_withheld) || 0);
      if (state_withheld !== undefined) session.answers.set('state_withheld', parseFloat(state_withheld) || 0);
      if (interest_income !== undefined) session.answers.set('interest_income', parseFloat(interest_income) || 0);
      if (dividend_income !== undefined) session.answers.set('dividend_income', parseFloat(dividend_income) || 0);
    }
    
    session.markModified('normalizedData.income');
    session.markModified('answers');
    await session.save();
    
    // Sync to Form1040
    const form = await syncToForm1040(odtUserId);
    
    console.log(`[FIX INCOME] ${odtUserId}:`, form.income);
    
    res.json({
      success: true,
      message: 'Income data corrected',
      income: form.income,
      result: form.result
    });
    
  } catch (error) {
    console.error('[FIX INCOME] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// HEALTH CHECK
// ============================================================
router.get('/health', async (req, res) => {
  try {
    const pythonHealth = await proxyToPython('/health');
    res.json({
      node: 'healthy',
      python: pythonHealth,
      pythonUrl: PYTHON_API
    });
  } catch (err) {
    res.json({
      node: 'healthy',
      python: { status: 'disconnected', error: err.message },
      pythonUrl: PYTHON_API
    });
  }
});

// ============================================================
// TAX CALCULATION ROUTES (Proxy to Python)
// ============================================================

router.post('/calculate', async (req, res) => {
  try {
    const language = req.query.language || 'en';
    const result = await proxyToPython('/calculate/full', 'POST', req.body, `?language=${language}`);
    res.json(result);
  } catch (err) {
    console.error('Tax calculation error:', err.message);
    res.status(500).json({ error: 'Tax calculation failed', details: err.message });
  }
});

router.post('/calculate/federal', async (req, res) => {
  try {
    const language = req.query.language || 'en';
    const result = await proxyToPython('/calculate/federal', 'POST', req.body, `?language=${language}`);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Federal calculation failed', details: err.message });
  }
});

router.post('/calculate/state/:stateCode', async (req, res) => {
  try {
    const { stateCode } = req.params;
    const language = req.query.language || 'en';
    const result = await proxyToPython(`/calculate/state/${stateCode}`, 'POST', req.body, `?language=${language}`);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'State calculation failed', details: err.message });
  }
});

// ============================================================
// RAG ROUTES
// ============================================================

router.post('/ask', async (req, res) => {
  try {
    const language = req.query.language || 'en';
    const result = await proxyToPython('/ask', 'POST', req.body, `?language=${language}`);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Question failed', details: err.message });
  }
});

router.get('/rag/federal', async (req, res) => {
  try {
    const result = await proxyToPython('/rag/federal');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get federal RAG', details: err.message });
  }
});

router.get('/rag/states/:stateCode', async (req, res) => {
  try {
    const { stateCode } = req.params;
    const result = await proxyToPython(`/rag/states/${stateCode}`);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get state RAG', details: err.message });
  }
});

router.get('/rag/available', async (req, res) => {
  try {
    const result = await proxyToPython('/rag/available');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get available RAGs', details: err.message });
  }
});

// ============================================================
// STATE & LANGUAGE INFO
// ============================================================

router.get('/states', async (req, res) => {
  try {
    const result = await proxyToPython('/states');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get states', details: err.message });
  }
});

router.get('/states/:stateCode', async (req, res) => {
  try {
    const { stateCode } = req.params;
    const result = await proxyToPython(`/states/${stateCode}`);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get state info', details: err.message });
  }
});

router.get('/languages', async (req, res) => {
  try {
    const result = await proxyToPython('/languages');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get languages', details: err.message });
  }
});

export default router;