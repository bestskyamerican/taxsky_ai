/**
 * ============================================================
 * TaxSky Smart AI Controller
 * Version: 14.0 - COMPLETE FIX
 * ============================================================
 * 
 * FIXES from v13.2:
 * - ✅ FIX #1: Track interview STATE (whose data we're collecting)
 * - ✅ FIX #2: Better spouse detection using state + patterns
 * - ✅ FIX #3: W-2 wages now detected with more patterns
 * - ✅ FIX #4: Python API URL fixed for production
 * - ✅ FIX #5: Add status: 'complete' to webhook call
 * - ✅ FIX #6: Multiple W-2 support (accumulate wages)
 * 
 * ============================================================
 */

import TaxSession from '../models/TaxSession.js';

// ============================================================
// CONFIG - ✅ FIX #4: Use environment variable or production URL
// ============================================================
const CONFIG = {
  model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
  promptId: process.env.OPENAI_PROMPT_ID || 'pmpt_6959ca4bb4c08194ae6c2011952c7bce06d67339e52d2b77',
  promptVersion: process.env.OPENAI_PROMPT_VERSION || '23',
  maxTokens: 1500,
  temperature: 0.7,
  // ✅ FIX: Default to production URL
  pythonApiUrl: process.env.PYTHON_API_URL || 'https://taxskyai.com/python'
};

// ============================================================
// STATE ABBREVIATIONS
// ============================================================
const STATE_MAP = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
  'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
  'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
  'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
  'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
  'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
  'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
  'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
  'wisconsin': 'WI', 'wyoming': 'WY'
};

const STATE_ABBR_TO_NAME = Object.fromEntries(
  Object.entries(STATE_MAP).map(([name, abbr]) => [abbr, name])
);

// ============================================================
// HELPER: Get or Create Session
// ============================================================
async function getOrCreateSession(userId, taxYear = 2025) {
  if (!userId || userId === 'undefined' || userId === 'null' || userId === '') {
    throw new Error(`Invalid userId: "${userId}"`);
  }
  
  const year = parseInt(taxYear) || 2025;
  let session = await TaxSession.findOne({ userId, taxYear: year });
  
  if (!session) {
    session = new TaxSession({
      userId,
      taxYear: year,
      messages: [],
      answers: new Map(),
      status: 'in_progress'
    });
    await session.save();
    console.log(`✅ Created new session for ${userId}, year ${year}`);
  }
  
  return session;
}

// ============================================================
// HELPER: Get/Set Answer
// ============================================================
function getAnswer(session, key) {
  if (session.answers instanceof Map) {
    return session.answers.get(key);
  }
  return session.answers?.[key];
}

function setAnswer(session, key, value) {
  if (session.answers instanceof Map) {
    session.answers.set(key, value);
  } else {
    if (!session.answers) session.answers = {};
    session.answers[key] = value;
  }
  console.log(`💾 Saved: ${key} = ${JSON.stringify(value)}`);
}

// ============================================================
// HELPER: Check Yes/No
// ============================================================
function isYes(text) {
  if (!text) return false;
  const lower = text.toLowerCase().trim();
  const yesWords = ['yes', 'yeah', 'yep', 'yup', 'sure', 'correct', 'ok', 'okay', 'y', 
                    'có', 'đúng', 'vâng', 'ừ', 'dạ', 'rồi', 'sí', 'si'];
  return yesWords.some(w => lower === w || lower.startsWith(w + ' ') || lower.startsWith(w + ','));
}

function isNo(text) {
  if (!text) return false;
  const lower = text.toLowerCase().trim();
  const noWords = ['no', 'nope', 'nah', 'n', 'không', 'ko', 'k', 'chưa', 'sai', '0', 'none'];
  return noWords.some(w => lower === w || lower.startsWith(w + ' ') || lower.startsWith(w + ','));
}

// ============================================================
// EXTRACT: Amount from text
// ============================================================
function extractAmount(text) {
  if (!text) return null;
  
  let cleaned = text.replace(/[$,]/g, '').trim();
  
  const isNegative = cleaned.includes('-') || text.toLowerCase().includes('loss');
  cleaned = cleaned.replace(/-/g, '');
  
  const justNumber = cleaned.match(/^(\d+)$/);
  if (justNumber) {
    const amount = parseFloat(justNumber[1]);
    return isNegative ? -amount : amount;
  }
  
  const withDecimal = cleaned.match(/^(\d+\.?\d*)$/);
  if (withDecimal) {
    const amount = parseFloat(withDecimal[1]);
    return isNegative ? -amount : amount;
  }
  
  const numbers = cleaned.match(/\b(\d{1,3}(?:,?\d{3})*(?:\.\d{2})?)\b/g);
  if (numbers && numbers.length === 1) {
    const amount = parseFloat(numbers[0].replace(/,/g, ''));
    return isNegative ? -amount : amount;
  }
  
  return null;
}

// ============================================================
// EXTRACT: Date from text
// ============================================================
function extractDate(text) {
  if (!text) return null;
  
  const pattern1 = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/;
  const match1 = text.match(pattern1);
  if (match1) {
    return `${match1[1].padStart(2, '0')}/${match1[2].padStart(2, '0')}/${match1[3]}`;
  }
  
  const months = ['january', 'february', 'march', 'april', 'may', 'june', 
                  'july', 'august', 'september', 'october', 'november', 'december'];
  const pattern2 = new RegExp(`(${months.join('|')})\\s+(\\d{1,2}),?\\s+(\\d{4})`, 'i');
  const match2 = text.match(pattern2);
  if (match2) {
    const monthNum = months.indexOf(match2[1].toLowerCase()) + 1;
    return `${String(monthNum).padStart(2, '0')}/${match2[2].padStart(2, '0')}/${match2[3]}`;
  }
  
  return null;
}

// ============================================================
// EXTRACT: State from text
// ============================================================
function extractState(text) {
  if (!text) return null;
  
  const cleaned = text.trim();
  
  if (/^[A-Za-z]{2}$/.test(cleaned)) {
    const upper = cleaned.toUpperCase();
    if (STATE_ABBR_TO_NAME[upper]) {
      return upper;
    }
  }
  
  const lower = cleaned.toLowerCase();
  if (STATE_MAP[lower]) {
    return STATE_MAP[lower];
  }
  
  for (const [name, abbr] of Object.entries(STATE_MAP)) {
    if (lower.includes(name)) {
      return abbr;
    }
  }
  
  return null;
}

