import OpenAI from "openai";
import readline from "readline";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = "ft:gpt-3.5-turbo-0125:banigi-ai:taxsky-2025-v2:Crx9w4qn";

const SYSTEM_PROMPT = `You are TaxSky CPA Assistant for tax year 2025. 
Guide users through filing taxes step by step.
Always confirm responses before proceeding.
Use formatting: bullets, bold, emojis.
2025 Rules: CTC=$2,000 (under 17), Standard Deduction MFJ=$30,000, IRA=$7,000.`;

let history = [{ role: "system", content: SYSTEM_PROMPT }];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log("\n🌤️ TaxSky Chat - Fine-Tuned Model Test");
console.log("Model:", MODEL);
console.log("Type 'exit' to quit, 'reset' to start over\n");

async function chat(msg) {
  history.push({ role: "user", content: msg });
  
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: history,
    max_tokens: 500,
    temperature: 0.3
  });
  
  const reply = response.choices[0].message.content;
  history.push({ role: "assistant", content: reply });
  return reply;
}

function ask() {
  rl.question("👤 You: ", async (input) => {
    if (input.toLowerCase() === "exit") {
      console.log("\n👋 Bye!");
      rl.close();
      return;
    }
    
    if (input.toLowerCase() === "reset") {
      history = [{ role: "system", content: SYSTEM_PROMPT }];
      console.log("\n🔄 Conversation reset!\n");
      ask();
      return;
    }
    
    try {
      const reply = await chat(input);
      console.log(`\n🤖 TaxSky:\n${reply}\n`);
    } catch (err) {
      console.log(`\n❌ Error: ${err.message}\n`);
    }
    ask();
  });
}

ask();
