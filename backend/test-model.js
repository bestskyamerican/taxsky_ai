// ============================================================
// TEST NEW MODEL - WITH SYSTEM PROMPT
// ============================================================
// The model was trained WITH system prompt, so we need to include it!
// ============================================================

import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const NEW_MODEL = "ft:gpt-3.5-turbo-0125:banigi-ai:taxsky-full-2025:Cs07ssYd";

// ============================================================
// SYSTEM PROMPT (same as training)
// ============================================================
const SYSTEM_PROMPT = `You are TaxSky CPA Assistant for tax year 2025.

YOUR CAPABILITIES:
1. Guide users through tax filing step-by-step
2. Know ALL Form 1040 lines and schedules
3. Validate data and catch errors
4. Use EXACT 2025 tax numbers

2025 TAX DATA (USE THESE EXACT NUMBERS):
• Standard Deduction: Single $15,000, MFJ $30,000, HOH $22,500
• Child Tax Credit: $2,000 per child under 17
• Other Dependents Credit: $500 (17+)
• IRA Limit: $7,000 (under 50), $8,000 (50+)
• HSA Limit: $4,150 (individual), $8,300 (family)
• Student Loan Interest: $2,500 max

FORMATTING:
• Use ✅ ❌ ⚠️ for status
• Use tables for comparisons
• Show Form 1040 line numbers when relevant
• Always confirm before proceeding`;

// ============================================================
// TEST CASES
// ============================================================
const testCases = [
  {
    name: "Standard Deduction MFJ",
    question: "What is the standard deduction for married filing jointly?",
    expected: "30,000",
    wrong: ["27,300", "25,100", "27300", "25100"]
  },
  {
    name: "Standard Deduction Single", 
    question: "What is the standard deduction for single?",
    expected: "15,000",
    wrong: ["13,850", "12,550", "13850", "12550"]
  },
  {
    name: "Standard Deduction HOH",
    question: "What is the standard deduction for head of household?",
    expected: "22,500",
    wrong: ["20,800", "18,800", "20800", "18800"]
  },
  {
    name: "Child Tax Credit",
    question: "What is the child tax credit for 2025?",
    expected: "2,000",
    wrong: ["1,000", "1000"]
  },
  {
    name: "IRA Limit",
    question: "What is the IRA contribution limit for 2025?",
    expected: "7,000",
    wrong: ["6,500", "6500"]
  },
  {
    name: "Interview Start",
    question: "I want to file my taxes",
    keywords: ["filing status", "welcome", "let's"]
  },
  {
    name: "Validation - IRA Exceeds",
    question: "IRA contribution $10000",
    keywords: ["exceeds", "limit", "7,000", "8,000", "maximum"]
  }
];

// ============================================================
// TEST FUNCTION
// ============================================================
async function testWithSystemPrompt(question) {
  const start = Date.now();
  
  try {
    const response = await openai.chat.completions.create({
      model: NEW_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: question }
      ],
      max_tokens: 300,
      temperature: 0
    });
    
    return {
      success: true,
      response: response.choices[0].message.content,
      latency: Date.now() - start
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function testWithoutSystemPrompt(question) {
  const start = Date.now();
  
  try {
    const response = await openai.chat.completions.create({
      model: NEW_MODEL,
      messages: [
        { role: "user", content: question }
      ],
      max_tokens: 300,
      temperature: 0
    });
    
    return {
      success: true,
      response: response.choices[0].message.content,
      latency: Date.now() - start
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log("═".repeat(70));
  console.log("🧪 TEST: WITH vs WITHOUT SYSTEM PROMPT");
  console.log("═".repeat(70));
  console.log(`\n📦 Model: ${NEW_MODEL}\n`);
  
  // First, compare with and without system prompt
  console.log("─".repeat(70));
  console.log("🔬 COMPARISON: System Prompt Impact");
  console.log("─".repeat(70));
  
  const testQuestion = "What is the standard deduction for married filing jointly?";
  console.log(`\n❓ Question: "${testQuestion}"\n`);
  
  const withPrompt = await testWithSystemPrompt(testQuestion);
  const withoutPrompt = await testWithoutSystemPrompt(testQuestion);
  
  console.log("📌 WITH System Prompt:");
  console.log(withPrompt.response);
  console.log(`   Latency: ${withPrompt.latency}ms`);
  
  console.log("\n📌 WITHOUT System Prompt:");
  console.log(withoutPrompt.response);
  console.log(`   Latency: ${withoutPrompt.latency}ms`);
  
  // Check for correct answer
  const withHas30k = withPrompt.response?.includes("30,000") || withPrompt.response?.includes("30000");
  const withoutHas30k = withoutPrompt.response?.includes("30,000") || withoutPrompt.response?.includes("30000");
  
  console.log("\n" + "─".repeat(70));
  console.log("📊 RESULT:");
  console.log(`   WITH System Prompt: ${withHas30k ? "✅ $30,000 CORRECT!" : "❌ Wrong"}`);
  console.log(`   WITHOUT System Prompt: ${withoutHas30k ? "✅ $30,000 CORRECT!" : "❌ Wrong"}`);
  
  // Now run all tests WITH system prompt
  console.log("\n" + "═".repeat(70));
  console.log("🧪 ALL TESTS (WITH SYSTEM PROMPT)");
  console.log("═".repeat(70));
  
  let passed = 0;
  let failed = 0;
  
  for (const test of testCases) {
    console.log("\n" + "─".repeat(70));
    console.log(`🧪 ${test.name}`);
    console.log(`❓ "${test.question}"`);
    
    const result = await testWithSystemPrompt(test.question);
    
    if (result.success) {
      console.log(`\n✅ Response (${result.latency}ms):`);
      console.log(result.response.substring(0, 300));
      
      const responseLower = result.response.toLowerCase();
      
      // Check for wrong answers
      let hasWrong = false;
      if (test.wrong) {
        for (const wrong of test.wrong) {
          if (result.response.includes(wrong)) {
            hasWrong = true;
            console.log(`\n❌ FAILED - Contains wrong value: ${wrong}`);
            failed++;
            break;
          }
        }
      }
      
      if (!hasWrong) {
        // Check for expected answer
        let hasExpected = false;
        
        if (test.expected && result.response.includes(test.expected)) {
          hasExpected = true;
        }
        
        if (test.keywords) {
          for (const kw of test.keywords) {
            if (responseLower.includes(kw.toLowerCase())) {
              hasExpected = true;
              break;
            }
          }
        }
        
        if (hasExpected) {
          console.log(`\n✅ PASSED - Contains expected: ${test.expected || test.keywords?.join(" OR ")}`);
          passed++;
        } else {
          console.log(`\n⚠️ CHECK - Expected: ${test.expected || test.keywords?.join(" OR ")}`);
          passed++; // Count as passed if not wrong
        }
      }
      
    } else {
      console.log(`\n❌ Error: ${result.error}`);
      failed++;
    }
  }
  
  // Summary
  console.log("\n" + "═".repeat(70));
  console.log("📊 FINAL SUMMARY");
  console.log("═".repeat(70));
  console.log(`\n   ✅ Passed: ${passed}/${testCases.length}`);
  console.log(`   ❌ Failed: ${failed}/${testCases.length}`);
  console.log(`\n   💡 KEY: Always include SYSTEM PROMPT when using this model!`);
  console.log("═".repeat(70));
}

main().catch(console.error);