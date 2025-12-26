// ============================================================
// RAG SERVICE v2.2 - FIXED SHORT ANSWER DETECTION
// ============================================================

import OpenAI from "openai";
import mongoose from "mongoose";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ============================================================
// DETECT TAX YEAR FROM QUESTION
// ============================================================
function detectTaxYear(query) {
  const q = query.toLowerCase();
  
  if (q.includes('2025')) return 2025;
  if (q.includes('2024')) return 2024;
  if (q.includes('this year')) return 2025;
  if (q.includes('last year')) return 2024;
  if (q.includes('next year')) return 2025;
  
  return 2024;
}

// ============================================================
// SMART SEARCH - Better relevance + Tax Year
// ============================================================
export async function searchDocuments(query, options = {}) {
  const { limit = 5 } = options;
  
  const taxYear = detectTaxYear(query);
  
  console.log("[RAG] Searching for:", query);
  console.log("[RAG] Tax Year:", taxYear);
  
  const cleanQuery = query.toLowerCase().replace(/[?.,!;:'"]/g, '').trim();
  
  const skipWords = [
    'what', 'is', 'the', 'a', 'an', 'for', 'how', 'much', 'can', 'i', 
    'do', 'does', 'are', 'my', 'in', 'to', 'of', 'and', 'or', 'about', 
    'tell', 'me', 'explain', 'get', 'there', 'when', 'where', 'why',
    'long', 'until', 'options'
  ];
  
  let words = cleanQuery.split(/\s+/).filter(w => w.length > 2 && !skipWords.includes(w));
  
  const keepTaxPhrases = ['tax credit', 'tax bracket', 'tax rate', 'tax deduction', 'tax deadline'];
  const hasTaxPhrase = keepTaxPhrases.some(p => cleanQuery.includes(p));
  if (!hasTaxPhrase) {
    words = words.filter(w => w !== 'tax' && w !== 'taxes');
  }
  
  if (words.length > 1) {
    words = words.filter(w => w !== '2024');
  }
  
  console.log("[RAG] Search words:", words);
  
  if (words.length === 0) {
    console.log("[RAG] No search words after filtering");
    return [];
  }
  
  try {
    if (mongoose.connection.readyState !== 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    const db = mongoose.connection.db;
    if (!db) {
      console.log("[RAG] ERROR: No database connection");
      return [];
    }
    
    const allDocs = await db.collection('taxknowledges')
      .find({ isActive: true })
      .toArray();
    
    const scoredDocs = allDocs.map(doc => {
      let score = 0;
      const topicLower = (doc.topic || '').toLowerCase();
      const contentLower = (doc.content || '').toLowerCase();
      const docIdLower = (doc.docId || '').toLowerCase();
      
      if (doc.taxYear === taxYear) {
        score += 200;
      }
      
      for (const word of words) {
        if (docIdLower.includes(word)) score += 50;
        if (topicLower.includes(word)) score += 30;
        if (contentLower.includes(word)) score += 10;
        
        if (words.length >= 2) {
          const phrase = words.join(' ');
          if (topicLower.includes(phrase)) score += 50;
          if (contentLower.includes(phrase)) score += 20;
        }
      }
      
      return { ...doc, score };
    });
    
    const results = scoredDocs
      .filter(d => d.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    
    console.log("[RAG] Found:", results.length, "documents");
    if (results.length > 0) {
      console.log("[RAG] Top docs:", results.map(r => `${r.docId} (${r.score})`));
    }
    
    return results;
    
  } catch (error) {
    console.error("[RAG] Search error:", error.message);
    return [];
  }
}

// ============================================================
// ANSWER WITH RAG
// ============================================================
export async function answerWithRAG(question, options = {}) {
  const taxYear = detectTaxYear(question);
  
  console.log("\n[RAG] ========================================");
  console.log("[RAG] Question:", question);
  console.log("[RAG] Tax Year:", taxYear);
  
  const docs = await searchDocuments(question, { limit: 3 });
  
  if (!docs || docs.length === 0) {
    console.log("[RAG] No documents found - using GPT knowledge");
    
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are TaxSky AI, a helpful tax assistant for ${taxYear} US taxes. 
Answer tax questions accurately. If unsure about specific numbers, recommend IRS.gov.`
          },
          { role: "user", content: question }
        ],
        temperature: 0.3,
        max_tokens: 500
      });
      
      return {
        answer: response.choices[0].message.content,
        sources: ["General Tax Knowledge"],
        docsUsed: 0,
        taxYear
      };
    } catch (err) {
      return {
        answer: "I couldn't find specific information. Please check IRS.gov.",
        sources: [],
        docsUsed: 0,
        taxYear
      };
    }
  }
  
  const context = docs
    .map(d => `[Source: ${d.source}]\n${d.content}`)
    .join("\n\n---\n\n");
  
  console.log("[RAG] Using", docs.length, "documents");
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are TaxSky AI, a tax assistant for ${taxYear} US taxes.

Answer using ONLY the information below:

${context}

RULES:
1. Use ONLY the information provided above
2. Cite the source (e.g., "According to IRS Publication 972...")
3. Be specific with dollar amounts and percentages
4. Keep answers clear and helpful
5. If info doesn't fully answer, say what you know`
      },
      { role: "user", content: question }
    ],
    temperature: 0.2,
    max_tokens: 600
  });
  
  const answer = response.choices[0].message.content;
  const sources = [...new Set(docs.map(d => d.source))];
  
  console.log("[RAG] Answer generated");
  
  return {
    answer,
    sources,
    docsUsed: docs.length,
    taxYear
  };
}

// ============================================================
// TAX QUESTION DETECTION v2.3 - FIXED "I WANT TO" DETECTION
// ============================================================
export function isTaxQuestion(message) {
  const msg = message.toLowerCase().trim();
  
  // ============================================================
  // STEP 1: EXCLUDE SHORT ANSWERS (MOST IMPORTANT!)
  // These are interview responses, NOT tax questions
  // ============================================================
  
  // Exact match exclusions (user providing data, not asking questions)
  const exactExclusions = [
    // Filing status answers
    'single',
    'married',
    'jointly',
    'separately',
    'mfj',
    'mfs',
    'hoh',
    'married filing jointly',
    'married filing separately',
    'head of household',
    // Yes/No answers
    'yes',
    'no',
    'yep',
    'nope',
    'yeah',
    'nah',
    'ok',
    'okay',
    'correct',
    'right',
    'skip',
    'later',
    'none',
    // Numbers
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
    'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'zero'
  ];
  
  // Check exact match
  if (exactExclusions.includes(msg)) {
    console.log("[RAG] isTaxQuestion: FALSE (exact exclusion match)");
    return false;
  }
  
  // Pattern-based exclusions
  const exclusionPatterns = [
    // Filing status variations
    /^(i am |i'm |im )?(single|married|divorced|widowed)$/i,
    /^married\s*(filing\s*)?(jointly|separately)?$/i,
    /^head\s*(of\s*)?(household|house)?$/i,
    // Dependent answers
    /^\d+\s*(kids?|children|dependents?)?$/i,
    /^(i have |we have )?\d+\s*(kids?|children|dependents?)$/i,
    /^(no|yes)\s*(kids?|children|dependents?)?$/i,
    // Names (2-4 words, letters/spaces only, but NOT if contains tax keywords)
    // SSN patterns
    /^\d{3}-?\d{2}-?\d{4}$/,
    /^\d{9}$/,
    // State codes (exactly 2 letters)
    /^[a-z]{2}$/i,
    // ZIP codes
    /^\d{5}(-?\d{4})?$/,
    // Addresses (start with number + street)
    /^\d+\s+[a-z]+.*?(st|street|ave|avenue|rd|road|dr|drive|ln|lane|blvd|way|ct|court)/i,
  ];
  
  // Check pattern exclusions
  for (const pattern of exclusionPatterns) {
    if (pattern.test(msg)) {
      console.log("[RAG] isTaxQuestion: FALSE (pattern exclusion)");
      return false;
    }
  }
  
  // Short messages that are likely names (2-4 words, no tax keywords)
  const wordCount = msg.split(/\s+/).length;
  const taxRelatedWords = ['tax', 'taxes', 'file', 'filing', 'refund', 'deduct', 'credit', 'irs', 'income', 'w2', 'w-2', '1099'];
  const hasTaxWord = taxRelatedWords.some(w => msg.includes(w));
  
  if (wordCount <= 4 && !msg.includes('?') && !hasTaxWord && /^[a-z\s]+$/i.test(msg)) {
    console.log("[RAG] isTaxQuestion: FALSE (likely a name)");
    return false;
  }
  
  // Short messages without "?" are likely data, not questions
  if (wordCount <= 5 && !msg.includes('?') && !hasTaxWord) {
    // Check if it contains ONLY status-related words
    const statusWords = ['single', 'married', 'filing', 'jointly', 'separately', 'head', 'household'];
    const msgWords = msg.split(/\s+/);
    const allStatusWords = msgWords.every(w => statusWords.includes(w) || w.length <= 2);
    if (allStatusWords) {
      console.log("[RAG] isTaxQuestion: FALSE (short status answer)");
      return false;
    }
  }
  
  // ============================================================
  // STEP 2: Now check if it's actually a tax QUESTION or REQUEST
  // ============================================================
  
  // Intent patterns - "I want to", "I need to", "Help me", etc.
  const intentPatterns = [
    /i (want|need|would like|trying|have) to (file|do|complete|submit|prepare)/i,
    /help me (file|with|do|complete|prepare|understand)/i,
    /file (my|our|the) (tax|taxes|return)/i,
    /do (my|our) (tax|taxes|return)/i,
    /prepare (my|our) (tax|taxes|return)/i,
    /(start|begin|let's|lets) (filing|file|do|prepare)/i,
    /ready to file/i,
  ];
  
  if (intentPatterns.some(p => p.test(msg))) {
    // But exclude if it's just confirming W-2 upload
    if (msg.includes('w-2 uploaded') || msg.includes('is this information correct')) {
      console.log("[RAG] isTaxQuestion: FALSE (W-2 confirmation message)");
      return false;
    }
    console.log("[RAG] isTaxQuestion: TRUE (intent pattern - user wants to do something tax-related)");
    return true;
  }
  
  const questionPatterns = [
    /\?$/,
    /^(what|how|can|do|does|is|are|should|when|where|why|tell|explain)/i,
    /how (much|many|do|does|to|can)/i,
    /what (is|are|does|do|can)/i,
    /can i (deduct|claim|get|file)/i,
    /am i (eligible|able|allowed)/i,
    /do i (need|have|qualify)/i
  ];
  
  // Strong tax keywords - BUT only if message is long enough to be a question
  const strongTaxKeywords = [
    'standard deduction', 'child tax credit', 'ctc', 'eitc', 'earned income credit',
    'tax bracket', 'tax rate', 'marginal rate',
    'schedule c', 'schedule a', 'schedule se',
    'capital gains', 'capital loss',
    'agi', 'adjusted gross income', 'magi',
    'roth ira', '401k', '401(k)', 'ira contribution',
    'itemize', 'itemized deduction',
    'quarterly tax', 'estimated tax', 'tax deadline',
    'w-2 form', 'w2 form', '1099-int', '1099-nec', '1099-div', '1099-b',
    'form 1040', 'form 4868',
    'dependent care credit', 'child care credit',
    'home office deduction', 'business expense',
    'social security tax', 'medicare tax', 'self employment tax',
    'caleitc', 'yctc', 'california tax credit',
    'state tax refund', 'federal tax refund'
  ];
  
  // Only check strong keywords if message is likely a question (6+ words or has ?)
  if (wordCount >= 6 || msg.includes('?')) {
    const hasStrongKeyword = strongTaxKeywords.some(k => msg.includes(k));
    if (hasStrongKeyword) {
      console.log("[RAG] isTaxQuestion: TRUE (strong keyword in question)");
      return true;
    }
  }
  
  // Regular tax keywords (need question pattern)
  const regularTaxKeywords = [
    'tax', 'taxes', 'deduct', 'deduction', 'credit', 'refund', 
    'irs', 'income', 'bracket',
    'withhold', 'withholding', 'exemption',
    'mortgage', 'interest', 'charity', 'charitable',
    'expense', 'business', 'freelance', 'contractor',
    'dividend', 'stock', 'investment'
  ];
  
  // Check for question pattern + regular keyword
  const isQuestion = questionPatterns.some(p => p.test(msg));
  const hasRegularKeyword = regularTaxKeywords.some(k => msg.includes(k));
  
  if (isQuestion && hasRegularKeyword) {
    console.log("[RAG] isTaxQuestion: TRUE (question + keyword)");
    return true;
  }
  
  // Comparative questions
  const comparativePatterns = [
    /difference between.*and/i,
    /compare.*to/i,
    /vs\.?|versus/i,
    /which is better/i,
    /should i.*or/i,
    /changed.*from.*to/i,
    /what('s| is) new in/i
  ];
  
  const isComparative = comparativePatterns.some(p => p.test(msg));
  if (isComparative && hasRegularKeyword) {
    console.log("[RAG] isTaxQuestion: TRUE (comparative)");
    return true;
  }
  
  // "How to" patterns
  const howToPatterns = [
    /how to (file|claim|deduct|report|calculate)/i,
    /can i (deduct|claim|file|report|get)/i,
    /do i (need|have|qualify|report)/i,
    /where (do|can|should) i/i,
    /when (do|can|should|is) (i|the)/i
  ];
  
  if (howToPatterns.some(p => p.test(msg))) {
    console.log("[RAG] isTaxQuestion: TRUE (how-to pattern)");
    return true;
  }
  
  console.log("[RAG] isTaxQuestion: FALSE");
  return false;
}

// ============================================================
// DETECT IF USER IS TALKING ABOUT INCOME
// ============================================================
export function isIncomeStatement(message) {
  const msg = message.toLowerCase();
  
  const incomePatterns = [
    /i (have|had|got|received|made|earned)/,
    /my (income|wages|salary|earnings)/,
    /(stock|dividend|interest|rental|business|freelance|side) (income|money|earnings)/,
    /\$[\d,]+/,
    /(\d+k|\d+,\d{3})/
  ];
  
  const incomeKeywords = [
    'income', 'wages', 'salary', 'earnings', 'money',
    'stock', 'dividend', 'interest', 'rental', 'business',
    'freelance', 'side job', 'gig', 'crypto', 'bitcoin',
    '1099', 'w-2', 'w2', 'bonus', 'commission', 'tips'
  ];
  
  const hasIncomePattern = incomePatterns.some(p => p.test(msg));
  const hasIncomeKeyword = incomeKeywords.some(k => msg.includes(k));
  
  return hasIncomePattern || hasIncomeKeyword;
}

// ============================================================
// EXPORT
// ============================================================
export async function seedTaxKnowledge() {
  console.log("[RAG] Run 'node seed-ai-tax.js' to seed database");
}

export default {
  searchDocuments,
  answerWithRAG,
  isTaxQuestion,
  isIncomeStatement,
  seedTaxKnowledge
};