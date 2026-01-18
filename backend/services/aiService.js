// ============================================================
// AI SERVICE v6.0 - Using OpenAI Responses API
// ============================================================
// File: backend/services/aiService.js
// 
// ✅ v6.0: Uses OpenAI Responses API with Saved Prompt
// ✅ Prompt ID: pmpt_69594f57dd288193b6fb070fa3b98ae80320559e0ffebce4
// ✅ Prompt Version: 12
// ============================================================

import OpenAI from "openai";
import { getText } from './i18n.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ============================================================
// CONFIGURATION
// ============================================================
export const CONFIG = {
  // Saved Prompt in OpenAI Platform
  PROMPT_ID: "pmpt_69594f57dd288193b6fb070fa3b98ae80320559e0ffebce4",
  PROMPT_VERSION: "12",
  
  // Models
  MODELS: {
    MAIN: "gpt-4o-mini",
    FUNCTION_CALLING: "gpt-4o-mini",
    FALLBACK: "gpt-4o"
  }
};

// Backward compatibility
export const MODELS = CONFIG.MODELS;

// ============================================================
// ✅ CORRECT 2025 TAX DATA (For Backend Calculations)
// ============================================================
export const TAX_DATA_2025 = {
  standard_deduction: {
    single: 15750,
    married_filing_jointly: 31500,
    married_filing_separately: 15750,
    head_of_household: 23625,
    qualifying_surviving_spouse: 31500
  },
  additional_standard_deduction: {
    single_or_hoh: 2000,
    married: 1600
  },
  child_tax_credit: 2000,
  child_tax_credit_refundable: 1700,
  other_dependents_credit: 500,
  ctc_phaseout: { married_filing_jointly: 400000, other: 200000 },
  eitc: {
    0: { max_credit: 649, income_limit_single: 18591, income_limit_mfj: 25511 },
    1: { max_credit: 4328, income_limit_single: 49084, income_limit_mfj: 56004 },
    2: { max_credit: 7152, income_limit_single: 55768, income_limit_mfj: 62688 },
    3: { max_credit: 8046, income_limit_single: 59899, income_limit_mfj: 66819 }
  },
  ira_limit: { under_50: 7000, over_50: 8000 },
  hsa_limit: { individual: 4300, family: 8550 },
  hsa_catchup: 1000,
  student_loan_interest_max: 2500,
  tax_brackets: {
    single: [
      { min: 0, max: 11925, rate: 0.10 },
      { min: 11925, max: 48475, rate: 0.12 },
      { min: 48475, max: 103350, rate: 0.22 },
      { min: 103350, max: 197300, rate: 0.24 },
      { min: 197300, max: 250500, rate: 0.32 },
      { min: 250500, max: 626350, rate: 0.35 },
      { min: 626350, max: Infinity, rate: 0.37 }
    ],
    married_filing_jointly: [
      { min: 0, max: 23850, rate: 0.10 },
      { min: 23850, max: 96950, rate: 0.12 },
      { min: 96950, max: 206700, rate: 0.22 },
      { min: 206700, max: 394600, rate: 0.24 },
      { min: 394600, max: 501050, rate: 0.32 },
      { min: 501050, max: 751600, rate: 0.35 },
      { min: 751600, max: Infinity, rate: 0.37 }
    ],
    head_of_household: [
      { min: 0, max: 17000, rate: 0.10 },
      { min: 17000, max: 64850, rate: 0.12 },
      { min: 64850, max: 103350, rate: 0.22 },
      { min: 103350, max: 197300, rate: 0.24 },
      { min: 197300, max: 250500, rate: 0.32 },
      { min: 250500, max: 626350, rate: 0.35 },
      { min: 626350, max: Infinity, rate: 0.37 }
    ]
  }
};

