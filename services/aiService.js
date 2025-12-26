// ============================================================
// AI SERVICE (Merged: payService + aiServices + taxModels)
// ============================================================
// All OpenAI/AI functionality in one place:
//   - API calls (chat, streaming)
//   - CPA model
//   - Interview model
//   - Vision model
//   - Intent classifier
//   - Tax question helpers
// ============================================================

import dotenv from "dotenv";
dotenv.config();

import axios from "axios";
import OpenAI from "openai";

// ============================================================
// OPENAI SETUP
// ============================================================
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const API_KEY = process.env.OPENAI_API_KEY;

let openaiClient = null;
try {
  openaiClient = new OpenAI({ apiKey: API_KEY });
  console.log("[AI] ✅ OpenAI client initialized");
} catch (err) {
  console.error("[AI] ❌ Failed to initialize OpenAI:", err.message);
}

// Debug
console.log("[AI] OpenAI Key:", API_KEY ? "OK" : "MISSING");

// ============================================================
// MODEL DEFINITIONS
// ============================================================

// CPA model → professional tax logic, IRS rules, explanations
export const MODEL_CPA = "gpt-4o";

// Interview model → extract answers, guide next question
export const MODEL_INTERVIEW = "gpt-4o";

// Vision model → W-2, 1099 extraction, documents
export const MODEL_VISION = "gpt-4o";

// Intent classifier → detect question, answer, upload, correction
export const MODEL_INTENT = "gpt-4o-mini";

// Fast model for simple tasks
export const MODEL_FAST = "gpt-4o-mini";

// ============================================================
// INTERNAL REQUEST WRAPPER (Retry + Error Safe)
// ============================================================
async function openaiRequest(payload, retry = 0) {
  try {
    const response = await axios.post(OPENAI_URL, payload, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    });

    return response.data;

  } catch (err) {
    const data = err.response?.data;
    const message = data?.error?.message || err.message;

    console.error("❌ AI ERROR:", message);

    // Auto retry once for overload/timeout
    if (
      retry < 1 &&
      (message.includes("rate") ||
        message.includes("overloaded") ||
        message.includes("timeout"))
    ) {
      console.warn("⏳ Retrying AI request...");
      await new Promise(r => setTimeout(r, 1000));
      return openaiRequest(payload, retry + 1);
    }

    // Graceful fallback
    return {
      error: true,
      message,
      choices: [{ message: { content: "AI error occurred. Please try again." } }],
    };
  }
}

// ============================================================
// PUBLIC AI FUNCTION (Text Interaction)
// ============================================================
export async function askAI(model, messages, temperature = 0.3) {
  const payload = {
    model,
    messages,
    temperature,
  };

  const data = await openaiRequest(payload);

  if (data.error) {
    return `AI error: ${data.message}`;
  }

  try {
    const msg = data.choices?.[0]?.message?.content;
    return typeof msg === "string" ? msg.trim() : msg;
  } catch (e) {
    console.error("⚠️ Failed to parse AI message:", e);
    return "AI returned invalid format.";
  }
}

// ============================================================
// STREAMING SUPPORT (Typing Effect)
// ============================================================
export async function askAIStream(model, messages, onToken) {
  const payload = {
    model,
    messages,
    temperature: 0.3,
    stream: true,
  };

  try {
    const response = await axios({
      method: "post",
      url: OPENAI_URL,
      data: payload,
      responseType: "stream",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    response.data.on("data", (chunk) => {
      const lines = chunk
        .toString("utf8")
        .split("\n")
        .filter((l) => l.trim() !== "");

      for (const line of lines) {
        if (line === "data: [DONE]") return;

        if (line.startsWith("data: ")) {
          try {
            const payload = JSON.parse(line.replace("data: ", ""));
            const token = payload.choices?.[0]?.delta?.content;
            if (token) onToken(token);
          } catch (e) {
            // Skip malformed chunks
          }
        }
      }
    });

  } catch (err) {
    console.error("STREAM ERROR:", err.response?.data || err.message);
  }
}

// ============================================================
// CPA MODEL - Professional Tax Questions
// ============================================================
export async function runCpaModel(userMessage, context = {}) {
  const SYSTEM_PROMPT = `You are TaxSky CPA Pro – a professional IRS-level tax assistant.
Answer tax questions with accuracy and friendly explanations.
Use 2024 tax year rules unless specified otherwise.
Be specific with dollar amounts and percentages.
English only.`;

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userMessage }
  ];

  return await askAI(MODEL_CPA, messages, 0.3);
}

// ============================================================
// INTERVIEW MODEL - Guide Tax Interview
// ============================================================
export async function runInterviewModel(userMessage, sessionData = {}) {
  const SYSTEM_PROMPT = `You are TaxSky – a friendly TurboTax-style interview assistant.
Collect tax information step-by-step.
Always ask the next required question.
Be encouraging and helpful.
English only.

Current session data:
${JSON.stringify(sessionData, null, 2)}`;

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userMessage }
  ];

  return await askAI(MODEL_INTERVIEW, messages, 0.4);
}

// ============================================================
// INTENT CLASSIFIER - Detect User Intent
// ============================================================
export async function classifyIntent(message) {
  const SYSTEM_PROMPT = `Classify the user's intent into one of these categories:
- question: User is asking a tax question
- answer: User is answering a question (providing information)
- upload: User mentions uploading a document
- correction: User wants to fix/change something
- confirmation: User is confirming (yes/no/correct)
- greeting: User is saying hello
- other: Anything else

Respond with ONLY the category name, nothing else.`;

  const result = await askAI(MODEL_INTENT, [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: message }
  ], 0.1);

  return result.toLowerCase().trim();
}

