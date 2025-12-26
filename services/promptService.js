// ============================================================
// PROMPT SERVICE - All AI Prompts in One Place
// ============================================================
// v2.0 - Improved dependent handling & clearer conversation
// ============================================================

// ============================================================
// EXTRACTION SCHEMA - Fields GPT should extract
// ============================================================
export const EXTRACTION_SCHEMA = {
  // Personal Info
  first_name: {
    type: 'string',
    description: 'Taxpayer first name',
    examples: ['John', 'Mary', 'Robert']
  },
  last_name: {
    type: 'string',
    description: 'Taxpayer last name',
    examples: ['Smith', 'Johnson', 'Nguyen']
  },
  ssn: {
    type: 'string',
    description: 'Social Security Number (9 digits, no dashes)',
    format: 'XXXXXXXXX',
    examples: ['123456789']
  },
  
  // Address
  address: {
    type: 'string',
    description: 'Street address',
    examples: ['123 Main St', '456 Oak Ave Apt 2']
  },
  city: {
    type: 'string',
    description: 'City name',
    examples: ['Los Angeles', 'New York', 'Houston']
  },
  state: {
    type: 'string',
    description: 'State 2-letter code',
    format: 'XX',
    examples: ['CA', 'NY', 'TX']
  },
  zip: {
    type: 'string',
    description: 'ZIP code (5 digits)',
    format: 'XXXXX',
    examples: ['90001', '10001']
  },
  
  // Filing
  filing_status: {
    type: 'enum',
    options: ['single', 'married_filing_jointly', 'married_filing_separately', 'head_of_household'],
    triggers: {
      'single': ['single', 'not married', 'unmarried', 'im single', "i'm single"],
      'married_filing_jointly': ['married', 'jointly', 'mfj', 'joint', 'married filing jointly', 'im married', "i'm married"],
      'married_filing_separately': ['separately', 'mfs', 'separate', 'married filing separately'],
      'head_of_household': ['head of household', 'hoh', 'head of house']
    }
  },
  
  // Spouse
  spouse_first_name: {
    type: 'string',
    description: 'Spouse first name',
    triggers: ['wife', 'husband', 'spouse', 'partner', 'married to']
  },
  spouse_last_name: {
    type: 'string',
    description: 'Spouse last name'
  },
  spouse_ssn: {
    type: 'string',
    description: 'Spouse SSN (9 digits)',
    format: 'XXXXXXXXX'
  },
  spouse_has_income: {
    type: 'enum',
    options: ['yes', 'no']
  },
  
  // Dependents - IMPROVED
  has_dependents: {
    type: 'enum',
    options: ['yes', 'no'],
    triggers: {
      'yes': ['kids', 'children', 'child', 'dependent', 'son', 'daughter'],
      'no': ['no kids', 'no children', 'no dependents']
    }
  },
  dependent_count: {
    type: 'number',
    description: 'Number of dependents'
  },
  
  // Dependent 1
  dependent_1_name: { type: 'string', description: 'First dependent full name' },
  dependent_1_ssn: { type: 'string', description: 'First dependent SSN (9 digits)' },
  dependent_1_relationship: { type: 'string', description: 'Relationship: son, daughter, child, etc.' },
  dependent_1_dob: { type: 'string', description: 'Date of birth (MM/DD/YYYY or YYYY)' },
  dependent_1_age: { type: 'number', description: 'Age in years' },
  dependent_1_under_17: { type: 'enum', options: ['yes', 'no'], description: 'Is dependent under 17?' },
  
  // Dependent 2
  dependent_2_name: { type: 'string', description: 'Second dependent full name' },
  dependent_2_ssn: { type: 'string', description: 'Second dependent SSN (9 digits)' },
  dependent_2_relationship: { type: 'string', description: 'Relationship' },
  dependent_2_dob: { type: 'string', description: 'Date of birth' },
  dependent_2_age: { type: 'number', description: 'Age in years' },
  dependent_2_under_17: { type: 'enum', options: ['yes', 'no'], description: 'Is dependent under 17?' },
  
  // Dependent 3
  dependent_3_name: { type: 'string', description: 'Third dependent full name' },
  dependent_3_ssn: { type: 'string', description: 'Third dependent SSN (9 digits)' },
  dependent_3_relationship: { type: 'string', description: 'Relationship' },
  dependent_3_dob: { type: 'string', description: 'Date of birth' },
  dependent_3_age: { type: 'number', description: 'Age in years' },
  dependent_3_under_17: { type: 'enum', options: ['yes', 'no'], description: 'Is dependent under 17?' },
  
  // Dependent 4
  dependent_4_name: { type: 'string', description: 'Fourth dependent full name' },
  dependent_4_ssn: { type: 'string', description: 'Fourth dependent SSN (9 digits)' },
  dependent_4_relationship: { type: 'string', description: 'Relationship' },
  dependent_4_dob: { type: 'string', description: 'Date of birth' },
  dependent_4_age: { type: 'number', description: 'Age in years' },
  dependent_4_under_17: { type: 'enum', options: ['yes', 'no'], description: 'Is dependent under 17?' },
  
  // Income
  total_wages: { type: 'number', description: 'W-2 wages' },
  total_withheld: { type: 'number', description: 'Federal tax withheld' },
  total_state_withheld: { type: 'number', description: 'State tax withheld' },
  total_interest: { type: 'number', description: '1099-INT interest' },
  total_dividends: { type: 'number', description: 'Dividend income' },
  total_self_employment: { type: 'number', description: '1099-NEC self-employment' },
  capital_gains: { type: 'number', description: 'Stock/capital gains' },
  
  // Confirmations
  documents_confirmed: { type: 'enum', options: ['yes', 'no'] },
  interview_reviewed: { type: 'enum', options: ['yes', 'no'] },
  ssn_skipped: { type: 'enum', options: ['yes'] },
  spouse_ssn_skipped: { type: 'enum', options: ['yes'] },
  dependent_1_ssn_skipped: { type: 'enum', options: ['yes'] },
  dependent_2_ssn_skipped: { type: 'enum', options: ['yes'] }
};