// ============================================================
// LANGUAGE KEYWORDS
// ============================================================
const KEYWORDS = {
  filing_status: {
    single: ["single", "độc thân", "doc than", "soltero"],
    married_filing_jointly: ["married filing jointly", "mfj", "joint", "jointly", "kết hôn khai chung"],
    married_filing_separately: ["married filing separately", "mfs", "separate", "kết hôn khai riêng"],
    head_of_household: ["head of household", "hoh", "head", "chủ hộ"],
    qualifying_widow: ["widow", "widower", "góa phụ", "qss"]
  },
  yes: {
    en: ["yes", "y", "yeah", "yep", "correct", "right", "ok", "okay", "sure"],
    vi: ["có", "co", "đúng", "dung", "vâng", "ừ", "được", "rồi"],
    es: ["sí", "si", "correcto", "claro", "ok", "bueno"]
  },
  no: {
    en: ["no", "n", "nope", "nah", "none", "never"],
    vi: ["không", "khong", "ko", "k", "chưa", "sai"],
    es: ["no", "nada", "ninguno"]
  },
  skip: {
    en: ["skip", "pass", "next", "none", "n/a", "nothing", "done"],
    vi: ["bỏ qua", "skip", "qua", "tiếp", "xong", "hết"],
    es: ["saltar", "omitir", "pasar", "siguiente", "listo"]
  }
};

// ============================================================
// ✅ MAIN: GET RESPONSE USING SAVED PROMPT (Responses API)
// ============================================================
export async function getResponseWithPrompt(userMessage, context = {}) {
  try {
    const { conversationHistory = [], collectedData = {} } = context;
    
    console.log(`🤖 [AI] Using Saved Prompt: ${CONFIG.PROMPT_ID} v${CONFIG.PROMPT_VERSION}`);
    
    // Build input for the prompt
    let inputMessage = userMessage;
    
    // Add collected data context if exists
    if (Object.keys(collectedData).length > 0) {
      inputMessage = `[COLLECTED DATA]\n${formatCollectedData(collectedData)}\n\n[USER MESSAGE]\n${userMessage}`;
    }
    
    // ✅ Use OpenAI Responses API with Saved Prompt
    const response = await openai.responses.create({
      prompt: {
        id: CONFIG.PROMPT_ID,
        version: CONFIG.PROMPT_VERSION
      },
      input: {
        messages: [
          ...conversationHistory.slice(-6).map(h => ({
            role: h.role,
            content: h.content
          })),
          { role: "user", content: inputMessage }
        ]
      }
    });
    
    // Extract response text
    const responseText = response.output_text || response.choices?.[0]?.message?.content || "";
    
    console.log(`✅ [AI] Response: "${responseText.substring(0, 100)}..."`);
    
    return {
      success: true,
      response: responseText,
      prompt_id: CONFIG.PROMPT_ID,
      prompt_version: CONFIG.PROMPT_VERSION
    };
    
  } catch (err) {
    console.error("❌ [AI] Responses API error:", err.message);
    
    // Fallback to regular chat completions
    return await getResponseFallback(userMessage, context);
  }
}