// ============================================================
// VISION MODEL - Extract Data from Images
// ============================================================
export async function extractFromImage(base64Image, formType = "W-2") {
  if (!openaiClient) {
    throw new Error("OpenAI client not initialized");
  }

  const prompts = {
    'W-2': `Extract ALL fields from this W-2 form. Return JSON with these exact keys:
{
  "employee_name": "",
  "ssa_number": "",
  "employer_name": "",
  "employer_fed_id_number": "",
  "employee_address": "",
  "wages_tips_other_comp": 0,
  "federal_income_tax_withheld": 0,
  "social_security_wages": 0,
  "social_security_tax_withheld": 0,
  "medicare_wages": 0,
  "medicare_tax_withheld": 0,
  "state_wages_tips": 0,
  "state_income_tax": 0
}`,
    '1099-NEC': `Extract ALL fields from this 1099-NEC form. Return JSON with these exact keys:
{
  "payer_name": "",
  "payer_tin": "",
  "recipient_name": "",
  "recipient_tin": "",
  "nonemployee_compensation": 0,
  "federal_income_tax_withheld": 0
}`,
    '1099-INT': `Extract ALL fields from this 1099-INT form. Return JSON with these exact keys:
{
  "payer_name": "",
  "interest_income": 0,
  "early_withdrawal_penalty": 0,
  "federal_income_tax_withheld": 0,
  "tax_exempt_interest": 0
}`
  };

  const prompt = prompts[formType] || prompts['W-2'];

  try {
    const response = await openaiClient.chat.completions.create({
      model: MODEL_VISION,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.1
    });

    const content = response.choices[0].message.content;
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return null;
  } catch (error) {
    console.error("[Vision] Error:", error.message);
    throw error;
  }
}

// ============================================================
// CPA ASSISTANT - Answer Tax Questions with Context
// ============================================================
export async function askCPAAssistant(question, session = {}) {
  const sessionContext = Object.keys(session).length > 0 
    ? `\n\nUser's current tax situation:\n${JSON.stringify(session, null, 2)}`
    : '';

  const SYSTEM_PROMPT = `You are TaxSky CPA Pro – a professional tax assistant.
Answer tax questions accurately using 2024 IRS rules.
Be specific with dollar amounts.
If the user has session data, personalize your answer.${sessionContext}`;

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: question }
  ];

  return await askAI(MODEL_CPA, messages, 0.3);
}

// ============================================================
// TAX SESSION REVIEW - AI Analysis
// ============================================================
export async function reviewTaxSession(session) {
  const SYSTEM_PROMPT = `You are a tax review AI. Analyze this tax session and provide:
1. Any errors or issues found
2. Potential missed deductions/credits
3. Optimization suggestions
4. Overall assessment

Respond in JSON format:
{
  "errors": [],
  "warnings": [],
  "opportunities": [],
  "assessment": "string"
}`;

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `Review this tax session:\n${JSON.stringify(session, null, 2)}` }
  ];

  const result = await askAI(MODEL_CPA, messages, 0.2);
  
  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error("[Review] Failed to parse:", e);
  }
  
  return {
    errors: [],
    warnings: [],
    opportunities: [],
    assessment: result
  };
}

// ============================================================
// GET NEXT QUESTION - Smart Question Generator
// ============================================================
export function getNextQuestion(answers) {
  const requiredFields = [
    { field: "filing_status", prompt: "What is your filing status for 2024?\n\n1️⃣ Single\n2️⃣ Married Filing Jointly\n3️⃣ Married Filing Separately\n4️⃣ Head of Household" },
    { field: "has_dependents", prompt: "Do you have any dependents (children under 17)?\n\nType **yes** or **no**" },
    { field: "w2_income", prompt: "What is your total W-2 income (Box 1)?" },
    { field: "withholding", prompt: "How much federal tax was withheld (Box 2)?" },
  ];

  for (const item of requiredFields) {
    if (!answers[item.field]) {
      return { field: item.field, prompt: item.prompt };
    }
  }

  return null; // All required fields collected
}

// ============================================================
// GENERATE TAX SUMMARY - Natural Language
// ============================================================
export async function generateTaxSummary(taxData) {
  const SYSTEM_PROMPT = `You are a friendly tax assistant. Generate a clear, easy-to-understand summary of this person's tax situation. Include:
- Total income
- Deductions used
- Tax owed or refund
- Key takeaways

Keep it conversational and encouraging.`;

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `Generate a summary for:\n${JSON.stringify(taxData, null, 2)}` }
  ];

  return await askAI(MODEL_CPA, messages, 0.5);
}

// ============================================================
// SIMPLE SEND TO GPT (Legacy Support)
// ============================================================
export async function sendToGPT(prompt) {
  return await askAI(MODEL_CPA, [{ role: "user", content: prompt }], 0.3);
}

// ============================================================
// EXPORTS
// ============================================================
export default {
  // Models
  MODEL_CPA,
  MODEL_INTERVIEW,
  MODEL_VISION,
  MODEL_INTENT,
  MODEL_FAST,
  
  // Core functions
  askAI,
  askAIStream,
  openaiRequest,
  
  // Specialized functions
  runCpaModel,
  runInterviewModel,
  classifyIntent,
  extractFromImage,
  askCPAAssistant,
  reviewTaxSession,
  getNextQuestion,
  generateTaxSummary,
  sendToGPT
};