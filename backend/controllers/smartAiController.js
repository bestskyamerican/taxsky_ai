// ============================================================
// SMART AI CONTROLLER v7.6 - GPT HANDLES ALL LANGUAGES
// ============================================================
// SIMPLIFIED: Removed hardcoded language processing
// GPT is smart enough to understand all languages naturally
// Only tax summary & welcome have translations (bypass GPT)
// ============================================================

import OpenAI from "openai";
import { getSession, saveAnswer } from "../tax/sessionDB.js";
import { answerWithRAG, isTaxQuestion, isIncomeStatement } from "../services/ragService.js";
import { calculateFullTax } from "../tax/fullCalculator.js";
import { parseAmount } from "../services/dataConversionService.js";
import TaxSession from "../models/TaxSession.js";
import {
  getTaxSystemPrompt,
  buildContextPrompt,
  formatFilingStatus as formatFilingStatusMultiLang
} from "../services/smartPromptService.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ============================================================
// STATE CODE HELPER (inline to avoid import issues)
// ============================================================
const STATE_CODES = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
  'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
  'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
  'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS', 'missouri': 'MO',
  'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH',
  'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
  'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY',
  'district of columbia': 'DC'
};

function getStateCode(input) {
  if (!input) return null;
  const clean = String(input).trim().toLowerCase();
  // Already a 2-letter code
  if (clean.length === 2 && /^[a-z]{2}$/.test(clean)) {
    return clean.toUpperCase();
  }
  // Full state name
  return STATE_CODES[clean] || clean.toUpperCase().substring(0, 2);
}

// ============================================================
// ONLY TRANSLATIONS FOR: Tax Summary & Welcome (bypass GPT)
// ============================================================
const translations = {
  en: {
    welcome: "👋 Hi! I'm **TaxSky AI**, your personal tax assistant.\n\nWhat's your name?",
    welcomeBack: "👋 Welcome back",
    uploadPrompt: "📤 **Upload your W-2 or 1099** and I'll extract everything automatically!",
    summary: {
      title: "📊 **Your 2024 Tax Summary**",
      federal: "**Federal:**",
      state: "**State",
      taxable: "Taxable Income",
      tax: "Tax",
      withheld: "Withheld",
      ctc: "Child Tax Credit",
      refund: "Refund",
      owed: "Owed",
      total: "TOTAL",
      generate: "Would you like me to generate your Form 1040?"
    }
  },
  vi: {
    welcome: "👋 Xin chào! Tôi là **TaxSky AI**, trợ lý thuế của bạn.\n\nBạn tên gì?",
    welcomeBack: "👋 Chào mừng trở lại",
    uploadPrompt: "📤 **Tải lên W-2 hoặc 1099** và tôi sẽ tự động trích xuất!",
    summary: {
      title: "📊 **Tóm Tắt Thuế 2024**",
      federal: "**Liên Bang:**",
      state: "**Tiểu Bang",
      taxable: "Thu nhập chịu thuế",
      tax: "Thuế",
      withheld: "Đã khấu trừ",
      ctc: "Tín dụng trẻ em",
      refund: "Hoàn thuế",
      owed: "Nợ thuế",
      total: "TỔNG CỘNG",
      generate: "Bạn có muốn tôi tạo Form 1040 không?"
    }
  },
  es: {
    welcome: "👋 ¡Hola! Soy **TaxSky AI**, tu asistente de impuestos.\n\n¿Cómo te llamas?",
    welcomeBack: "👋 ¡Bienvenido/a de nuevo",
    uploadPrompt: "📤 **Sube tu W-2 o 1099** y extraeré todo automáticamente!",
    summary: {
      title: "📊 **Resumen de Impuestos 2024**",
      federal: "**Federal:**",
      state: "**Estatal",
      taxable: "Ingreso gravable",
      tax: "Impuesto",
      withheld: "Retenido",
      ctc: "Crédito por hijos",
      refund: "Reembolso",
      owed: "Adeudado",
      total: "TOTAL",
      generate: "¿Quieres que genere tu Form 1040?"
    }
  }
};

function t(lang = 'en') {
  return translations[lang] || translations.en;
}

