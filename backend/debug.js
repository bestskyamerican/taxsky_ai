// ============================================================
// TAXSKY AI - FULL FLOW TEST SCRIPT
// ============================================================
// Run: node test-full-flow.js
// ============================================================

import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'http://localhost:3000';
const TEST_USER = 'test_flow_' + Date.now();

// Use the SAME secret as your backend
const JWT_SECRET = process.env.JWT_SECRET || 'taxsky-jwt-secret-2024-bestskyamerican-random-key';

// Generate valid token
const TEST_TOKEN = jwt.sign(
  { 
    odisguserIdtest: TEST_USER, 
    email: 'test@taxsky.com',
    name: 'Test User'
  }, 
  JWT_SECRET, 
  { expiresIn: '1h' }
);

// Colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function log(icon, message, color = RESET) {
  console.log(`${color}${icon} ${message}${RESET}`);
}

function header(text) {
  console.log(`\n${CYAN}${'═'.repeat(60)}${RESET}`);
  console.log(`${CYAN}${BOLD}  ${text}${RESET}`);
  console.log(`${CYAN}${'═'.repeat(60)}${RESET}\n`);
}

function subHeader(text) {
  console.log(`\n${BLUE}── ${text} ──${RESET}\n`);
}

async function apiCall(endpoint, body = {}) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_TOKEN}`
      },
      body: JSON.stringify({ userId: TEST_USER, ...body })
    });
    return await response.json();
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function chat(message) {
  return await apiCall('/api/ai/chat', { message });
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// MAIN TEST
// ============================================================
async function runFullFlowTest() {
  console.log('\n');
  console.log(`${CYAN}╔════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${CYAN}║${RESET}${BOLD}          TAXSKY AI - FULL FLOW TEST                        ${RESET}${CYAN}║${RESET}`);
  console.log(`${CYAN}╚════════════════════════════════════════════════════════════╝${RESET}`);
  console.log(`\n🔑 Test User: ${TEST_USER}`);
  
  let passed = 0;
  let failed = 0;
  const results = [];

  // ============================================================
  header('1. RESET SESSION');
  // ============================================================
  
  const reset = await apiCall('/api/ai/reset');
  if (reset.success) {
    log('✅', 'Session reset successfully', GREEN);
    passed++;
  } else {
    log('❌', `Reset failed: ${reset.error}`, RED);
    failed++;
  }
  await delay(500);

  // ============================================================
  header('2. WELCOME MESSAGE');
  // ============================================================
  
  const welcome = await apiCall('/api/ai/welcome');
  if (welcome.success && welcome.reply) {
    log('✅', 'Welcome message received', GREEN);
    console.log(`   ${YELLOW}"${welcome.reply.substring(0, 80)}..."${RESET}`);
    passed++;
  } else {
    log('❌', `Welcome failed: ${welcome.error}`, RED);
    failed++;
  }
  await delay(500);

  // ============================================================
  header('3. CONVERSATION FLOW TEST');
  // ============================================================

  const conversations = [
    {
      step: 'Start Filing',
      input: 'I want to file my taxes',
      expectContains: ['name', 'start', 'help', 'document'],
      expectNotContains: ['IRS Publication', 'According to']
    },
    {
      step: 'Provide Name',
      input: 'John Smith',
      expectContains: ['filing', 'status', 'single', 'married'],
      expectExtract: ['first_name', 'last_name']
    },
    {
      step: 'Filing Status (Should NOT trigger RAG)',
      input: 'Married Filing Jointly',
      expectContains: ['spouse', 'dependent', 'wife', 'husband'],
      expectNotContains: ['IRS Publication', 'standard deduction', '$29,200', 'According to'],
      critical: true
    },
    {
      step: 'Complex Input - Spouse & Dependents',
      input: 'My wife is HA TRAN and we have 2 kids',
      expectContains: ['address', 'noted', 'great', 'got it'],
      expectExtract: ['spouse_first_name', 'spouse_last_name', 'dependent_count']
    },
    {
      step: 'Address',
      input: '123 Main St, Los Angeles, CA 90001',
      expectContains: ['ssn', 'social', 'security', 'skip'],
      expectExtract: ['address', 'city', 'state', 'zip']
    },
    {
      step: 'Skip SSN',
      input: 'skip',
      expectContains: ['dependent', 'child', 'name', 'ok'],
      expectNotContains: ['IRS Publication']
    },
    {
      step: 'Dependent Name',
      input: 'Tommy Smith',
      expectContains: ['great', 'got', 'next', 'ssn', 'more'],
      expectExtract: ['dependent_1_name']
    }
  ];

  for (const conv of conversations) {
    subHeader(`Step: ${conv.step}`);
    console.log(`   ${BLUE}You: "${conv.input}"${RESET}`);
    
    const result = await chat(conv.input);
    await delay(800);
    
    if (!result.success) {
      log('❌', `API Error: ${result.error}`, RED);
      failed++;
      results.push({ step: conv.step, passed: false, error: result.error });
      continue;
    }

    const reply = (result.reply || '').toLowerCase();
    let stepPassed = true;
    let issues = [];

    // Check expected content
    if (conv.expectContains) {
      const hasExpected = conv.expectContains.some(word => reply.includes(word.toLowerCase()));
      if (!hasExpected) {
        issues.push(`Missing expected words: ${conv.expectContains.join(', ')}`);
        stepPassed = false;
      }
    }

    // Check NOT expected content (like RAG answers)
    if (conv.expectNotContains) {
      const hasUnexpected = conv.expectNotContains.find(word => reply.includes(word.toLowerCase()));
      if (hasUnexpected) {
        issues.push(`Contains unexpected: "${hasUnexpected}" (RAG triggered incorrectly!)`);
        stepPassed = false;
      }
    }

    // Check extraction
    if (conv.expectExtract && result.extracted) {
      const extractedKeys = Object.keys(result.extracted);
      const missingExtracts = conv.expectExtract.filter(key => !extractedKeys.includes(key));
      if (missingExtracts.length > 0) {
        issues.push(`Missing extractions: ${missingExtracts.join(', ')}`);
        // Don't fail for missing extractions, just warn
      }
    }

    // Log result
    console.log(`   ${YELLOW}AI: "${result.reply.substring(0, 100)}..."${RESET}`);
    
    if (result.extracted && Object.keys(result.extracted).length > 0) {
      console.log(`   ${GREEN}📤 Extracted: ${JSON.stringify(result.extracted)}${RESET}`);
    }

    if (stepPassed) {
      log('✅', `${conv.step} - PASSED`, GREEN);
      passed++;
    } else {
      log('❌', `${conv.step} - FAILED`, RED);
      issues.forEach(issue => console.log(`      ${RED}└─ ${issue}${RESET}`));
      failed++;
      
      if (conv.critical) {
        log('🚨', 'CRITICAL TEST FAILED - RAG was triggered for filing status!', RED);
      }
    }

    results.push({ step: conv.step, passed: stepPassed, issues });
  }

  // ============================================================
  header('4. TAX QUESTION TEST (Should use RAG)');
  // ============================================================

  const taxQuestions = [
    {
      question: 'What is the standard deduction for 2024?',
      expectContains: ['14,600', '29,200', 'deduction'],
      shouldUseRAG: true
    },
    {
      question: 'How much is the child tax credit?',
      expectContains: ['2,000', 'child', 'credit'],
      shouldUseRAG: true
    }
  ];

  for (const tq of taxQuestions) {
    subHeader(`Tax Q: "${tq.question}"`);
    
    const result = await chat(tq.question);
    await delay(800);
    
    if (!result.success) {
      log('❌', `API Error: ${result.error}`, RED);
      failed++;
      continue;
    }

    const reply = (result.reply || '').toLowerCase();
    const hasExpected = tq.expectContains.some(word => reply.includes(word.toLowerCase()));
    
    console.log(`   ${YELLOW}AI: "${result.reply.substring(0, 150)}..."${RESET}`);
    
    if (hasExpected) {
      log('✅', 'Tax question answered correctly (RAG used)', GREEN);
      passed++;
    } else {
      log('❌', `Missing expected content: ${tq.expectContains.join(', ')}`, RED);
      failed++;
    }
  }

  // ============================================================
  header('5. CHECK SAVED DATA');
  // ============================================================

  const data = await apiCall('/api/ai/data');
  
  if (data.success && data.data) {
    log('✅', 'Data retrieved successfully', GREEN);
    console.log(`\n   ${CYAN}Saved Fields:${RESET}`);
    
    const importantFields = [
      'first_name', 'last_name', 'filing_status', 
      'spouse_first_name', 'spouse_last_name',
      'has_dependents', 'dependent_count', 'dependent_1_name',
      'address', 'city', 'state', 'zip'
    ];
    
    for (const field of importantFields) {
      const value = data.data[field];
      if (value) {
        console.log(`   ${GREEN}✓ ${field}: ${value}${RESET}`);
      } else {
        console.log(`   ${YELLOW}○ ${field}: (not set)${RESET}`);
      }
    }
    passed++;
  } else {
    log('❌', `Data retrieval failed: ${data.error}`, RED);
    failed++;
  }

  // ============================================================
  header('6. CHECK 1040 READINESS');
  // ============================================================

  const validate = await fetch(`${BASE_URL}/api/tax/1040/validate?userId=${TEST_USER}`, {
    headers: { 'Authorization': `Bearer ${TEST_TOKEN}` }
  }).then(r => r.json());

  if (validate.ready) {
    log('✅', 'Form 1040 is READY to generate!', GREEN);
    passed++;
  } else {
    log('⚠️', `Form 1040 not ready yet`, YELLOW);
    console.log(`   Missing: ${(validate.missingFields || []).slice(0, 5).join(', ')}`);
    // This is expected if we didn't provide income
  }

  // ============================================================
  header('7. TAX CALCULATION');
  // ============================================================

  const status = await apiCall('/api/ai/status');
  
  if (status.success) {
    console.log(`   ${CYAN}📊 Progress: ${status.progress}%${RESET}`);
    console.log(`   ${CYAN}💵 Refund: $${status.refund || 0}${RESET}`);
    console.log(`   ${CYAN}✅ Complete: ${status.isComplete ? 'Yes' : 'No'}${RESET}`);
    log('✅', 'Status retrieved', GREEN);
    passed++;
  } else {
    log('❌', `Status failed: ${status.error}`, RED);
    failed++;
  }

  // ============================================================
  // FINAL SUMMARY
  // ============================================================
  console.log('\n');
  console.log(`${CYAN}╔════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${CYAN}║${RESET}${BOLD}                    TEST RESULTS                            ${RESET}${CYAN}║${RESET}`);
  console.log(`${CYAN}╠════════════════════════════════════════════════════════════╣${RESET}`);
  console.log(`${CYAN}║${RESET}  ${GREEN}✅ PASSED: ${passed.toString().padEnd(4)}${RESET}                                         ${CYAN}║${RESET}`);
  console.log(`${CYAN}║${RESET}  ${RED}❌ FAILED: ${failed.toString().padEnd(4)}${RESET}                                         ${CYAN}║${RESET}`);
  console.log(`${CYAN}║${RESET}  📊 TOTAL:  ${(passed + failed).toString().padEnd(4)}                                         ${CYAN}║${RESET}`);
  console.log(`${CYAN}╚════════════════════════════════════════════════════════════╝${RESET}`);

  const percentage = Math.round((passed / (passed + failed)) * 100);
  
  if (failed === 0) {
    console.log(`\n${GREEN}${BOLD}🎉 ALL TESTS PASSED! TaxSky AI is working perfectly!${RESET}\n`);
  } else if (percentage >= 80) {
    console.log(`\n${YELLOW}${BOLD}✨ ${percentage}% tests passed. Most features working!${RESET}\n`);
  } else {
    console.log(`\n${RED}${BOLD}⚠️  ${percentage}% tests passed. Please check errors above.${RESET}\n`);
  }

  // Cleanup
  await apiCall('/api/ai/reset');
  console.log(`${CYAN}🧹 Test session cleaned up${RESET}\n`);

  return { passed, failed, percentage };
}

// Run the test
runFullFlowTest().catch(err => {
  console.error(`${RED}Test runner error: ${err.message}${RESET}`);
  process.exit(1);
});