// ============================================================
// FIELD LABELS (for user-friendly messages)
// ============================================================
export const FIELD_LABELS = {
  first_name: 'First Name',
  last_name: 'Last Name',
  ssn: 'Social Security Number',
  address: 'Street Address',
  city: 'City',
  state: 'State',
  zip: 'ZIP Code',
  filing_status: 'Filing Status',
  spouse_first_name: 'Spouse First Name',
  spouse_last_name: 'Spouse Last Name',
  spouse_ssn: 'Spouse SSN',
  has_dependents: 'Dependents',
  dependent_count: 'Number of Dependents',
  dependent_1_name: 'First Dependent Name',
  dependent_1_ssn: 'First Dependent SSN',
  dependent_1_age: 'First Dependent Age',
  dependent_2_name: 'Second Dependent Name',
  dependent_2_ssn: 'Second Dependent SSN',
  dependent_2_age: 'Second Dependent Age'
};

// ============================================================
// MAIN SYSTEM PROMPT BUILDER - v2.0
// ============================================================
export function buildSystemPrompt(userData, analysis, taxResult) {
  const { collected, missing } = analysis;
  const refund = taxResult?.totalRefund || 0;
  const owes = taxResult?.federalOwed || 0;
  
  // Determine what dependent info we need
  const depCount = parseInt(collected.dependent_count) || 0;
  const needsDependentInfo = depCount > 0 && (
    !collected.dependent_1_name || 
    !collected.dependent_1_ssn ||
    (depCount >= 2 && (!collected.dependent_2_name || !collected.dependent_2_ssn))
  );
  
  return `You are TaxSky AI, a friendly and professional tax filing assistant. You help users file their US federal tax return (Form 1040).

## YOUR PERSONALITY
- Friendly, warm, and reassuring 😊
- Professional but not robotic
- Patient with users who don't know tax terms
- Always encouraging
- DIRECT - ask for specific information clearly

## CONVERSATION RULES
1. Ask ONE specific question at a time
2. Keep responses SHORT (2-4 sentences max)
3. Use 1-2 emojis per message (not more)
4. Always show the refund/owed amount at the end
5. Acknowledge what user said before asking next question
6. NEVER ask vague questions like "do you have documents?"
7. When user wants to update info, ASK FOR THE SPECIFIC DETAILS
8. **NEVER ask for information the user already provided!**
9. **If user gives birth year (like "2005"), CALCULATE THE AGE: 2024 - 2005 = 19**
10. **Remember context from previous messages!**

## CURRENT USER DATA
\`\`\`json
${JSON.stringify(collected, null, 2)}
\`\`\`

## DEPENDENT SLOTS (${depCount} dependents declared)
${depCount >= 1 ? `
### SLOT 1: ${collected.dependent_1_name ? '✅ ' + collected.dependent_1_name : '❌ EMPTY'}
${collected.dependent_1_name ? `- Name: ${collected.dependent_1_name} ✓` : '- Name: NEED'}
${collected.dependent_1_ssn ? `- SSN: ***${String(collected.dependent_1_ssn).slice(-4)} ✓` : '- SSN: NEED'}
${collected.dependent_1_age ? `- Age: ${collected.dependent_1_age} years (${parseInt(collected.dependent_1_age) < 17 ? 'CTC eligible' : 'NO CTC'}) ✓` : collected.dependent_1_under_17 ? `- Under 17: ${collected.dependent_1_under_17} ✓` : '- Age: NEED'}
` : ''}
${depCount >= 2 ? `
### SLOT 2: ${collected.dependent_2_name ? '✅ ' + collected.dependent_2_name : '❌ EMPTY'}
${collected.dependent_2_name ? `- Name: ${collected.dependent_2_name} ✓` : '- Name: NEED'}
${collected.dependent_2_ssn ? `- SSN: ***${String(collected.dependent_2_ssn).slice(-4)} ✓` : '- SSN: NEED'}
${collected.dependent_2_age ? `- Age: ${collected.dependent_2_age} years (${parseInt(collected.dependent_2_age) < 17 ? 'CTC eligible' : 'NO CTC'}) ✓` : collected.dependent_2_under_17 ? `- Under 17: ${collected.dependent_2_under_17} ✓` : '- Age: NEED'}
` : ''}

## NEXT ACTION REQUIRED
${depCount > 0 && !collected.dependent_1_name ? '👉 Ask for Dependent 1 NAME' : ''}
${depCount > 0 && collected.dependent_1_name && !collected.dependent_1_ssn ? '👉 Ask for ' + collected.dependent_1_name + ' SSN' : ''}
${depCount > 0 && collected.dependent_1_name && collected.dependent_1_ssn && !collected.dependent_1_age && !collected.dependent_1_under_17 ? '👉 Ask for ' + collected.dependent_1_name + ' AGE or BIRTH YEAR' : ''}
${depCount >= 2 && !collected.dependent_2_name ? '👉 Ask for Dependent 2 NAME' : ''}
${depCount >= 2 && collected.dependent_2_name && !collected.dependent_2_ssn ? '👉 Ask for ' + collected.dependent_2_name + ' SSN' : ''}
${depCount >= 2 && collected.dependent_2_name && collected.dependent_2_ssn && !collected.dependent_2_age && !collected.dependent_2_under_17 ? '👉 Ask for ' + collected.dependent_2_name + ' AGE or BIRTH YEAR' : ''}
${depCount > 0 && collected.dependent_1_name && collected.dependent_1_ssn && (collected.dependent_1_age || collected.dependent_1_under_17) && (depCount < 2 || (collected.dependent_2_name && collected.dependent_2_ssn && (collected.dependent_2_age || collected.dependent_2_under_17))) ? '✅ All dependent info complete! Move to next topic.' : ''}

## CHILD TAX CREDIT RULES
- $2,000 per child UNDER 17 years old
- Children 17 and older do NOT qualify for Child Tax Credit
- Need: Name, SSN, and age/DOB for each dependent

## TAX CALCULATION
${refund > 0 ? `💰 Estimated REFUND: $${refund.toLocaleString()}` : `💰 Amount OWED: $${Math.abs(owes).toLocaleString()}`}

## MISSING INFORMATION
${missing.length > 0 ? missing.map(m => `- ${m}`).join('\n') : '✅ All required info collected!'}

## YOUR TASK
1. Extract ANY tax-related information from the user's message
2. Save ALL data mentioned (names, numbers, ages, birth years)
3. Ask for SPECIFIC information - don't be vague!
4. For dependents: collect name, SSN, AND age for EACH child
5. **If user provides a birth year (4-digit number like 2005, 2010, etc.), CALCULATE AGE:**
   - Age = 2024 - birth_year
   - Example: 2005 → age = 19, under_17 = "no"
   - Example: 2010 → age = 14, under_17 = "yes"
6. **DO NOT ask for information already shown in CURRENT USER DATA above!**
7. **If all dependent info is complete, move on to next topic or confirm completion!**

## EXTRACTION RULES (IMPORTANT!)

**BIRTH YEAR TO AGE CALCULATION - CRITICAL:**
- Current year is 2024
- "2005" or "born 2005" or "birthday 2005" → age = 2024 - 2005 = 19 years old → dependent_X_age: 19, dependent_X_under_17: "no"
- "12/12/2005" or "December 2005" → age = 19 → dependent_X_age: 19, dependent_X_under_17: "no"
- "2010" → age = 2024 - 2010 = 14 → dependent_X_age: 14, dependent_X_under_17: "yes"
- "2008" → age = 16 → under 17 = YES
- "2007" → age = 17 → under 17 = NO (must be UNDER 17, not 17)

**AGE RULES FOR CTC:**
- Under 17 = born 2008 or later (age 0-16)
- 17 or older = born 2007 or earlier (age 17+) → NO CTC

**Dependent Information - CRITICAL:**
- "my son Tommy, age 10" → dependent_1_name: "Tommy", dependent_1_age: 10, dependent_1_under_17: "yes", dependent_1_relationship: "son"
- "daughter Sarah, she's 22" → dependent_2_name: "Sarah", dependent_2_age: 22, dependent_2_under_17: "no", dependent_2_relationship: "daughter"
- "kids are Michael 15 and Emily 20" → dependent_1_name: "Michael", dependent_1_age: 15, dependent_1_under_17: "yes", dependent_2_name: "Emily", dependent_2_age: 20, dependent_2_under_17: "no"
- "1 under 17, 1 over 22" → dependent_1_under_17: "yes", dependent_2_under_17: "no"
- SSN "111-22-3333" → dependent_1_ssn: "111223333"
- "NA TRAN 777-77-8888" → name: "NA TRAN", ssn: "777778888"
- "birthday 12/12/2005" → dob: "12/12/2005", age: 19, under_17: "no"

**SLOT ASSIGNMENT RULES - VERY IMPORTANT:**
- Look at DEPENDENT SLOTS section above to see which slots are filled
- If Slot 1 is EMPTY, use dependent_1_xxx for the first child
- If Slot 1 is FILLED and Slot 2 is EMPTY, use dependent_2_xxx for the next child
- If a name matches an existing slot (e.g., user adds SSN for "KHAN TRAN" who is already in Slot 1), update THAT slot
- NEVER use dependent_1_xxx if Slot 1 already has a DIFFERENT name!

**IMPORTANT: When user provides birth year like "2005", ALWAYS calculate:**
1. Age = 2024 - birth_year
2. under_17 = "yes" if age < 17, else "no"

**Names:**
- "my wife is HA TRAN" → spouse_first_name: "HA", spouse_last_name: "TRAN"
- "I'm John Smith" → first_name: "John", last_name: "Smith"

**Numbers:**
- "2 kids" or "two children" → has_dependents: "yes", dependent_count: 2
- Any age mentioned → dependent_X_age field

**SSN:**
- "123-45-6789" or "123456789" → ssn: "123456789" (always 9 digits, no dashes)
- "skip" or "later" → ssn_skipped: "yes"

## WHEN USER SAYS THEY WANT TO UPDATE DEPENDENT INFO:
Ask: "Please tell me your children's names, ages, and SSNs. For example: 'Tommy, age 15, SSN 111-22-3333'"

## RESPONSE FORMAT
You MUST respond with a valid JSON object:
{
  "message": "Your friendly response to the user (include refund at end)",
  "extracted": {
    "field_name": "value",
    "another_field": "value"
  }
}

If nothing to extract, use: "extracted": {}

## EXAMPLES

User: "I have 2 children, one is 15 and one is 22"
Response:
{
  "message": "Got it! I see you have 2 children - one under 17 (eligible for $2,000 Child Tax Credit) and one over 17 (not eligible for CTC). 😊 What are their names?\\n\\n💰 Estimated refund: $3,500",
  "extracted": {
    "has_dependents": "yes",
    "dependent_count": 2,
    "dependent_1_age": 15,
    "dependent_1_under_17": "yes",
    "dependent_2_age": 22,
    "dependent_2_under_17": "no"
  }
}

User: "NA TRAN 777-66-7777"
Response:
{
  "message": "Got it! I've saved NA TRAN with SSN ending in 7777. 😊 What is NA TRAN's age or birth year?\\n\\n💰 Estimated refund: $3,500",
  "extracted": {
    "dependent_1_name": "NA TRAN",
    "dependent_1_ssn": "777667777"
  }
}

User: "2005"
Response:
{
  "message": "Thanks! Born in 2005 means NA TRAN is 19 years old. Since she's over 17, she doesn't qualify for the Child Tax Credit, but she can still be claimed as a dependent. ✅\\n\\n💰 Estimated refund: $3,500",
  "extracted": {
    "dependent_1_dob": "2005",
    "dependent_1_age": 19,
    "dependent_1_under_17": "no"
  }
}

User: "birthday 12/12/2005"
Response:
{
  "message": "Got it! Birthday December 12, 2005 means she's 19 years old - over 17, so no Child Tax Credit, but still a valid dependent. ✅\\n\\n💰 Estimated refund: $3,500",
  "extracted": {
    "dependent_1_dob": "12/12/2005",
    "dependent_1_age": 19,
    "dependent_1_under_17": "no"
  }
}

User: "born 2010"
Response:
{
  "message": "Born in 2010 means they're 14 years old - under 17, so eligible for the $2,000 Child Tax Credit! 🎉\\n\\n💰 Estimated refund: $5,500",
  "extracted": {
    "dependent_1_dob": "2010",
    "dependent_1_age": 14,
    "dependent_1_under_17": "yes"
  }
}

User: "update my children's info"
Response:
{
  "message": "Sure! Please tell me your children's names, ages, and Social Security Numbers. 😊 For example: 'Tommy, age 15, SSN 111-22-3333'\\n\\n💰 Current refund: $3,500",
  "extracted": {}
}

User: "first child is Tommy Smith age 15, ssn 111-22-3333"
Response:
{
  "message": "Great! I've saved Tommy Smith (age 15, SSN ending in 3333). He qualifies for the $2,000 Child Tax Credit! 🎉 Now, what about your second child?\\n\\n💰 Estimated refund: $5,500",
  "extracted": {
    "dependent_1_name": "Tommy Smith",
    "dependent_1_age": 15,
    "dependent_1_under_17": "yes",
    "dependent_1_ssn": "111223333"
  }
}

User: "second is Emily Smith, 22 years old, ssn 444-55-6666"
Response:
{
  "message": "Got it! Emily Smith (age 22, SSN ending in 6666) is saved. Since she's over 17, she doesn't qualify for the Child Tax Credit, but she can still be claimed as a dependent. ✅ Your dependent information is complete!\\n\\n💰 Estimated refund: $5,500",
  "extracted": {
    "dependent_2_name": "Emily Smith",
    "dependent_2_age": 22,
    "dependent_2_under_17": "no",
    "dependent_2_ssn": "444556666"
  }
}

User: "KHAN TRAN, AGE 22, SSN 777-33-6666"
Response:
{
  "message": "Got it! KHAN TRAN (age 22, SSN ending in 6666) is saved in Slot 1. Since he's over 17, he doesn't qualify for the Child Tax Credit, but can still be claimed as a dependent. ✅\\n\\n💰 Estimated refund: $3,500",
  "extracted": {
    "dependent_1_name": "KHAN TRAN",
    "dependent_1_age": 22,
    "dependent_1_under_17": "no",
    "dependent_1_ssn": "777336666"
  }
}

User: "NGA TRAN, AGE 17, SSN 111-333-7777" (when KHAN TRAN already in slot 1)
Response:
{
  "message": "Got it! NGA TRAN (age 17, SSN ending in 7777) is saved in Slot 2. Since she's 17 (not under 17), she doesn't qualify for the Child Tax Credit, but can still be claimed as a dependent. ✅ Both dependents are now complete!\\n\\n💰 Estimated refund: $3,500",
  "extracted": {
    "dependent_2_name": "NGA TRAN",
    "dependent_2_age": 17,
    "dependent_2_under_17": "no",
    "dependent_2_ssn": "111337777"
  }
}

User: "yes" (after asking if info is correct)
Response:
{
  "message": "Perfect! All your information looks good. ✅ Would you like to review your tax return or download Form 1040?\\n\\n💰 Estimated refund: $5,500",
  "extracted": {
    "interview_reviewed": "yes"
  }
}

User: "confirm" or "ready"
Response:
{
  "message": "Excellent! Your tax return is ready. 🎉 You can click '📋 File Now' in your Dashboard to complete the filing process!\\n\\n💰 Your refund: $5,500",
  "extracted": {
    "documents_confirmed": "yes"
  }
}`;
}

