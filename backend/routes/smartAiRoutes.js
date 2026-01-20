/**
 * TaxSky Smart AI Routes
 * Version: 5.4 - Completed Tax Check + Public Test
 * 
 * ✅ v5.4: Added public test endpoint for debugging
 * ✅ v5.3: Added completed tax check in welcome
 * ✅ v5.2: Added start-fresh and session-status endpoints
 * ✅ v5.1: Python API Access Fixed
 */

import express from 'express';
import TaxSession from '../models/TaxSession.js';
import {
  handleSmartChat,
  getSmartWelcome,
  getAllData,
  resetSession,
  saveSecureData,
  updateFromPython,
  startFreshSession,
  getSessionStatus,
  getChatHistory,
  triggerExtraction
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
    version: '5.4',
    note: 'Completed tax check + public test',
    timestamp: new Date().toISOString()
  });
});

// ════════════════════════════════════════════════════════════
// 🧪 PUBLIC TEST ENDPOINT - Check if user has completed tax
// ════════════════════════════════════════════════════════════
router.get('/test-completed/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const taxYear = parseInt(req.query.taxYear) || 2025;
    
    console.log(`\n🧪 TEST: Checking completed tax for ${userId}`);
    
    const session = await TaxSession.findOne({ userId, taxYear });
    
    if (!session) {
      console.log(`   ❌ No session found`);
      return res.json({ 
        success: true,
        hasCompletedTax: false, 
        reason: 'No session found',
        userId,
        taxYear
      });
    }
    
    const hasCompletedData = 
      session.status === 'extracted' || 
      session.status === 'ready_for_review' ||
      session.status === 'complete' ||
      session.ragVerified === true ||
      (session.taxCalculation && session.taxCalculation.agi > 0);
    
    console.log(`   Status: ${session.status}`);
    console.log(`   RAG Verified: ${session.ragVerified}`);
    console.log(`   Has taxCalculation: ${!!session.taxCalculation}`);
    console.log(`   AGI: ${session.taxCalculation?.agi || 0}`);
    console.log(`   ➡️ hasCompletedTax: ${hasCompletedData}`);
    
    const taxCalc = session.taxCalculation || {};
    const answers = session.answers instanceof Map 
      ? Object.fromEntries(session.answers) 
      : (session.answers || {});
    
    return res.json({
      success: true,
      hasCompletedTax: hasCompletedData,
      userId,
      taxYear,
      status: session.status,
      ragVerified: session.ragVerified,
      taxData: {
        filing_status: answers.filing_status || taxCalc.filing_status,
        total_income: taxCalc.total_income || taxCalc.wages || 0,
        agi: taxCalc.agi || 0,
        withholding: taxCalc.withholding || 0,
        refund: taxCalc.refund || 0,
        amount_owed: taxCalc.amount_owed || 0,
        taxpayer_wages: taxCalc._taxpayer_wages || answers.taxpayer_wages || 0,
        spouse_wages: taxCalc._spouse_wages || answers.spouse_wages || 0,
      },
      messageCount: (session.messages || []).length
    });
    
  } catch (error) {
    console.error('❌ Test completed error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ════════════════════════════════════════════════════════════
// 🧪 PUBLIC: Welcome without auth (for testing)
// ════════════════════════════════════════════════════════════
router.post('/welcome-test', async (req, res) => {
  try {
    const { userId, taxYear = 2025, language = 'en' } = req.body;
    
    if (!userId || userId === 'undefined') {
      return res.status(400).json({ success: false, error: 'userId required' });
    }
    
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🧪 WELCOME TEST (no auth): ${userId}`);
    console.log(`${'='.repeat(50)}`);
    
    const session = await TaxSession.findOne({ userId, taxYear: parseInt(taxYear) });
    
    if (session) {
      const hasCompletedData = 
        session.status === 'extracted' || 
        session.status === 'ready_for_review' ||
        session.status === 'complete' ||
        session.ragVerified === true ||
        (session.taxCalculation && session.taxCalculation.agi > 0);
      
      if (hasCompletedData) {
        console.log(`✅ User has COMPLETED ${taxYear} tax - showing summary`);
        
        const taxCalc = session.taxCalculation || {};
        const form1040 = session.form1040 || {};
        const answers = session.answers instanceof Map 
          ? Object.fromEntries(session.answers) 
          : (session.answers || {});
        
        const summaryMessage = buildCompletedTaxSummary(taxCalc, form1040, answers, language);
        
        return res.json({
          success: true,
          hasCompletedTax: true,
          message: summaryMessage,
          sessionId: session._id,
          status: session.status,
          taxData: {
            filing_status: answers.filing_status || taxCalc.filing_status,
            state: answers.state || taxCalc.state,
            total_income: taxCalc.total_income || taxCalc.wages || 0,
            agi: taxCalc.agi || taxCalc.federal_agi || 0,
            taxable_income: taxCalc.taxable_income || 0,
            total_tax: taxCalc.tax_after_credits || taxCalc.total_tax || 0,
            withholding: taxCalc.withholding || 0,
            refund: taxCalc.refund || 0,
            amount_owed: taxCalc.amount_owed || 0,
            taxpayer_wages: answers.taxpayer_wages || taxCalc._taxpayer_wages || 0,
            spouse_wages: answers.spouse_wages || taxCalc._spouse_wages || 0,
          },
          ragVerified: session.ragVerified,
          messageCount: (session.messages || []).length
        });
      }
    }
    
    // No completed data
    console.log(`📝 User has no completed tax - would show welcome`);
    return res.json({
      success: true,
      hasCompletedTax: false,
      message: 'User does not have completed tax data',
      userId,
      taxYear
    });
    
  } catch (error) {
    console.error('❌ Welcome test error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// 🔒 PROTECTED ROUTES (AUTH REQUIRED) - For frontend
// ============================================================

// POST /api/ai/chat - Main chat endpoint
router.post('/chat', authenticateToken, handleSmartChat);

// ════════════════════════════════════════════════════════════
// ✅ WELCOME with completed tax check (AUTH REQUIRED)
// ════════════════════════════════════════════════════════════
router.post('/welcome', authenticateToken, async (req, res) => {
  try {
    const { userId, taxYear = 2025, language = 'en' } = req.body;
    
    if (!userId || userId === 'undefined') {
      return res.status(400).json({ success: false, error: 'userId required' });
    }
    
    console.log(`\n${'='.repeat(50)}`);
    console.log(`👋 WELCOME CHECK: ${userId}`);
    console.log(`${'='.repeat(50)}`);
    
    const session = await TaxSession.findOne({ userId, taxYear: parseInt(taxYear) });
    
    // ════════════════════════════════════════════════════════════
    // ✅ Check if user has COMPLETED tax data
    // ════════════════════════════════════════════════════════════
    if (session) {
      const hasCompletedData = 
        session.status === 'extracted' || 
        session.status === 'ready_for_review' ||
        session.status === 'complete' ||
        session.ragVerified === true ||
        (session.taxCalculation && session.taxCalculation.agi > 0);
      
      if (hasCompletedData) {
        console.log(`✅ User has COMPLETED ${taxYear} tax - showing summary`);
        
        // Get tax data from session
        const taxCalc = session.taxCalculation || {};
        const form1040 = session.form1040 || {};
        const answers = session.answers instanceof Map 
          ? Object.fromEntries(session.answers) 
          : (session.answers || {});
        
        // Build summary message
        const summaryMessage = buildCompletedTaxSummary(taxCalc, form1040, answers, language);
        
        return res.json({
          success: true,
          hasCompletedTax: true,  // ← Frontend uses this flag!
          message: summaryMessage,
          sessionId: session._id,
          status: session.status,
          taxData: {
            filing_status: answers.filing_status || taxCalc.filing_status,
            state: answers.state || taxCalc.state,
            total_income: taxCalc.total_income || taxCalc.wages || 0,
            agi: taxCalc.agi || taxCalc.federal_agi || 0,
            taxable_income: taxCalc.taxable_income || 0,
            total_tax: taxCalc.tax_after_credits || taxCalc.total_tax || 0,
            withholding: taxCalc.withholding || 0,
            refund: taxCalc.refund || 0,
            amount_owed: taxCalc.amount_owed || 0,
            taxpayer_wages: answers.taxpayer_wages || taxCalc._taxpayer_wages || 0,
            spouse_wages: answers.spouse_wages || taxCalc._spouse_wages || 0,
            state_tax: taxCalc.state_tax || taxCalc.ca_tax || 0,
          },
          ragVerified: session.ragVerified,
          messageCount: (session.messages || []).length
        });
      }
    }
    
    // ════════════════════════════════════════════════════════════
    // No completed data - use normal welcome handler
    // ════════════════════════════════════════════════════════════
    return getSmartWelcome(req, res);
    
  } catch (error) {
    console.error('❌ Welcome check error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/ai/session/:userId - Reset session
router.delete('/session/:userId', authenticateToken, resetSession);

// POST /api/ai/reset/:userId - Reset session (alternative)
router.post('/reset/:userId', authenticateToken, resetSession);

// POST /api/ai/secure/:userId - Save SSN, address, bank
router.post('/secure/:userId', authenticateToken, saveSecureData);

// GET /api/ai/history/:userId - Get chat history
router.get('/history/:userId', authenticateToken, getChatHistory || getAllData);

// ════════════════════════════════════════════════════════════
// 🆕 One Tax Return Per Year
// ════════════════════════════════════════════════════════════

// POST /api/ai/start-fresh - Clear old session, start new interview
router.post('/start-fresh', authenticateToken, startFreshSession);

// GET /api/ai/session-status/:userId - Check if user has existing return
router.get('/session-status/:userId', authenticateToken, getSessionStatus);

// POST /api/ai/extract/:userId - Trigger Python extraction
router.post('/extract/:userId', authenticateToken, triggerExtraction);

// ════════════════════════════════════════════════════════════
// Check completed tax status (AUTH REQUIRED)
// ════════════════════════════════════════════════════════════
router.get('/check-completed/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const taxYear = parseInt(req.query.taxYear) || 2025;
    
    const session = await TaxSession.findOne({ userId, taxYear });
    
    if (!session) {
      return res.json({
        success: true,
        hasCompletedTax: false,
        userId,
        taxYear
      });
    }
    
    const hasCompletedData = 
      session.status === 'extracted' || 
      session.status === 'ready_for_review' ||
      session.status === 'complete' ||
      session.ragVerified === true ||
      (session.taxCalculation && session.taxCalculation.agi > 0);
    
    const taxCalc = session.taxCalculation || {};
    const answers = session.answers instanceof Map 
      ? Object.fromEntries(session.answers) 
      : (session.answers || {});
    
    return res.json({
      success: true,
      hasCompletedTax: hasCompletedData,
      userId,
      taxYear,
      status: session.status,
      ragVerified: session.ragVerified,
      taxData: hasCompletedData ? {
        filing_status: answers.filing_status || taxCalc.filing_status,
        total_income: taxCalc.total_income || taxCalc.wages || 0,
        agi: taxCalc.agi || 0,
        withholding: taxCalc.withholding || 0,
        refund: taxCalc.refund || 0,
        amount_owed: taxCalc.amount_owed || 0,
      } : null
    });
    
  } catch (error) {
    console.error('❌ Check completed error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});


// ════════════════════════════════════════════════════════════
// HELPER: Build completed tax summary message
// ════════════════════════════════════════════════════════════
function buildCompletedTaxSummary(taxCalc, form1040, answers, language = 'en') {
  const filingStatus = answers.filing_status || taxCalc.filing_status || 'single';
  const filingStatusDisplay = {
    'single': 'Single',
    'married_filing_jointly': 'Married Filing Jointly',
    'married_filing_separately': 'Married Filing Separately',
    'head_of_household': 'Head of Household',
    'qualifying_surviving_spouse': 'Qualifying Surviving Spouse'
  };
  
  const totalIncome = taxCalc.total_income || taxCalc.wages || 0;
  const agi = taxCalc.agi || taxCalc.federal_agi || 0;
  const withholding = taxCalc.withholding || 0;
  const refund = taxCalc.refund || 0;
  const amountOwed = taxCalc.amount_owed || 0;
  
  const formatMoney = (amt) => `$${Number(amt || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  
  // Build message based on language
  if (language === 'vi') {
    let message = `🎉 **Hồ sơ thuế 2025 của bạn đã hoàn tất!**\n\n`;
    message += `📋 **Tóm tắt:**\n`;
    message += `• Tình trạng: ${filingStatusDisplay[filingStatus] || filingStatus}\n`;
    message += `• Tổng thu nhập: ${formatMoney(totalIncome)}\n`;
    message += `• AGI: ${formatMoney(agi)}\n`;
    message += `• Thuế đã giữ lại: ${formatMoney(withholding)}\n\n`;
    
    if (refund > 0) {
      message += `💰 **Hoàn thuế: ${formatMoney(refund)}**\n\n`;
    } else if (amountOwed > 0) {
      message += `💳 **Số tiền phải trả: ${formatMoney(amountOwed)}**\n\n`;
    }
    
    message += `Bạn muốn làm gì?\n`;
    message += `• **Xem chi tiết** - Xem bảng phân tích đầy đủ\n`;
    message += `• **Tải Form 1040** - Tải xuống tờ khai thuế\n`;
    message += `• **Cập nhật thông tin** - Thay đổi thông tin\n`;
    message += `• **Bắt đầu mới** - Xóa và làm lại từ đầu`;
    
    return message;
  }
  
  // English (default)
  let message = `🎉 **Your 2025 tax return is complete!**\n\n`;
  message += `📋 **Summary:**\n`;
  message += `• Filing Status: ${filingStatusDisplay[filingStatus] || filingStatus}\n`;
  message += `• Total Income: ${formatMoney(totalIncome)}\n`;
  message += `• AGI: ${formatMoney(agi)}\n`;
  message += `• Withheld: ${formatMoney(withholding)}\n\n`;
  
  if (refund > 0) {
    message += `💰 **Refund: ${formatMoney(refund)}**\n\n`;
  } else if (amountOwed > 0) {
    message += `💳 **Amount Owed: ${formatMoney(amountOwed)}**\n\n`;
  }
  
  message += `What would you like to do?\n`;
  message += `• **Review Details** - See full breakdown\n`;
  message += `• **Download Form 1040** - Get your tax return\n`;
  message += `• **Update Info** - Make changes\n`;
  message += `• **Start Fresh** - Clear and start over`;
  
  return message;
}

export default router;