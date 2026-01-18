// ============================================================
// TEST FINE-TUNED INTERVIEW FLOW
// ============================================================
// Tests the complete TaxSky interview conversation
// Run: node test-interview-flow.js
// ============================================================

import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MODEL = "ft:gpt-3.5-turbo-0125:banigi-ai:taxsky-interview:CkIjPvqg";

// Simulated conversation history
let conversationHistory = [];

async function chat(userMessage) {
  // Add user message to history
  conversationHistory.push({ role: "user", content: userMessage });
  
  console.log(`\n👤 USER: ${userMessage}`);
  console.log("-".repeat(50));
  
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { 
          role: "system", 
          content: `You are TaxSky CPA Assistant. Guide the user through filing their 2025 taxes step by step.

INTERVIEW FLOW:
1. Welcome & document upload
2. Filing status (confirm before proceeding)
3. Spouse income (if MFJ)
4. Dependents (how many, then ages for each)
5. Income review
6. Adjustments (IRA, student loan, HSA)
7. Deductions (standard vs itemized)
8. Credits review
9. Final review & calculate

RULES:
- Always confirm user responses before moving to next step
- For MFJ, always ask about spouse income
- For dependents, ask age of EACH child to determine CTC eligibility
- Child Tax Credit: $2,000 per child UNDER 17
- Other Dependents Credit: $500 per dependent 17 or older
- Be conversational and helpful`
        },
        ...conversationHistory
      ],
      max_tokens: 300,
      temperature: 0.3
    });
    
    const assistantMessage = response.choices[0].message.content;
    conversationHistory.push({ role: "assistant", content: assistantMessage });
    
    console.log(`🤖 TAXSKY: ${assistantMessage}`);
    console.log(`   [${response.usage.total_tokens} tokens, ${Date.now()}]`);
    
    return assistantMessage;
    
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    return null;
  }
}

async function runInterviewTest() {
  console.log("\n" + "=".repeat(60));
  console.log("🧪 TAXSKY INTERVIEW FLOW TEST");
  console.log("   Model:", MODEL);
  console.log("=".repeat(60));
  
  // Test conversation flow
  const testFlow = [
    // Step 1: Start
    "I want to file my taxes for 2025",
    
    // Step 2: Filing status
    "married filing jointly",
    
    // Step 3: Confirm
    "yes",
    
    // Step 4: Spouse income (should ask this for MFJ)
    "yes my wife has income too",
    
    // Step 5: Dependents
    "we have 2 children",
    
    // Step 6: Confirm dependents
    "yes 2 kids",
    
    // Step 7: Child ages
    "my son is 16 years old",
    
    // Step 8: Second child age
    "my daughter is 12",
    
    // Step 9: Review
    "yes that looks correct",
    
    // Step 10: Adjustments
    "I contributed $7000 to my IRA",
    
    // Step 11: Confirm IRA
    "yes",
    
    // Step 12: More adjustments
    "no more adjustments",
    
    // Step 13: Deductions
    "I'll take the standard deduction",
    
    // Step 14: Final
    "yes calculate my taxes"
  ];
  
  for (const message of testFlow) {
    await chat(message);
    // Small delay between messages
    await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("📊 TEST COMPLETE");
  console.log(`   Total messages: ${conversationHistory.length}`);
  console.log("=".repeat(60));
}

// Test specific scenarios
async function testScenarios() {
  console.log("\n" + "=".repeat(60));
  console.log("🎯 SPECIFIC SCENARIO TESTS");
  console.log("=".repeat(60));
  
  const scenarios = [
    {
      name: "Age confirmation (older)",
      messages: [
        "I want to contribute $8000 to my IRA",
        "yes I'm over 50"
      ]
    },
    {
      name: "Dependent age edge case",
      messages: [
        "I have a 17 year old",
      ]
    },
    {
      name: "Correction flow",
      messages: [
        "married filing jointly",
        "no wait, I meant single"
      ]
    },
    {
      name: "Tax question mid-flow",
      messages: [
        "what is the standard deduction for married filing jointly?"
      ]
    }
  ];
  
  for (const scenario of scenarios) {
    console.log(`\n📌 Scenario: ${scenario.name}`);
    console.log("-".repeat(40));
    
    // Reset conversation
    conversationHistory = [];
    
    for (const msg of scenario.messages) {
      await chat(msg);
      await new Promise(r => setTimeout(r, 500));
    }
  }
}

// Quick single message test
async function quickTest(message) {
  conversationHistory = [];
  console.log("\n🚀 Quick Test:");
  await chat(message);
}

// Main
async function main() {
  const args = process.argv.slice(2);
  
  if (args[0] === "--quick" && args[1]) {
    await quickTest(args.slice(1).join(" "));
  } else if (args[0] === "--scenarios") {
    await testScenarios();
  } else {
    await runInterviewTest();
  }
}

main().catch(console.error);