// ============================================================
// EXTRACT: Filing Status from text
// ============================================================
function extractFilingStatus(text) {
  if (!text) return null;
  
  const lower = text.toLowerCase();
  
  if (lower.includes('married filing jointly') || lower.includes('jointly') || 
      lower.includes('mfj') || lower.includes('vợ chồng khai chung')) {
    return 'married_filing_jointly';
  }
  if (lower.includes('married filing separately') || lower.includes('separately') ||
      lower.includes('mfs') || lower.includes('vợ chồng khai riêng')) {
    return 'married_filing_separately';
  }
  if (lower.includes('head of household') || lower.includes('hoh') || lower.includes('chủ hộ')) {
    return 'head_of_household';
  }
  if (lower.includes('single') || lower.includes('độc thân')) {
    return 'single';
  }
  if (lower.includes('qualifying') || lower.includes('surviving spouse')) {
    return 'qualifying_surviving_spouse';
  }
  
  return null;
}

// ============================================================
// CALCULATE: Age from DOB
// ============================================================
function calculateAge(dob) {
  if (!dob) return null;
  
  if (dob.includes('/')) {
    const parts = dob.split('/');
    const year = parseInt(parts[2]);
    return 2025 - year;
  }
  
  return null;
}

// ============================================================
// GET: Previous User Message (the actual data, not yes/no)
// ============================================================
function getPreviousDataMessage(session) {
  const messages = session.messages || [];
  
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.sender === 'user') {
      const text = msg.text.trim();
      if (!isYes(text) && !isNo(text) && text.length > 0) {
        return text;
      }
    }
  }
  
  return null;
}

// ============================================================
// ✅ FIX #1: GET CURRENT DATA OWNER (Track interview state)
// ============================================================
function getCurrentDataOwner(session) {
  const messages = session.messages || [];
  const spouseName = getAnswer(session, 'spouse_name') || '';
  const spouseNameLower = spouseName.toLowerCase();
  const spouseFirstName = spouseName.split(/\s+/)[0]?.toLowerCase() || '';
  
  // Look at last 8 AI messages for context
  for (let i = messages.length - 1; i >= Math.max(0, messages.length - 8); i--) {
    const msg = messages[i];
    if (msg.sender === 'assistant') {
      const text = (msg.text || '').toLowerCase();
      
      // Check if we're collecting spouse's income
      if (
        text.includes("spouse's income") ||
        text.includes("spouse's w-2") ||
        text.includes("now let's collect") && (
          text.includes("spouse") || 
          (spouseNameLower && text.includes(spouseNameLower)) ||
          (spouseFirstName && text.includes(spouseFirstName))
        ) ||
        text.includes("does your spouse have") ||
        (spouseNameLower && text.includes(`${spouseNameLower}'s income`)) ||
        (spouseNameLower && text.includes(`${spouseNameLower}'s w-2`)) ||
        (spouseNameLower && text.includes(`what is ${spouseNameLower}'s`)) ||
        (spouseNameLower && text.includes(`does ${spouseNameLower} have`)) ||
        (spouseFirstName && text.includes(`${spouseFirstName}'s w-2`)) ||
        (spouseFirstName && text.includes(`${spouseFirstName}'s income`))
      ) {
        console.log(`   📍 Interview STATE: SPOUSE (found spouse context in recent message)`);
        return 'spouse';
      }
      
      // Check if we finished spouse and moved to adjustments
      if (text.includes("all w-2s collected") || 
          text.includes("now let's move to adjustments") ||
          text.includes("now let's talk about deductions") ||
          text.includes("do you have any ira")) {
        console.log(`   📍 Interview STATE: ADJUSTMENTS (both/taxpayer)`);
        return 'taxpayer'; // IRA/HSA questions default to taxpayer first
      }
      
      // Explicit taxpayer indicators  
      if (
        text.includes("your income") ||
        text.includes("your w-2") ||
        text.includes("do you have a w-2") ||
        text.includes("what is your")
      ) {
        console.log(`   📍 Interview STATE: TAXPAYER`);
        return 'taxpayer';
      }
    }
  }
  
  return 'taxpayer'; // Default
}

// ============================================================
// ✅ FIX #2: DETECT Is this spouse data? - IMPROVED
// ============================================================
function isSpouseData(session, savedPart) {
  const savedPartLower = savedPart.toLowerCase();
  const spouseName = getAnswer(session, 'spouse_name');
  
  // Check if explicitly "Your" (taxpayer) - return early
  const isExplicitlyYours = (
    (savedPartLower.includes('your ') || savedPartLower.includes('your updated')) && 
    !savedPartLower.includes("your spouse")
  );
  
  if (isExplicitlyYours) {
    console.log(`   🔍 isSpouseData: FALSE (explicitly 'your')`);
    return false;
  }
  
  // Patterns that indicate spouse data
  const spousePatterns = [
    /spouse\s+(birthday|name|w-2|wages|federal|state|ira|withheld|income)/i,
    /spouse's\s+(birthday|name|w-2|wages|federal|state|ira|withheld|income)/i,
    /their\s+(ira|traditional|w-2|wages|birthday|income)/i,
  ];
  
  // ✅ Add patterns for spouse name (both full name and first name)
  if (spouseName) {
    // Full name patterns: "Ha Do's", "Ha Do birthday"
    const fullNameEscaped = spouseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    spousePatterns.push(new RegExp(`${fullNameEscaped}'s`, 'i'));
    spousePatterns.push(new RegExp(`${fullNameEscaped}\\s+(birthday|w-2|wages|federal|state|ira|withheld|income)`, 'i'));
    
    // First name patterns: "Ha's", "Ha birthday"
    const firstName = spouseName.split(/\s+/)[0];
    if (firstName && firstName.length >= 2) {
      const firstNameEscaped = firstName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      spousePatterns.push(new RegExp(`\\b${firstNameEscaped}'s\\s+(birthday|w-2|wages|federal|state|ira|withheld|income|saved)`, 'i'));
      spousePatterns.push(new RegExp(`\\b${firstNameEscaped}'s\\s+`, 'i')); // Just "Ha's " is enough
      spousePatterns.push(new RegExp(`\\b${firstNameEscaped}\\s+(birthday|w-2|wages|federal|state|ira|withheld|income)`, 'i'));
    }
  }
  
  // Check all patterns
  for (const pattern of spousePatterns) {
    if (pattern.test(savedPart)) {
      console.log(`   🔍 isSpouseData: TRUE (pattern: ${pattern})`);
      return true;
    }
  }
  
  // ✅ FIX #1: Check interview STATE as fallback
  const currentOwner = getCurrentDataOwner(session);
  if (currentOwner === 'spouse') {
    console.log(`   🔍 isSpouseData: TRUE (interview state = spouse)`);
    return true;
  }
  
  console.log(`   🔍 isSpouseData: FALSE (no pattern, state=${currentOwner})`);
  return false;
}

