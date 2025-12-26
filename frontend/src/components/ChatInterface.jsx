import React, { useState, useRef, useEffect } from "react";
import axios from "axios";

const API_BASE = "http://localhost:3000";

// ============================================================
// TAX INTERVIEW STEPS - Structured Flow
// ============================================================
const INTERVIEW_STEPS = {
  WELCOME: "welcome",
  FILING_STATUS: "filing_status",
  FIRST_NAME: "first_name",
  LAST_NAME: "last_name",
  SSN: "ssn",
  ADDRESS: "address",
  DEPENDENTS: "dependents",
  DEPENDENT_DETAILS: "dependent_details",
  INCOME_TYPE: "income_type",
  W2_UPLOAD: "w2_upload",
  W2_CONFIRM: "w2_confirm",
  OTHER_INCOME: "other_income",
  OTHER_INCOME_AMOUNT: "other_income_amount",
  DEDUCTIONS: "deductions",
  CREDITS: "credits",
  REVIEW: "review",
  COMPLETE: "complete",
};

// Step order for progress tracking
const STEP_ORDER = [
  INTERVIEW_STEPS.WELCOME,
  INTERVIEW_STEPS.FILING_STATUS,
  INTERVIEW_STEPS.FIRST_NAME,
  INTERVIEW_STEPS.LAST_NAME,
  INTERVIEW_STEPS.SSN,
  INTERVIEW_STEPS.ADDRESS,
  INTERVIEW_STEPS.DEPENDENTS,
  INTERVIEW_STEPS.DEPENDENT_DETAILS,
  INTERVIEW_STEPS.INCOME_TYPE,
  INTERVIEW_STEPS.W2_UPLOAD,
  INTERVIEW_STEPS.OTHER_INCOME,
  INTERVIEW_STEPS.OTHER_INCOME_AMOUNT,
  INTERVIEW_STEPS.DEDUCTIONS,
  INTERVIEW_STEPS.CREDITS,
  INTERVIEW_STEPS.REVIEW,
  INTERVIEW_STEPS.COMPLETE,
];