// ============================================================
// GENERATE TAX SUMMARY (Used when bypassing GPT)
// ============================================================
function generateTaxSummary(userData, taxCalc, language = 'en') {
  const txt = t(language).summary;
  const state = userData.state || 'CA';
  
  const fedTax = taxCalc?.federalTax || 0;
  const fedWithheld = Number(userData.total_withheld) || 0;
  const ctc = taxCalc?.childTaxCredit || 0;
  const fedNet = fedWithheld + ctc - fedTax;
  
  const stateTax = taxCalc?.caTax || 0;
  const stateWithheld = Number(userData.total_state_withheld) || 0;
  const stateNet = stateWithheld - stateTax;
  const totalNet = fedNet + stateNet;
  
  const depCount = parseInt(userData.dependent_count) || 0;
  
  let msg = `${txt.title}\n\n`;
  msg += `👤 **${userData.first_name || ''} ${userData.last_name || ''}** | ${formatFilingStatusMultiLang(userData.filing_status, language) || 'Single'}`;
  if (depCount > 0) msg += ` | ${depCount} dependent${depCount > 1 ? 's' : ''}`;
  msg += `\n\n`;
  
  msg += `${txt.federal}\n`;
  msg += `• ${txt.taxable}: $${(taxCalc?.taxableIncome || 0).toLocaleString()}\n`;
  msg += `• ${txt.tax}: $${fedTax.toLocaleString()}\n`;
  msg += `• ${txt.withheld}: $${fedWithheld.toLocaleString()}\n`;
  if (ctc > 0) msg += `• ${txt.ctc}: $${ctc.toLocaleString()}\n`;
  msg += `• ${fedNet >= 0 ? '💚 ' + txt.refund : '❌ ' + txt.owed}: $${Math.abs(fedNet).toLocaleString()}\n\n`;
  
  msg += `${txt.state} (${state}):**\n`;
  msg += `• ${txt.tax}: $${stateTax.toLocaleString()}\n`;
  msg += `• ${txt.withheld}: $${stateWithheld.toLocaleString()}\n`;
  msg += `• ${stateNet >= 0 ? '💚 ' + txt.refund : '❌ ' + txt.owed}: $${Math.abs(stateNet).toLocaleString()}\n\n`;
  
  msg += `**${txt.total} ${totalNet >= 0 ? '💚 ' + txt.refund : '❌ ' + txt.owed}: $${Math.abs(totalNet).toLocaleString()}**\n\n`;
  msg += txt.generate;
  
  return msg;
}

// ============================================================
// CONVERSATION HISTORY
// ============================================================
async function getHistory(userId) {
  try {
    const session = await getSession(userId);
    const answers = session?.answers;
    let history = [];
    if (answers instanceof Map) history = answers.get('conversation_history') || [];
    else if (answers && typeof answers === 'object') history = answers.conversation_history || [];
    return Array.isArray(history) ? history : [];
  } catch (e) { return []; }
}

async function addToHistory(userId, role, content) {
  try {
    const history = await getHistory(userId);
    history.push({ role, content });
    while (history.length > 20) history.shift();
    await TaxSession.findOneAndUpdate(
      { odooId: userId },
      { $set: { 'answers.conversation_history': history, updatedAt: new Date() } },
      { upsert: false, new: true }
    );
  } catch (e) { console.error("[HISTORY] Error:", e.message); }
}

async function clearHistory(userId) {
  try {
    await TaxSession.findOneAndUpdate(
      { odooId: userId },
      { $set: { 'answers.conversation_history': [], updatedAt: new Date() } },
      { upsert: false }
    );
  } catch (e) {}
}

async function getLastAssistantMessage(userId) {
  try {
    const history = await getHistory(userId);
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i]?.role === 'assistant') return history[i]?.content || '';
    }
    return '';
  } catch (e) { return ''; }
}

// ============================================================
// HELPER: Convert session to object
// ============================================================
function sessionToObject(session) {
  const data = {};
  const answers = session?.answers;
  if (answers instanceof Map) { for (const [k, v] of answers) data[k] = v; }
  else if (answers && typeof answers === 'object') Object.assign(data, answers);
  return data;
}

