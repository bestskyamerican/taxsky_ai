// ============================================================
// TEST RAG - 2024 + 2025 Tax Questions
// ============================================================

const BASE_URL = "http://localhost:3000";

const testQuestions = [
  // 2024 Questions (default)
  { q: "What is the standard deduction for 2024?", expect: "14,600", year: 2024 },
  { q: "What is the standard deduction for married filing jointly?", expect: "29,200", year: 2024 },
  { q: "How much is the child tax credit?", expect: "2,000", year: 2024 },
  { q: "What is the maximum EITC for 3 children?", expect: "7,830", year: 2024 },
  { q: "What are the 2024 tax brackets?", expect: "10%", year: 2024 },
  { q: "What is the 401k contribution limit?", expect: "23,000", year: 2024 },
  { q: "What is the California standard deduction?", expect: "5,363", year: 2024 },
  
  // 2025 Questions
  { q: "What is the standard deduction for 2025?", expect: "15,000", year: 2025 },
  { q: "What is the 2025 standard deduction for married filing jointly?", expect: "30,000", year: 2025 },
  { q: "What are the 2025 tax brackets?", expect: "11,925", year: 2025 },
  { q: "What is the 2025 401k limit?", expect: "23,500", year: 2025 },
  { q: "What is the 2025 social security wage base?", expect: "176", year: 2025 },
  { q: "What is the 2025 EITC for 3 children?", expect: "8,046", year: 2025 },
  { q: "What is the 2025 California standard deduction?", expect: "5,540", year: 2025 },
  { q: "What changed between 2024 and 2025 taxes?", expect: "15,000", year: 2025 },
  { q: "What is the 2025 business mileage rate?", expect: "70", year: 2025 },
];

async function runTests() {
  console.log("\n" + "=".repeat(60));
  console.log("   RAG TEST - 2024 + 2025 Tax Questions");
  console.log("=".repeat(60) + "\n");
  
  let passed = 0;
  let failed = 0;
  
  for (const test of testQuestions) {
    try {
      const response = await fetch(`${BASE_URL}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "test_rag", message: test.q })
      });
      
      const data = await response.json();
      
      const hasExpected = data.reply?.toLowerCase().includes(test.expect.toLowerCase());
      
      if (hasExpected) {
        console.log(`✅ [${test.year}] "${test.q.substring(0, 35)}..."`);
        console.log(`   Docs: ${data.docsUsed || 0} | Year: ${data.taxYear || 'N/A'}`);
        passed++;
      } else {
        console.log(`❌ [${test.year}] "${test.q.substring(0, 35)}..."`);
        console.log(`   Expected "${test.expect}" not found`);
        console.log(`   Got: ${data.reply?.substring(0, 80)}...`);
        failed++;
      }
      
      console.log("");
      
      // Small delay
      await new Promise(r => setTimeout(r, 500));
      
    } catch (error) {
      console.log(`❌ "${test.q.substring(0, 35)}..." - ERROR: ${error.message}`);
      failed++;
    }
  }
  
  console.log("=".repeat(60));
  console.log(`   RESULTS: ${passed} passed, ${failed} failed`);
  console.log(`   ACCURACY: ${((passed / testQuestions.length) * 100).toFixed(0)}%`);
  console.log("=".repeat(60) + "\n");
}

runTests();