// ============================================================
// FALLBACK: Regular Chat Completions (if Responses API fails)
// ============================================================
async function getResponseFallback(userMessage, context = {}) {
  try {
    const { conversationHistory = [], collectedData = {} } = context;
    
    console.log("⚠️ [AI] Using fallback (Chat Completions)");
    
    const messages = [];
    
    // Add history
    if (conversationHistory.length > 0) {
      messages.push(...conversationHistory.slice(-6));
    }
    
    // Add collected data context
    if (Object.keys(collectedData).length > 0) {
      messages.push({
        role: "system",
        content: `[COLLECTED DATA - DO NOT REPEAT WELCOME!]\n${formatCollectedData(collectedData)}`
      });
    }
    
    messages.push({ role: "user", content: userMessage });
    
    const response = await openai.chat.completions.create({
      model: CONFIG.MODELS.MAIN,
      messages,
      max_tokens: 800,
      temperature: 0.7
    });
    
    return {
      success: true,
      response: response.choices[0].message.content,
      fallback: true
    };
    
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ============================================================
// FORMAT COLLECTED DATA
// ============================================================
function formatCollectedData(data) {
  const parts = [];
  let nextStep = "Step 1: Ask Filing Status";
  
  if (data.filing_status) {
    parts.push(`✅ Filing Status: ${data.filing_status}`);
    nextStep = "Step 2: Ask TAXPAYER's date of birth";
  }
  if (data.taxpayer_dob) {
    parts.push(`✅ Taxpayer DOB: ${data.taxpayer_dob} (Age: ${data.taxpayer_age || '?'})`);
    if (data.taxpayer_50_plus) parts.push("   → 50+ (IRA limit $8,000)");
    if (data.taxpayer_65_plus) parts.push("   → 65+ (Extra deduction)");
    nextStep = data.filing_status === 'married_filing_jointly' ? "Step 3: Ask SPOUSE's name" : "Step 5: Ask about dependents";
  }
  if (data.spouse_name) {
    parts.push(`✅ Spouse Name: ${data.spouse_name}`);
    nextStep = "Step 4: Ask SPOUSE's date of birth";
  }
  if (data.spouse_dob) {
    parts.push(`✅ Spouse DOB: ${data.spouse_dob} (Age: ${data.spouse_age || '?'})`);
    nextStep = "Step 5: Ask about dependents";
  }
  if (data.has_dependents !== undefined) {
    parts.push(`✅ Has Dependents: ${data.has_dependents ? 'Yes' : 'No'}`);
    nextStep = "Step 7: Ask TAXPAYER's W-2 wages";
  }
  if (data.total_wages) {
    parts.push(`✅ Taxpayer Wages: $${data.total_wages.toLocaleString()}`);
    nextStep = "Step 8: Ask TAXPAYER's federal withholding";
  }
  if (data.total_withheld) {
    parts.push(`✅ Taxpayer Federal Withholding: $${data.total_withheld.toLocaleString()}`);
    nextStep = "Step 9: Ask TAXPAYER's state withholding";
  }
  if (data.spouse_wages) {
    parts.push(`✅ Spouse Wages: $${data.spouse_wages.toLocaleString()}`);
  }
  
  parts.push(`\n🎯 NEXT: ${nextStep}`);
  parts.push(`⚠️ DO NOT say "Hello! Welcome to TaxSky!" again!`);
  
  return parts.join('\n');
}

// ============================================================
// CHECK STATUS
// ============================================================
export async function checkOpenAIStatus() {
  try {
    // Test the Responses API
    const response = await openai.responses.create({
      prompt: {
        id: CONFIG.PROMPT_ID,
        version: CONFIG.PROMPT_VERSION
      },
      input: {
        messages: [{ role: "user", content: "Say OK" }]
      }
    });
    
    return {
      success: true,
      status: "connected",
      api: "responses",
      prompt_id: CONFIG.PROMPT_ID,
      prompt_version: CONFIG.PROMPT_VERSION,
      response: response.output_text || "OK"
    };
  } catch (err) {
    // Fallback test
    try {
      const fallback = await openai.chat.completions.create({
        model: CONFIG.MODELS.MAIN,
        messages: [{ role: "user", content: "Say OK" }],
        max_tokens: 10
      });
      return {
        success: true,
        status: "connected",
        api: "chat_completions",
        model: CONFIG.MODELS.MAIN,
        responses_api_error: err.message
      };
    } catch (fallbackErr) {
      return { success: false, error: fallbackErr.message };
    }
  }
}

// ============================================================
// EXTRACT FILING STATUS
// ============================================================
export async function extractFilingStatus(message, language = "en") {
  try {
    const text = message.toLowerCase().trim();
    
    for (const [status, keywords] of Object.entries(KEYWORDS.filing_status)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          return { success: true, data: { filing_status: status } };
        }
      }
    }
    
    // GPT fallback
    const response = await openai.chat.completions.create({
      model: CONFIG.MODELS.FUNCTION_CALLING,
      messages: [
        { role: "system", content: "Extract filing status if stated." },
        { role: "user", content: message }
      ],
      tools: [{
        type: "function",
        function: {
          name: "extract_filing_status",
          parameters: {
            type: "object",
            properties: {
              found: { type: "boolean" },
              filing_status: { type: "string", enum: ["single", "married_filing_jointly", "married_filing_separately", "head_of_household", "qualifying_widow"] }
            },
            required: ["found"]
          }
        }
      }],
      tool_choice: { type: "function", function: { name: "extract_filing_status" } },
      temperature: 0
    });
    
    const toolCall = response.choices[0].message.tool_calls?.[0];
    if (toolCall) {
      const args = JSON.parse(toolCall.function.arguments);
      if (args.found && args.filing_status) {
        return { success: true, data: { filing_status: args.filing_status } };
      }
    }
    return { success: false, error: "No filing status found" };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ============================================================
// EXTRACT YES/NO
// ============================================================
export async function extractYesNo(message, language = "en") {
  try {
    const text = message.toLowerCase().trim();
    
    const yesWords = [...(KEYWORDS.yes.en || []), ...(KEYWORDS.yes[language] || [])];
    const noWords = [...(KEYWORDS.no.en || []), ...(KEYWORDS.no[language] || [])];
    
    for (const word of yesWords) {
      if (text === word || text.startsWith(word + " ")) {
        return { success: true, data: { answer: "YES" } };
      }
    }
    for (const word of noWords) {
      if (text === word || text.startsWith(word + " ")) {
        return { success: true, data: { answer: "NO" } };
      }
    }
    
    const response = await openai.chat.completions.create({
      model: CONFIG.MODELS.FUNCTION_CALLING,
      messages: [
        { role: "system", content: "Determine YES, NO, or UNCLEAR" },
        { role: "user", content: message }
      ],
      tools: [{
        type: "function",
        function: {
          name: "extract_yes_no",
          parameters: {
            type: "object",
            properties: { answer: { type: "string", enum: ["YES", "NO", "UNCLEAR"] } },
            required: ["answer"]
          }
        }
      }],
      tool_choice: { type: "function", function: { name: "extract_yes_no" } },
      temperature: 0
    });
    
    const toolCall = response.choices[0].message.tool_calls?.[0];
    if (toolCall) return { success: true, data: JSON.parse(toolCall.function.arguments) };
    return { success: false, error: "Could not determine" };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ============================================================
// EXTRACT INCOME DATA
// ============================================================
export async function extractIncomeData(message, context = "", language = "en") {
  try {
    const text = message.toLowerCase();
    
    const skipWords = [...KEYWORDS.skip.en, ...(KEYWORDS.skip[language] || [])];
    for (const word of skipWords) {
      if (text === word) return { success: true, data: { action: "SKIP", amount: 0 } };
    }
    
    const response = await openai.chat.completions.create({
      model: CONFIG.MODELS.FUNCTION_CALLING,
      messages: [
        { role: "system", content: `Extract income. "W2" is form name, NOT amount! Convert "k" to thousands.` },
        { role: "user", content: message }
      ],
      tools: [{
        type: "function",
        function: {
          name: "record_income",
          parameters: {
            type: "object",
            properties: {
              income_type: { type: "string", enum: ["W2_WAGES", "SELF_EMPLOYMENT", "INTEREST", "DIVIDEND", "OTHER"] },
              amount: { type: "number" },
              is_spouse: { type: "boolean" },
              action: { type: "string", enum: ["ADD", "SKIP", "UNCLEAR"] }
            },
            required: ["action"]
          }
        }
      }],
      tool_choice: { type: "function", function: { name: "record_income" } },
      temperature: 0
    });
    
    const toolCall = response.choices[0].message.tool_calls?.[0];
    if (toolCall) return { success: true, data: JSON.parse(toolCall.function.arguments) };
    return { success: false, error: "No data extracted" };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ============================================================
// EXTRACT SPOUSE INCOME COMPLETE
// ============================================================
export async function extractSpouseIncomeComplete(message, existingData = {}, language = "en") {
  try {
    const text = message.toLowerCase();
    
    if (text.includes("no income") || text.includes("doesn't work") || text === "no" || text === "none") {
      return { success: true, data: { action: "SKIP", spouse_has_income: false } };
    }
    
    const response = await openai.chat.completions.create({
      model: CONFIG.MODELS.FUNCTION_CALLING,
      messages: [
        { role: "system", content: `Extract spouse income. "W2" is form name NOT amount!` },
        { role: "user", content: message }
      ],
      tools: [{
        type: "function",
        function: {
          name: "extract_spouse_income",
          parameters: {
            type: "object",
            properties: {
              action: { type: "string", enum: ["ADD", "SKIP", "UNCLEAR"] },
              wages: { type: "number" },
              federal_withholding: { type: "number" },
              state_withholding: { type: "number" },
              withholding_provided: { type: "boolean" }
            },
            required: ["action"]
          }
        }
      }],
      tool_choice: { type: "function", function: { name: "extract_spouse_income" } },
      temperature: 0
    });
    
    const toolCall = response.choices[0].message.tool_calls?.[0];
    if (toolCall) {
      const data = JSON.parse(toolCall.function.arguments);
      if (data.action === "ADD" && data.wages > 0 && !data.withholding_provided) {
        data.needs_followup = true;
      }
      return { success: true, data };
    }
    return { success: false, error: "No data extracted" };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ============================================================
// EXTRACT WITHHOLDING AMOUNT
// ============================================================
export async function extractWithholdingAmount(message, context = {}, language = "en") {
  try {
    const response = await openai.chat.completions.create({
      model: CONFIG.MODELS.FUNCTION_CALLING,
      messages: [
        { role: "system", content: "Extract dollar amount for withholding." },
        { role: "user", content: message }
      ],
      tools: [{
        type: "function",
        function: {
          name: "extract_withholding",
          parameters: {
            type: "object",
            properties: {
              amount: { type: "number" },
              is_zero: { type: "boolean" }
            },
            required: ["amount"]
          }
        }
      }],
      tool_choice: { type: "function", function: { name: "extract_withholding" } },
      temperature: 0
    });
    
    const toolCall = response.choices[0].message.tool_calls?.[0];
    if (toolCall) return { success: true, data: JSON.parse(toolCall.function.arguments) };
    return { success: false, error: "No amount found" };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ============================================================
// EXTRACT DEPENDENT DATA
// ============================================================
export async function extractDependentData(message, context = "", language = "en") {
  try {
    const text = message.toLowerCase();
    
    if (text.includes("no dependent") || text.includes("no children") || text === "no" || text === "none") {
      return { success: true, data: { action: "SKIP", has_dependents: false } };
    }
    
    const response = await openai.chat.completions.create({
      model: CONFIG.MODELS.FUNCTION_CALLING,
      messages: [
        { role: "system", content: "Extract dependent info. Age = 2025 - birth_year. Under 17 = CTC $2000, 17+ = ODC $500." },
        { role: "user", content: message }
      ],
      tools: [{
        type: "function",
        function: {
          name: "record_dependent",
          parameters: {
            type: "object",
            properties: {
              has_dependents: { type: "boolean" },
              count: { type: "number" },
              dependents: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    age: { type: "number" },
                    relationship: { type: "string" }
                  }
                }
              },
              action: { type: "string", enum: ["ADD", "SKIP", "DONE", "NEED_MORE_INFO"] }
            },
            required: ["action"]
          }
        }
      }],
      tool_choice: { type: "function", function: { name: "record_dependent" } },
      temperature: 0
    });
    
    const toolCall = response.choices[0].message.tool_calls?.[0];
    if (toolCall) return { success: true, data: JSON.parse(toolCall.function.arguments) };
    return { success: false, error: "No data extracted" };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ============================================================
// EXTRACT TAX DATA (Universal)
// ============================================================
export async function extractTaxData(message, expectedField, context = {}, language = "en") {
  try {
    const response = await openai.chat.completions.create({
      model: CONFIG.MODELS.FUNCTION_CALLING,
      messages: [
        { role: "system", content: `Extract ${expectedField}. Parse "$50k" = 50000.` },
        { role: "user", content: message }
      ],
      tools: [{
        type: "function",
        function: {
          name: "extract_tax_data",
          parameters: {
            type: "object",
            properties: {
              field: { type: "string" },
              value: { type: "string" },
              numeric_value: { type: "number" },
              action: { type: "string", enum: ["SAVE", "SKIP", "UNCLEAR"] }
            },
            required: ["action"]
          }
        }
      }],
      tool_choice: { type: "function", function: { name: "extract_tax_data" } },
      temperature: 0
    });
    
    const toolCall = response.choices[0].message.tool_calls?.[0];
    if (toolCall) return { success: true, data: JSON.parse(toolCall.function.arguments) };
    return { success: false, error: "No data extracted" };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ============================================================
// EXTRACT ADJUSTMENT DATA
// ============================================================
export async function extractAdjustmentData(message, context = "", language = "en") {
  try {
    const text = message.toLowerCase();
    
    const skipWords = [...KEYWORDS.skip.en, ...(KEYWORDS.skip[language] || [])];
    for (const word of skipWords) {
      if (text.includes(word)) return { success: true, data: { action: "SKIP" } };
    }
    
    const response = await openai.chat.completions.create({
      model: CONFIG.MODELS.FUNCTION_CALLING,
      messages: [
        { role: "system", content: "Extract adjustment. IRA: $7k/<50, $8k/50+. HSA: $4,300/ind, $8,550/fam." },
        { role: "user", content: message }
      ],
      tools: [{
        type: "function",
        function: {
          name: "record_adjustment",
          parameters: {
            type: "object",
            properties: {
              adjustment_type: { type: "string", enum: ["IRA", "SPOUSE_IRA", "STUDENT_LOAN", "HSA"] },
              amount: { type: "number" },
              action: { type: "string", enum: ["ADD", "SKIP", "DONE", "UNCLEAR"] }
            },
            required: ["action"]
          }
        }
      }],
      tool_choice: { type: "function", function: { name: "record_adjustment" } },
      temperature: 0
    });
    
    const toolCall = response.choices[0].message.tool_calls?.[0];
    if (toolCall) return { success: true, data: JSON.parse(toolCall.function.arguments) };
    return { success: false, error: "No data extracted" };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ============================================================
// GET TAX KNOWLEDGE
// ============================================================
export async function getTaxKnowledge(question, state = "CA", language = "en") {
  try {
    const PYTHON_TAX_API = process.env.PYTHON_TAX_API || "http://localhost:5002";
    
    try {
      const ragResponse = await fetch(`${PYTHON_TAX_API}/rag/question`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, state })
      });
      if (ragResponse.ok) {
        const result = await ragResponse.json();
        if (result.success) return result;
      }
    } catch (e) { /* RAG not available */ }
    
    const response = await openai.chat.completions.create({
      model: CONFIG.MODELS.MAIN,
      messages: [{ role: "user", content: `[State: ${state}] ${question}` }],
      max_tokens: 500
    });
    
    return { success: true, answer: response.choices[0].message.content };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ============================================================
// VERIFY TAX RESULTS
// ============================================================
export async function verifyTaxResults(taxResults, userData, language = "en") {
  try {
    const prompt = `Verify: Filing ${userData.filing_status}, Wages $${userData.total_wages || 0}, Refund $${taxResults.federal?.refund || 0}. Reasonable?`;
    
    const response = await openai.chat.completions.create({
      model: CONFIG.MODELS.MAIN,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200
    });
    
    return { success: true, verification: response.choices[0].message.content };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ============================================================
// LEGACY: getResponse (for backward compatibility)
// ============================================================
export async function getResponse(userMessage, context = {}) {
  return await getResponseWithPrompt(userMessage, context);
}

// ============================================================
// ALIAS FUNCTIONS
// ============================================================
export const getInterviewResponse = getResponse;
export const getCPAResponse = getResponse;
export const getForm1040Response = getResponse;
export const getChecklistResponse = getResponse;
export const getSmartResponse = getResponse;

// ============================================================
// EXPORTS
// ============================================================
export default {
  CONFIG,
  MODELS,
  TAX_DATA_2025,
  checkOpenAIStatus,
  getResponseWithPrompt,
  getResponse,
  extractFilingStatus,
  extractYesNo,
  extractIncomeData,
  extractSpouseIncomeComplete,
  extractWithholdingAmount,
  extractDependentData,
  extractTaxData,
  extractAdjustmentData,
  getTaxKnowledge,
  verifyTaxResults,
  getInterviewResponse,
  getCPAResponse,
  getForm1040Response,
  getChecklistResponse,
  getSmartResponse
};