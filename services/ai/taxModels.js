import { Router } from 'express'; const r=Router(); export default r;import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ----------------------------
// MODEL 1: CPA PRO MODEL (4.1)
// ----------------------------
export async function runCpaModel(userMessage) {
  const SYSTEM_PROMPT = `
You are TaxSky CPA Pro — a professional IRS-level tax assistant.
Answer tax questions with accuracy and friendly explanations.
English only.
  `;

  const response = await client.chat.completions.create({
    model: "ft:gpt-4.1-mini-2025-04-14:banigi-ai:taxsky-cpa:CkIiIKRJ",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage }
    ]
  });

  return response.choices[0].message.content;
}

// ---------------------------------
// MODEL 2: INTERVIEW MODEL (3.5)
// ---------------------------------
export async function runInterviewModel(userMessage, sessionAnswers = {}) {
  const SYSTEM_PROMPT = `
You are TaxSky — a friendly TurboTax-style interview assistant.
Collect tax information step-by-step.
Always ask the next required question.
English only.
  `;

  const response = await client.chat.completions.create({
    model: "ft:gpt-3.5-turbo-0125:banigi-ai:taxsky-interview:CkIjPvqg",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage }
    ]
  });

  return response.choices[0].message.content;
}
