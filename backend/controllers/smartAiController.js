/**
 * ============================================================
 * TaxSky Smart AI Controller
 * Version: 16.0 - FIX: Federal tax computation + dependents
 * ============================================================
 * 
 * ✅ v16.0 FIX:
 *  - CRITICAL: Added federal tax bracket computation to manualRebuild()
 *    (was computing taxable_income but NEVER calculating actual tax!)
 *  - CRITICAL: Added CTC/ODC credit calculation for dependents
 *  - CRITICAL: Added refund/amount_owed calculation  
 *  - Fixed DEPENDENT_PATTERNS: added dependent_N_credit_type match
 *    (AI saves "dependent_1_credit_type" not "dependent_1_credit")
 *  - Fixed finalizeDependents: no longer requires first_name
 *    (dependent was silently dropped if AI didn't save a name)
 * 
 * ✅ v15.9 FIX:
 *  - Added taxpayer_ira, spouse_ira, hsa to specialFields
 *  - These fields can be capped/adjusted by AI, so validation
 *    was rejecting them when value didn't match user message
 *  - Added all adjustment fields to specialFields list
 * 
 * ✅ v15.8 LONG-TERM FIX:
 *  - ALWAYS rebuild totals after ANY save_data() call
 *  - Auto-rebuild when Dashboard reads data (getAllData)
 *  - checkIfRebuildNeeded() detects stale data:
 *    • Federal withheld mismatch between answers & totals
 *    • IRA not deducted when no 401(k)
 *    • Wages mismatch
 *  - This ensures tax calculations are ALWAYS correct!
 * 
 * ✅ v15.7 FIX:
 *  - Fixed IRA deduction not being applied (when no 401k)
 *  - Added proper IRA contribution limits ($7,000 / $8,000 for 50+)
 *  - IRA fully deductible if NO 401(k) (regardless of income)
 *  - IRA income limits only apply if HAS 401(k)
 * 
 * ✅ v15.6 FIX:
 *  - Fixed federal_withheld = 0 bug when page refreshed
 *  - manualRebuild aggregates W-2 data from answers
 * 
 * ============================================================
 */

import TaxSession from '../models/TaxSession.js';

// ============================================================
// CONFIG
// ============================================================
const CONFIG = {
  model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
  promptId: process.env.OPENAI_PROMPT_ID || 'pmpt_6959ca4bb4c08194ae6c2011952c7bce06d67339e52d2b77',
  promptVersion: process.env.OPENAI_PROMPT_VERSION || '36',
  maxTokens: 1500,
  temperature: 0.7,
  pythonApiUrl: process.env.PYTHON_API_URL || 'http://localhost:5002'
};

console.log(`📌 SmartAI v16.0 — Federal tax computation + dependents fix!`);

// ============================================================
// HELPER: Get or Create Session (ATOMIC)
// ============================================================
async function getOrCreateSession(userId, taxYear = 2025) {
  if (!userId || userId === 'undefined' || userId === 'null' || userId === '') {
    throw new Error(`Invalid userId: "${userId}"`);
  }
  
  const year = parseInt(taxYear) || 2025;
  
  const session = await TaxSession.findOneAndUpdate(
    { userId, taxYear: year },
    {
      $setOnInsert: {
        userId,
        taxYear: year,
        messages: [],
        answers: {},
        status: 'in_progress',
        createdAt: new Date()
      }
    },
    { 
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }
  );
  
  return session;
}

// ============================================================
// HELPER: Get/Set Answer (for simple fields + tracking)
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
  console.log(`   💾 ${key} = ${JSON.stringify(value)}`);
}

// ============================================================
// HELPER: Parse Date
// ============================================================
function parseDateToISO(dateStr) {
  if (!dateStr) return null;
  
  if (typeof dateStr === 'string' && dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [month, day, year] = parts;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
  }
  
  return null;
}