// ============================================================
// PARSE AND SAVE: Main parser function - ✅ FIXED
// ============================================================
function parseAndSaveData(session, aiResponse, userMessage) {
  const aiLower = aiResponse.toLowerCase();
  
  // ─────────────────────────────────────────────────────────
  // ⚠️ CRITICAL: SKIP parsing if this is a SUMMARY message!
  // ─────────────────────────────────────────────────────────
  if (aiLower.includes("here's your complete summary") || 
      aiLower.includes("is everything correct") ||
      aiLower.includes("here is your complete summary") ||
      (aiResponse.includes('═══') && aiResponse.includes('PERSONAL INFORMATION'))) {
    console.log('⏭️ SUMMARY message detected - skipping field parsing to preserve data');
    return;
  }
  
  const hasSaved = aiLower.includes('saved') || aiResponse.includes('✅');
  if (!hasSaved) {
    console.log('⏭️ No "saved" indicator - skipping parse');
    return;
  }
  
  const dataMessage = getPreviousDataMessage(session);
  console.log(`📝 Data message: "${dataMessage}"`);
  
  // Split to isolate saved confirmation (not follow-up question)
  const savedPart = aiResponse.split(/\?|What is|What's|Now let's|Do you have|How much|Did you/i)[0];
  const savedPartLower = savedPart.toLowerCase();
  
  console.log(`🔍 Analyzing: "${savedPart.substring(0, 100)}..."`);
  
  const isSpouse = isSpouseData(session, savedPart);
  if (isSpouse) {
    console.log(`👫 Detected SPOUSE data`);
  } else {
    console.log(`👤 Detected TAXPAYER data`);
  }
  
  // ─────────────────────────────────────────────────────────
  // FILING STATUS
  // ─────────────────────────────────────────────────────────
  if (savedPartLower.includes('filing status saved')) {
    const status = extractFilingStatus(dataMessage) || extractFilingStatus(aiResponse);
    if (status) {
      setAnswer(session, 'filing_status', status);
    }
  }
  
  // ─────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────
  if ((savedPartLower.includes('state saved') || savedPartLower.includes('state confirmed')) && 
      !savedPartLower.includes('withheld')) {
    const state = extractState(dataMessage);
    if (state) {
      setAnswer(session, 'state', state);
    }
  }
  
  // ─────────────────────────────────────────────────────────
  // SPOUSE NAME
  // ─────────────────────────────────────────────────────────
  if (savedPartLower.includes('spouse name saved') || 
      (savedPartLower.includes("got it!") && savedPartLower.includes('spouse'))) {
    if (dataMessage && !isYes(dataMessage) && !isNo(dataMessage) && dataMessage.length < 50) {
      setAnswer(session, 'spouse_name', dataMessage);
      console.log(`👫 Saved spouse name: ${dataMessage}`);
    }
  }
  
  // ─────────────────────────────────────────────────────────
  // BIRTHDAY
  // ─────────────────────────────────────────────────────────
  if (savedPartLower.includes('birthday saved') || savedPartLower.includes('updated birthday saved')) {
    const dob = extractDate(dataMessage);
    if (dob) {
      const age = calculateAge(dob);
      
      if (isSpouse) {
        setAnswer(session, 'spouse_dob', dob);
        if (age) {
          setAnswer(session, 'spouse_age', age);
          setAnswer(session, 'spouse_is_65_or_older', age >= 65);
          setAnswer(session, 'spouse_is_50_or_older', age >= 50);
        }
        console.log(`👫 Saved SPOUSE birthday: ${dob}, age: ${age}`);
      } else {
        setAnswer(session, 'taxpayer_dob', dob);
        if (age) {
          setAnswer(session, 'taxpayer_age', age);
          setAnswer(session, 'taxpayer_is_65_or_older', age >= 65);
          setAnswer(session, 'taxpayer_is_50_or_older', age >= 50);
        }
        console.log(`👤 Saved TAXPAYER birthday: ${dob}, age: ${age}`);
      }
    }
  }
  
  // ─────────────────────────────────────────────────────────
  // DEPENDENTS
  // ─────────────────────────────────────────────────────────
  if (savedPartLower.includes('dependent') && (savedPartLower.includes('saved') || savedPartLower.includes('noted'))) {
    if (savedPartLower.includes('none') || savedPartLower.includes('no dependent') || isNo(dataMessage)) {
      setAnswer(session, 'has_dependents', false);
      setAnswer(session, 'dependent_count', 0);
      setAnswer(session, 'children_under_17', 0);
      setAnswer(session, 'other_dependents', 0);
    } else {
      setAnswer(session, 'has_dependents', true);
    }
  }
  
  // Children under 17
  if (savedPartLower.includes('children') && savedPartLower.includes('saved')) {
    const amount = extractAmount(dataMessage);
    if (amount !== null) {
      setAnswer(session, 'children_under_17', amount);
    }
  }
  
  // Other dependents
  if (savedPartLower.includes('other dependent') && savedPartLower.includes('saved')) {
    const amount = extractAmount(dataMessage);
    if (amount !== null) {
      setAnswer(session, 'other_dependents', amount);
    }
  }
  
  // ─────────────────────────────────────────────────────────
  // ✅ FIX #3: W-2 WAGES - More patterns + accumulate multiple W-2s
  // ─────────────────────────────────────────────────────────
  const isW2Wages = savedPartLower.includes('w-2 wages saved') || 
                    savedPartLower.includes('wages saved') || 
                    savedPartLower.includes('w2 saved') ||
                    savedPartLower.includes('w-2 #') ||
                    (savedPartLower.includes('box 1') && savedPartLower.includes('saved'));
  
  if (isW2Wages) {
    const amount = extractAmount(dataMessage);
    if (amount !== null && amount > 0) {
      if (isSpouse) {
        // ✅ FIX #6: Accumulate for multiple W-2s
        const current = getAnswer(session, 'spouse_wages') || 0;
        const w2Count = (getAnswer(session, 'spouse_w2_count') || 0) + 1;
        setAnswer(session, 'spouse_wages', current + amount);
        setAnswer(session, 'spouse_w2_count', w2Count);
        console.log(`👫 Saved SPOUSE W-2 #${w2Count} wages: $${amount} (total: $${current + amount})`);
      } else {
        const current = getAnswer(session, 'taxpayer_wages') || 0;
        const w2Count = (getAnswer(session, 'taxpayer_w2_count') || 0) + 1;
        setAnswer(session, 'taxpayer_wages', current + amount);
        setAnswer(session, 'taxpayer_w2_count', w2Count);
        console.log(`👤 Saved TAXPAYER W-2 #${w2Count} wages: $${amount} (total: $${current + amount})`);
      }
    }
  }
  
  // ─────────────────────────────────────────────────────────
  // FEDERAL WITHHELD - ✅ FIX: Accumulate for multiple W-2s
  // ─────────────────────────────────────────────────────────
  if (savedPartLower.includes('federal') && savedPartLower.includes('withheld') && 
      (savedPartLower.includes('saved') || savedPartLower.includes('confirmed'))) {
    const amount = extractAmount(dataMessage);
    if (amount !== null) {
      if (isSpouse) {
        const current = getAnswer(session, 'spouse_federal_withheld') || 0;
        setAnswer(session, 'spouse_federal_withheld', current + amount);
        console.log(`👫 Saved SPOUSE federal withheld: $${amount} (total: $${current + amount})`);
      } else {
        const current = getAnswer(session, 'taxpayer_federal_withheld') || 0;
        setAnswer(session, 'taxpayer_federal_withheld', current + amount);
        console.log(`👤 Saved TAXPAYER federal withheld: $${amount} (total: $${current + amount})`);
      }
    }
  }
  
  // ─────────────────────────────────────────────────────────
  // STATE WITHHELD
  // ─────────────────────────────────────────────────────────
  if (savedPartLower.includes('state') && savedPartLower.includes('withheld') && 
      (savedPartLower.includes('saved') || savedPartLower.includes('confirmed'))) {
    const amount = extractAmount(dataMessage);
    if (amount !== null) {
      if (isSpouse) {
        const current = getAnswer(session, 'spouse_state_withheld') || 0;
        setAnswer(session, 'spouse_state_withheld', current + amount);
        console.log(`👫 Saved SPOUSE state withheld: $${amount}`);
      } else {
        const current = getAnswer(session, 'taxpayer_state_withheld') || 0;
        setAnswer(session, 'taxpayer_state_withheld', current + amount);
        console.log(`👤 Saved TAXPAYER state withheld: $${amount}`);
      }
    }
  }
  
  // ─────────────────────────────────────────────────────────
  // 1099-NEC / SCHEDULE C (Self-Employment)
  // ─────────────────────────────────────────────────────────
  if (savedPartLower.includes('1099-nec') && savedPartLower.includes('saved') ||
      savedPartLower.includes('self-employment') && savedPartLower.includes('saved') ||
      savedPartLower.includes('freelance') && savedPartLower.includes('saved')) {
    const amount = extractAmount(dataMessage);
    if (amount !== null && amount > 0) {
      const current = getAnswer(session, 'self_employment_income') || 0;
      setAnswer(session, 'self_employment_income', current + amount);
      console.log(`💼 Saved 1099-NEC: $${amount} (total: $${current + amount})`);
    }
  }
  
  // Business Expenses (Schedule C)
  if (savedPartLower.includes('business expense') && savedPartLower.includes('saved')) {
    const amount = extractAmount(dataMessage);
    if (amount !== null) {
      setAnswer(session, 'business_expenses', amount);
      
      const seIncome = getAnswer(session, 'self_employment_income') || 0;
      const net = seIncome - amount;
      setAnswer(session, 'schedule_c_net', net);
      
      if (net < 0) {
        setAnswer(session, 'has_business_loss', true);
        console.log(`📉 Business LOSS: $${Math.abs(net)}`);
      } else {
        setAnswer(session, 'has_business_loss', false);
        console.log(`📈 Business PROFIT: $${net}`);
      }
    }
  }
  
  // ─────────────────────────────────────────────────────────
  // 1099-INT (Interest)
  // ─────────────────────────────────────────────────────────
  if ((savedPartLower.includes('interest') && savedPartLower.includes('saved')) ||
      savedPartLower.includes('1099-int saved')) {
    const amount = extractAmount(dataMessage);
    if (amount !== null) {
      const current = getAnswer(session, 'interest_income') || 0;
      setAnswer(session, 'interest_income', current + amount);
      console.log(`🏦 Saved Interest: $${amount}`);
    }
  }
  
  // ─────────────────────────────────────────────────────────
  // 1099-DIV (Dividends)
  // ─────────────────────────────────────────────────────────
  if ((savedPartLower.includes('dividend') && savedPartLower.includes('saved')) ||
      savedPartLower.includes('1099-div saved')) {
    const amount = extractAmount(dataMessage);
    if (amount !== null) {
      if (savedPartLower.includes('qualified')) {
        const current = getAnswer(session, 'qualified_dividends') || 0;
        setAnswer(session, 'qualified_dividends', current + amount);
        console.log(`📈 Saved Qualified Dividends: $${amount}`);
      } else {
        const current = getAnswer(session, 'ordinary_dividends') || 0;
        setAnswer(session, 'ordinary_dividends', current + amount);
        console.log(`📈 Saved Ordinary Dividends: $${amount}`);
      }
    }
  }
  
  // ─────────────────────────────────────────────────────────
  // 1099-R (Retirement)
  // ─────────────────────────────────────────────────────────
  if ((savedPartLower.includes('retirement') && savedPartLower.includes('saved')) ||
      savedPartLower.includes('1099-r saved') ||
      savedPartLower.includes('distribution') && savedPartLower.includes('saved')) {
    const amount = extractAmount(dataMessage);
    if (amount !== null) {
      const current = getAnswer(session, 'retirement_income') || 0;
      setAnswer(session, 'retirement_income', current + amount);
      console.log(`🏦 Saved Retirement: $${amount}`);
    }
  }
  
  // ─────────────────────────────────────────────────────────
  // 1099-G (Unemployment)
  // ─────────────────────────────────────────────────────────
  if ((savedPartLower.includes('unemployment') && savedPartLower.includes('saved')) ||
      savedPartLower.includes('1099-g saved')) {
    const amount = extractAmount(dataMessage);
    if (amount !== null) {
      setAnswer(session, 'unemployment_income', amount);
      console.log(`📋 Saved Unemployment: $${amount}`);
    }
  }
  
  // ─────────────────────────────────────────────────────────
  // SSA-1099 (Social Security)
  // ─────────────────────────────────────────────────────────
  if ((savedPartLower.includes('social security') && savedPartLower.includes('saved')) ||
      savedPartLower.includes('ssa-1099 saved') ||
      savedPartLower.includes('ssa saved')) {
    const amount = extractAmount(dataMessage);
    if (amount !== null) {
      setAnswer(session, 'social_security', amount);
      console.log(`👴 Saved Social Security: $${amount}`);
    }
  }
  
  // ─────────────────────────────────────────────────────────
  // RENTAL INCOME (Schedule E)
  // ─────────────────────────────────────────────────────────
  if (savedPartLower.includes('rental income') && savedPartLower.includes('saved')) {
    const amount = extractAmount(dataMessage);
    if (amount !== null) {
      const current = getAnswer(session, 'rental_income') || 0;
      setAnswer(session, 'rental_income', current + amount);
      console.log(`🏠 Saved Rental Income: $${amount}`);
    }
  }
  
  if (savedPartLower.includes('rental expense') && savedPartLower.includes('saved')) {
    const amount = extractAmount(dataMessage);
    if (amount !== null) {
      setAnswer(session, 'rental_expenses', amount);
      
      const rentalIncome = getAnswer(session, 'rental_income') || 0;
      const net = rentalIncome - amount;
      setAnswer(session, 'rental_net', net);
      console.log(`🏠 Rental Net: $${net}`);
    }
  }
  
  // ─────────────────────────────────────────────────────────
  // CAPITAL GAINS/LOSSES (Schedule D)
  // ─────────────────────────────────────────────────────────
  if (savedPartLower.includes('capital gain') && savedPartLower.includes('saved')) {
    const amount = extractAmount(dataMessage);
    if (amount !== null) {
      setAnswer(session, 'capital_gains', amount);
      console.log(`📊 Saved Capital Gains: $${amount}`);
    }
  }
  
  if (savedPartLower.includes('capital loss') && savedPartLower.includes('saved')) {
    const amount = extractAmount(dataMessage);
    if (amount !== null) {
      setAnswer(session, 'capital_losses', amount);
      console.log(`📉 Saved Capital Losses: $${amount}`);
    }
  }
  
  // ─────────────────────────────────────────────────────────
  // CRYPTO INCOME
  // ─────────────────────────────────────────────────────────
  if (savedPartLower.includes('crypto') && savedPartLower.includes('saved')) {
    const amount = extractAmount(dataMessage);
    if (amount !== null) {
      setAnswer(session, 'crypto_income', amount);
      console.log(`🪙 Saved Crypto: $${amount}`);
    }
  }
  
  // ─────────────────────────────────────────────────────────
  // IRA CONTRIBUTIONS - ✅ FIXED
  // ─────────────────────────────────────────────────────────
  if (savedPartLower.includes('ira saved') || savedPartLower.includes('ira contribution saved') ||
      (savedPartLower.includes('ira') && savedPartLower.includes('saved'))) {
    const amount = extractAmount(dataMessage);
    if (amount !== null) {
      if (isSpouse) {
        setAnswer(session, 'spouse_ira', amount);
        console.log(`👫 Saved SPOUSE IRA: $${amount}`);
      } else {
        setAnswer(session, 'taxpayer_ira', amount);
        console.log(`👤 Saved TAXPAYER IRA: $${amount}`);
      }
    }
  }
  
  // ─────────────────────────────────────────────────────────
  // HSA
  // ─────────────────────────────────────────────────────────
  if (savedPartLower.includes('hsa saved') || savedPartLower.includes('health savings') && savedPartLower.includes('saved')) {
    const amount = extractAmount(dataMessage);
    if (amount !== null) {
      setAnswer(session, 'hsa', amount);
      console.log(`🏥 Saved HSA: $${amount}`);
    }
  }
  
  // ─────────────────────────────────────────────────────────
  // STUDENT LOAN INTEREST
  // ─────────────────────────────────────────────────────────
  if (savedPartLower.includes('student loan') && savedPartLower.includes('saved')) {
    const amount = extractAmount(dataMessage);
    if (amount !== null) {
      setAnswer(session, 'student_loan_interest', amount);
      console.log(`📚 Saved Student Loan Interest: $${amount}`);
    }
  }
  
  // ─────────────────────────────────────────────────────────
  // DEDUCTION TYPE
  // ─────────────────────────────────────────────────────────
  if (savedPartLower.includes('deduction') && savedPartLower.includes('saved')) {
    if (savedPartLower.includes('standard') || (dataMessage && dataMessage.toLowerCase().includes('standard'))) {
      setAnswer(session, 'deduction_type', 'standard');
    } else if (savedPartLower.includes('itemize') || (dataMessage && dataMessage.toLowerCase().includes('itemize'))) {
      setAnswer(session, 'deduction_type', 'itemized');
    }
  }
  
  // ─────────────────────────────────────────────────────────
  // ITEMIZED DEDUCTIONS
  // ─────────────────────────────────────────────────────────
  if (savedPartLower.includes('medical expense') && savedPartLower.includes('saved')) {
    const amount = extractAmount(dataMessage);
    if (amount !== null) {
      setAnswer(session, 'medical_expenses', amount);
    }
  }
  
  if (savedPartLower.includes('property tax') && savedPartLower.includes('saved')) {
    const amount = extractAmount(dataMessage);
    if (amount !== null) {
      setAnswer(session, 'property_tax', amount);
    }
  }
  
  if (savedPartLower.includes('mortgage') && savedPartLower.includes('saved')) {
    const amount = extractAmount(dataMessage);
    if (amount !== null) {
      setAnswer(session, 'mortgage_interest', amount);
    }
  }
  
  if ((savedPartLower.includes('charitable') || savedPartLower.includes('donation')) && savedPartLower.includes('saved')) {
    const amount = extractAmount(dataMessage);
    if (amount !== null) {
      setAnswer(session, 'charitable_donations', amount);
    }
  }
  
  // ─────────────────────────────────────────────────────────
  // ESTIMATED TAX PAYMENTS
  // ─────────────────────────────────────────────────────────
  if (savedPartLower.includes('estimated') && savedPartLower.includes('payment') && savedPartLower.includes('saved')) {
    const amount = extractAmount(dataMessage);
    if (amount !== null) {
      setAnswer(session, 'estimated_payments', amount);
    }
  }
}