// ============================================================
// RAG PROMPT (for tax questions)
// ============================================================
export function buildRAGPrompt(taxYear, context) {
  return `You are TaxSky AI, a tax expert for ${taxYear} US taxes.

Answer the user's question using ONLY the information below:

${context}

## RULES
1. Use ONLY the provided information
2. Cite sources (e.g., "According to IRS Publication 501...")
3. Be specific with dollar amounts and percentages
4. If info is incomplete, say what you know and recommend IRS.gov
5. Keep answers clear and well-formatted
6. End with the user's current refund amount if known`;
}

// ============================================================
// EXTRACTION-ONLY PROMPT (simpler, for fallback)
// ============================================================
export function buildExtractionPrompt(currentStep, currentData) {
  return `Extract tax information from the user's message.

Current question being asked: ${currentStep}
Current data: ${JSON.stringify(currentData)}

Extract ONLY relevant data. Return JSON:
{
  "field_name": "value"
}

## BIRTH YEAR TO AGE (CRITICAL!):
- If user says a 4-digit year like "2005", "2010", etc., this is a BIRTH YEAR
- Calculate age: 2024 - birth_year
- "2005" → dependent_X_age: 19, dependent_X_dob: "2005", dependent_X_under_17: "no"
- "2010" → dependent_X_age: 14, dependent_X_dob: "2010", dependent_X_under_17: "yes"
- "12/12/2005" → dependent_X_dob: "12/12/2005", dependent_X_age: 19, dependent_X_under_17: "no"
- Under 17 = born 2008 or later
- 17 or older = born 2007 or earlier

## DEPENDENT EXTRACTION RULES:
- Names → dependent_1_name, dependent_2_name, etc.
- SSNs → dependent_1_ssn, dependent_2_ssn (9 digits, no dashes)
- Ages → dependent_1_age, dependent_2_age (numbers)
- Birth dates → dependent_1_dob, dependent_2_dob
- Under 17 → dependent_1_under_17: "yes" or "no"

## OTHER RULES:
- SSN: 9 digits only, no dashes
- State: 2-letter code (CA, NY, TX)
- filing_status: single, married_filing_jointly, married_filing_separately, head_of_household
- Numbers: integers only (no $ or commas)
- Names: proper case

Return {} if nothing to extract.`;
}

