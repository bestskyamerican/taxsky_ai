import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Your fine-tuned models
const MODELS = {
  "1": "ft:gpt-3.5-turbo-0125:banigi-ai:taxsky-2025-v2:Crx9w4qn",
  "2": "ft:gpt-3.5-turbo-0125:banigi-ai:taxsky-interview:CkIjPvqg",
  "3": "ft:gpt-4.1-mini-2025-04-14:banigi-ai:taxsky-cpa:CkIiIKRJ"
};

async function chat(model, message) {
  const response = await openai.chat.completions.create({
    model: model,
    messages: [
      { role: "user", content: message }
    ],
    max_tokens: 500
  });
  return response.choices[0].message.content;
}

// Test
const model = MODELS["1"]; // taxsky-2025-v2
const message = process.argv[2] || "I want to file my taxes";

console.log(`\n🤖 Model: ${model}`);
console.log(`👤 You: ${message}\n`);

chat(model, message).then(response => {
  console.log(`🤖 TaxSky:\n${response}`);
});