// ============================================================
// GENERATE: Form 1040 from answers (simplified)
// ============================================================
function generateSimpleForm1040(session) {
  const answers = session.answers instanceof Map 
    ? Object.fromEntries(session.answers) 
    : (session.answers || {});
  
  const taxpayerWages = answers.taxpayer_wages || 0;
  const spouseWages = answers.spouse_wages || 0;
  const totalWages = taxpayerWages + spouseWages;
  
  const taxpayerFed = answers.taxpayer_federal_withheld || 0;
  const spouseFed = answers.spouse_federal_withheld || 0;
  const totalWithholding = taxpayerFed + spouseFed;
  
  const taxpayerIra = answers.taxpayer_ira || 0;
  const spouseIra = answers.spouse_ira || 0;
  const totalIra = taxpayerIra + spouseIra;
  
  const hsa = answers.hsa || 0;
  const studentLoan = answers.student_loan_interest || 0;
  
  const otherIncome = (answers.interest_income || 0) +
                      (answers.ordinary_dividends || 0) +
                      (answers.retirement_income || 0) +
                      (answers.unemployment_income || 0) +
                      (answers.social_security || 0) +
                      (answers.rental_net || 0) +
                      (answers.capital_gains || 0) +
                      (answers.crypto_income || 0) +
                      (answers.schedule_c_net || 0);
  
  const totalIncome = totalWages + otherIncome;
  const adjustments = totalIra + hsa + studentLoan;
  const agi = totalIncome - adjustments;
  
  // Standard deduction lookup (2025)
  const filingStatus = answers.filing_status || 'single';
  const deductionMap = {
    'single': 15000,
    'married_filing_jointly': 30000,
    'married_filing_separately': 15000,
    'head_of_household': 22500,
    'qualifying_surviving_spouse': 30000
  };
  
  const standardDeduction = deductionMap[filingStatus] || 15000;
  const taxableIncome = Math.max(0, agi - standardDeduction);
  
  return {
    header: {
      tax_year: 2025,
      state: answers.state || '',
      filing_status: filingStatus,
    },
    income: {
      line_1a_w2_wages: totalWages,
      line_1_wages: totalWages,
      line_2b_taxable_interest: answers.interest_income || 0,
      line_3a_qualified_dividends: answers.qualified_dividends || 0,
      line_3b_ordinary_dividends: answers.ordinary_dividends || 0,
      line_6a_social_security: answers.social_security || 0,
      line_7_capital_gain: answers.capital_gains || 0,
      line_9_total_income: totalIncome,
    },
    adjustments: {
      line_10_schedule_1_adjustments: adjustments,
      line_11_agi: agi
    },
    deductions: {
      line_12_deduction: standardDeduction,
      line_14_total_deductions: standardDeduction,
      line_15_taxable_income: taxableIncome
    },
    payments: {
      line_25a_w2_withholding: totalWithholding,
      line_25d_total_withholding: totalWithholding,
      line_26_estimated_payments: answers.estimated_payments || 0,
      line_33_total_payments: totalWithholding + (answers.estimated_payments || 0),
    },
    _income_details: {
      taxpayer_wages: taxpayerWages,
      spouse_wages: spouseWages,
      taxpayer_federal_withheld: taxpayerFed,
      spouse_federal_withheld: spouseFed,
      taxpayer_ira: taxpayerIra,
      spouse_ira: spouseIra,
    }
  };
}