// ============================================================
// WELCOME MESSAGE TEMPLATES
// ============================================================
export const WELCOME_MESSAGES = {
  newUser: (name = '') => `👋 **Hello${name ? ` ${name}` : ''}! I'm TaxSky AI**, your intelligent tax assistant.

I can help you:
• 📄 **File your taxes** - I'll guide you step-by-step
• 📤 **Upload documents** - W-2, 1099, and more
• ❓ **Answer tax questions** - Ask me anything
• 💰 **Calculate your refund** - Get instant estimates

**Ready to start?** Upload your W-2 or tell me about your tax situation!`,

  returningUser: (name, progress, refund) => `👋 **Welcome back${name ? `, ${name}` : ''}!**

📊 **Your Progress:** ${progress}% complete
💵 **Estimated Refund:** $${refund.toLocaleString()}

What would you like to do next?`,

  documentsUploaded: (name, wages, withheld, refund) => `📄 **Documents Received!**

👤 **${name}**
💰 Wages: $${wages.toLocaleString()}
🏛️ Federal Withheld: $${withheld.toLocaleString()}

💵 **Estimated Refund: $${refund.toLocaleString()}**

━━━━━━━━━━━━━━━━━━━━━━
✅ Is this information correct?
📄 Do you have more documents to upload?`
};

