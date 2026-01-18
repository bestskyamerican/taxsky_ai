import OpenAI from "openai";
import readline from "readline";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = "ft:gpt-3.5-turbo-0125:banigi-ai:taxsky-2025-v2:Crx9w4qn";

let history = [];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log("\n🌤️ TaxSky Chat (type 'exit' to quit)\n");

async function chat(msg) {
  history.push({ role: "user", content: msg });
  
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: history,
    max_tokens: 500
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
    
    const reply = await chat(input);
    console.log(`\n🤖 TaxSky:\n${reply}\n`);
    ask();
  });
}

ask();