// ============================================================
// GET SESSION STATUS INTERNAL
// ============================================================
function getSessionStatusInternal(session) {
  const answers = session.answers instanceof Map 
    ? Object.fromEntries(session.answers) 
    : (session.answers || {});
  
  const requiredFields = ['filing_status', 'state', 'taxpayer_dob'];
  const completedFields = requiredFields.filter(f => answers[f]);
  
  return {
    completionPercent: Math.round((completedFields.length / requiredFields.length) * 100),
    answers
  };
}

// ============================================================
// ✅ FIX #4 & #5: CALL PYTHON EXTRACTOR - Fixed URL + status
// ============================================================
async function callPythonExtractor(userId, taxYear) {
  try {
    console.log(`📤 Calling Python extractor for ${userId}...`);
    console.log(`   URL: ${CONFIG.pythonApiUrl}/api/extract/webhook/interview-complete`);
    
    const response = await fetch(`${CONFIG.pythonApiUrl}/api/extract/webhook/interview-complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        user_id: userId, 
        tax_year: taxYear,
        status: 'complete'  // ✅ FIX #5: Add status
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ Python extraction SUCCESS!`);
      console.log(`   Taxpayer wages: $${result.extracted?.taxpayer_wages || 0}`);
      console.log(`   Spouse wages: $${result.extracted?.spouse_wages || 0}`);
      console.log(`   Amount owed: $${result.tax_result?.amount_owed || 0}`);
    } else {
      console.log(`❌ Python extraction FAILED: ${result.error}`);
    }
    
    return result;
  } catch (error) {
    console.error(`❌ Python extractor error:`, error.message);
    return { success: false, error: error.message };
  }
}