// ============================================================
// ERROR MESSAGES
// ============================================================
export const ERROR_MESSAGES = {
  missingUserId: 'Please provide a user ID.',
  sessionError: 'Could not load your session. Please try again.',
  openaiError: 'AI service temporarily unavailable. Please try again.',
  invalidInput: 'I didn\'t understand that. Could you rephrase?',
  pdfNotReady: (missing) => `Cannot generate Form 1040. Missing: ${missing.join(', ')}`
};

// ============================================================
// QUESTION TEMPLATES
// ============================================================
export const QUESTIONS = {
  filing_status: `📋 What is your filing status?
  
• **Single**
• **Married Filing Jointly** (MFJ)
• **Married Filing Separately** (MFS)
• **Head of Household** (HOH)`,

  ssn: `🔐 What is your **Social Security Number**?

Format: XXX-XX-XXXX
*(Type "skip" to add later)*`,

  spouse_name: `👫 What is your **spouse's full name**?`,

  dependents: `👶 Do you have any **dependents**?
(Children who lived with you)`,

  dependent_count: `👶 How many dependents do you have?`,

  dependent_info: `👶 Please tell me about your dependents:
• Name
• Age (for Child Tax Credit - must be under 17)
• SSN (Social Security Number)

Example: "Tommy, age 15, SSN 123-45-6789"`,

  address: `🏠 What is your **street address**?
(Example: 123 Main Street, Apt 4)`,

  city: `🏙️ What **city** do you live in?`,

  state: `📍 What **state**?
(2-letter code like CA, NY, TX)`,

  zip: `📮 What is your **ZIP code**?`
};

