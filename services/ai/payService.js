import dotenv from "dotenv";
dotenv.config(); // Load environment variables before using API key

import axios from "axios";

// ---------------------------------------------------------
// OPENAI SETTINGS
// ---------------------------------------------------------
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const API_KEY = process.env.OPENAI_API_KEY;

// Debug print
console.log("AI Service Loaded – OpenAI Key:", API_KEY ? "OK" : "MISSING");

// ---------------------------------------------------------
// 🔥 NEW 2025 MODELS — REPLACES ALL FINE-TUNED MODELS
// ---------------------------------------------------------

// CPA model → professional tax logic, IRS rules, explanations
export const MODEL_CPA = "gpt-5.1";

// Interview model → extract answers, guide next question, step flow
export const MODEL_INTERVIEW = "gpt-4o";

// Vision model → W-2, 1099 extraction, receipts, documents
export const MODEL_VISION = "gpt-4o";

// Intent classifier → detect question, answer, upload, correction
export const MODEL_INTENT = "gpt-4o-mini";

// ---------------------------------------------------------
// INTERNAL REQUEST WRAPPER (Retry + Error Safe)
// ---------------------------------------------------------
async function openaiRequest(payload, retry = 0) {
  try {
    const response = await axios.post(OPENAI_URL, payload, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 25000,
    });

    return response.data;

  } catch (err) {
    const data = err.response?.data;
    const message = data?.error?.message || err.message;

    console.error("❌ TAXSKY AI ERROR:", message);

    // Auto retry once for overload/timeout
    if (
      retry < 1 &&
      (message.includes("rate") ||
        message.includes("overloaded") ||
        message.includes("timeout"))
    ) {
      console.warn("⏳ Retrying AI request...");
      return openaiRequest(payload, retry + 1);
    }

    // Graceful fallback
    return {
      error: true,
      message,
      choices: [{ message: { content: "AI error occurred." } }],
    };
  }
}

// ---------------------------------------------------------
// PUBLIC AI FUNCTION (Text Interaction)
// ---------------------------------------------------------
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

// ---------------------------------------------------------
// STREAMING SUPPORT (Typing Effect)
// ---------------------------------------------------------
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
          const payload = JSON.parse(line.replace("data: ", ""));
          const token = payload.choices?.[0]?.delta?.content;
          if (token) onToken(token);
        }
      }
    });

  } catch (err) {
    console.error("STREAM ERROR:", err.response?.data || err.message);
  }
}