// ============================================================
// ✅ SMART PARSING: Extract save_data() calls
// ============================================================
function extractSaveDataCalls(aiResponse) {
  const calls = [];
  
  // Pattern: save_data("field", value) OR call save_data("field", value)
  const pattern = /(?:call\s+)?save_data\s*\(\s*["']([^"']+)["']\s*,\s*([^)]+)\)/gi;
  
  let match;
  while ((match = pattern.exec(aiResponse)) !== null) {
    const field = match[1].trim();
    let valueStr = match[2].trim();
    
    // Parse the value
    let value;
    
    // String with quotes
    if ((valueStr.startsWith('"') && valueStr.endsWith('"')) ||
        (valueStr.startsWith("'") && valueStr.endsWith("'"))) {
      value = valueStr.slice(1, -1);
    }
    // Boolean
    else if (valueStr === 'true') {
      value = true;
    }
    else if (valueStr === 'false') {
      value = false;
    }
    // Number
    else if (!isNaN(valueStr) && valueStr !== '') {
      value = parseFloat(valueStr);
    }
    // String without quotes
    else {
      value = valueStr.replace(/^["']|["']$/g, '');
    }
    
    calls.push({ field, value });
  }
  
  return calls;
}

// ============================================================
// ✅ v15.3: Smarter validation for save_data
// Allows abbreviations, calculated fields, and mapped values
// ============================================================
function validateSaveDataAgainstUserMessage(calls, userMessage) {
  if (!userMessage || calls.length === 0) return calls; // ✅ If no message, allow all
  
  const userMessageLower = userMessage.toLowerCase().trim();
  const validCalls = [];
  
  // ✅ Abbreviation mappings
  const abbreviations = {
    'mfj': 'married_filing_jointly',
    'mfs': 'married_filing_separately',
    'single': 'single',
    's': 'single',
    'hoh': 'head_of_household',
    'head of household': 'head_of_household',
    'married filing jointly': 'married_filing_jointly',
    'married filing separately': 'married_filing_separately',
    'married jointly': 'married_filing_jointly',
    'married separately': 'married_filing_separately',
    'jointly': 'married_filing_jointly',
    'y': true,
    'yes': true,
    'yeah': true,
    'yep': true,
    'sure': true,
    'correct': true,
    'n': false,
    'no': false,
    'nope': false,
    'none': false,
  };
  
  // ✅ Fields that are calculated (always allow)
  const calculatedFields = [
    'taxpayer_age', 'spouse_age', 
    'dependent_1_age', 'dependent_2_age', 'dependent_3_age',
    'dependent_1_credit_type', 'dependent_2_credit_type', 'dependent_3_credit_type',
    'dependent_count', 'taxpayer_w2_count', 'spouse_w2_count'
  ];
  
  // ✅ v15.8 FIX: Fields that don't need strict validation
  // These may be calculated/adjusted by AI (e.g., IRA capped to limit)
  const specialFields = [
    'interview_complete', 'deduction_type', 'has_dependents',
    'filing_status', 'language', 
    // 401(k) status
    'taxpayer_has_401k', 'spouse_has_401k',
    // IRA contributions (AI may cap to limit)
    'taxpayer_ira', 'spouse_ira',
    // HSA (AI may cap to limit)
    'hsa', 'hsa_contribution',
    // Adjustments
    'student_loan_interest',
    // OBBB fields
    'worked_overtime', 'overtime_pay',
    'bought_new_car', 'car_loan_interest', 'car_is_american',
    // Estimated payments
    'estimated_payments',
    // W-2 count
    'taxpayer_w2_count', 'spouse_w2_count'
  ];
  
  for (const call of calls) {
    const { field, value } = call;
    
    // Always allow calculated fields
    if (calculatedFields.includes(field)) {
      validCalls.push(call);
      console.log(`   ✅ Auto-allowed (calculated): save_data("${field}", ${JSON.stringify(value)})`);
      continue;
    }
    
    // Always allow special fields
    if (specialFields.includes(field)) {
      validCalls.push(call);
      console.log(`   ✅ Auto-allowed (special): save_data("${field}", ${JSON.stringify(value)})`);
      continue;
    }
    
    // Check if value appears in user message
    let isValid = false;
    
    // ✅ v15.4: Handle "none", "n/a", "0" for zero values
    const zeroWords = ['none', 'n/a', 'na', 'no', 'nope', '0', 'zero', 'nothing'];
    if (value === 0 && zeroWords.some(w => userMessageLower === w || userMessageLower.includes(w))) {
      isValid = true;
    }
    
    // Check abbreviations first
    const abbrevValue = abbreviations[userMessageLower];
    if (abbrevValue !== undefined) {
      if (abbrevValue === value || 
          (typeof abbrevValue === 'string' && value.toLowerCase().includes(abbrevValue))) {
        isValid = true;
      }
    }
    
    if (typeof value === 'number') {
      // For numbers, check if the number appears in user message
      const numStr = value.toString();
      const numWithCommas = value.toLocaleString();
      // Also check without commas
      const userMsgNoCommas = userMessage.replace(/,/g, '');
      if (userMessage.includes(numStr) || 
          userMessage.includes(numWithCommas) ||
          userMsgNoCommas.includes(numStr)) {
        isValid = true;
      }
    } else if (typeof value === 'string') {
      // For strings, check if value appears in user message (case insensitive)
      const valueLower = value.toLowerCase();
      if (userMessageLower.includes(valueLower)) {
        isValid = true;
      }
      // Also check if user message is contained in value (for abbreviations)
      if (valueLower.includes(userMessageLower) && userMessageLower.length >= 2) {
        isValid = true;
      }
      // Check for partial matches (e.g., "ha do" matches "Ha Do")
      const userWords = userMessageLower.split(/\s+/);
      const valueWords = valueLower.split(/[\s_]+/);
      const matchCount = userWords.filter(uw => valueWords.some(vw => vw.includes(uw) || uw.includes(vw))).length;
      if (matchCount >= userWords.length * 0.5 && userWords.length > 0) {
        isValid = true;
      }
    } else if (typeof value === 'boolean') {
      // For booleans, check for yes/no/true/false
      const yesWords = ['yes', 'yeah', 'yep', 'sure', 'correct', 'right', 'true', 'y', 'ok', 'okay'];
      const noWords = ['no', 'nope', 'none', 'false', 'n', '0', 'nah'];
      
      if (value === true && yesWords.some(w => userMessageLower === w || userMessageLower.startsWith(w + ' '))) {
        isValid = true;
      } else if (value === false && noWords.some(w => userMessageLower === w || userMessageLower.startsWith(w + ' '))) {
        isValid = true;
      }
    }
    
    if (isValid) {
      validCalls.push(call);
      console.log(`   ✅ Validated: save_data("${field}", ${JSON.stringify(value)})`);
    } else {
      console.log(`   ❌ Rejected (not in user message): save_data("${field}", ${JSON.stringify(value)})`);
    }
  }
  
  return validCalls;
}

// ============================================================
// ✅ FIELD MAPPING: Map GPT fields to TaxSession model
// ============================================================
const FIELD_MAPPING = {
  // Filing Status
  'filing_status': { target: 'filing_status', type: 'direct' },
  
  // State
  'state': { target: 'address.state', type: 'direct' },
  
  // Taxpayer Info
  'taxpayer_name': { target: 'taxpayer.name', type: 'name' },
  'taxpayer_dob': { target: 'taxpayer.dob', type: 'date' },
  'taxpayer_age': { target: 'taxpayer.age', type: 'direct' },
  
  // Spouse Info  
  'spouse_name': { target: 'spouse.name', type: 'name' },
  'spouse_dob': { target: 'spouse.dob', type: 'date' },
  'spouse_age': { target: 'spouse.age', type: 'direct' },
  
  // Dependents
  'has_dependents': { target: 'tracking.has_dependents', type: 'tracking' },
  'dependent_count': { target: 'tracking.dependent_count', type: 'tracking' },
  'child_care_expenses': { target: 'tracking.child_care_expenses', type: 'tracking' },
  
  // 401(k) tracking
  'taxpayer_has_401k': { target: 'tracking.taxpayer_has_401k', type: 'tracking' },
  'spouse_has_401k': { target: 'tracking.spouse_has_401k', type: 'tracking' },
  
  // Adjustments
  'taxpayer_ira': { target: 'adjustments.traditional_ira', type: 'adjustment' },
  'spouse_ira': { target: 'adjustments.spouse_traditional_ira', type: 'adjustment' },
  'hsa': { target: 'adjustments.hsa', type: 'adjustment' },
  'hsa_contribution': { target: 'adjustments.hsa', type: 'adjustment' },
  'student_loan_interest': { target: 'adjustments.student_loan_interest', type: 'adjustment' },
  
  // Deduction
  'deduction_type': { target: 'tracking.deduction_type', type: 'tracking' },
  
  // Payments
  'estimated_payments': { target: 'totals.estimated_payments', type: 'direct' },
  
  // Interview status
  'interview_complete': { target: 'tracking.interview_complete', type: 'tracking' }
};

// W-2 field patterns (dynamic matching)
const W2_FIELD_PATTERNS = [
  // Taxpayer W-2 patterns: taxpayer_w2_1_wages, taxpayer_w2_2_wages, etc.
  { pattern: /^taxpayer_w2_(\d+)_wages$/, owner: 'taxpayer', field: 'box_1_wages' },
  { pattern: /^taxpayer_w2_(\d+)_federal_withheld$/, owner: 'taxpayer', field: 'box_2_federal_withheld' },
  { pattern: /^taxpayer_w2_(\d+)_state$/, owner: 'taxpayer', field: 'box_15_state' },
  { pattern: /^taxpayer_w2_(\d+)_state_withheld$/, owner: 'taxpayer', field: 'box_17_state_withheld' },
  // Spouse W-2 patterns
  { pattern: /^spouse_w2_(\d+)_wages$/, owner: 'spouse', field: 'box_1_wages' },
  { pattern: /^spouse_w2_(\d+)_federal_withheld$/, owner: 'spouse', field: 'box_2_federal_withheld' },
  { pattern: /^spouse_w2_(\d+)_state$/, owner: 'spouse', field: 'box_15_state' },
  { pattern: /^spouse_w2_(\d+)_state_withheld$/, owner: 'spouse', field: 'box_17_state_withheld' },
  // Legacy patterns (for backward compatibility)
  { pattern: /^taxpayer_wages$/, owner: 'taxpayer', field: 'box_1_wages', index: 1 },
  { pattern: /^taxpayer_federal_withheld$/, owner: 'taxpayer', field: 'box_2_federal_withheld', index: 1 },
  { pattern: /^taxpayer_w2_state$/, owner: 'taxpayer', field: 'box_15_state', index: 1 },
  { pattern: /^taxpayer_state_withheld$/, owner: 'taxpayer', field: 'box_17_state_withheld', index: 1 },
  { pattern: /^spouse_wages$/, owner: 'spouse', field: 'box_1_wages', index: 1 },
  { pattern: /^spouse_federal_withheld$/, owner: 'spouse', field: 'box_2_federal_withheld', index: 1 },
  { pattern: /^spouse_w2_state$/, owner: 'spouse', field: 'box_15_state', index: 1 },
  { pattern: /^spouse_state_withheld$/, owner: 'spouse', field: 'box_17_state_withheld', index: 1 },
];

// Dependent field patterns
const DEPENDENT_PATTERNS = [
  { pattern: /^dependent_(\d+)_name$/, field: 'first_name' },
  { pattern: /^dependent_(\d+)_dob$/, field: 'dob' },
  { pattern: /^dependent_(\d+)_age$/, field: 'age' },
  { pattern: /^dependent_(\d+)_relationship$/, field: 'relationship' },
  { pattern: /^dependent_(\d+)_credit$/, field: 'credit_type' },
  // ✅ v16.0 FIX: AI saves "dependent_1_credit_type" not "dependent_1_credit"
  { pattern: /^dependent_(\d+)_credit_type$/, field: 'credit_type' },
];

// ============================================================
// ✅ PROCESS SAVE_DATA CALLS - Build objects for model
// ============================================================
function processSaveDataCalls(session, aiResponse, userMessage) {
  const allCalls = extractSaveDataCalls(aiResponse);
  
  if (allCalls.length === 0) {
    return;
  }
  
  console.log(`\n📦 Found ${allCalls.length} save_data() calls in response`);
  
  // ✅ v15.0: Validate calls against user message
  const calls = validateSaveDataAgainstUserMessage(allCalls, userMessage);
  
  if (calls.length === 0) {
    console.log(`   ⚠️ No valid save_data() calls (none matched user input)`);
    return;
  }
  
  console.log(`   ✅ Processing ${calls.length} validated save_data() calls:`);
  
  // Initialize W-2 storage if needed
  if (!session._pendingW2s) {
    session._pendingW2s = {
      taxpayer: {},
      spouse: {}
    };
  }
  
  // Initialize dependent storage if needed
  if (!session._pendingDependents) {
    session._pendingDependents = {};
  }
  
  for (const { field, value } of calls) {
    console.log(`   📝 Saving: "${field}" = ${JSON.stringify(value)}`);
    
    // Always save to answers for tracking/backup
    setAnswer(session, field, value);
    
    // Check for W-2 field patterns
    let w2Match = false;
    for (const wp of W2_FIELD_PATTERNS) {
      const match = field.match(wp.pattern);
      if (match) {
        const index = wp.index || parseInt(match[1]) || 1;
        const owner = wp.owner;
        const boxField = wp.field;
        
        if (!session._pendingW2s[owner][index]) {
          session._pendingW2s[owner][index] = { owner };
        }
        session._pendingW2s[owner][index][boxField] = value;
        console.log(`   📄 W-2 [${owner}][#${index}].${boxField} = ${value}`);
        w2Match = true;
        break;
      }
    }
    if (w2Match) continue;
    
    // Check for dependent field patterns
    let depMatch = false;
    for (const dp of DEPENDENT_PATTERNS) {
      const match = field.match(dp.pattern);
      if (match) {
        const index = parseInt(match[1]);
        if (!session._pendingDependents[index]) {
          session._pendingDependents[index] = {};
        }
        session._pendingDependents[index][dp.field] = value;
        console.log(`   👶 Dependent #${index}.${dp.field} = ${value}`);
        depMatch = true;
        break;
      }
    }
    if (depMatch) continue;
    
    // Check regular field mapping
    const mapping = FIELD_MAPPING[field];
    
    if (!mapping) {
      console.log(`   ℹ️ Field stored in answers: ${field}`);
      continue;
    }
    
    switch (mapping.type) {
      case 'direct':
        applyDirectField(session, mapping.target, value);
        break;
        
      case 'name':
        applyNameField(session, mapping.target, value);
        break;
        
      case 'date':
        applyDateField(session, mapping.target, value);
        break;
        
      case 'adjustment':
        // Stored in answers, will be processed when rebuilding
        break;
        
      case 'tracking':
        // Already saved to answers
        break;
    }
  }
  
  console.log(`✅ All validated save_data() processed\n`);
}

// ============================================================
// APPLY FIELD HELPERS
// ============================================================

function applyDirectField(session, target, value) {
  const parts = target.split('.');
  let obj = session;
  
  for (let i = 0; i < parts.length - 1; i++) {
    if (!obj[parts[i]]) obj[parts[i]] = {};
    obj = obj[parts[i]];
  }
  
  obj[parts[parts.length - 1]] = value;
  session.markModified(parts[0]);
}

function applyNameField(session, target, value) {
  const parts = target.split('.');
  const personKey = parts[0];
  
  const nameParts = value.split(/\s+/);
  session[personKey].first_name = nameParts[0] || '';
  session[personKey].last_name = nameParts.slice(1).join(' ') || '';
  session.markModified(personKey);
}

function applyDateField(session, target, value) {
  const parts = target.split('.');
  const personKey = parts[0];
  
  session[personKey].dob = parseDateToISO(value);
  session.markModified(personKey);
}

// ============================================================
// ✅ FINALIZE W-2s: Push pending W-2s to input_forms array
// ============================================================
function finalizeW2s(session) {
  console.log(`\n📄 FINALIZING W-2s...`);
  
  if (!session.input_forms) session.input_forms = { w2: [] };
  session.input_forms.w2 = [];
  
  const answers = session.answers instanceof Map 
    ? Object.fromEntries(session.answers) 
    : (session.answers || {});
  
  const state = answers.state || '';
  
  if (session._pendingW2s) {
    // Process taxpayer W-2s
    for (const [index, w2Data] of Object.entries(session._pendingW2s.taxpayer)) {
      if (w2Data.box_1_wages && w2Data.box_1_wages > 0) {
        const w2 = {
          owner: 'taxpayer',
          box_1_wages: w2Data.box_1_wages || 0,
          box_2_federal_withheld: w2Data.box_2_federal_withheld || 0,
          box_15_state: w2Data.box_15_state || state,
          box_17_state_withheld: w2Data.box_17_state_withheld || 0
        };
        session.input_forms.w2.push(w2);
        console.log(`   ✅ Taxpayer W-2 #${index}: $${w2.box_1_wages} wages, $${w2.box_2_federal_withheld} fed withheld`);
      }
    }
    
    // Process spouse W-2s
    for (const [index, w2Data] of Object.entries(session._pendingW2s.spouse)) {
      if (w2Data.box_1_wages && w2Data.box_1_wages > 0) {
        const w2 = {
          owner: 'spouse',
          box_1_wages: w2Data.box_1_wages || 0,
          box_2_federal_withheld: w2Data.box_2_federal_withheld || 0,
          box_15_state: w2Data.box_15_state || state,
          box_17_state_withheld: w2Data.box_17_state_withheld || 0
        };
        session.input_forms.w2.push(w2);
        console.log(`   ✅ Spouse W-2 #${index}: $${w2.box_1_wages} wages, $${w2.box_2_federal_withheld} fed withheld`);
      }
    }
  }
  
  session.markModified('input_forms.w2');
  console.log(`   📊 Total W-2s: ${session.input_forms.w2.length}`);
}

// ============================================================
// ✅ FINALIZE DEPENDENTS
// ============================================================
function finalizeDependents(session) {
  console.log(`\n👶 FINALIZING DEPENDENTS...`);
  
  if (!session._pendingDependents || Object.keys(session._pendingDependents).length === 0) {
    // ✅ v16.0 FIX: Also check answers for dependent data when _pendingDependents is empty
    const answers = session.answers instanceof Map 
      ? Object.fromEntries(session.answers) 
      : (session.answers || {});
    
    const depCount = parseInt(answers.dependent_count || 0);
    const hasDeps = answers.has_dependents === true || answers.has_dependents === 'true';
    
    if ((depCount > 0 || hasDeps) && (!session.dependents || session.dependents.length === 0)) {
      console.log(`   ⚠️ No _pendingDependents but answers say ${depCount} dependents - reading from answers`);
      session.dependents = [];
      const count = depCount || (hasDeps ? 1 : 0);
      
      for (let i = 1; i <= count; i++) {
        const depAge = answers[`dependent_${i}_age`];
        const depDob = answers[`dependent_${i}_dob`];
        const depName = answers[`dependent_${i}_name`] || '';
        const depRelationship = answers[`dependent_${i}_relationship`] || 'child';
        const depCreditType = answers[`dependent_${i}_credit_type`] || answers[`dependent_${i}_credit`] || '';
        
        if (depAge !== undefined || depDob) {
          const age = depAge !== undefined ? parseInt(depAge) : null;
          const dependent = {
            first_name: depName,
            dob: depDob ? parseDateToISO(depDob) : null,
            age: age,
            relationship: depRelationship,
            credit_type: depCreditType,
            qualifies_ctc: (age !== null && age < 17) || depCreditType === 'ctc',
            qualifies_odc: (age !== null && age >= 17) || depCreditType === 'odc'
          };
          session.dependents.push(dependent);
          console.log(`   ✅ Dependent #${i} from answers: Age ${age}, credit=${depCreditType}`);
        }
      }
      
      session.markModified('dependents');
      console.log(`   📊 Total Dependents: ${session.dependents.length}`);
      return;
    }
    
    console.log(`   ℹ️ No dependents to finalize`);
    return;
  }
  
  session.dependents = [];
  
  for (const [index, depData] of Object.entries(session._pendingDependents)) {
    // ✅ v16.0 FIX: Don't require first_name - accept any dependent with age, dob, or relationship
    if (depData.first_name || depData.age !== undefined || depData.dob || depData.relationship) {
      const age = depData.age !== undefined ? parseInt(depData.age) : null;
      const creditType = depData.credit_type || '';
      const dependent = {
        first_name: depData.first_name || '',
        dob: depData.dob ? parseDateToISO(depData.dob) : null,
        age: age,
        relationship: depData.relationship || 'child',
        credit_type: creditType,
        qualifies_ctc: (age !== null && age < 17) || creditType === 'ctc',
        qualifies_odc: (age !== null && age >= 17) || creditType === 'odc'
      };
      session.dependents.push(dependent);
      console.log(`   ✅ Dependent #${index}: ${dependent.first_name || '(unnamed)'}, Age ${dependent.age}, credit=${creditType}`);
    }
  }
  
  session.markModified('dependents');
  console.log(`   📊 Total Dependents: ${session.dependents.length}`);
}

// ============================================================
// ✅ REBUILD ALL DATA
// ============================================================
function rebuildAllData(session) {
  console.log(`\n📊 REBUILDING ALL TAX DATA...`);
  
  const answers = session.answers instanceof Map 
    ? Object.fromEntries(session.answers) 
    : (session.answers || {});
  
  finalizeW2s(session);
  finalizeDependents(session);
  
  // Update adjustments
  const hsaContribution = Number(answers.hsa || answers.hsa_contribution || 0);
  const taxpayerIra = Number(answers.taxpayer_ira || 0);
  const spouseIra = Number(answers.spouse_ira || 0);
  const studentLoan = Math.min(Number(answers.student_loan_interest || 0), 2500);
  
  if (!session.totals) session.totals = {};
  
  // ✅ v15.6: Always use manualRebuild for consistent IRA/adjustment logic
  // The model's rebuildAllData may have different IRA deductibility rules
  console.log(`   🔧 Using manualRebuild (v15.6)`);
  manualRebuild(session, answers);
  
  const t = session.totals;
  console.log(`\n   📊 TOTALS:`);
  console.log(`      Wages: $${(t.wages || 0).toLocaleString()}`);
  console.log(`      Adjustments: $${(t.total_adjustments || 0).toLocaleString()}`);
  console.log(`      AGI: $${(t.agi || 0).toLocaleString()}`);
  console.log(`      OBBB Total: $${(t.obbb_total_deduction || 0).toLocaleString()}`);
  console.log(`      Taxable Income: $${(t.taxable_income || 0).toLocaleString()}`);
  console.log(`      Federal Withheld: $${(t.federal_withheld || 0).toLocaleString()}`);
  
  console.log(`\n✅ REBUILD COMPLETE`);
}

// ============================================================
// MANUAL REBUILD (fallback) - v15.6 FIX W2 FROM ANSWERS
// ============================================================
function manualRebuild(session, answers) {
  const t = session.totals;
  
  // First try input_forms.w2
  const w2s = session.input_forms?.w2 || [];
  let wagesFromW2 = w2s.reduce((sum, w) => sum + (w.box_1_wages || 0), 0);
  let fedWithheldFromW2 = w2s.reduce((sum, w) => sum + (w.box_2_federal_withheld || 0), 0);
  let stateWithheldFromW2 = w2s.reduce((sum, w) => sum + (w.box_17_state_withheld || 0), 0);
  
  // ✅ v15.6 FIX: If input_forms.w2 is empty/incomplete, aggregate from answers directly
  // This handles the case where _pendingW2s was lost due to page refresh between requests
  let wagesFromAnswers = 0;
  let fedWithheldFromAnswers = 0;
  let stateWithheldFromAnswers = 0;
  let tipsFromAnswers = 0;
  
  // Aggregate from taxpayer_w2_1_*, taxpayer_w2_2_*, etc.
  for (let i = 1; i <= 10; i++) {
    // Taxpayer W-2s
    wagesFromAnswers += parseFloat(answers[`taxpayer_w2_${i}_wages`] || 0);
    fedWithheldFromAnswers += parseFloat(answers[`taxpayer_w2_${i}_federal_withheld`] || 0);
    stateWithheldFromAnswers += parseFloat(answers[`taxpayer_w2_${i}_state_withheld`] || 0);
    tipsFromAnswers += parseFloat(answers[`taxpayer_w2_${i}_tips`] || 0);
    // Spouse W-2s
    wagesFromAnswers += parseFloat(answers[`spouse_w2_${i}_wages`] || 0);
    fedWithheldFromAnswers += parseFloat(answers[`spouse_w2_${i}_federal_withheld`] || 0);
    stateWithheldFromAnswers += parseFloat(answers[`spouse_w2_${i}_state_withheld`] || 0);
  }
  
  // Also check legacy single-field format (taxpayer_federal_withheld, etc.)
  if (fedWithheldFromAnswers === 0) {
    fedWithheldFromAnswers = parseFloat(answers.taxpayer_federal_withheld || 0) + 
                             parseFloat(answers.spouse_federal_withheld || 0);
  }
  if (stateWithheldFromAnswers === 0) {
    stateWithheldFromAnswers = parseFloat(answers.taxpayer_state_withheld || 0) + 
                               parseFloat(answers.spouse_state_withheld || 0);
  }
  if (wagesFromAnswers === 0) {
    wagesFromAnswers = parseFloat(answers.taxpayer_wages || 0) + 
                       parseFloat(answers.spouse_wages || 0);
  }
  
  // Use the larger value (prioritize input_forms.w2 if it has data, otherwise use answers)
  t.wages = wagesFromW2 > 0 ? wagesFromW2 : wagesFromAnswers;
  t.federal_withheld = fedWithheldFromW2 > 0 ? fedWithheldFromW2 : fedWithheldFromAnswers;
  t.state_withheld = stateWithheldFromW2 > 0 ? stateWithheldFromW2 : stateWithheldFromAnswers;
  
  console.log(`   📊 W-2 Data Sources:`);
  console.log(`      input_forms.w2: wages=$${wagesFromW2}, fed=$${fedWithheldFromW2}, state=$${stateWithheldFromW2}`);
  console.log(`      answers: wages=$${wagesFromAnswers}, fed=$${fedWithheldFromAnswers}, state=$${stateWithheldFromAnswers}`);
  console.log(`      FINAL: wages=$${t.wages}, fed=$${t.federal_withheld}, state=$${t.state_withheld}`);
  
  // IRA deduction - with proper limits
  // Calculate age from DOB if not saved directly
  let taxpayerAge = Number(answers.taxpayer_age || 0);
  let spouseAge = Number(answers.spouse_age || 0);
  
  if (taxpayerAge === 0 && answers.taxpayer_dob) {
    const dob = new Date(answers.taxpayer_dob);
    if (!isNaN(dob.getTime())) {
      taxpayerAge = new Date().getFullYear() - dob.getFullYear();
    }
  }
  if (spouseAge === 0 && answers.spouse_dob) {
    const dob = new Date(answers.spouse_dob);
    if (!isNaN(dob.getTime())) {
      spouseAge = new Date().getFullYear() - dob.getFullYear();
    }
  }
  
  const taxpayerIraLimit = taxpayerAge >= 50 ? 8000 : 7000;
  const spouseIraLimit = spouseAge >= 50 ? 8000 : 7000;
  
  let taxpayerIra = Number(answers.taxpayer_ira || 0);
  let spouseIra = Number(answers.spouse_ira || 0);
  
  // Cap at contribution limits
  taxpayerIra = Math.min(taxpayerIra, taxpayerIraLimit);
  spouseIra = Math.min(spouseIra, spouseIraLimit);
  
  // Check IRA deductibility based on 401(k) status and income
  // If NO 401(k), IRA is ALWAYS fully deductible (no income limit)
  // If HAS 401(k), income limits apply (2025: $79,000-$89,000 single)
  const has401k = answers.taxpayer_has_401k === true || answers.taxpayer_has_401k === 'true';
  const spouseHas401k = answers.spouse_has_401k === true || answers.spouse_has_401k === 'true';
  
  let taxpayerIraDeductible = taxpayerIra;
  let spouseIraDeductible = spouseIra;
  
  // Only apply income limits if has 401k
  if (has401k && taxpayerIra > 0) {
    const agi = t.wages - Number(answers.hsa || 0); // Preliminary AGI for limit check
    if (agi > 89000) {
      taxpayerIraDeductible = 0;
      console.log(`   ⚠️ Taxpayer IRA not deductible: AGI $${agi} > $89,000 limit (has 401k)`);
    } else if (agi > 79000) {
      // Partial deduction phase-out
      const phaseOutPct = (89000 - agi) / 10000;
      taxpayerIraDeductible = Math.round(taxpayerIra * phaseOutPct);
      console.log(`   ℹ️ Taxpayer IRA partially deductible: $${taxpayerIraDeductible} (phase-out)`);
    }
  }
  
  if (spouseHas401k && spouseIra > 0) {
    const agi = t.wages - Number(answers.hsa || 0);
    if (agi > 89000) {
      spouseIraDeductible = 0;
    }
  }
  
  t.ira_deduction = taxpayerIraDeductible + spouseIraDeductible;
  t.taxpayer_ira_deductible = taxpayerIraDeductible;
  t.spouse_ira_deductible = spouseIraDeductible;
  
  console.log(`   💰 IRA: taxpayer=$${taxpayerIra} (deductible=$${taxpayerIraDeductible}), spouse=$${spouseIra} (deductible=$${spouseIraDeductible})`);
  console.log(`   💰 401(k) status: taxpayer=${has401k}, spouse=${spouseHas401k}`);
  
  // HSA deduction
  const hsaDeduction = Number(answers.hsa || answers.hsa_contribution || 0);
  t.hsa_deduction = hsaDeduction;
  
  // Student loan interest (max $2,500)
  const studentLoanInterest = Math.min(Number(answers.student_loan_interest || 0), 2500);
  
  t.total_adjustments = t.ira_deduction + hsaDeduction + studentLoanInterest;
  
  t.total_income = t.wages + (t.interest || 0) + (t.dividends || 0);
  t.agi = t.total_income - t.total_adjustments;
  
  const stdDeductionMap = {
    'single': 15750,
    'married_filing_jointly': 31500,
    'married_filing_separately': 15750,
    'head_of_household': 23625,
    'qualifying_widow': 31500
  };
  t.standard_deduction = stdDeductionMap[session.filing_status] || 15750;
  t.deduction_used = t.standard_deduction;
  
  // ════════════════════════════════════════════════════════════
  // ✅ v15.6: OBBB DEDUCTIONS (Tips, Overtime, Car Loan, Senior)
  // ════════════════════════════════════════════════════════════
  const isJoint = session.filing_status === 'married_filing_jointly';
  
  // Tips deduction (max $25,000) - aggregate from all W-2s + additional tips
  let totalTips = tipsFromAnswers; // From W-2 aggregation above
  totalTips += Number(answers.additional_cash_tips || 0);
  totalTips += Number(answers.tips_received || answers.tips || 0);
  // Also check legacy single fields
  if (totalTips === 0) {
    totalTips = Number(answers.taxpayer_w2_tips || 0);
  }
  t.obbb_tips_deduction = Math.min(totalTips, 25000);
  
  // Overtime deduction (max $12,500 single / $25,000 MFJ)
  const overtime = Number(answers.overtime_pay || answers.overtime || 0);
  const overtimeMax = isJoint ? 25000 : 12500;
  t.obbb_overtime_deduction = Math.min(overtime, overtimeMax);
  
  // Car loan interest deduction (max $10,000, NEW American-made only)
  const carLoanInterest = Number(answers.car_loan_interest || 0);
  const boughtNewCar = answers.bought_new_car === true;
  const carIsAmerican = answers.car_is_american === true;
  t.obbb_car_loan_deduction = (boughtNewCar && carIsAmerican) ? Math.min(carLoanInterest, 10000) : 0;
  
  // Senior deduction ($6,000 per person 65+)
  // Note: taxpayerAge and spouseAge already calculated above in IRA section
  let seniorCount = 0;
  if (taxpayerAge >= 65) seniorCount++;
  if (isJoint && spouseAge >= 65) seniorCount++;
  t.obbb_senior_deduction = seniorCount * 6000;
  
  // Total OBBB (below-the-line)
  t.obbb_total_deduction = (t.obbb_tips_deduction || 0) + 
                           (t.obbb_overtime_deduction || 0) + 
                           (t.obbb_car_loan_deduction || 0) + 
                           (t.obbb_senior_deduction || 0);
  
  // ✅ Taxable Income = AGI - Standard Deduction - OBBB
  t.taxable_income = Math.max(0, t.agi - t.deduction_used - t.obbb_total_deduction);
  
  // Log OBBB for debugging
  if (t.obbb_total_deduction > 0) {
    console.log(`   🌟 OBBB Deductions:`);
    console.log(`      Tips: $${t.obbb_tips_deduction}`);
    console.log(`      Overtime: $${t.obbb_overtime_deduction}`);
    console.log(`      Car Loan: $${t.obbb_car_loan_deduction}`);
    console.log(`      Senior: $${t.obbb_senior_deduction}`);
    console.log(`      TOTAL OBBB: $${t.obbb_total_deduction}`);
  }
  
  t.total_payments = t.federal_withheld + (t.estimated_payments || 0);
  
  // ════════════════════════════════════════════════════════════
  // ✅ v16.0 CRITICAL FIX: COMPUTE FEDERAL TAX FROM BRACKETS
  // Previously this was NEVER computed - federal_tax stayed at 0!
  // ════════════════════════════════════════════════════════════
  
  // 2025 Tax Brackets
  const TAX_BRACKETS = {
    'single': [
      [11925, 0.10], [48475, 0.12], [103350, 0.22],
      [197300, 0.24], [250525, 0.32], [626350, 0.35], [Infinity, 0.37]
    ],
    'married_filing_jointly': [
      [23850, 0.10], [96950, 0.12], [206700, 0.22],
      [394600, 0.24], [501050, 0.32], [751600, 0.35], [Infinity, 0.37]
    ],
    'married_filing_separately': [
      [11925, 0.10], [48475, 0.12], [103350, 0.22],
      [197300, 0.24], [250525, 0.32], [375800, 0.35], [Infinity, 0.37]
    ],
    'head_of_household': [
      [17000, 0.10], [64850, 0.12], [103350, 0.22],
      [197300, 0.24], [250500, 0.32], [626350, 0.35], [Infinity, 0.37]
    ],
    'qualifying_widow': [
      [23850, 0.10], [96950, 0.12], [206700, 0.22],
      [394600, 0.24], [501050, 0.32], [751600, 0.35], [Infinity, 0.37]
    ]
  };
  
  const brackets = TAX_BRACKETS[session.filing_status] || TAX_BRACKETS['single'];
  const taxableIncome = t.taxable_income || 0;
  
  let federalTax = 0;
  let prev = 0;
  for (const [limit, rate] of brackets) {
    if (taxableIncome <= prev) break;
    federalTax += (Math.min(taxableIncome, limit) - prev) * rate;
    prev = limit;
  }
  federalTax = Math.round(federalTax * 100) / 100;
  
  t.bracket_tax = federalTax;
  t.tax_before_credits = federalTax;
  
  console.log(`   💰 Federal Tax (brackets): $${federalTax.toLocaleString()}`);
  
  // ════════════════════════════════════════════════════════════
  // ✅ v16.0: CHILD TAX CREDIT + OTHER DEPENDENT CREDIT
  // ════════════════════════════════════════════════════════════
  let childrenUnder17 = 0;
  let otherDependents = 0;
  
  // Count from dependents array
  const deps = session.dependents || [];
  for (const dep of deps) {
    const age = dep.age !== undefined ? parseInt(dep.age) : null;
    const creditType = dep.credit_type || '';
    if ((age !== null && age < 17) || creditType === 'ctc' || dep.qualifies_ctc) {
      childrenUnder17++;
    } else if (age !== null || creditType === 'odc' || dep.qualifies_odc) {
      otherDependents++;
    }
  }
  
  // Also read from answers as fallback (in case dependents array is empty)
  if (childrenUnder17 === 0 && otherDependents === 0) {
    const depCount = parseInt(answers.dependent_count || 0);
    for (let i = 1; i <= depCount; i++) {
      const depAge = answers[`dependent_${i}_age`];
      const depCredit = answers[`dependent_${i}_credit_type`] || answers[`dependent_${i}_credit`] || '';
      if (depAge !== undefined) {
        const age = parseInt(depAge);
        if (age < 17 || depCredit === 'ctc') {
          childrenUnder17++;
        } else {
          otherDependents++;
        }
      }
    }
  }
  
  // CTC: $2,000 per qualifying child under 17
  // Phase-out: reduces by $50 per $1,000 over threshold
  const ctcThreshold = isJoint ? 400000 : 200000;
  let grossCTC = childrenUnder17 * 2000;
  if (t.agi > ctcThreshold) {
    const reduction = Math.ceil((t.agi - ctcThreshold) / 1000) * 50;
    grossCTC = Math.max(0, grossCTC - reduction);
  }
  
  // ODC: $500 per other dependent
  let grossODC = otherDependents * 500;
  if (t.agi > ctcThreshold) {
    const reduction = Math.ceil((t.agi - ctcThreshold) / 1000) * 50;
    grossODC = Math.max(0, grossODC - Math.max(0, reduction - (childrenUnder17 * 2000)));
  }
  
  // Nonrefundable credits are limited to tax liability
  const totalNonrefundableCredits = Math.min(grossCTC + grossODC, federalTax);
  t.child_tax_credit = Math.min(grossCTC, federalTax);
  t.other_dependent_credit = Math.min(grossODC, Math.max(0, federalTax - t.child_tax_credit));
  t.total_credits = totalNonrefundableCredits;
  
  // Additional Child Tax Credit (refundable portion)
  const ctcUsed = Math.min(grossCTC, federalTax);
  const ctcRemaining = grossCTC - ctcUsed;
  let additionalCTC = 0;
  if (ctcRemaining > 0 && t.wages > 2500) {
    const earnedIncomeOver2500 = Math.max(0, t.wages - 2500);
    additionalCTC = Math.min(ctcRemaining, Math.round(earnedIncomeOver2500 * 0.15));
  }
  t.additional_child_tax_credit = additionalCTC;
  
  // Tax after credits
  t.federal_tax = Math.max(0, federalTax - totalNonrefundableCredits);
  t.total_tax = t.federal_tax + (t.self_employment_tax || 0);
  
  // Refund or amount owed
  const totalPayments = t.total_payments + additionalCTC;
  if (totalPayments > t.total_tax) {
    t.refund = Math.round((totalPayments - t.total_tax) * 100) / 100;
    t.amount_owed = 0;
  } else {
    t.refund = 0;
    t.amount_owed = Math.round((t.total_tax - totalPayments) * 100) / 100;
  }
  
  console.log(`   👶 Dependents: ${childrenUnder17} children CTC, ${otherDependents} other ODC`);
  console.log(`   💰 CTC: $${t.child_tax_credit}, ODC: $${t.other_dependent_credit}`);
  console.log(`   💰 Additional CTC (refundable): $${additionalCTC}`);
  console.log(`   💰 Federal Tax (after credits): $${t.federal_tax}`);
  console.log(`   💰 Total Tax: $${t.total_tax}`);
  console.log(`   💰 Refund: $${t.refund} | Owed: $${t.amount_owed}`);
  // ════════════════════════════════════════════════════════════
  
  session.markModified('totals');
  
  // Update form1040
  if (!session.form1040) session.form1040 = { income: {}, adjustments: {}, deductions: {}, tax_credits: {}, payments: {}, refund: {} };
  
  session.form1040.income.line_1a_w2_wages = t.wages;
  session.form1040.income.line_1z_total_wages = t.wages;
  session.form1040.income.line_9_total_income = t.total_income;
  session.form1040.adjustments.line_10_schedule_1_adjustments = t.total_adjustments;
  session.form1040.adjustments.line_11_agi = t.agi;
  session.form1040.deductions.line_12a_standard_deduction = t.standard_deduction;
  session.form1040.deductions.line_12_deduction = t.standard_deduction;
  session.form1040.deductions.line_14_total_deductions = t.deduction_used;
  session.form1040.deductions.obbb_total_deduction = t.obbb_total_deduction;
  session.form1040.deductions.line_15_taxable_income = t.taxable_income;
  
  // ✅ v16.0: Tax computation fields
  session.form1040.tax_credits.line_16_tax = t.bracket_tax || 0;
  session.form1040.tax_credits.line_18_total_tax_before_credits = t.tax_before_credits || 0;
  session.form1040.tax_credits.line_19_child_tax_credit = t.child_tax_credit || 0;
  session.form1040.tax_credits.line_21_total_credits = t.total_credits || 0;
  session.form1040.tax_credits.line_22_tax_minus_credits = t.federal_tax || 0;
  session.form1040.tax_credits.line_24_total_tax = t.total_tax || 0;
  session.form1040.dependent_children_ctc = childrenUnder17;
  session.form1040.dependent_other = otherDependents;
  
  session.form1040.payments.line_25a_w2_withholding = t.federal_withheld;
  session.form1040.payments.line_25d_total_withholding = t.federal_withheld;
  session.form1040.payments.line_28_additional_ctc = t.additional_child_tax_credit || 0;
  session.form1040.payments.line_33_total_payments = t.total_payments + (t.additional_child_tax_credit || 0);
  
  // ✅ v16.0: Refund/owed
  session.form1040.refund.line_34_overpaid = t.refund || 0;
  session.form1040.refund.line_35a_refund_amount = t.refund || 0;
  session.form1040.refund.line_37_amount_owed = t.amount_owed || 0;
  
  session.markModified('form1040');
}

// ============================================================
// CALL PYTHON EXTRACTOR
// ============================================================
async function callPythonExtractor(userId, taxYear) {
  try {
    console.log(`📤 Calling Python extractor for ${userId}...`);
    
    const response = await fetch(`${CONFIG.pythonApiUrl}/api/extract/webhook/interview-complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        user_id: userId, 
        tax_year: taxYear,
        status: 'complete'
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ Python extraction SUCCESS!`);
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
    console.log(`📝 User: "${message}"`);
    console.log(`${'='.repeat(50)}`);
    
    const session = await getOrCreateSession(userId, taxYear);
    
    // Restore pending W-2s from answers
    if (!session._pendingW2s) {
      session._pendingW2s = { taxpayer: {}, spouse: {} };
      
      const answers = session.answers instanceof Map 
        ? Object.fromEntries(session.answers) 
        : (session.answers || {});
      
      for (const [key, value] of Object.entries(answers)) {
        for (const wp of W2_FIELD_PATTERNS) {
          const match = key.match(wp.pattern);
          if (match) {
            const index = wp.index || parseInt(match[1]) || 1;
            if (!session._pendingW2s[wp.owner][index]) {
              session._pendingW2s[wp.owner][index] = { owner: wp.owner };
            }
            session._pendingW2s[wp.owner][index][wp.field] = value;
            break;
          }
        }
      }
    }
    
    // Restore pending dependents
    if (!session._pendingDependents) {
      session._pendingDependents = {};
      
      const answers = session.answers instanceof Map 
        ? Object.fromEntries(session.answers) 
        : (session.answers || {});
      
      for (const [key, value] of Object.entries(answers)) {
        for (const dp of DEPENDENT_PATTERNS) {
          const match = key.match(dp.pattern);
          if (match) {
            const index = parseInt(match[1]);
            if (!session._pendingDependents[index]) {
              session._pendingDependents[index] = {};
            }
            session._pendingDependents[index][dp.field] = value;
            break;
          }
        }
      }
    }
    
    // Build conversation history
    const conversationHistory = (session.messages || []).map(m => ({
      role: m.sender === 'assistant' ? 'assistant' : 'user',
      content: m.text
    }));
    
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
    
    // ✅ v15.0: Process save_data() with validation against user message
    processSaveDataCalls(session, aiMessage, message);
    
    // Check if interview complete
    const hasInterviewComplete = aiMessage.includes('save_data("interview_complete"') ||
                                 aiMessage.includes("save_data('interview_complete'");
    const isComplete = hasInterviewComplete || 
                       (aiMessage.toLowerCase().includes('everything correct') && 
                        aiMessage.includes('Great job'));
    
    // ✅ v15.8: ALWAYS rebuild totals after ANY save_data() call
    // This ensures calculations are always correct, no matter what field changes
    const hasSaveData = aiMessage.includes('save_data(');
    
    if (hasSaveData) {
      console.log(`\n🔄 REBUILDING TOTALS (save_data detected)...`);
      rebuildAllData(session);
      console.log(`✅ Totals recalculated!`);
    }
    
    if (isComplete) {
      console.log(`\n🎉 INTERVIEW COMPLETE!`);
      session.status = 'ready_for_review';
      setAnswer(session, 'interview_complete', true);
      console.log(`\n✅ Interview data saved to MongoDB!`);
    }
    
    session.updatedAt = now;
    session.markModified('messages');
    session.markModified('answers');
    await session.save();
    
    // ✅ v15.1: Clean and format the AI message
    // 1. Remove save_data() calls
    let cleanMessage = aiMessage.replace(/(?:call\s+)?save_data\s*\([^)]+\)\s*/gi, '').trim();
    
    // 2. Add line breaks after confirmation messages (✅ ...saved!)
    cleanMessage = cleanMessage.replace(/(saved!)\s*/gi, '$1\n\n');
    
    // 3. Add line breaks before emoji questions
    cleanMessage = cleanMessage.replace(/\s*(💳|🏛️|👶|💰|📋|🏠|💼|📄|✍️)/g, '\n\n$1');
    
    // 4. Clean up multiple line breaks
    cleanMessage = cleanMessage.replace(/\n{3,}/g, '\n\n').trim();
    
    return res.json({
      success: true,
      message: cleanMessage,
      sessionId: session._id,
      status: session.status
    });
    
  } catch (error) {
    console.error('❌ handleSmartChat error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// GET WELCOME MESSAGE - v15.2 Fixed duplicate issue
// ============================================================
export async function getSmartWelcome(req, res) {
  try {
    const { userId } = req.body;
    const taxYear = parseInt(req.body.taxYear) || 2025;
    
    if (!userId || userId === 'undefined') {
      return res.status(400).json({ success: false, error: 'userId required' });
    }
    
    console.log(`\n${'='.repeat(50)}`);
    console.log(`👋 WELCOME: ${userId}`);
    console.log(`${'='.repeat(50)}`);
    
    // ✅ v15.2: Check for existing session FIRST
    let session = await TaxSession.findOne({ userId, taxYear });
    
    // ✅ If session exists with messages, return the LAST ASSISTANT message only
    // ✅ If session exists with messages, return the LAST ASSISTANT message only
// ✅ If session exists with messages, return the LAST ASSISTANT message only
if (session && session.messages && session.messages.length > 0) {
  console.log(`   📋 Existing session with ${session.messages.length} messages`);
  
  // Find the last ASSISTANT message (not user message)
  const assistantMessages = session.messages.filter(m => m.sender === 'assistant');
  const lastAssistantMessage = assistantMessages[assistantMessages.length - 1];
  
  // ✅ Check if tax is complete
  const isComplete = session.status === 'ready_for_review' || 
                     session.status === 'complete' ||
                     session.answers?.interview_complete === true;
  
  // ✅ v15.5: Build taxData from session.totals OR calculate from answers
  const answers = session.answers || {};
  const totals = session.totals || {};
  
  // Calculate totals from individual answer fields
  const taxpayerWages = parseFloat(answers.taxpayer_wages) || 0;
  const spouseWages = parseFloat(answers.spouse_wages) || 0;
  const totalWages = taxpayerWages + spouseWages;
  
  const taxpayerWithheld = parseFloat(answers.taxpayer_federal_withheld) || 0;
  const spouseWithheld = parseFloat(answers.spouse_federal_withheld) || 0;
  const totalWithheld = taxpayerWithheld + spouseWithheld;
  
  // Use totals if available, otherwise calculate from answers
  const finalWages = totals.wages || totalWages;
  const finalAgi = totals.agi || finalWages;  // AGI = wages if no adjustments stored
  const finalWithheld = totals.federal_withheld || totalWithheld;
  
  const taxData = isComplete ? {
    filing_status: session.filing_status || answers.filing_status || 'single',
    total_income: finalWages,
    wages: finalWages,
    agi: finalAgi,
    withholding: finalWithheld,
    refund: totals.refund || 0,
    amount_owed: totals.amount_owed || 0,
    // Include breakdown
    taxpayer_wages: taxpayerWages,
    spouse_wages: spouseWages,
    state: answers.state || 'CA',
  } : null;
  
  console.log('📊 Built taxData:', taxData);
  
  if (lastAssistantMessage) {
    return res.json({
      success: true,
      message: lastAssistantMessage.text,
      sessionId: session._id,
      status: session.status,
      hasExistingSession: true,
      messageCount: session.messages.length,
      hasCompletedTax: isComplete,
      taxData: taxData
    });
  }
}
    
    // ✅ v15.2: Use atomic findOneAndUpdate to prevent race conditions
    // Only create if no session exists
    if (!session) {
      session = await TaxSession.findOneAndUpdate(
        { userId, taxYear },
        {
          $setOnInsert: {
            userId,
            taxYear,
            messages: [],
            answers: {},
            status: 'in_progress',
            createdAt: new Date()
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    
    // ✅ v15.2: Double-check messages weren't added by another request
    const recheckSession = await TaxSession.findOne({ userId, taxYear });
    if (recheckSession && recheckSession.messages && recheckSession.messages.length > 0) {
      console.log(`   ⚡ Race condition detected - returning existing messages`);
      const assistantMessages = recheckSession.messages.filter(m => m.sender === 'assistant');
      const lastAssistantMessage = assistantMessages[assistantMessages.length - 1];
      
      if (lastAssistantMessage) {
        return res.json({
          success: true,
          message: lastAssistantMessage.text,
          sessionId: recheckSession._id,
          status: recheckSession.status,
          hasExistingSession: true,
          messageCount: recheckSession.messages.length
        });
      }
    }
    
    console.log(`   🤖 Getting welcome from GPT...`);
    
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
    
    if (!welcomeMessage) {
      welcomeMessage = "👋 Welcome to TaxSky! I'm your AI CPA Assistant. Let's get started with your 2025 taxes!\n\n📋 What is your filing status?\n• Single\n• Married Filing Jointly\n• Married Filing Separately\n• Head of Household";
    }
    
    const now = new Date();
    const updateResult = await TaxSession.findOneAndUpdate(
      { 
        userId, 
        taxYear,
        $or: [
          { messages: { $size: 0 } },
          { messages: { $exists: false } }
        ]
      },
      {
        $push: {
          messages: {
            $each: [
              { sender: 'user', text: 'hello', timestamp: now },
              { sender: 'assistant', text: welcomeMessage, timestamp: now }
            ]
          }
        },
        $set: { updatedAt: now }
      },
      { new: true }
    );
    
    if (!updateResult) {
      console.log(`   ⚡ Race condition - returning current state`);
      const currentSession = await TaxSession.findOne({ userId, taxYear });
      if (currentSession && currentSession.messages.length > 0) {
        const lastMessage = currentSession.messages[currentSession.messages.length - 1];
        return res.json({
          success: true,
          message: lastMessage.text,
          sessionId: currentSession._id,
          status: currentSession.status,
          hasExistingSession: true,
          messageCount: currentSession.messages.length
        });
      }
    }
    
    console.log(`   ✅ Welcome message saved`);
    
    return res.json({
      success: true,
      message: welcomeMessage,
      sessionId: updateResult?._id || session._id,
      status: 'in_progress',
      hasExistingSession: false
    });
    
  } catch (error) {
    console.error('❌ getSmartWelcome error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// GET ALL DATA - v15.8: Auto-rebuild totals on read
// ============================================================
export async function getAllData(req, res) {
  try {
    const { userId } = req.params;
    const taxYear = parseInt(req.query.taxYear) || 2025;
    const forceRebuild = req.query.rebuild === 'true'; // Optional: ?rebuild=true
    
    const session = await TaxSession.findOne({ userId, taxYear });
    
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    
    const answers = session.answers instanceof Map 
      ? Object.fromEntries(session.answers) 
      : (session.answers || {});
    
    // ✅ v15.8: Auto-rebuild totals if answers have W-2 data but totals seem stale
    // This catches cases where data was saved but totals weren't recalculated
    const shouldRebuild = forceRebuild || checkIfRebuildNeeded(session, answers);
    
    if (shouldRebuild) {
      console.log(`[getAllData] 🔄 Auto-rebuilding totals for ${userId}...`);
      rebuildAllData(session);
      await session.save();
      console.log(`[getAllData] ✅ Totals recalculated and saved!`);
    }
    
    return res.json({
      success: true,
      userId,
      taxYear,
      status: session.status,
      filing_status: session.filing_status,
      taxpayer: session.taxpayer,
      spouse: session.spouse,
      dependents: session.dependents,
      input_forms: session.input_forms,
      totals: session.totals,
      form1040: session.form1040,
      answers,
      messages: session.messages,
      rebuilt: shouldRebuild
    });
    
  } catch (error) {
    console.error('❌ getAllData error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// ✅ v15.8: Check if totals need rebuilding
function checkIfRebuildNeeded(session, answers) {
  const totals = session.totals || {};
  
  // Check if answers have W-2 withholding but totals.federal_withheld is different
  let answersWithheld = 0;
  for (let i = 1; i <= 10; i++) {
    answersWithheld += parseFloat(answers[`taxpayer_w2_${i}_federal_withheld`] || 0);
    answersWithheld += parseFloat(answers[`spouse_w2_${i}_federal_withheld`] || 0);
  }
  // Check legacy format
  if (answersWithheld === 0) {
    answersWithheld = parseFloat(answers.taxpayer_federal_withheld || 0) +
                      parseFloat(answers.spouse_federal_withheld || 0);
  }
  
  // If answers have withholding but totals don't match
  if (answersWithheld > 0 && totals.federal_withheld !== answersWithheld) {
    console.log(`[checkIfRebuildNeeded] Mismatch: answers=$${answersWithheld}, totals=$${totals.federal_withheld || 0}`);
    return true;
  }
  
  // Check if IRA in answers but not reflected in totals
  const answersIra = parseFloat(answers.taxpayer_ira || 0) + parseFloat(answers.spouse_ira || 0);
  const has401k = answers.taxpayer_has_401k === true || answers.taxpayer_has_401k === 'true';
  
  // If no 401k and IRA exists, it should be deductible
  if (!has401k && answersIra > 0 && (totals.ira_deduction || 0) === 0) {
    console.log(`[checkIfRebuildNeeded] IRA not deducted: answers=$${answersIra}, totals=$${totals.ira_deduction || 0}`);
    return true;
  }
  
  // Check wages mismatch
  let answersWages = 0;
  for (let i = 1; i <= 10; i++) {
    answersWages += parseFloat(answers[`taxpayer_w2_${i}_wages`] || 0);
    answersWages += parseFloat(answers[`spouse_w2_${i}_wages`] || 0);
  }
  if (answersWages === 0) {
    answersWages = parseFloat(answers.taxpayer_wages || 0) + parseFloat(answers.spouse_wages || 0);
  }
  
  if (answersWages > 0 && Math.abs((totals.wages || 0) - answersWages) > 1) {
    console.log(`[checkIfRebuildNeeded] Wages mismatch: answers=$${answersWages}, totals=$${totals.wages || 0}`);
    return true;
  }
  
  return false;
}

// ============================================================
// RESET SESSION
// ============================================================
export async function resetSession(req, res) {
  try {
    const { userId } = req.params;
    const taxYear = parseInt(req.query.taxYear) || 2025;
    
    await TaxSession.deleteOne({ userId, taxYear });
    
    return res.json({ success: true, message: 'Session deleted' });
    
  } catch (error) {
    console.error('❌ resetSession error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// SAVE SECURE DATA
// ============================================================
export async function saveSecureData(req, res) {
  try {
    const { userId, taxYear = 2025, taxpayer_ssn, spouse_ssn, bank_routing, bank_account } = req.body;
    
    const session = await TaxSession.findOne({ userId, taxYear });
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    
    if (taxpayer_ssn) session.taxpayer.ssn = taxpayer_ssn;
    if (spouse_ssn) session.spouse.ssn = spouse_ssn;
    if (bank_routing) session.bank_info.routing_number = bank_routing;
    if (bank_account) session.bank_info.account_number = bank_account;
    
    session.markModified('taxpayer');
    session.markModified('spouse');
    session.markModified('bank_info');
    await session.save();
    
    return res.json({ success: true, message: 'Secure data saved' });
    
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
      return res.json({ success: true, messages: [] });
    }
    
    return res.json({
      success: true,
      userId,
      taxYear,
      status: session.status,
      messages: session.messages || []
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
    if (rag_verified !== undefined) session.ragVerified = rag_verified;
    if (validation_errors) session.extractionErrors = validation_errors;
    
    session.updatedAt = new Date();
    await session.save();
    
    return res.json({ success: true, message: 'Status updated', userId, status: session.status });
    
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
    
    const result = await callPythonExtractor(userId, taxYear);
    
    return res.json({ success: result.success, userId, taxYear, ...result });
    
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
    
    await TaxSession.deleteOne({ userId, taxYear });
    
    const session = await getOrCreateSession(userId, taxYear);
    
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
    session.messages = [
      { sender: 'user', text: 'hello', timestamp: now },
      { sender: 'assistant', text: welcomeMessage, timestamp: now }
    ];
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
      return res.json({ success: true, userId, taxYear, hasExistingSession: false, status: 'none' });
    }
    
    return res.json({
      success: true,
      userId,
      taxYear,
      sessionId: session._id,
      hasExistingSession: true,
      status: session.status,
      w2Count: session.input_forms?.w2?.length || 0,
      totals: session.totals
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