// ============================================================
// MAIN HANDLER: handleSmartChat
// ============================================================
export async function handleSmartChat(req, res) {
  try {
    const { userId, message, taxYear = 2025 } = req.body;
    
    if (!userId || userId === 'undefined') {
      return res.status(400).json({ success: false, error: 'userId required' });
    }
    
    console.log(`\n${'='.repeat(50)}`);
    console.log(`💬 CHAT: ${userId}`);
    console.log(`📝 Message: "${message?.substring(0, 50)}..."`);
    console.log(`${'='.repeat(50)}`);
    
    const session = await getOrCreateSession(userId, taxYear);
    
    // Build conversation history for OpenAI
    const conversationHistory = (session.messages || []).map(m => ({
      role: m.sender === 'assistant' ? 'assistant' : 'user',
      content: m.text
    }));
    
    // Add new message
    conversationHistory.push({ role: 'user', content: message });
    
    // Call OpenAI
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: CONFIG.model,
        prompt: { id: CONFIG.promptId, version: CONFIG.promptVersion },
        input: conversationHistory,
        max_output_tokens: CONFIG.maxTokens,
        temperature: CONFIG.temperature
      })
    });
    
    const data = await response.json();
    
    let aiMessage = data.output_text || '';
    if (!aiMessage && data.output) {
      aiMessage = data.output
        .filter(i => i.type === 'message' && i.role === 'assistant')
        .map(i => i.content?.map(c => c.text).join(''))
        .join('');
    }
    
    if (!aiMessage) {
      console.error('❌ No AI response:', data);
      return res.status(500).json({ success: false, error: 'No AI response' });
    }
    
    // Save messages
    const now = new Date();
    session.messages.push(
      { sender: 'user', text: message, timestamp: now },
      { sender: 'assistant', text: aiMessage, timestamp: now }
    );
    
    // Parse and save data from AI response
    parseAndSaveData(session, aiMessage, message);
    
    // Check if interview complete
    const isComplete = aiMessage.toLowerCase().includes('everything correct') ||
                       aiMessage.toLowerCase().includes('is this correct');
    
    if (isComplete && aiMessage.includes('Great job')) {
      console.log(`🎉 Interview COMPLETE - triggering extraction`);
      
      // Generate simple form1040 from answers
      session.form1040 = generateSimpleForm1040(session);
      session.status = 'ready_for_review';
      session.markModified('form1040');
      
      // Trigger Python extractor asynchronously
      callPythonExtractor(userId, taxYear).catch(console.error);
    }
    
    session.updatedAt = now;
    session.markModified('messages');
    session.markModified('answers');
    await session.save();
    
    return res.json({
      success: true,
      message: aiMessage,
      sessionId: session._id,
      status: session.status
    });
    
  } catch (error) {
    console.error('❌ handleSmartChat error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// GET WELCOME MESSAGE
// ============================================================
export async function getSmartWelcome(req, res) {
  try {
    const { userId } = req.body;
    const taxYear = req.body.taxYear || 2025;
    
    if (!userId || userId === 'undefined') {
      return res.status(400).json({ success: false, error: 'userId required' });
    }
    
    const session = await getOrCreateSession(userId, taxYear);
    
    // Check if session has messages
    if (session.messages && session.messages.length > 0) {
      const lastMessage = session.messages[session.messages.length - 1];
      return res.json({
        success: true,
        message: lastMessage.text,
        sessionId: session._id,
        status: session.status,
        hasExistingSession: true,
        messageCount: session.messages.length
      });
    }
    
    // New session - get welcome message
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: CONFIG.model,
        prompt: { id: CONFIG.promptId, version: CONFIG.promptVersion },
        input: [{ role: 'user', content: 'hello' }],
        max_output_tokens: CONFIG.maxTokens,
        temperature: CONFIG.temperature
      })
    });
    
    const data = await response.json();
    let welcomeMessage = data.output_text || '';
    if (!welcomeMessage && data.output) {
      welcomeMessage = data.output
        .filter(i => i.type === 'message' && i.role === 'assistant')
        .map(i => i.content?.map(c => c.text).join(''))
        .join('');
    }
    
    const now = new Date();
    session.messages.push(
      { sender: 'user', text: 'hello', timestamp: now },
      { sender: 'assistant', text: welcomeMessage, timestamp: now }
    );
    session.updatedAt = now;
    session.markModified('messages');
    await session.save();
    
    return res.json({
      success: true,
      message: welcomeMessage,
      sessionId: session._id,
      status: session.status,
      hasExistingSession: false
    });
    
  } catch (error) {
    console.error('❌ getSmartWelcome error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// GET ALL DATA (for Dashboard)
// ============================================================
export async function getAllData(req, res) {
  try {
    const { userId } = req.params;
    const taxYear = parseInt(req.query.taxYear) || 2025;
    
    const session = await TaxSession.findOne({ userId, taxYear });
    
    if (!session) {
      return res.json({ success: false, error: 'Session not found' });
    }
    
    const answers = session.answers instanceof Map 
      ? Object.fromEntries(session.answers) 
      : (session.answers || {});
    
    return res.json({
      success: true,
      userId,
      taxYear,
      sessionId: session._id,
      status: session.status,
      answers,
      form1040: session.form1040,
      taxCalculation: session.taxCalculation,
      ragVerified: session.ragVerified,
      messages: session.messages,
      messageCount: (session.messages || []).length
    });
    
  } catch (error) {
    console.error('❌ getAllData error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// RESET SESSION
// ============================================================
export async function resetSession(req, res) {
  try {
    const { userId } = req.body;
    const taxYear = req.body.taxYear || 2025;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId required' });
    }
    
    await TaxSession.deleteOne({ userId, taxYear });
    console.log(`🗑️ Deleted session for ${userId}`);
    
    return res.json({ success: true, message: 'Session reset' });
    
  } catch (error) {
    console.error('❌ resetSession error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// SAVE SECURE DATA (from OCR)
// ============================================================
export async function saveSecureData(req, res) {
  try {
    const { userId, field, value, taxYear = 2025 } = req.body;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId required' });
    }
    
    const session = await getOrCreateSession(userId, taxYear);
    setAnswer(session, field, value);
    session.updatedAt = new Date();
    session.markModified('answers');
    await session.save();
    
    return res.json({ success: true, field, saved: true });
    
  } catch (error) {
    console.error('❌ saveSecureData error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// GET CHAT HISTORY
// ============================================================
export async function getChatHistory(req, res) {
  try {
    const { userId } = req.params;
    const taxYear = parseInt(req.query.taxYear) || 2025;
    
    const session = await TaxSession.findOne({ userId, taxYear });
    
    if (!session) {
      return res.json({ success: false, userId, taxYear, messages: [] });
    }
    
    const chatHistory = (session.messages || []).map((msg, index) => ({
      index,
      sender: msg.sender,
      text: msg.text,
      timestamp: msg.timestamp,
      formattedTime: new Date(msg.timestamp).toLocaleString()
    }));
    
    return res.json({
      success: true,
      userId,
      taxYear,
      sessionId: session._id,
      status: session.status,
      messageCount: chatHistory.length,
      messages: chatHistory
    });
    
  } catch (error) {
    console.error('❌ getChatHistory error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// UPDATE STATUS (from Python)
// ============================================================
export async function updateStatus(req, res) {
  try {
    const { userId } = req.params;
    const { status, form1040, taxCalculation, rag_verified, validation_errors } = req.body;
    const taxYear = req.body.taxYear || 2025;
    
    const session = await TaxSession.findOne({ userId, taxYear });
    
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    
    if (status) session.status = status;
    if (form1040) {
      session.form1040 = form1040;
      session.markModified('form1040');
    }
    if (taxCalculation) {
      session.taxCalculation = taxCalculation;
      session.markModified('taxCalculation');
    }
    if (rag_verified !== undefined) {
      session.ragVerified = rag_verified;
    }
    if (validation_errors) {
      session.extractionErrors = validation_errors;
    }
    
    session.updatedAt = new Date();
    await session.save();
    
    console.log(`✅ Updated ${userId}: status=${status}, ragVerified=${rag_verified}`);
    
    return res.json({ 
      success: true, 
      message: 'Status updated', 
      userId, 
      status: session.status,
      ragVerified: session.ragVerified
    });
    
  } catch (error) {
    console.error('❌ updateStatus error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// TRIGGER EXTRACTION
// ============================================================
export async function triggerExtraction(req, res) {
  try {
    const { userId } = req.params;
    const taxYear = parseInt(req.query.taxYear) || 2025;
    
    console.log(`\n🔄 Manual extraction for ${userId}`);
    
    const result = await callPythonExtractor(userId, taxYear);
    
    if (result.success) {
      const session = await TaxSession.findOne({ userId, taxYear });
      if (session) {
        session.status = 'ready_for_review';
        session.ragVerified = result.rag_verified;
        session.extractionErrors = result.errors || [];
        session.updatedAt = new Date();
        await session.save();
      }
    }
    
    return res.json({
      success: result.success,
      userId,
      taxYear,
      ragVerified: result.rag_verified,
      errors: result.errors,
      extracted: result.extracted,
      tax_result: result.tax_result
    });
    
  } catch (error) {
    console.error('❌ triggerExtraction error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// START FRESH SESSION
// ============================================================
export async function startFreshSession(req, res) {
  try {
    const { userId } = req.body;
    const taxYear = req.body.taxYear || 2025;
    
    if (!userId || userId === 'undefined') {
      return res.status(400).json({ success: false, error: 'userId required' });
    }
    
    console.log(`\n🔄 Fresh session for ${userId}`);
    
    await TaxSession.deleteOne({ userId, taxYear });
    
    const session = new TaxSession({
      userId,
      taxYear,
      messages: [],
      answers: new Map(),
      status: 'in_progress'
    });
    await session.save();
    
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: CONFIG.model,
        prompt: { id: CONFIG.promptId, version: CONFIG.promptVersion },
        input: [{ role: 'user', content: 'hello' }],
        max_output_tokens: CONFIG.maxTokens,
        temperature: CONFIG.temperature
      })
    });
    
    const data = await response.json();
    let welcomeMessage = data.output_text || '';
    if (!welcomeMessage && data.output) {
      welcomeMessage = data.output
        .filter(i => i.type === 'message' && i.role === 'assistant')
        .map(i => i.content?.map(c => c.text).join(''))
        .join('');
    }
    
    const now = new Date();
    session.messages.push(
      { sender: 'user', text: 'hello', timestamp: now },
      { sender: 'assistant', text: welcomeMessage, timestamp: now }
    );
    session.updatedAt = now;
    session.markModified('messages');
    await session.save();
    
    return res.json({
      success: true,
      message: welcomeMessage,
      sessionId: session._id,
      userId,
      taxYear,
      status: 'in_progress',
      isFreshStart: true
    });
    
  } catch (error) {
    console.error('❌ startFreshSession error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// GET SESSION STATUS
// ============================================================
export async function getSessionStatus(req, res) {
  try {
    const { userId } = req.params;
    const taxYear = parseInt(req.query.taxYear) || 2025;
    
    const session = await TaxSession.findOne({ userId, taxYear });
    
    if (!session) {
      return res.json({
        success: true,
        userId,
        taxYear,
        hasExistingSession: false,
        status: 'none',
        completionPercent: 0
      });
    }
    
    const status = getSessionStatusInternal(session);
    
    return res.json({
      success: true,
      userId,
      taxYear,
      sessionId: session._id,
      hasExistingSession: true,
      status: session.status,
      completionPercent: status.completionPercent,
      messageCount: (session.messages || []).length,
      hasForm1040: !!session.form1040,
      ragVerified: session.ragVerified || false,
      answers: status.answers
    });
    
  } catch (error) {
    console.error('❌ getSessionStatus error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export { updateStatus as updateFromPython };

export default {
  handleSmartChat,
  getSmartWelcome,
  getAllData,
  resetSession,
  saveSecureData,
  getChatHistory,
  updateStatus,
  updateFromPython: updateStatus,
  triggerExtraction,
  startFreshSession,
  getSessionStatus
};