// ============================================================
// PROCESS EXTRACTED DATA (from GPT response)
// ============================================================
async function processExtractedData(userId, extracted, currentData) {
  const saved = {};
  
  for (let [key, value] of Object.entries(extracted)) {
    if (value === null || value === undefined || value === '') continue;
    if (key === 'message' || key === 'response') continue;
    
    // SSN validation
    if (key.includes('ssn')) {
      value = String(value).replace(/\D/g, '');
      if (value.length !== 9) continue;
    }
    
    // State code normalization
    if (key === 'state') {
      value = getStateCode(value) || String(value).toUpperCase().substring(0, 2);
    }
    
    // Dependents logic
    if (key === 'has_dependents') {
      value = (value === 'yes' || value === true) ? 'yes' : 'no';
      if (value === 'no') await saveAnswer(userId, 'dependent_count', 0);
    }
    
    if (key === 'dependent_count') {
      const count = parseInt(value) || 0;
      if (count > 0) await saveAnswer(userId, 'has_dependents', 'yes');
      else await saveAnswer(userId, 'has_dependents', 'no');
    }
    
    // Name parsing
    if (key === 'full_name' || key === 'name' || key === 'user_name') {
      const parts = String(value).trim().split(/\s+/);
      if (parts.length >= 1) {
        await saveAnswer(userId, 'first_name', parts[0]);
        saved.first_name = parts[0];
        if (parts.length >= 2) {
          await saveAnswer(userId, 'last_name', parts.slice(1).join(' '));
          saved.last_name = parts.slice(1).join(' ');
        }
        continue;
      }
    }
    
    await saveAnswer(userId, key, value);
    saved[key] = value;
    console.log(`[SAVE] ${key} = ${key.includes('ssn') ? '***' : value}`);
  }
  
  return saved;
}

// ============================================================
// DETECT TAX CORRECTIONS (e.g., "my state withheld is 5000")
// ============================================================
function detectTaxCorrection(message) {
  const msg = message.toLowerCase();
  const extracted = {};
  
  // State withheld
  const stateMatch = msg.match(/state\s*(?:tax)?\s*withheld\s*(?:is|=|:)?\s*\$?([0-9,]+)/i) || 
                     msg.match(/box\s*17\s*(?:is|=|:)?\s*\$?([0-9,]+)/i);
  if (stateMatch) extracted.total_state_withheld = parseFloat(stateMatch[1].replace(/,/g, ''));
  
  // Federal withheld
  const fedMatch = msg.match(/federal\s*(?:tax)?\s*withheld\s*(?:is|=|:)?\s*\$?([0-9,]+)/i) || 
                   msg.match(/box\s*2\s*(?:is|=|:)?\s*\$?([0-9,]+)/i);
  if (fedMatch) extracted.total_withheld = parseFloat(fedMatch[1].replace(/,/g, ''));
  
  // Wages
  const wagesMatch = msg.match(/(?:my\s*)?wages?\s*(?:is|are|=|:)?\s*\$?([0-9,]+)/i) || 
                     msg.match(/box\s*1\s*(?:is|=|:)?\s*\$?([0-9,]+)/i);
  if (wagesMatch) extracted.total_wages = parseFloat(wagesMatch[1].replace(/,/g, ''));
  
  return Object.keys(extracted).length > 0 ? extracted : null;
}