// ============================================================
// API Setup with Auth
// ============================================================
const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("taxsky_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("taxsky_token");
      localStorage.removeItem("taxsky_user");
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

// ============================================================
// Main Component
// ============================================================
export default function TaxChat() {
  // User identification
  const [userId] = useState(() => {
    const user = localStorage.getItem("taxsky_user");
    if (user) {
      try {
        const parsed = JSON.parse(user);
        return parsed.id || parsed.email || `user_${Date.now()}`;
      } catch (e) {}
    }
    const stored = localStorage.getItem("taxsky_userId");
    if (stored) return stored;
    const newId = `user_${Date.now()}`;
    localStorage.setItem("taxsky_userId", newId);
    return newId;
  });

  const [currentUser] = useState(() => {
    const user = localStorage.getItem("taxsky_user");
    if (user) {
      try {
        return JSON.parse(user);
      } catch (e) {}
    }
    return null;
  });

  // ============================================================
  // TAX DATA STATE - Structured storage
  // ============================================================
  const [taxData, setTaxData] = useState({
    // Personal Info
    firstName: currentUser?.firstName || "",
    lastName: currentUser?.lastName || "",
    ssn: "",
    address: {
      street: "",
      city: "",
      state: localStorage.getItem("taxsky_state") || "CA",
      zip: "",
    },
    // Filing
    filingStatus: "", // single, married_joint, married_separate, head_of_household
    // Dependents
    hasDependents: null, // true/false
    dependents: [],
    // Income
    hasW2: null,
    w2Data: null, // Extracted from upload
    hasOtherIncome: null,
    otherIncome: [],
    // Deductions
    deductionType: "", // standard or itemized
    itemizedDeductions: {},
    // Credits
    claimEITC: null,
    claimChildCredit: null,
    claimStudentLoan: null,
  });

  // Server data (from API) - for Data Panel display
  const [serverData, setServerData] = useState(null);

  // Interview state
  const [currentStep, setCurrentStep] = useState(INTERVIEW_STEPS.WELCOME);
  const [interviewMode, setInterviewMode] = useState(false);

  // UI state
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [refundAmount, setRefundAmount] = useState(0);
  const [animatedRefund, setAnimatedRefund] = useState(0);
  const [progress, setProgress] = useState(0);
  const [taxYear, setTaxYear] = useState(localStorage.getItem("taxsky_taxYear") || "2024");
  const [showDataPanel, setShowDataPanel] = useState(false);
  const [userLanguage, setUserLanguage] = useState(localStorage.getItem("taxsky_language") || "en");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  
  // SSN Confirmation Modal state
  const [showSSNConfirmation, setShowSSNConfirmation] = useState(false);
  const [ssnConfirmationData, setSSNConfirmationData] = useState({});

  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  // ============================================================
  // Load existing data silently
  // ============================================================
  const loadUserDataSilent = async () => {
    try {
      const res = await api.post(`/api/ai/welcome`, { userId });
      if (res.data.refund !== undefined) setRefundAmount(res.data.refund);
      if (res.data.progress !== undefined) setProgress(res.data.progress);
    } catch (err) {
      console.log("Could not load initial data:", err.message);
    }
  };

  // Fetch full user data for Data Panel
  const fetchServerData = async () => {
    try {
      const res = await api.post(`/api/ai/data`, { userId });
      if (res.data.success) {
        setServerData(res.data.data);
        if (res.data.tax?.totalRefund !== undefined) {
          setRefundAmount(res.data.tax.totalRefund);
        }
        console.log("📊 Server data loaded:", res.data.data);
      }
    } catch (err) {
      console.log("Could not fetch server data:", err.message);
    }
  };

  // ============================================================
  // Initialize with welcome message
  // ============================================================
  useEffect(() => {
    const firstName = currentUser?.firstName || "";
    const welcomeMsg = `👋 Hello${firstName ? ` ${firstName}` : ""}! I'm <b>TaxSky AI</b>, your intelligent tax assistant.

I can help you with:
• <b>File your taxes</b> - I'll guide you step-by-step
• <b>Upload documents</b> - W-2, 1099, and more
• <b>Answer tax questions</b> - Ask me anything about ${taxYear} taxes
• <b>Calculate your refund</b> - Get instant estimates

💡 <i>Click "File my taxes" below to start, or ask me any tax question!</i>`;

    setMessages([{ sender: "ai", text: welcomeMsg }]);
    loadUserDataSilent();
    fetchServerData(); // Pre-load server data for Data Panel
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Animate refund counter
  useEffect(() => {
    let start = animatedRefund;
    let end = refundAmount;
    let step = (end - start) / 25;
    const animate = () => {
      start += step;
      if ((step > 0 && start >= end) || (step < 0 && start <= end)) {
        setAnimatedRefund(end);
        return;
      }
      setAnimatedRefund(Math.round(start));
      requestAnimationFrame(animate);
    };
    animate();
  }, [refundAmount]);

  // Calculate progress based on current step
  useEffect(() => {
    const stepIndex = STEP_ORDER.indexOf(currentStep);
    const newProgress = Math.round((stepIndex / (STEP_ORDER.length - 1)) * 100);
    setProgress(newProgress);
  }, [currentStep]);

  // Fetch server data when panel opens
  useEffect(() => {
    if (showDataPanel) {
      fetchServerData();
    }
  }, [showDataPanel]);

  // ============================================================
  // INTERVIEW FLOW - Get AI message for current step
  // ============================================================
  const getStepMessage = (step, data = taxData) => {
    const messages = {
      [INTERVIEW_STEPS.FILING_STATUS]: `Great! Let's file your ${taxYear} taxes. 📝

First, what's your <b>filing status</b>?`,
      
      [INTERVIEW_STEPS.FIRST_NAME]: `Got it! You're filing as <b>${formatFilingStatus(data.filingStatus)}</b>. ✓

What's your <b>first name</b>?`,
      
      [INTERVIEW_STEPS.LAST_NAME]: `Nice to meet you, <b>${data.firstName}</b>! 😊

What's your <b>last name</b>?`,
      
      [INTERVIEW_STEPS.SSN]: `Thanks, <b>${data.firstName} ${data.lastName}</b>! ✓

For tax filing, I'll need your <b>Social Security Number (SSN)</b>.
<i>(Format: XXX-XX-XXXX - This is kept secure)</i>`,
      
      [INTERVIEW_STEPS.ADDRESS]: `SSN recorded securely. ✓

What's your <b>current address</b>?
<i>(Street, City, State, ZIP)</i>`,
      
      [INTERVIEW_STEPS.DEPENDENTS]: `Address saved: <b>${data.address.street}, ${data.address.city}, ${data.address.state} ${data.address.zip}</b> ✓

Do you have any <b>dependents</b> (children or qualifying relatives)?`,
      
      [INTERVIEW_STEPS.INCOME_TYPE]: `${data.hasDependents ? `Great! You have ${data.dependents.length} dependent(s). ✓` : "No dependents. ✓"}

Now let's talk about your <b>income</b>.
Did you receive a <b>W-2</b> from an employer in ${taxYear}?`,
      
      [INTERVIEW_STEPS.W2_UPLOAD]: `Perfect! Let's get your W-2 information.

📤 <b>Upload your W-2</b> and I'll automatically extract the data, OR you can enter it manually.

<i>Click the upload button below or type "enter manually"</i>`,
      
      [INTERVIEW_STEPS.W2_CONFIRM]: `I extracted the following from your W-2:
• <b>Employer:</b> ${data.w2Data?.employer || "N/A"}
• <b>Wages:</b> $${(data.w2Data?.wages || 0).toLocaleString()}
• <b>Federal Withheld:</b> $${(data.w2Data?.federalWithheld || 0).toLocaleString()}
• <b>State Withheld:</b> $${(data.w2Data?.stateWithheld || 0).toLocaleString()}

Is this correct?`,
      
      [INTERVIEW_STEPS.OTHER_INCOME]: `${data.hasW2 ? "W-2 income recorded! ✓" : "No W-2 income. ✓"}

Did you have any <b>other income</b> in ${taxYear}?
• 1099-NEC (freelance/contract work)
• 1099-INT (bank interest)
• 1099-DIV (dividends)
• Other`,
      
      [INTERVIEW_STEPS.DEDUCTIONS]: `Income section complete! ✓

💡 Based on your situation, I recommend the <b>standard deduction</b> ($${taxYear === "2024" ? "14,600" : "15,000"} for single filers).

Would you like to use the <b>standard deduction</b> or <b>itemize</b>?`,
      
      [INTERVIEW_STEPS.CREDITS]: `${data.deductionType === "standard" ? "Standard" : "Itemized"} deduction selected. ✓

Let's check for <b>tax credits</b> you might qualify for:

${data.hasDependents ? "• <b>Child Tax Credit</b> - Up to $2,000 per child\n" : ""}• <b>Earned Income Credit</b> - Based on income
• <b>Student Loan Interest</b> - Up to $2,500 deduction

Did you pay <b>student loan interest</b> in ${taxYear}?`,
      
      [INTERVIEW_STEPS.REVIEW]: generateReviewMessage(data),
      
      [INTERVIEW_STEPS.COMPLETE]: `🎉 <b>Congratulations!</b> Your ${taxYear} tax return is complete!

📊 <b>Summary:</b>
• Total Income: $${calculateTotalIncome(data).toLocaleString()}
• Total Tax: $${calculateTax(data).toLocaleString()}
• Amount Withheld: $${calculateWithheld(data).toLocaleString()}
• <b>Your Refund: $${refundAmount.toLocaleString()}</b>

📥 Click <b>"Download 1040"</b> to get your completed tax form!`,
    };

    return messages[step] || "Let's continue with your tax return.";
  };

  // ============================================================
  // INTERVIEW FLOW - Process user response
  // ============================================================
  const processInterviewResponse = (userMessage) => {
    const msg = userMessage.toLowerCase().trim();
    let nextStep = currentStep;
    let updatedData = { ...taxData };
    let aiResponse = "";

    // 🔍 DEBUG LOGGING
    console.log("===========================================");
    console.log("🤖 TAXSKY AI - Processing Response");
    console.log("===========================================");
    console.log("📝 User Message:", userMessage);
    console.log("📍 Current Step:", currentStep);
    console.log("🔄 Interview Mode:", interviewMode);
    console.log("📊 Tax Data:", taxData);

    switch (currentStep) {
      case INTERVIEW_STEPS.WELCOME:
        console.log("➡️ WELCOME -> FILING_STATUS");
        nextStep = INTERVIEW_STEPS.FILING_STATUS;
        aiResponse = getStepMessage(nextStep);
        break;

      case INTERVIEW_STEPS.FILING_STATUS:
        const filingStatus = parseFilingStatus(msg);
        console.log("➡️ FILING_STATUS - Parsed:", filingStatus);
        if (filingStatus) {
          updatedData.filingStatus = filingStatus;
          nextStep = INTERVIEW_STEPS.FIRST_NAME;
          aiResponse = getStepMessage(nextStep, updatedData);
          console.log("   ✅ Moving to FIRST_NAME");
        } else {
          aiResponse = `Please select your filing status:
• <b>Single</b>
• <b>Married Filing Jointly</b>
• <b>Married Filing Separately</b>
• <b>Head of Household</b>`;
          console.log("   ❌ Invalid, asking again");
        }
        break;

      case INTERVIEW_STEPS.FIRST_NAME:
        console.log("➡️ FIRST_NAME");
        if (msg.length >= 1) {
          updatedData.firstName = capitalize(userMessage.trim());
          nextStep = INTERVIEW_STEPS.LAST_NAME;
          aiResponse = getStepMessage(nextStep, updatedData);
          console.log("   ✅ Name:", updatedData.firstName, "-> LAST_NAME");
        } else {
          aiResponse = "Please enter your first name.";
          console.log("   ❌ Invalid");
        }
        break;

      case INTERVIEW_STEPS.LAST_NAME:
        console.log("➡️ LAST_NAME");
        if (msg.length >= 1) {
          updatedData.lastName = capitalize(userMessage.trim());
          nextStep = INTERVIEW_STEPS.SSN;
          aiResponse = getStepMessage(nextStep, updatedData);
          console.log("   ✅ Name:", updatedData.lastName, "-> SSN");
        } else {
          aiResponse = "Please enter your last name.";
          console.log("   ❌ Invalid");
        }
        break;

      case INTERVIEW_STEPS.SSN:
        console.log("➡️ SSN");
        const ssn = parseSSN(userMessage);
        console.log("   Parsed SSN:", ssn ? "***-**-" + ssn.slice(-4) : "INVALID");
        if (ssn) {
          updatedData.ssn = ssn;
          nextStep = INTERVIEW_STEPS.ADDRESS;
          aiResponse = getStepMessage(nextStep, updatedData);
          console.log("   ✅ -> ADDRESS");
        } else {
          aiResponse = "Please enter a valid SSN (format: XXX-XX-XXXX or XXXXXXXXX).";
          console.log("   ❌ Invalid format");
        }
        break;

      case INTERVIEW_STEPS.ADDRESS:
        console.log("➡️ ADDRESS");
        const address = parseAddress(userMessage);
        console.log("   Parsed Address:", address);
        if (address) {
          updatedData.address = address;
          nextStep = INTERVIEW_STEPS.DEPENDENTS;
          aiResponse = getStepMessage(nextStep, updatedData);
          console.log("   ✅ -> DEPENDENTS");
        } else {
          aiResponse = "Please enter your full address (Street, City, State, ZIP).";
          console.log("   ❌ Could not parse");
        }
        break;

      case INTERVIEW_STEPS.DEPENDENTS:
        console.log("➡️ DEPENDENTS");
        const hasDependents = parseYesNo(msg);
        console.log("   Parsed Yes/No:", hasDependents);
        if (hasDependents !== null) {
          updatedData.hasDependents = hasDependents;
          if (!hasDependents) {
            nextStep = INTERVIEW_STEPS.INCOME_TYPE;
            aiResponse = getStepMessage(nextStep, updatedData);
            console.log("   ✅ No dependents -> INCOME_TYPE");
          } else {
            aiResponse = `How many dependents do you have?`;
            nextStep = INTERVIEW_STEPS.DEPENDENT_DETAILS;
            console.log("   ✅ Has dependents -> DEPENDENT_DETAILS");
          }
        } else {
          aiResponse = "Do you have any dependents? Please answer <b>Yes</b> or <b>No</b>.";
          console.log("   ❌ Could not parse yes/no");
        }
        break;

      case INTERVIEW_STEPS.DEPENDENT_DETAILS:
        console.log("➡️ DEPENDENT_DETAILS");
        
        // First check if we're collecting count or details
        if (!updatedData.dependents || updatedData.dependents.length === 0) {
          // User just entered the count
          const numDependents = parseInt(msg);
          console.log("   Parsed number:", numDependents);
          if (!isNaN(numDependents) && numDependents >= 0 && numDependents <= 10) {
            updatedData.dependents = Array(numDependents).fill(null).map(() => ({ 
              name: "", 
              ssn: "", 
              age: "", 
              relationship: "child" 
            }));
            updatedData.hasDependents = numDependents > 0;
            
            if (numDependents === 0) {
              nextStep = INTERVIEW_STEPS.INCOME_TYPE;
              aiResponse = getStepMessage(nextStep, updatedData);
              console.log("   ✅ 0 dependents -> INCOME_TYPE");
            } else {
              updatedData.currentDependentIndex = 0;
              aiResponse = `Great! You have <b>${numDependents} dependent(s)</b>.

👶 <b>Dependent #1</b>
Please enter: <b>Full Name, Age, SSN</b>
<i>Example: "Tommy Smith, 15, 123-45-6789"</i>

💡 <i>For the Child Tax Credit ($2,000), the child must be under 17.</i>`;
              console.log("   ✅ Collecting dependent #1 details");
            }
          } else {
            aiResponse = "How many dependents do you have? Please enter a number (0-10).";
            console.log("   ❌ Invalid number");
          }
        } else {
          // User is entering dependent details
          const idx = updatedData.currentDependentIndex || 0;
          const total = updatedData.dependents.length;
          
          // Parse: "Tommy Smith, 15, 123-45-6789" or "Tommy Smith age 15 ssn 123-45-6789"
          const ssnMatch = msg.match(/(\d{3}[-\s]?\d{2}[-\s]?\d{4})/);
          const ageMatch = msg.match(/\b(\d{1,2})\b/);
          let nameText = msg
            .replace(/(\d{3}[-\s]?\d{2}[-\s]?\d{4})/, '') // Remove SSN
            .replace(/\b\d{1,2}\b/, '')  // Remove age
            .replace(/,/g, ' ')
            .replace(/age|ssn|years?|old/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
          
          if (nameText && nameText.length >= 2) {
            const age = ageMatch ? parseInt(ageMatch[1]) : null;
            const ssn = ssnMatch ? ssnMatch[1].replace(/\D/g, '') : '';
            
            updatedData.dependents[idx] = {
              name: nameText,
              ssn: ssn,
              age: age,
              relationship: 'child'
            };
            
            // Sync to backend
            syncDependentToBackend(idx + 1, updatedData.dependents[idx]);
            
            const ageStatus = age !== null 
              ? (age < 17 ? '✅ Qualifies for $2,000 Child Tax Credit!' : '(Over 17 - no CTC)')
              : '';
            
            if (idx + 1 < total) {
              // More dependents to collect
              updatedData.currentDependentIndex = idx + 1;
              aiResponse = `✓ Saved: <b>${nameText}</b> (Age: ${age || 'N/A'}) ${ageStatus}

👶 <b>Dependent #${idx + 2}</b>
Please enter: <b>Full Name, Age, SSN</b>`;
              console.log(`   ✅ Saved dependent ${idx + 1}, asking for ${idx + 2}`);
            } else {
              // All dependents collected
              updatedData.currentDependentIndex = 0;
              
              // Calculate CTC eligible
              const ctcCount = updatedData.dependents.filter(d => d.age && d.age < 17).length;
              const ctcAmount = ctcCount * 2000;
              
              nextStep = INTERVIEW_STEPS.INCOME_TYPE;
              aiResponse = `✅ <b>All ${total} dependent(s) saved!</b>

${updatedData.dependents.map((d, i) => 
  `${i+1}. ${d.name} (Age: ${d.age || 'N/A'}) ${d.age && d.age < 17 ? '✅ CTC' : ''}`
).join('\n')}

${ctcCount > 0 ? `💰 <b>Child Tax Credit: $${ctcAmount.toLocaleString()}</b> (${ctcCount} child(ren) under 17)` : ''}

${getStepMessage(nextStep, updatedData)}`;
              console.log("   ✅ All dependents collected -> INCOME_TYPE");
            }
          } else {
            aiResponse = `Please enter dependent #${idx + 1}'s information:
<b>Full Name, Age, SSN</b>
<i>Example: "Tommy Smith, 15, 123-45-6789"</i>`;
            console.log("   ❌ Could not parse dependent info");
          }
        }
        break;

      case INTERVIEW_STEPS.INCOME_TYPE:
        console.log("➡️ INCOME_TYPE (W-2?)");
        const hasW2 = parseYesNo(msg);
        console.log("   Parsed Yes/No:", hasW2);
        if (hasW2 !== null) {
          updatedData.hasW2 = hasW2;
          if (hasW2) {
            nextStep = INTERVIEW_STEPS.W2_UPLOAD;
            aiResponse = getStepMessage(nextStep, updatedData);
            console.log("   ✅ Has W-2 -> W2_UPLOAD");
          } else {
            nextStep = INTERVIEW_STEPS.OTHER_INCOME;
            aiResponse = getStepMessage(nextStep, updatedData);
            console.log("   ✅ No W-2 -> OTHER_INCOME");
          }
        } else {
          aiResponse = "Did you receive a W-2? Please answer <b>Yes</b> or <b>No</b>.";
          console.log("   ❌ Could not parse yes/no");
        }
        break;

      case INTERVIEW_STEPS.W2_UPLOAD:
        console.log("➡️ W2_UPLOAD");
        if (msg.includes("manual") || msg.includes("enter")) {
          aiResponse = `Let's enter your W-2 manually.

What was your <b>total wages</b> (Box 1)?`;
          console.log("   📝 User wants manual entry");
        } else {
          aiResponse = `📤 Please <b>upload your W-2</b> using the upload button below.

Or type "enter manually" to input the information yourself.`;
          console.log("   ⏳ Waiting for upload");
        }
        break;

      case INTERVIEW_STEPS.W2_CONFIRM:
        console.log("➡️ W2_CONFIRM");
        const confirmed = parseYesNo(msg);
        console.log("   Parsed Yes/No:", confirmed);
        if (confirmed === true) {
          nextStep = INTERVIEW_STEPS.OTHER_INCOME;
          aiResponse = getStepMessage(nextStep, updatedData);
          console.log("   ✅ Confirmed -> OTHER_INCOME");
        } else if (confirmed === false) {
          aiResponse = "Let me know what needs to be corrected, or upload the W-2 again.";
          console.log("   ❌ Not confirmed, waiting for correction");
        } else {
          aiResponse = "Is the W-2 information correct? Please answer <b>Yes</b> or <b>No</b>.";
          console.log("   ❌ Could not parse yes/no");
        }
        break;

      case INTERVIEW_STEPS.OTHER_INCOME:
        console.log("➡️ OTHER_INCOME");
        const hasOther = parseYesNo(msg);
        console.log("   Parsed Yes/No:", hasOther);
        if (hasOther === true) {
          updatedData.hasOtherIncome = true;
          nextStep = INTERVIEW_STEPS.OTHER_INCOME_AMOUNT;
          aiResponse = `What type of other income did you have?

• <b>1099-NEC</b> - Freelance/contract work
• <b>1099-INT</b> - Bank interest
• <b>1099-DIV</b> - Dividends
• <b>Other</b> - Other income

Or just tell me the <b>total amount</b>.`;
          console.log("   ✅ Has other income -> OTHER_INCOME_AMOUNT");
        } else if (hasOther === false) {
          updatedData.hasOtherIncome = false;
          nextStep = INTERVIEW_STEPS.DEDUCTIONS;
          aiResponse = getStepMessage(nextStep, updatedData);
          console.log("   ✅ No other income -> DEDUCTIONS");
        } else {
          aiResponse = "Did you have any other income? Please answer <b>Yes</b> or <b>No</b>.";
          console.log("   ❌ Could not parse yes/no");
        }
        break;

      case INTERVIEW_STEPS.OTHER_INCOME_AMOUNT:
        console.log("➡️ OTHER_INCOME_AMOUNT");
        // Try to parse an amount from the message
        const amountMatch = msg.replace(/[$,]/g, '').match(/(\d+\.?\d*)/);
        console.log("   Looking for amount in:", msg);
        if (amountMatch) {
          const amount = parseFloat(amountMatch[1]);
          updatedData.otherIncome = [{ type: 'other', amount: amount }];
          nextStep = INTERVIEW_STEPS.DEDUCTIONS;
          aiResponse = `Other income of <b>$${amount.toLocaleString()}</b> recorded. ✓

${getStepMessage(INTERVIEW_STEPS.DEDUCTIONS, updatedData)}`;
          console.log("   ✅ Amount:", amount, "-> DEDUCTIONS");
        } else if (msg.includes('1099') || msg.includes('nec') || msg.includes('int') || msg.includes('div')) {
          aiResponse = `Got it! How much was the total amount from your 1099?`;
          console.log("   📝 Recognized 1099, asking for amount");
        } else {
          aiResponse = `Please enter the <b>amount</b> of your other income (e.g., "5000" or "$5,000").`;
          console.log("   ❌ Could not parse amount");
        }
        break;

      case INTERVIEW_STEPS.DEDUCTIONS:
        console.log("➡️ DEDUCTIONS");
        console.log("   Message contains 'standard':", msg.includes("standard"));
        console.log("   Message contains 'itemize':", msg.includes("itemize"));
        if (msg.includes("standard")) {
          updatedData.deductionType = "standard";
          nextStep = INTERVIEW_STEPS.CREDITS;
          aiResponse = getStepMessage(nextStep, updatedData);
          console.log("   ✅ Standard deduction -> CREDITS");
        } else if (msg.includes("itemize")) {
          updatedData.deductionType = "itemized";
          nextStep = INTERVIEW_STEPS.CREDITS;
          aiResponse = getStepMessage(nextStep, updatedData);
          console.log("   ✅ Itemized deduction -> CREDITS");
        } else {
          aiResponse = "Would you like to use the <b>standard deduction</b> or <b>itemize</b>?";
          console.log("   ❌ Could not determine deduction type");
        }
        break;

      case INTERVIEW_STEPS.CREDITS:
        console.log("➡️ CREDITS (Student Loan?)");
        const studentLoan = parseYesNo(msg);
        console.log("   Parsed Yes/No:", studentLoan);
        if (studentLoan !== null) {
          updatedData.claimStudentLoan = studentLoan;
          // Calculate refund
          const newRefund = calculateRefund(updatedData);
          console.log("   💰 Calculated Refund:", newRefund);
          setRefundAmount(newRefund);
          nextStep = INTERVIEW_STEPS.REVIEW;
          aiResponse = getStepMessage(nextStep, updatedData);
          console.log("   ✅ -> REVIEW");
        } else {
          aiResponse = "Did you pay student loan interest? Please answer <b>Yes</b> or <b>No</b>.";
          console.log("   ❌ Could not parse yes/no");
        }
        break;

      case INTERVIEW_STEPS.REVIEW:
        console.log("➡️ REVIEW");
        console.log("   User message:", msg);
        
        // Handle dependent editing flow
        if (updatedData.editingDependents) {
          const numMatch = msg.match(/\d+/);
          if (numMatch) {
            const depCount = parseInt(numMatch[0]);
            if (depCount >= 0 && depCount <= 10) {
              updatedData.dependents = Array(depCount).fill(null).map((_, i) => ({
                name: "",
                ssn: "",
                age: "",
                relationship: ""
              }));
              updatedData.hasDependents = depCount > 0 ? true : false;
              
              if (depCount === 0) {
                updatedData.editingDependents = false;
                aiResponse = `✓ No dependents recorded.

${generateReviewMessage(updatedData)}`;
              } else {
                updatedData.currentDependentIndex = 0;
                updatedData.collectingDependentDetails = true;
                aiResponse = `Got it! ${depCount} dependent(s).

👶 <b>Dependent #1</b>
Please enter: <b>Name, Age, SSN</b>
<i>Example: "Tommy Smith, 15, 123-45-6789"</i>`;
              }
              console.log(`   📝 Dependents count: ${depCount}`);
            }
          }
          break;
        }
        
        // Handle collecting individual dependent details
        if (updatedData.collectingDependentDetails) {
          const idx = updatedData.currentDependentIndex || 0;
          const total = updatedData.dependents?.length || 0;
          
          // Parse dependent info from message (name, age, ssn)
          // Try to extract: "Tommy Smith, 15, 123-45-6789" or "Tommy Smith age 15 ssn 123-45-6789"
          const ssnMatch = msg.match(/(\d{3}[-\s]?\d{2}[-\s]?\d{4})/);
          const ageMatch = msg.match(/\b(\d{1,2})\b/);
          const nameMatch = msg.replace(/(\d{3}[-\s]?\d{2}[-\s]?\d{4})/, '').replace(/\b\d{1,2}\b/, '').replace(/[,\s]+/g, ' ').trim();
          
          if (nameMatch && nameMatch.length > 1) {
            updatedData.dependents[idx] = {
              name: nameMatch.split(' ').slice(0, 3).join(' '), // Take up to 3 words as name
              ssn: ssnMatch ? ssnMatch[1].replace(/\D/g, '') : '',
              age: ageMatch ? parseInt(ageMatch[1]) : '',
              relationship: 'child'
            };
            
            // Sync this dependent to backend
            syncDependentToBackend(idx + 1, updatedData.dependents[idx]);
            
            if (idx + 1 < total) {
              // More dependents to collect
              updatedData.currentDependentIndex = idx + 1;
              aiResponse = `✓ Saved: <b>${updatedData.dependents[idx].name}</b> (Age: ${updatedData.dependents[idx].age || 'N/A'})

👶 <b>Dependent #${idx + 2}</b>
Please enter: <b>Name, Age, SSN</b>`;
            } else {
              // All dependents collected - return to review
              updatedData.collectingDependentDetails = false;
              updatedData.editingDependents = false;
              updatedData.currentDependentIndex = 0;
              
              // Show summary and return to review
              const depSummary = updatedData.dependents.map((d, i) => 
                `  ${i+1}. ${d.name} (Age: ${d.age || 'N/A'})`
              ).join('\n');
              
              aiResponse = `✅ <b>Dependents Updated!</b>

${depSummary}

${generateReviewMessage(updatedData)}`;
            }
          } else {
            aiResponse = `Please enter the dependent's info in this format:
<b>Name, Age, SSN</b>
<i>Example: "Tommy Smith, 15, 123-45-6789"</i>`;
          }
          break;
        }
        
        if (msg.includes("yes") || msg.includes("correct") || msg.includes("good") || msg.includes("looks good") || msg.includes("confirm")) {
          nextStep = INTERVIEW_STEPS.COMPLETE;
          aiResponse = getStepMessage(nextStep, updatedData);
          console.log("   ✅ CONFIRMED -> COMPLETE! 🎉");
        } 
        // Handle specific edit requests
        else if (msg.includes("income") || msg.includes("w2") || msg.includes("w-2") || msg.includes("wages")) {
          nextStep = INTERVIEW_STEPS.INCOME_TYPE;
          updatedData.hasW2 = null;
          updatedData.w2Data = null;
          updatedData.hasOtherIncome = null;
          aiResponse = `Let's update your income information.

Did you receive a <b>W-2</b> from an employer in ${taxYear}?`;
          console.log("   🔄 Edit: INCOME -> INCOME_TYPE");
        }
        else if (msg.includes("address") || msg.includes("street") || msg.includes("city")) {
          nextStep = INTERVIEW_STEPS.ADDRESS;
          aiResponse = `Let's update your address.

What's your <b>current address</b>?
<i>(Street, City, State, ZIP)</i>`;
          console.log("   🔄 Edit: ADDRESS");
        }
        else if (msg.includes("name") || msg.includes("first") || msg.includes("last")) {
          nextStep = INTERVIEW_STEPS.FIRST_NAME;
          aiResponse = `Let's update your name.

What's your <b>first name</b>?`;
          console.log("   🔄 Edit: NAME -> FIRST_NAME");
        }
        else if (msg.includes("filing") || msg.includes("status") || msg.includes("married") || msg.includes("single")) {
          nextStep = INTERVIEW_STEPS.FILING_STATUS;
          aiResponse = `Let's update your filing status.

What's your <b>filing status</b>?`;
          console.log("   🔄 Edit: FILING_STATUS");
        }
        else if (msg.includes("dependent") || msg.includes("child") || msg.includes("kids")) {
          // DON'T reset to DEPENDENTS step - that would continue through income steps!
          // Instead, ask for dependent details here and return to REVIEW
          const depCount = updatedData.dependents?.length || 0;
          aiResponse = `Let's update your dependents.

📝 <b>Currently: ${depCount} dependent(s)</b>

How many dependents do you have? (Enter a number)
<i>After you enter the count, I'll ask for each dependent's details.</i>`;
          
          // Set a flag to handle dependent details flow
          updatedData.editingDependents = true;
          // DON'T change nextStep - stay in REVIEW to handle the response
          console.log("   🔄 Edit: DEPENDENTS (staying in REVIEW mode)");
        }
        else if (msg.includes("deduction") || msg.includes("itemize") || msg.includes("standard")) {
          nextStep = INTERVIEW_STEPS.DEDUCTIONS;
          updatedData.deductionType = "";
          aiResponse = `Let's update your deductions.

Would you like to use the <b>standard deduction</b> or <b>itemize</b>?`;
          console.log("   🔄 Edit: DEDUCTIONS");
        }
        else if (msg.includes("ssn") || msg.includes("social")) {
          nextStep = INTERVIEW_STEPS.SSN;
          aiResponse = `Let's update your SSN.

Please enter your <b>Social Security Number</b>.
<i>(Format: XXX-XX-XXXX)</i>`;
          console.log("   🔄 Edit: SSN");
        }
        else if (msg.includes("no") || msg.includes("change") || msg.includes("edit") || msg.includes("update")) {
          aiResponse = `What would you like to change?

• <b>name</b> - Update your name
• <b>address</b> - Update your address  
• <b>filing status</b> - Change filing status
• <b>dependents</b> - Update dependents
• <b>income</b> - Update W-2 or other income
• <b>deductions</b> - Change deduction type
• <b>ssn</b> - Update Social Security Number`;
          console.log("   📋 User wants to edit - showing options");
        }
        else {
          aiResponse = `Does everything look correct?

Say <b>Yes</b> to finalize, or tell me what to change:
• name, address, filing status, dependents, income, deductions, ssn`;
          console.log("   ❓ Unknown response - asking for clarification");
        }
        break;

      default:
        console.log("➡️ DEFAULT - Not in interview step, sending to backend AI");
        // Not in interview mode, send to AI backend
        return null;
    }

    // 🔍 DEBUG: Final summary
    console.log("-------------------------------------------");
    console.log("📍 Next Step:", nextStep);
    console.log("📊 Updated Tax Data:", updatedData);
    console.log("💬 AI Response Preview:", aiResponse.substring(0, 80) + "...");
    console.log("===========================================\n");

    setTaxData(updatedData);
    setCurrentStep(nextStep);
    
    // Sync with backend
    syncTaxDataToBackend(updatedData);

    return aiResponse;
  };

  // ============================================================
  // Helper Functions
  // ============================================================
  const parseFilingStatus = (msg) => {
    if (msg.includes("single")) return "single";
    if (msg.includes("married") && msg.includes("joint")) return "married_joint";
    if (msg.includes("married") && msg.includes("separate")) return "married_separate";
    if (msg.includes("head")) return "head_of_household";
    if (msg === "1" || msg === "single") return "single";
    if (msg === "2") return "married_joint";
    if (msg === "3") return "married_separate";
    if (msg === "4") return "head_of_household";
    return null;
  };

  const formatFilingStatus = (status) => {
    const labels = {
      single: "Single",
      married_joint: "Married Filing Jointly",
      married_separate: "Married Filing Separately",
      head_of_household: "Head of Household",
    };
    return labels[status] || status;
  };

  const parseYesNo = (msg) => {
    if (msg.includes("yes") || msg.includes("yeah") || msg.includes("yep") || msg === "y") return true;
    if (msg.includes("no") || msg.includes("nope") || msg === "n" || msg.includes("none")) return false;
    return null;
  };

  const parseSSN = (input) => {
    const digits = input.replace(/\D/g, "");
    if (digits.length === 9) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
    }
    return null;
  };

  const parseAddress = (input) => {
    // Simple address parser - could be improved with API
    const parts = input.split(",").map((p) => p.trim());
    if (parts.length >= 3) {
      const stateZip = parts[parts.length - 1].split(" ");
      return {
        street: parts[0],
        city: parts[1],
        state: stateZip[0] || "CA",
        zip: stateZip[1] || "",
      };
    }
    // Try to extract from a single line
    const match = input.match(/(.+),\s*(.+),\s*([A-Z]{2})\s*(\d{5})/i);
    if (match) {
      return {
        street: match[1],
        city: match[2],
        state: match[3].toUpperCase(),
        zip: match[4],
      };
    }
    return null;
  };

  const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

  const calculateTotalIncome = (data) => {
    let total = 0;
    if (data.w2Data?.wages) total += data.w2Data.wages;
    if (data.otherIncome && data.otherIncome.length > 0) {
      data.otherIncome.forEach(inc => {
        total += inc.amount || 0;
      });
    }
    return total;
  };

  const calculateWithheld = (data) => {
    let total = 0;
    if (data.w2Data?.federalWithheld) total += data.w2Data.federalWithheld;
    return total;
  };

  const calculateTax = (data) => {
    const income = calculateTotalIncome(data);
    
    // Standard deductions for 2024 based on filing status
    let standardDeduction = 14600; // Single
    if (data.filingStatus === 'married_filing_jointly') {
      standardDeduction = 29200;
    } else if (data.filingStatus === 'head_of_household') {
      standardDeduction = 21900;
    } else if (data.filingStatus === 'married_filing_separately') {
      standardDeduction = 14600;
    }
    
    const taxableIncome = Math.max(0, income - standardDeduction);
    
    // Tax brackets depend on filing status
    if (data.filingStatus === 'married_filing_jointly') {
      // MFJ brackets
      if (taxableIncome <= 23200) return taxableIncome * 0.1;
      if (taxableIncome <= 94300) return 2320 + (taxableIncome - 23200) * 0.12;
      if (taxableIncome <= 201050) return 10852 + (taxableIncome - 94300) * 0.22;
      return 34337 + (taxableIncome - 201050) * 0.24;
    } else {
      // Single/other brackets
      if (taxableIncome <= 11600) return taxableIncome * 0.1;
      if (taxableIncome <= 47150) return 1160 + (taxableIncome - 11600) * 0.12;
      if (taxableIncome <= 100525) return 5426 + (taxableIncome - 47150) * 0.22;
      return 17168 + (taxableIncome - 100525) * 0.24;
    }
  };

  const calculateRefund = (data) => {
    const withheld = calculateWithheld(data);
    const tax = calculateTax(data);
    let credits = 0;
    
    // Child Tax Credit - only for dependents under 17
    if (data.hasDependents && data.dependents.length > 0) {
      const ctcEligible = data.dependents.filter(d => {
        const age = parseInt(d.age);
        return !isNaN(age) && age < 17;
      }).length;
      credits += ctcEligible * 2000;
    }
    
    return Math.round(withheld - tax + credits);
  };

  const generateReviewMessage = (data) => {
    const totalOtherIncome = data.otherIncome?.reduce((sum, inc) => sum + (inc.amount || 0), 0) || 0;
    const totalIncome = calculateTotalIncome(data);
    
    // Count CTC eligible dependents
    const ctcEligible = data.dependents?.filter(d => {
      const age = parseInt(d.age);
      return !isNaN(age) && age < 17;
    }).length || 0;
    
    // Format dependent list
    const dependentList = data.hasDependents && data.dependents?.length > 0
      ? data.dependents.map((d, i) => {
          const age = d.age ? `${d.age} yrs` : 'N/A';
          const ctcStatus = d.age && parseInt(d.age) < 17 ? '✅ CTC' : '';
          return `  ${i+1}. ${d.name || 'Dependent ' + (i+1)} (${age}) ${ctcStatus}`;
        }).join('\n')
      : '';
    
    return `📋 <b>Review Your Tax Return</b>

<b>Personal Information:</b>
• Name: ${data.firstName} ${data.lastName}
• SSN: ***-**-${data.ssn?.slice(-4) || "XXXX"}
• Address: ${data.address.street}, ${data.address.city}, ${data.address.state} ${data.address.zip}
• Filing Status: ${formatFilingStatus(data.filingStatus)}
• Dependents: ${data.hasDependents ? data.dependents.length : "None"}
${dependentList ? '\n' + dependentList : ''}

<b>Income:</b>
• W-2 Wages: ${data.w2Data ? `$${data.w2Data.wages.toLocaleString()}` : "None"}
• Other Income: ${totalOtherIncome > 0 ? `$${totalOtherIncome.toLocaleString()}` : "None"}
• <b>Total Income: $${totalIncome.toLocaleString()}</b>

<b>Deductions:</b>
• Type: ${data.deductionType === "standard" ? "Standard" : "Itemized"}
• Amount: $${taxYear === "2024" ? "14,600" : "15,000"}

<b>Estimated Refund: $${calculateRefund(data).toLocaleString()}</b>

Does everything look correct? Say <b>Yes</b> to finalize, or tell me what to change.`;
  };

  const syncTaxDataToBackend = async (data) => {
    try {
      await api.post(`/api/tax/update`, {
        userId,
        taxData: data,
        taxYear: parseInt(taxYear),
      });
    } catch (err) {
      console.log("Sync error:", err.message);
    }
  };

  // Sync individual dependent to backend
  const syncDependentToBackend = async (depNum, depData) => {
    try {
      const updates = {};
      updates[`dependent_${depNum}_name`] = depData.name || '';
      updates[`dependent_${depNum}_ssn`] = depData.ssn || '';
      updates[`dependent_${depNum}_age`] = depData.age || '';
      updates[`dependent_${depNum}_relationship`] = depData.relationship || 'child';
      
      // Calculate under_17
      if (depData.age) {
        const age = parseInt(depData.age);
        updates[`dependent_${depNum}_under_17`] = age < 17 ? 'yes' : 'no';
      }
      
      await api.post(`/api/ai/update`, {
        userId,
        updates
      });
      
      // Also update dependent_count and has_dependents
      await api.post(`/api/ai/update`, {
        userId,
        updates: {
          dependent_count: taxData.dependents?.length || 1,
          has_dependents: 'yes'
        }
      });
      
      console.log(`   ✅ Synced dependent ${depNum} to backend:`, depData.name);
    } catch (err) {
      console.log("Sync dependent error:", err.message);
    }
  };

  // ============================================================
  // Send Message Handler
  // ============================================================
  const sendMessage = async (customMessage = null) => {
    const userMsg = customMessage || input;
    if (!userMsg.trim() || isLoading) return;

    console.log("\n🚀 SEND MESSAGE TRIGGERED");
    console.log("   Message:", userMsg);
    console.log("   Interview Mode:", interviewMode);
    console.log("   Current Step:", currentStep);

    setInput("");
    setMessages((prev) => [...prev, { sender: "user", text: userMsg }]);
    setIsLoading(true);

    // Check for special commands
    const lowerMsg = userMsg.toLowerCase();
    if (lowerMsg.includes("download 1040") || lowerMsg === "download") {
      console.log("   📥 Special command: Download 1040");
      download1040();
      setIsLoading(false);
      return;
    }

    // If in interview mode, use structured flow
    if (interviewMode) {
      console.log("   🎯 Using INTERVIEW MODE flow");
      const aiResponse = processInterviewResponse(userMsg);
      if (aiResponse) {
        console.log("   ✅ Got response from interview flow");
        setTimeout(() => {
          setMessages((prev) => [...prev, { sender: "ai", text: aiResponse }]);
          setIsLoading(false);
        }, 500);
        return;
      } else {
        console.log("   ⚠️ Interview flow returned null, falling back to backend");
      }
    } else {
      console.log("   📡 Not in interview mode, using backend AI");
    }

    // Otherwise, send to backend AI for general questions
    try {
      console.log("   📡 Sending to backend API...");
      const res = await api.post(`/api/ai/chat`, {
        userId,
        message: userMsg,
        taxYear: parseInt(taxYear),
        taxData, // Send current state for context
      });

      console.log("   ✅ Backend response received");
      if (res.data.refund !== undefined) setRefundAmount(res.data.refund);
      
      // Refresh server data if panel is open
      if (showDataPanel) {
        fetchServerData();
      }

      let responseText = res.data.reply || res.data.response || "I'm here to help!";
      responseText = responseText.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br/>");

      setMessages((prev) => [...prev, { sender: "ai", text: responseText }]);
    } catch (err) {
      console.error("❌ Chat error:", err);
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: "❌ Sorry, there was an error. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // Start Tax Filing Interview
  // ============================================================
  const startInterview = () => {
    console.log("\n🎬 STARTING TAX INTERVIEW");
    console.log("   Setting interviewMode = true");
    console.log("   Setting currentStep = FILING_STATUS");
    setInterviewMode(true);
    setCurrentStep(INTERVIEW_STEPS.FILING_STATUS);
    const aiMessage = getStepMessage(INTERVIEW_STEPS.FILING_STATUS);
    setMessages((prev) => [...prev, { sender: "ai", text: aiMessage }]);
    console.log("   ✅ Interview started!\n");
  };

  // ============================================================
  // FILE UPLOAD HANDLER - Auto-detects form type, saves for CPA review
  // ============================================================
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: "❌ Please upload an image (JPG, PNG) or PDF file." },
      ]);
      return;
    }

    setIsUploading(true);
    setMessages((prev) => [...prev, { sender: "user", text: `📤 Uploading: ${file.name}...` }]);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", userId);
      formData.append("taxYear", taxYear);  // ✅ Added taxYear

      // ✅ CHANGED: /api/file/upload → /api/forms/upload (auto-detects form type)
      const res = await api.post(`/api/forms/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        const extracted = res.data.extractedFields || {};
        const formType = res.data.formType || "Document";
        
        setUploadedFiles((prev) => [...prev, { name: file.name, type: formType }]);

        // Build confirmation message based on form type
        let confirmMsg = `✅ <b>${formType} Uploaded Successfully!</b>\n\n`;
        
        if (formType === "W-2" || formType === "W2") {
          if (extracted.employer_name) confirmMsg += `• Employer: <b>${extracted.employer_name}</b>\n`;
          if (extracted.wages_tips_other_comp) confirmMsg += `• Wages (Box 1): <b>$${Number(extracted.wages_tips_other_comp).toLocaleString()}</b>\n`;
          if (extracted.federal_income_tax_withheld) confirmMsg += `• Federal Withheld (Box 2): <b>$${Number(extracted.federal_income_tax_withheld).toLocaleString()}</b>\n`;
          if (extracted.state_income_tax) confirmMsg += `• State Tax Withheld: <b>$${Number(extracted.state_income_tax).toLocaleString()}</b>\n`;
          
          // Update local taxData for interview flow
          const w2Data = {
            employer: extracted.employer_name || "Employer",
            wages: Number(extracted.wages_tips_other_comp) || 0,
            federalWithheld: Number(extracted.federal_income_tax_withheld) || 0,
            stateWithheld: Number(extracted.state_income_tax) || 0,
          };
          setTaxData((prev) => ({ ...prev, w2Data, hasW2: true }));
          
          // If in interview mode, move to confirm step
          if (interviewMode && currentStep === INTERVIEW_STEPS.W2_UPLOAD) {
            setCurrentStep(INTERVIEW_STEPS.W2_CONFIRM);
          }
          
          // Update refund estimate
          const newRefund = w2Data.federalWithheld - calculateTax({ ...taxData, w2Data });
          setRefundAmount(Math.round(newRefund));
          
        } else if (formType === "1099-NEC" || formType === "1099NEC") {
          if (extracted.payer_name) confirmMsg += `• Payer: <b>${extracted.payer_name}</b>\n`;
          if (extracted.nonemployee_compensation) confirmMsg += `• Self-Employment Income: <b>$${Number(extracted.nonemployee_compensation).toLocaleString()}</b>\n`;
          confirmMsg += `\n⚠️ Self-employment tax will apply (15.3%)\n`;
          
        } else if (formType === "1099-INT" || formType === "1099INT") {
          if (extracted.payer_name) confirmMsg += `• Bank/Payer: <b>${extracted.payer_name}</b>\n`;
          if (extracted.interest_income) confirmMsg += `• Interest Income: <b>$${Number(extracted.interest_income).toLocaleString()}</b>\n`;
          
        } else if (formType === "1099-DIV" || formType === "1099DIV") {
          if (extracted.payer_name) confirmMsg += `• Payer: <b>${extracted.payer_name}</b>\n`;
          if (extracted.ordinary_dividends) confirmMsg += `• Ordinary Dividends: <b>$${Number(extracted.ordinary_dividends).toLocaleString()}</b>\n`;
          if (extracted.qualified_dividends) confirmMsg += `• Qualified Dividends: <b>$${Number(extracted.qualified_dividends).toLocaleString()}</b>\n`;
          
        } else if (formType === "1099-R" || formType === "1099R") {
          if (extracted.payer_name) confirmMsg += `• Payer: <b>${extracted.payer_name}</b>\n`;
          if (extracted.gross_distribution) confirmMsg += `• Gross Distribution: <b>$${Number(extracted.gross_distribution).toLocaleString()}</b>\n`;
          if (extracted.taxable_amount) confirmMsg += `• Taxable Amount: <b>$${Number(extracted.taxable_amount).toLocaleString()}</b>\n`;
          if (extracted.distribution_code) confirmMsg += `• Distribution Code: <b>${extracted.distribution_code}</b>\n`;
          
        } else if (formType === "1099-G" || formType === "1099G") {
          if (extracted.payer_name) confirmMsg += `• Agency: <b>${extracted.payer_name}</b>\n`;
          if (extracted.unemployment_compensation) confirmMsg += `• Unemployment: <b>$${Number(extracted.unemployment_compensation).toLocaleString()}</b>\n`;
          
        } else if (formType === "SSA-1099" || formType === "SSA1099") {
          if (extracted.net_benefits) confirmMsg += `• Social Security Benefits: <b>$${Number(extracted.net_benefits).toLocaleString()}</b>\n`;
          
        } else if (formType === "1098") {
          if (extracted.lender_name) confirmMsg += `• Lender: <b>${extracted.lender_name}</b>\n`;
          if (extracted.mortgage_interest_received) confirmMsg += `• Mortgage Interest: <b>$${Number(extracted.mortgage_interest_received).toLocaleString()}</b>\n`;
          confirmMsg += `\n💡 This can be used for itemized deductions!\n`;
          
        } else if (formType === "1098-T" || formType === "1098T") {
          if (extracted.filer_name) confirmMsg += `• School: <b>${extracted.filer_name}</b>\n`;
          if (extracted.payments_received) confirmMsg += `• Tuition Paid: <b>$${Number(extracted.payments_received).toLocaleString()}</b>\n`;
          if (extracted.scholarships_grants) confirmMsg += `• Scholarships: <b>$${Number(extracted.scholarships_grants).toLocaleString()}</b>\n`;
          confirmMsg += `\n💡 You may qualify for education credits!\n`;
          
        } else if (formType === "1098-E" || formType === "1098E") {
          if (extracted.lender_name) confirmMsg += `• Lender: <b>${extracted.lender_name}</b>\n`;
          if (extracted.student_loan_interest_received) confirmMsg += `• Student Loan Interest: <b>$${Number(extracted.student_loan_interest_received).toLocaleString()}</b>\n`;
          confirmMsg += `\n💡 Deductible up to $2,500!\n`;
          
        } else if (formType === "1099-K" || formType === "1099K") {
          if (extracted.pse_name) confirmMsg += `• Platform: <b>${extracted.pse_name}</b>\n`;
          if (extracted.gross_amount) confirmMsg += `• Gross Payments: <b>$${Number(extracted.gross_amount).toLocaleString()}</b>\n`;
          
        } else if (formType === "1099-MISC" || formType === "1099MISC") {
          if (extracted.payer_name) confirmMsg += `• Payer: <b>${extracted.payer_name}</b>\n`;
          if (extracted.other_income) confirmMsg += `• Other Income: <b>$${Number(extracted.other_income).toLocaleString()}</b>\n`;
          if (extracted.rents) confirmMsg += `• Rents: <b>$${Number(extracted.rents).toLocaleString()}</b>\n`;
          
        } else {
          confirmMsg += `<i>Form data extracted. Check data panel for details.</i>\n`;
        }
        
        // ✅ Show CPA review status
        confirmMsg += `\n<hr/>\n`;
        confirmMsg += `📋 <b>Status:</b> Pending CPA Review\n`;
        confirmMsg += `<i>File saved. A CPA will verify this data before filing.</i>\n`;
        confirmMsg += `\n<b>Is this information correct?</b>`;

        setMessages((prev) => [...prev, { sender: "ai", text: confirmMsg }]);
        
        // Refresh server data
        fetchServerData();
      } else {
        setMessages((prev) => [
          ...prev,
          { sender: "ai", text: `⚠️ ${res.data.error || res.data.message || "Upload failed"}` },
        ]);
      }

      if (res.data.refund !== undefined) setRefundAmount(res.data.refund);
      if (res.data.progress !== undefined) setProgress(res.data.progress);
    } catch (err) {
      console.error("Upload error:", err);
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: `❌ Upload failed: ${err.response?.data?.error || err.message}` },
      ]);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const triggerFileUpload = () => fileInputRef.current?.click();

  // ============================================================
  // Download 1040 - Shows SSN confirmation first
  // ============================================================
  const download1040 = async () => {
    try {
      // First, get all the tax data from backend to show in confirmation
      const res = await api.post(`/api/ai/data`, { userId });
      const data = res.data.data || {};
      
      // Check if we have minimum required data
      if (!data.first_name || !data.last_name) {
        setMessages((prev) => [
          ...prev,
          { sender: "ai", text: "❌ Please complete your personal information before downloading Form 1040." }
        ]);
        return;
      }
      
      // Check for SSN
      if (!data.ssn) {
        setMessages((prev) => [
          ...prev,
          { sender: "ai", text: "❌ Please provide your Social Security Number before downloading Form 1040." }
        ]);
        return;
      }
      
      // Store the data and show confirmation modal
      setSSNConfirmationData(data);
      setShowSSNConfirmation(true);
      
    } catch (err) {
      console.error("Error fetching data:", err);
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: "❌ Error loading tax data. Please try again." }
      ]);
    }
  };

  // ============================================================
  // Handle Confirmed 1040 Download (after SSN verification)
  // ============================================================
  const handleConfirmedDownload = async () => {
    setShowSSNConfirmation(false);
    setIsLoading(true);
    
    setMessages((prev) => [
      ...prev,
      { sender: "ai", text: "📄 SSN verified! Generating your Form 1040... Please wait." }
    ]);

    try {
      const response = await api.post(
        `/api/tax/1040`,
        { userId, taxYear: parseInt(taxYear) },
        { responseType: "blob" }
      );

      // Create download link
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Form_1040_${taxYear}_${ssnConfirmationData.last_name || 'TaxReturn'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: `✅ <b>Form 1040 Downloaded!</b><br/><br/>📄 File: Form_1040_${taxYear}_${ssnConfirmationData.last_name}.pdf<br/><br/>📋 Please review the form before filing.` }
      ]);
    } catch (err) {
      console.error("1040 Error:", err);
      
      // Try to get error message from response
      let errorMessage = "Error generating Form 1040.";
      if (err.response?.data) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          errorMessage = json.message || json.error || errorMessage;
        } catch (e) {}
      }
      
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: `❌ ${errorMessage}<br/><br/>Please make sure all required information is complete.` }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // Reset Session
  // ============================================================
  const resetSession = async () => {
    if (!window.confirm("Are you sure you want to start over?")) return;
    try {
      await api.post(`/api/ai/reset`, { userId });
      setTaxData({
        firstName: currentUser?.firstName || "",
        lastName: currentUser?.lastName || "",
        ssn: "",
        address: { street: "", city: "", state: "CA", zip: "" },
        filingStatus: "",
        hasDependents: null,
        dependents: [],
        hasW2: null,
        w2Data: null,
        hasOtherIncome: null,
        otherIncome: [],
        deductionType: "",
        itemizedDeductions: {},
        claimEITC: null,
        claimChildCredit: null,
        claimStudentLoan: null,
      });
      setCurrentStep(INTERVIEW_STEPS.WELCOME);
      setInterviewMode(false);
      setRefundAmount(0);
      setProgress(0);
      setUploadedFiles([]);
      
      const welcomeMsg = `👋 Session reset! I'm ready to help you file your taxes.

Click <b>"File my taxes"</b> to start fresh!`;
      setMessages([{ sender: "ai", text: welcomeMsg }]);
    } catch (err) {
      console.error("Reset error:", err);
    }
  };

  // Logout
  const handleLogout = () => {
    if (!window.confirm("Are you sure you want to sign out?")) return;
    localStorage.removeItem("taxsky_token");
    localStorage.removeItem("taxsky_user");
    localStorage.removeItem("taxsky_userId");
    localStorage.removeItem("taxsky_language");
    localStorage.removeItem("taxsky_state");
    window.location.href = "/";
  };

  // ============================================================
  // Quick Actions
  // ============================================================
  const quickActions = [
    { label: "📋 File my taxes", action: startInterview },
    { label: "📊 Show my data", action: () => setShowDataPanel(true) },
    { label: "📥 Download 1040", action: download1040 },
    { label: "🔄 Start Over", action: resetSession },
  ];

  const quickQuestions = [
    { label: "📋 Standard Deduction", message: `What is the ${taxYear} standard deduction?` },
    { label: "👶 Child Tax Credit", message: `How much is the ${taxYear} child tax credit?` },
    { label: "💵 EITC", message: `What is the ${taxYear} EITC?` },
    { label: "📊 Tax Brackets", message: `What are the ${taxYear} tax brackets?` },
  ];

  // Filing status buttons for interview
  const filingStatusOptions = [
    { label: "Single", value: "single" },
    { label: "Married Filing Jointly", value: "married_joint" },
    { label: "Married Filing Separately", value: "married_separate" },
    { label: "Head of Household", value: "head_of_household" },
  ];

  // ============================================================
  // Render
  // ============================================================
  return (
    <div className="h-screen w-screen flex bg-gray-100">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex justify-between items-center shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧾</span>
            <div>
              <div className="font-bold text-lg">TaxSky AI Assistant</div>
              <div className="text-xs text-blue-200">Smart Tax Filing • {taxYear}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="bg-blue-500 hover:bg-blue-400 px-3 py-1 rounded text-sm flex items-center gap-1"
            >
              📊 Dashboard
            </button>
            <select
              value={taxYear}
              onChange={(e) => setTaxYear(e.target.value)}
              className="bg-blue-500 text-white border border-blue-400 rounded px-2 py-1 text-sm"
            >
              <option value="2024">2024</option>
              <option value="2025">2025</option>
            </select>
            <button
              onClick={() => setShowDataPanel(!showDataPanel)}
              className="bg-blue-500 hover:bg-blue-400 px-3 py-1 rounded text-sm"
            >
              {showDataPanel ? "Hide" : "📋 Data"}
            </button>
            {currentUser && (
              <div className="flex items-center gap-2 ml-2 pl-2 border-l border-blue-400">
                <img src={currentUser.picture} alt={currentUser.name} className="w-8 h-8 rounded-full" />
                <span className="text-sm hidden md:block">{currentUser.firstName || currentUser.name}</span>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-sm"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Refund & Progress Bar */}
        <div className="bg-white px-6 py-4 shadow">
          <div className="flex justify-between items-center mb-2">
            <div>
              <div className="text-sm text-gray-500">Estimated Refund</div>
              <div className={`text-3xl font-bold ${animatedRefund >= 0 ? "text-green-600" : "text-red-600"}`}>
                ${animatedRefund.toLocaleString()}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Progress</div>
              <div className="text-2xl font-bold text-blue-600">{progress}%</div>
            </div>
          </div>
          <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Uploaded Files */}
        {uploadedFiles.length > 0 && (
          <div className="bg-blue-50 px-6 py-2 flex flex-wrap gap-2">
            <span className="text-sm text-blue-600 font-medium">Documents:</span>
            {uploadedFiles.map((file, i) => (
              <span key={i} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                📄 {file.type}
              </span>
            ))}
          </div>
        )}

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`max-w-2xl px-5 py-4 rounded-2xl shadow-sm ${
                msg.sender === "ai"
                  ? "bg-white text-gray-800 border border-gray-200"
                  : "bg-blue-600 text-white ml-auto"
              }`}
            >
              <div dangerouslySetInnerHTML={{ __html: msg.text }} />
            </div>
          ))}
          {isLoading && (
            <div className="bg-white text-gray-500 px-5 py-4 rounded-2xl shadow-sm border max-w-2xl">
              <span className="animate-pulse">⏳ Thinking...</span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Interview-specific buttons */}
        {interviewMode && currentStep === INTERVIEW_STEPS.FILING_STATUS && (
          <div className="px-4 pb-2">
            <div className="text-xs text-gray-500 mb-2">Select your filing status:</div>
            <div className="flex gap-2 flex-wrap">
              {filingStatusOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => sendMessage(opt.label)}
                  className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Yes/No buttons for applicable steps */}
        {interviewMode &&
          [INTERVIEW_STEPS.DEPENDENTS, INTERVIEW_STEPS.INCOME_TYPE, INTERVIEW_STEPS.W2_CONFIRM, INTERVIEW_STEPS.OTHER_INCOME, INTERVIEW_STEPS.CREDITS].includes(currentStep) && (
            <div className="px-4 pb-2">
              <div className="flex gap-2">
                <button
                  onClick={() => sendMessage("Yes")}
                  className="bg-green-100 hover:bg-green-200 text-green-700 px-6 py-2 rounded-lg text-sm font-medium"
                >
                  ✓ Yes
                </button>
                <button
                  onClick={() => sendMessage("No")}
                  className="bg-red-100 hover:bg-red-200 text-red-700 px-6 py-2 rounded-lg text-sm font-medium"
                >
                  ✗ No
                </button>
              </div>
            </div>
          )}

        {/* Review step - Confirm or Edit buttons */}
        {interviewMode && currentStep === INTERVIEW_STEPS.REVIEW && (
          <div className="px-4 pb-2">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => sendMessage("Yes, looks good")}
                className="bg-green-100 hover:bg-green-200 text-green-700 px-4 py-2 rounded-lg text-sm font-medium"
              >
                ✓ Yes, Submit
              </button>
              <button
                onClick={() => sendMessage("change income")}
                className="bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-3 py-2 rounded-lg text-sm font-medium"
              >
                Edit Income
              </button>
              <button
                onClick={() => sendMessage("change address")}
                className="bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-3 py-2 rounded-lg text-sm font-medium"
              >
                Edit Address
              </button>
              <button
                onClick={() => sendMessage("change filing status")}
                className="bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-3 py-2 rounded-lg text-sm font-medium"
              >
                Edit Filing Status
              </button>
              <button
                onClick={() => sendMessage("change dependents")}
                className="bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-3 py-2 rounded-lg text-sm font-medium"
              >
                Edit Dependents
              </button>
            </div>
          </div>
        )}

        {/* Deduction buttons */}
        {interviewMode && currentStep === INTERVIEW_STEPS.DEDUCTIONS && (
          <div className="px-4 pb-2">
            <div className="flex gap-2">
              <button
                onClick={() => sendMessage("Standard deduction")}
                className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium"
              >
                📋 Standard Deduction
              </button>
              <button
                onClick={() => sendMessage("Itemize")}
                className="bg-purple-100 hover:bg-purple-200 text-purple-700 px-4 py-2 rounded-lg text-sm font-medium"
              >
                📝 Itemize Deductions
              </button>
            </div>
          </div>
        )}

        {/* Quick Questions (when not in interview) */}
        {!interviewMode && (
          <div className="px-4 pb-2">
            <div className="text-xs text-gray-500 mb-2">💡 Ask a tax question:</div>
            <div className="flex gap-2 flex-wrap">
              {quickQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q.message)}
                  className="bg-purple-50 hover:bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg text-xs font-medium border border-purple-200"
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="px-4 pb-2">
          <div className="text-xs text-gray-500 mb-2">📋 Actions:</div>
          <div className="flex gap-2 flex-wrap">
            {quickActions.map((action, i) => (
              <button
                key={i}
                onClick={action.action}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium"
              >
                {action.label}
              </button>
            ))}
            <button
              onClick={triggerFileUpload}
              disabled={isUploading}
              className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
            >
              {isUploading ? "⏳ Uploading..." : "📤 Upload Document"}
            </button>
          </div>
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={triggerFileUpload}
            disabled={isUploading}
            className="bg-gray-100 hover:bg-gray-200 text-gray-600 p-3 rounded-xl disabled:opacity-50"
          >
            📎
          </button>
          <input
            className="flex-1 border border-gray-300 rounded-xl p-3 focus:outline-none focus:border-blue-500"
            placeholder={interviewMode ? "Type your answer..." : `Ask about ${taxYear} taxes...`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            disabled={isLoading}
          />
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium disabled:opacity-50"
            onClick={() => sendMessage()}
            disabled={isLoading || !input.trim()}
          >
            Send
          </button>
        </div>
      </div>

      {/* Data Sidebar */}
      {showDataPanel && (
        <div className="w-80 bg-white border-l shadow-lg overflow-y-auto p-4">
          <h2 className="font-bold text-lg mb-4">📋 Your Tax Data</h2>

          {currentUser && (
            <div className="mb-4 pb-4 border-b">
              <div className="flex items-center gap-3">
                <img src={currentUser.picture} alt="" className="w-10 h-10 rounded-full" />
                <div>
                  <div className="font-medium">{currentUser.name}</div>
                  <div className="text-xs text-gray-500">{currentUser.email}</div>
                </div>
              </div>
            </div>
          )}

          {serverData ? (
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-500">Name:</span>{" "}
                <b>{serverData.first_name && serverData.last_name 
                  ? `${serverData.first_name} ${serverData.last_name}` 
                  : serverData.first_name || "Not provided"}</b>
              </div>
              <div>
                <span className="text-gray-500">Filing Status:</span>{" "}
                <b>{serverData.filing_status ? formatFilingStatus(serverData.filing_status) : "Not selected"}</b>
              </div>
              <div>
                <span className="text-gray-500">Address:</span>{" "}
                <b>{serverData.address 
                  ? `${serverData.address}, ${serverData.city || ''} ${serverData.state || ''} ${serverData.zip || ''}` 
                  : "Not provided"}</b>
              </div>
              <div>
                <span className="text-gray-500">Dependents:</span>{" "}
                <b>{serverData.has_dependents === 'yes' || serverData.dependent_count > 0
                  ? `${serverData.dependent_count || 0} child(ren)`
                  : serverData.has_dependents === 'no' ? "None" : "Not answered"}</b>
              </div>
              
              {/* Show dependent names if any */}
              {serverData.dependent_count > 0 && (
                <div className="ml-3 text-xs text-gray-600">
                  {serverData.dependent_1_name && <div>• {serverData.dependent_1_name} {serverData.dependent_1_age ? `(${serverData.dependent_1_age} yrs)` : ''}</div>}
                  {serverData.dependent_2_name && <div>• {serverData.dependent_2_name} {serverData.dependent_2_age ? `(${serverData.dependent_2_age} yrs)` : ''}</div>}
                  {serverData.dependent_3_name && <div>• {serverData.dependent_3_name} {serverData.dependent_3_age ? `(${serverData.dependent_3_age} yrs)` : ''}</div>}
                  {serverData.dependent_4_name && <div>• {serverData.dependent_4_name} {serverData.dependent_4_age ? `(${serverData.dependent_4_age} yrs)` : ''}</div>}
                </div>
              )}
              
              <div>
                <span className="text-gray-500">W-2 Wages:</span>{" "}
                <b>{serverData.total_wages ? `$${Number(serverData.total_wages).toLocaleString()}` : "Not uploaded"}</b>
              </div>
              <div>
                <span className="text-gray-500">Federal Withheld:</span>{" "}
                <b>{serverData.total_withheld ? `$${Number(serverData.total_withheld).toLocaleString()}` : "—"}</b>
              </div>
              <div>
                <span className="text-gray-500">State Withheld:</span>{" "}
                <b>{serverData.total_state_withheld ? `$${Number(serverData.total_state_withheld).toLocaleString()}` : "—"}</b>
              </div>
              {serverData.total_self_employment > 0 && (
                <div>
                  <span className="text-gray-500">1099-NEC Income:</span>{" "}
                  <b>${Number(serverData.total_self_employment).toLocaleString()}</b>
                </div>
              )}

              <div className="pt-3 border-t">
                <div className="text-gray-500">Estimated Refund:</div>
                <div className={`text-2xl font-bold ${refundAmount >= 0 ? "text-green-600" : "text-red-600"}`}>
                  ${refundAmount.toLocaleString()}
                </div>
              </div>

              <div className="pt-3 border-t">
                <button 
                  onClick={fetchServerData}
                  className="w-full py-2 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                >
                  🔄 Refresh Data
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2 text-sm">Loading data...</p>
            </div>
          )}
        </div>
      )}

      {/* SSN Confirmation Modal */}
      {showSSNConfirmation && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowSSNConfirmation(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-5">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🔐</span>
                <div>
                  <h2 className="text-xl font-bold">Confirm SSN Information</h2>
                  <p className="text-blue-100 text-sm">
                    Please verify the last 4 digits before downloading Form 1040
                  </p>
                </div>
              </div>
            </div>

            {/* SSN List */}
            <div className="p-5 space-y-3 max-h-80 overflow-y-auto">
              {/* Taxpayer */}
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                <div>
                  <div className="font-semibold text-gray-800 flex items-center gap-2">
                    <span>👤</span> Taxpayer
                  </div>
                  <div className="text-sm text-gray-500">
                    {ssnConfirmationData.first_name} {ssnConfirmationData.last_name}
                  </div>
                </div>
                <div className={`font-mono text-lg font-bold px-4 py-2 rounded-lg ${
                  ssnConfirmationData.ssn 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  {ssnConfirmationData.ssn 
                    ? `***-**-${String(ssnConfirmationData.ssn).slice(-4)}` 
                    : 'Missing'}
                </div>
              </div>

              {/* Spouse (if married) */}
              {(ssnConfirmationData.filing_status === 'married_filing_jointly' || 
                ssnConfirmationData.filing_status === 'married_filing_separately') && (
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                  <div>
                    <div className="font-semibold text-gray-800 flex items-center gap-2">
                      <span>👫</span> Spouse
                    </div>
                    <div className="text-sm text-gray-500">
                      {ssnConfirmationData.spouse_first_name} {ssnConfirmationData.spouse_last_name}
                    </div>
                  </div>
                  <div className={`font-mono text-lg font-bold px-4 py-2 rounded-lg ${
                    ssnConfirmationData.spouse_ssn 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {ssnConfirmationData.spouse_ssn 
                      ? `***-**-${String(ssnConfirmationData.spouse_ssn).slice(-4)}` 
                      : 'Missing'}
                  </div>
                </div>
              )}

              {/* Dependents */}
              {[1, 2, 3, 4].map(i => {
                const name = ssnConfirmationData[`dependent_${i}_name`];
                const ssn = ssnConfirmationData[`dependent_${i}_ssn`];
                if (!name) return null;
                return (
                  <div key={i} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                    <div>
                      <div className="font-semibold text-gray-800 flex items-center gap-2">
                        <span>👶</span> Dependent {i}
                      </div>
                      <div className="text-sm text-gray-500">{name}</div>
                    </div>
                    <div className={`font-mono text-lg font-bold px-4 py-2 rounded-lg ${
                      ssn 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {ssn 
                        ? `***-**-${String(ssn).slice(-4)}` 
                        : 'Not provided'}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Warning */}
            <div className="mx-5 mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-sm text-amber-800">
                ⚠️ <b>Important:</b> Please verify that the last 4 digits of all SSNs are correct. 
                Incorrect SSNs may delay your tax refund or cause rejection.
              </p>
            </div>

            {/* Buttons */}
            <div className="p-5 bg-gray-50 flex gap-3">
              <button
                onClick={() => setShowSSNConfirmation(false)}
                className="flex-1 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-100 transition"
              >
                ✏️ Edit Information
              </button>
              <button
                onClick={handleConfirmedDownload}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition"
              >
                ✓ Confirm & Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}