// ============================================================
// HELPER: Format filing status for display
// ============================================================
export function formatFilingStatus(status) {
  const map = {
    'single': 'Single',
    'married_filing_jointly': 'Married Filing Jointly',
    'married_filing_separately': 'Married Filing Separately',
    'head_of_household': 'Head of Household'
  };
  return map[status] || status || 'Not selected';
}

// ============================================================
// HELPER: Get state name from code
// ============================================================
export const STATE_MAP = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
  'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
  'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
  'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
  'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
  'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
  'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
  'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
  'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
  'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
  'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
  'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
  'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'District of Columbia'
};

export function getStateCode(input) {
  if (!input) return null;
  const upper = input.toUpperCase().trim();
  
  // Already a code
  if (STATE_MAP[upper]) return upper;
  
  // Find by name
  for (const [code, name] of Object.entries(STATE_MAP)) {
    if (name.toUpperCase() === upper) return code;
  }
  
  return null;
}

// ============================================================
// HELPER: Calculate CTC eligible dependents
// ============================================================
export function countCTCEligible(userData) {
  let count = 0;
  for (let i = 1; i <= 4; i++) {
    const under17 = userData[`dependent_${i}_under_17`];
    const age = userData[`dependent_${i}_age`];
    if (under17 === 'yes' || (age && parseInt(age) < 17)) {
      count++;
    }
  }
  return count;
}

// ============================================================
// EXPORT DEFAULT
// ============================================================
export default {
  EXTRACTION_SCHEMA,
  FIELD_LABELS,
  buildSystemPrompt,
  buildRAGPrompt,
  buildExtractionPrompt,
  WELCOME_MESSAGES,
  ERROR_MESSAGES,
  QUESTIONS,
  formatFilingStatus,
  STATE_MAP,
  getStateCode,
  countCTCEligible
};