// ============================================================
// MAIN CHAT HANDLER - GPT HANDLES ALL LANGUAGES
// ============================================================
export async function handleSmartChat(req, res) {
  try {
    const { userId, message, taxYear = 2024, language = 'en' } = req.body;
    
    if (!userId) return res.status(400).json({ error: "userId required" });
    
    console.log(`\n${"=".repeat(60)}`);
    console.log(`🤖 SMART AI v7.6 - User: ${userId} - Lang: ${language}`);
    console.log(`📝 Message: "${message}"`);
    console.log(`${"=".repeat(60)}`);
    
    const session = await getSession(userId);
    let userData = sessionToObject(session);
    let taxCalc = calculateFullTax(session, userData.state || "CA");
    
    // ============================================================
    // 1. TAX QUESTION → Use RAG
    // ============================================================
    if (isTaxQuestion(message)) {
      console.log("[AI] → Using RAG for tax question");
      const ragResult = await answerWithRAG(message, { taxYear, language });
      await addToHistory(userId, 'user', message);
      await addToHistory(userId, 'assistant', ragResult.answer);
      return res.json({ 
        success: true, 
        reply: ragResult.answer, 
        sources: ragResult.sources, 
        isQuestion: true 
      });
    }
    
    // ============================================================
    // 2. TAX CORRECTION → Direct update (no GPT needed)
    // ============================================================
    const correction = detectTaxCorrection(message);
    if (correction) {
      console.log("[AI] → Tax correction detected:", correction);
      await processExtractedData(userId, correction, userData);
      
      const updatedSession = await getSession(userId);
      const updatedData = sessionToObject(updatedSession);
      const updatedTax = calculateFullTax(updatedSession, updatedData.state || "CA");
      
      const summary = generateTaxSummary(updatedData, updatedTax, language);
      await addToHistory(userId, 'user', message);
      await addToHistory(userId, 'assistant', summary);
      
      return res.json({ 
        success: true, 
        reply: `✅ Updated!\n\n${summary}`, 
        extracted: correction, 
        tax: updatedTax 
      });
    }
    
    // ============================================================
    // 3. INCOME STATEMENT → Extract with GPT
    // ============================================================
    if (isIncomeStatement(message)) {
      console.log("[AI] → Extracting income statement");
      const incomeResult = await extractIncome(message, language);
      if (Object.keys(incomeResult.extracted).length > 0) {
        await processExtractedData(userId, incomeResult.extracted, userData);
      }
      await addToHistory(userId, 'user', message);
      await addToHistory(userId, 'assistant', incomeResult.message);
      return res.json({ 
        success: true, 
        reply: incomeResult.message, 
        extracted: incomeResult.extracted 
      });
    }
    
    // ============================================================
    // 4. CHECK IF INTERVIEW COMPLETE → Bypass GPT, show summary
    // ============================================================
    const hasW2 = Number(userData.total_wages) > 0;
    const hasFilingStatus = !!userData.filing_status;
    const hasDependents = userData.has_dependents === 'yes' || userData.has_dependents === 'no';
    const isMFJ = userData.filing_status === 'married_filing_jointly';
    const needsSpouse = isMFJ && !userData.spouse_first_name;
    
    if (hasW2 && hasFilingStatus && hasDependents && !needsSpouse) {
      console.log("[AI] ✅ Interview complete - bypassing GPT");
      const summary = generateTaxSummary(userData, taxCalc, language);
      await addToHistory(userId, 'user', message);
      await addToHistory(userId, 'assistant', summary);
      return res.json({ 
        success: true, 
        reply: summary, 
        tax: taxCalc, 
        phase: 'complete' 
      });
    }
    
    // ============================================================
    // 5. INTERVIEW MODE → GPT handles everything (including language!)
    // ============================================================
    console.log("[AI] → GPT Interview mode");
    
    const systemPrompt = getTaxSystemPrompt(taxYear, language);
    const contextPrompt = buildContextPrompt(userData, taxCalc, language);
    
    const messages = [{ role: "system", content: systemPrompt }];
    
    // Add conversation history
    const history = await getHistory(userId);
    for (const msg of history.slice(-10)) {
      messages.push({ role: msg.role, content: msg.content });
    }
    
    // Add current message with context
    messages.push({ 
      role: "user", 
      content: `${contextPrompt}\n---\nUser message: "${message}"\n\nRespond in ${language === 'vi' ? 'Vietnamese' : language === 'es' ? 'Spanish' : 'English'}. Return valid JSON.`
    });
    
    // Call GPT - Let it handle all language understanding!
    console.log("[AI] Calling GPT...");
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages,
      max_tokens: 1500,
      temperature: 0.7,
    });
    
    let aiText = response.choices[0]?.message?.content || "";
    
    // Parse GPT response
    let parsed = {};
    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    } catch (e) { 
      parsed = { message: aiText.replace(/```json|```/g, '').trim() }; 
    }
    
    const aiMessage = parsed.message || aiText;
    const extracted = parsed.extracted || {};
    
    console.log("[AI] GPT Extracted:", JSON.stringify(extracted));
    
    // Save extracted data
    if (Object.keys(extracted).length > 0) {
      await processExtractedData(userId, extracted, userData);
    }
    
    await addToHistory(userId, 'user', message);
    await addToHistory(userId, 'assistant', aiMessage);
    
    // Recalculate tax
    const updatedSession = await getSession(userId);
    const updatedTax = calculateFullTax(updatedSession, userData.state || "CA");
    
    return res.json({ 
      success: true, 
      reply: aiMessage, 
      extracted, 
      tax: updatedTax 
    });
    
  } catch (error) {
    console.error("❌ Error:", error);
    return res.status(500).json({ error: error.message });
  }
}

// ============================================================
// EXTRACT INCOME (GPT handles language)
// ============================================================
async function extractIncome(message, language = 'en') {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Extract income data. Return JSON: { message: 'confirmation', extracted: { total_wages: number } }" },
        { role: "user", content: `Extract income from: "${message}". Respond in ${language === 'vi' ? 'Vietnamese' : language === 'es' ? 'Spanish' : 'English'}.` }
      ],
      max_tokens: 200,
    });
    const cleaned = response.choices[0].message.content.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (e) {
    return { message: "Got it!", extracted: {} };
  }
}

// ============================================================
// WELCOME MESSAGE (Only place with hardcoded translations)
// ============================================================
export async function getSmartWelcome(req, res) {
  try {
    const { userId, language = 'en' } = req.body;
    const txt = t(language);
    
    console.log(`[WELCOME] User: ${userId}, Lang: ${language}`);
    await clearHistory(userId);
    
    const session = await getSession(userId);
    const userData = sessionToObject(session);
    const taxCalc = calculateFullTax(session, userData.state || "CA");
    
    const hasW2 = parseAmount(userData.total_wages) > 0;
    const hasFilingStatus = !!userData.filing_status;
    
    // Calculate refund
    const fedWithheld = parseAmount(userData.total_withheld);
    const stateWithheld = parseAmount(userData.total_state_withheld);
    const fedTax = taxCalc.federalTax || 0;
    const stateTax = taxCalc.caTax || 0;
    const ctc = taxCalc.childTaxCredit || 0;
    const totalNet = (fedWithheld + ctc - fedTax) + (stateWithheld - stateTax);
    
    let welcomeMessage;
    let phase = "greeting";
    
    // Complete - show summary
    if (hasW2 && hasFilingStatus && userData.has_dependents !== undefined) {
      welcomeMessage = generateTaxSummary(userData, taxCalc, language);
      phase = "complete";
    }
    // Has name, needs documents
    else if (userData.first_name && !hasW2) {
      welcomeMessage = `${txt.welcomeBack} ${userData.first_name}!\n\n${txt.uploadPrompt}`;
      phase = "document_request";
    }
    // New user
    else {
      welcomeMessage = txt.welcome;
      phase = "greeting";
    }
    
    await addToHistory(userId, 'assistant', welcomeMessage);
    
    return res.json({ 
      success: true, 
      message: welcomeMessage, 
      phase, 
      refund: totalNet, 
      tax: taxCalc, 
      hasW2, 
      hasFilingStatus 
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// ============================================================
// OTHER ENDPOINTS
// ============================================================
export async function getAllData(req, res) {
  try {
    const { userId } = req.body;
    const session = await getSession(userId);
    const userData = sessionToObject(session);
    const taxCalc = calculateFullTax(session, userData.state || "CA");
    return res.json({ success: true, data: userData, tax: taxCalc });
  } catch (error) { return res.status(500).json({ error: error.message }); }
}

export async function updateFields(req, res) {
  try {
    const { userId, updates } = req.body;
    if (!userId || !updates) return res.status(400).json({ error: "userId and updates required" });
    const session = await getSession(userId);
    await processExtractedData(userId, updates, sessionToObject(session));
    return res.json({ success: true });
  } catch (error) { return res.status(500).json({ error: error.message }); }
}

export async function resetSession(req, res) {
  try {
    const { userId } = req.body;
    const session = await getSession(userId);
    session.answers = new Map();
    await session.save();
    await clearHistory(userId);
    return res.json({ success: true, message: "Session reset!" });
  } catch (error) { return res.status(500).json({ error: error.message }); }
}

// ============================================================
// EXPORTS
// ============================================================
export const handleChat = handleSmartChat;
export const getWelcome = getSmartWelcome;

export default {
  handleSmartChat,
  handleChat: handleSmartChat,
  getSmartWelcome,
  getWelcome: getSmartWelcome,
  getAllData,
  updateFields,
  resetSession
};