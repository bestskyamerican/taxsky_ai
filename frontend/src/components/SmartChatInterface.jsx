// ============================================================
// TAXSKY 2025 - SMART AI CHAT INTERFACE v2.0
// ============================================================
// ✅ FIXED: Properly collects dependent AGES for CTC calculation
// ✅ FIXED: Sends has_dependents flag to backend
// ✅ FIXED: Language support
// ============================================================

import React, { useState, useEffect, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Get language from localStorage or default to English
const getLanguage = () => localStorage.getItem("taxsky_language") || "en";

// ============================================================
// CPA INTERVIEW PHASES
// ============================================================
const PHASES = {
  WELCOME: "welcome",
  UPLOAD_DOCS: "upload_docs",
  FILING_STATUS: "filing_status",
  SPOUSE_INCOME: "spouse_income",
  DEPENDENTS: "dependents",
  DEPENDENT_DETAILS: "dependent_details",
  INCOME_REVIEW: "income_review",
  ADJUSTMENTS: "adjustments",
  DEDUCTIONS: "deductions",
  CREDITS: "credits",
  REVIEW: "review",
  COMPLETE: "complete"
};

// ============================================================
// ✅ TRANSLATIONS - Frontend UI Labels
// ============================================================
const TRANSLATIONS = {
  en: {
    welcome: (name, year) => `👋 Hi${name ? ` ${name}` : ""}! I'm your TaxSky CPA Assistant.

I'll help you file your ${year} taxes step by step. I have access to the latest tax rules and can answer any questions you have along the way.

📤 **Let's start by uploading your tax documents:**
• W-2 (employment income)
• 1099-NEC (self-employment)
• 1099-INT (interest)
• 1099-DIV (dividends)
• 1099-R (retirement)
• SSA-1099 (Social Security)

Click the 📎 button or drag & drop your documents.

Or just ask me a tax question!`,
    uploadPrompt: "Please upload at least one tax document (W-2, 1099, etc.) to continue. Click the 📎 button below.\n\nOr ask me any tax question!",
    filingStatusQuestion: (year) => `**What is your filing status for ${year}?**
• Single
• Married Filing Jointly
• Married Filing Separately  
• Head of Household
• Qualifying Widow(er)`,
    dependentsQuestion: (year) => `Do you have any dependents (children or other qualifying relatives) to claim on your ${year} tax return?`,
    dependentAgeQuestion: (num) => `**Dependent #${num}:** What is their age?

(This helps determine if they qualify for the $2,000 Child Tax Credit - must be under 17)`,
    incomeCorrect: "Does this income summary look correct? Reply **Yes** to continue or **No** to make changes.",
    placeholder: "Type your message or ask a tax question...",
    uploadW2: "📄 Upload W-2",
    standardDeduction: "❓ Standard Deduction",
    checkEITC: "💰 Check EITC",
    continueFile: "➡️ Continue Filing",
    viewDashboard: "📊 View Dashboard",
    reset: "🔄 Reset",
    history: "📜 History",
    ctcWarning: "⚠️ **Note:** Without qualifying children under 17, Child Tax Credit will be **$0**.",
    ctcInfo: (count, amount) => `👶 ${count} child(ren) under 17 qualify for Child Tax Credit (up to $${amount.toLocaleString()}).`
  },
  vi: {
    welcome: (name, year) => `👋 Xin chào${name ? ` ${name}` : ""}! Tôi là Trợ lý CPA của TaxSky.

Tôi sẽ giúp bạn khai thuế ${year} từng bước. Tôi có quyền truy cập vào các quy tắc thuế mới nhất và có thể trả lời bất kỳ câu hỏi nào của bạn.

📤 **Hãy bắt đầu bằng cách tải lên tài liệu thuế của bạn:**
• W-2 (thu nhập từ việc làm)
• 1099-NEC (tự kinh doanh)
• 1099-INT (lãi suất)
• 1099-DIV (cổ tức)
• 1099-R (hưu trí)
• SSA-1099 (An sinh xã hội)

Nhấp vào nút 📎 hoặc kéo và thả tài liệu của bạn.

Hoặc chỉ cần hỏi tôi một câu hỏi về thuế!`,
    uploadPrompt: "Vui lòng tải lên ít nhất một tài liệu thuế (W-2, 1099, v.v.) để tiếp tục. Nhấp vào nút 📎 bên dưới.\n\nHoặc hỏi tôi bất kỳ câu hỏi thuế nào!",
    filingStatusQuestion: (year) => `**Tình trạng khai thuế của bạn cho năm ${year} là gì?**
• Độc thân (Single)
• Vợ chồng khai chung (Married Filing Jointly)
• Vợ chồng khai riêng (Married Filing Separately)
• Chủ hộ (Head of Household)
• Góa phụ đủ điều kiện (Qualifying Widow(er))`,
    dependentsQuestion: (year) => `Bạn có người phụ thuộc (con cái hoặc người thân đủ điều kiện) để khai trên tờ khai thuế ${year} của bạn không?`,
    dependentAgeQuestion: (num) => `**Người phụ thuộc #${num}:** Họ bao nhiêu tuổi?

(Điều này giúp xác định xem họ có đủ điều kiện nhận Tín dụng Thuế Trẻ em $2,000 không - phải dưới 17 tuổi)`,
    incomeCorrect: "Tóm tắt thu nhập này có đúng không? Trả lời **Có** để tiếp tục hoặc **Không** để thay đổi.",
    placeholder: "Nhập tin nhắn hoặc hỏi câu hỏi về thuế...",
    uploadW2: "📄 Tải W-2",
    standardDeduction: "❓ Khấu trừ tiêu chuẩn",
    checkEITC: "💰 Kiểm tra EITC",
    continueFile: "➡️ Tiếp tục khai",
    viewDashboard: "📊 Xem bảng điều khiển",
    reset: "🔄 Đặt lại",
    history: "📜 Lịch sử",
    ctcWarning: "⚠️ **Lưu ý:** Không có trẻ dưới 17 tuổi đủ điều kiện, Tín dụng thuế trẻ em sẽ là **$0**.",
    ctcInfo: (count, amount) => `👶 ${count} trẻ dưới 17 tuổi đủ điều kiện nhận Tín dụng Thuế Trẻ em (tối đa $${amount.toLocaleString()}).`
  },
  es: {
    welcome: (name, year) => `👋 ¡Hola${name ? ` ${name}` : ""}! Soy tu Asistente CPA de TaxSky.

Te ayudaré a presentar tus impuestos de ${year} paso a paso. Tengo acceso a las últimas reglas fiscales y puedo responder cualquier pregunta que tengas.

📤 **Comencemos subiendo tus documentos fiscales:**
• W-2 (ingresos de empleo)
• 1099-NEC (trabajo por cuenta propia)
• 1099-INT (intereses)
• 1099-DIV (dividendos)
• 1099-R (jubilación)
• SSA-1099 (Seguro Social)

Haz clic en el botón 📎 o arrastra y suelta tus documentos.

¡O simplemente hazme una pregunta sobre impuestos!`,
    uploadPrompt: "Por favor sube al menos un documento fiscal (W-2, 1099, etc.) para continuar. Haz clic en el botón 📎 abajo.\n\n¡O hazme cualquier pregunta sobre impuestos!",
    filingStatusQuestion: (year) => `**¿Cuál es tu estado civil para ${year}?**
• Soltero (Single)
• Casado declarando juntos (Married Filing Jointly)
• Casado declarando separado (Married Filing Separately)
• Cabeza de familia (Head of Household)
• Viudo(a) calificado (Qualifying Widow(er))`,
    dependentsQuestion: (year) => `¿Tienes dependientes (hijos u otros familiares calificados) para reclamar en tu declaración de impuestos de ${year}?`,
    dependentAgeQuestion: (num) => `**Dependiente #${num}:** ¿Cuál es su edad?

(Esto ayuda a determinar si califican para el Crédito Tributario por Hijos de $2,000 - debe ser menor de 17)`,
    incomeCorrect: "¿Este resumen de ingresos es correcto? Responde **Sí** para continuar o **No** para hacer cambios.",
    placeholder: "Escribe tu mensaje o haz una pregunta sobre impuestos...",
    uploadW2: "📄 Subir W-2",
    standardDeduction: "❓ Deducción estándar",
    checkEITC: "💰 Verificar EITC",
    continueFile: "➡️ Continuar",
    viewDashboard: "📊 Ver panel",
    reset: "🔄 Reiniciar",
    history: "📜 Historial",
    ctcWarning: "⚠️ **Nota:** Sin hijos calificados menores de 17, el Crédito Tributario por Hijos será **$0**.",
    ctcInfo: (count, amount) => `👶 ${count} hijo(s) menor(es) de 17 califican para el Crédito Tributario por Hijos (hasta $${amount.toLocaleString()}).`
  }
};

// Helper to get translation
const t = (lang, key, ...args) => {
  const translations = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const value = translations[key];
  if (typeof value === 'function') {
    return value(...args);
  }
  return value || TRANSLATIONS.en[key] || key;
};

// ============================================================
// LANGUAGE SELECTOR COMPONENT
// ============================================================
function LanguageSelector() {
  const [lang, setLang] = useState(getLanguage());
  
  const handleChange = (e) => {
    const newLang = e.target.value;
    localStorage.setItem("taxsky_language", newLang);
    setLang(newLang);
    window.location.reload(); // Reload to apply language
  };
  
  return (
    <select 
      value={lang} 
      onChange={handleChange}
      className="bg-slate-700 rounded px-2 py-1 text-sm border-0 text-white"
    >
      <option value="en" className="bg-slate-800 text-white">🇺🇸 English</option>
      <option value="vi" className="bg-slate-800 text-white">🇻🇳 Tiếng Việt</option>
      <option value="es" className="bg-slate-800 text-white">🇪🇸 Español</option>
    </select>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function SmartChatInterface() {
  // ✅ Get language from localStorage - re-check on each render
  const [language, setLanguageState] = useState(getLanguage());
  
  // Update language when localStorage changes
  useEffect(() => {
    const checkLanguage = () => {
      const newLang = getLanguage();
      if (newLang !== language) {
        setLanguageState(newLang);
      }
    };
    
    // Check every second for language changes
    const interval = setInterval(checkLanguage, 1000);
    return () => clearInterval(interval);
  }, [language]);
  
  // Get user from localStorage
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("taxsky_user") || "{}");
    } catch {
      return {};
    }
  });
  
  // State
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [phase, setPhase] = useState(PHASES.WELCOME);
  const [taxYear, setTaxYear] = useState(2025);
  const [userState, setUserState] = useState(() => localStorage.getItem("taxsky_state") || "CA");
  
  // ============================================================
  // ✅ TAX DATA - Now properly tracks dependent ages
  // ============================================================
  const [taxData, setTaxData] = useState({
    filing_status: "",
    // ════════════════════════════════════════════════════════════
    // ⚠️ CRITICAL: Dependent tracking with ages
    // ════════════════════════════════════════════════════════════
    has_dependents: null,           // true/false/null - explicit flag
    dependents: [],                  // Array of {name, age, relationship}
    dependent_count: 0,              // Total count
    qualifying_children_under_17: 0, // Count of children under 17 (for CTC)
    other_dependents: 0,             // Count of dependents 17+ (for ODC)
    collecting_dependent_details: false,
    current_dependent_index: 0,
    // ════════════════════════════════════════════════════════════
    spouse_has_income: null,
    spouse_first_name: "",
    spouse_last_name: "",
    spouse_ssn: "",
    spouse_wages: 0,
    spouse_federal_withheld: 0,
    spouse_state_withheld: 0,
    spouse_w2_uploaded: false,
    wages: 0,
    federal_withheld: 0,
    state_withheld: 0,
    interest_income: 0,
    dividend_income: 0,
    self_employment_income: 0,
    retirement_income: 0,
    social_security_benefits: 0,
    capital_gains: 0,
    other_income: 0,
    documents: [],
    w2_list: [],
    form_1099_list: [],
    w2_count: 0,
    nec_count: 0,
    int_count: 0,
    div_count: 0,
    first_name: "",
    last_name: "",
    ssn: "",
    itemized_deductions: 0,
    mortgage_interest: 0,
    property_taxes: 0,
    charitable_donations: 0,
    ira_contributions: 0,
    student_loan_interest: 0,
    hsa_contributions: 0,
    self_employment_health_insurance: 0,
    total_adjustments: 0
  });
  
  const [showTaxCalc, setShowTaxCalc] = useState(false);
  const [taxResult, setTaxResult] = useState(null);
  const [isOver50, setIsOver50] = useState(false);
  const [pendingIRAAmount, setPendingIRAAmount] = useState(0);
  const [pendingConfirmation, setPendingConfirmation] = useState(null);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // ============================================================
  // NAVIGATION FUNCTIONS
  // ============================================================
  const goToDashboard = () => {
    window.location.href = "/dashboard";
  };

  const goToDownloads = () => {
    window.location.href = "/dashboard?tab=downloads";
  };

  const handleLogout = () => {
    localStorage.removeItem("taxsky_token");
    localStorage.removeItem("taxsky_user");
    localStorage.removeItem("taxsky_userId");
    window.location.href = "/";
  };

  // ============================================================
  // SAVE DATA TO BACKEND
  // ============================================================
  const saveToBackend = async (updates) => {
    try {
      const token = localStorage.getItem("taxsky_token");
      const userId = localStorage.getItem("taxsky_userId") || user?.id || "guest";
      
      await fetch(`${API_BASE}/api/ai/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ userId, updates })
      });
      
      console.log("✅ Data saved to backend:", updates);
    } catch (err) {
      console.error("❌ Save to backend error:", err);
    }
  };

  // ============================================================
  // ✅ SAVE CHAT HISTORY TO BACKEND
  // ============================================================
  const saveChatHistory = async (role, content) => {
    try {
      const token = localStorage.getItem("taxsky_token");
      const userId = localStorage.getItem("taxsky_userId") || user?.id || "guest";
      
      await fetch(`${API_BASE}/api/ai/save-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          userId,
          role,
          content,
          timestamp: new Date().toISOString(),
          language
        })
      });
      
      console.log("💬 Chat saved:", role);
    } catch (err) {
      console.error("❌ Save chat error:", err);
    }
  };

  // ============================================================
  // SCROLL TO BOTTOM
  // ============================================================
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ============================================================
  // LOAD EXISTING SESSION & CHAT HISTORY
  // ============================================================
  useEffect(() => {
    const loadSession = async () => {
      try {
        const token = localStorage.getItem("taxsky_token");
        const userId = localStorage.getItem("taxsky_userId") || user?.id;
        
        if (!userId || !token) {
          showWelcomeMessage();
          return;
        }
        
        const response = await fetch(`${API_BASE}/api/ai/data`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ userId })
        });
        
        const data = await response.json();
        
        if (data.success && data.data) {
          const session = data.data;
          
          if (session.conversation_history && session.conversation_history.length > 0) {
            console.log("📜 Restoring chat history:", session.conversation_history.length, "messages");
            setMessages(session.conversation_history.map(msg => ({
              role: msg.role,
              content: msg.content,
              timestamp: new Date(msg.timestamp)
            })));
          } else {
            showWelcomeMessage();
          }
          
          if (session.filing_status) {
            // ════════════════════════════════════════════════════════════
            // ✅ FIXED: Properly restore dependent data with ages
            // ════════════════════════════════════════════════════════════
            const dependentsArray = session.dependents || [];
            let childrenUnder17 = 0;
            let otherDeps = 0;
            
            // Count from dependents array if available
            if (Array.isArray(dependentsArray) && dependentsArray.length > 0) {
              dependentsArray.forEach(dep => {
                const age = parseInt(dep.age) || 99;
                if (age < 17) {
                  childrenUnder17++;
                } else {
                  otherDeps++;
                }
              });
            } else {
              // Fallback to legacy fields
              childrenUnder17 = session.qualifying_children_under_17 || 0;
              otherDeps = session.other_dependents || 0;
            }
            
            setTaxData(prev => ({
              ...prev,
              filing_status: session.filing_status,
              wages: session.total_wages || session.wages || 0,
              federal_withheld: session.total_withheld || session.federal_withheld || 0,
              state_withheld: session.total_state_withheld || session.state_withheld || 0,
              interest_income: session.total_interest || session.interest_income || 0,
              dividend_income: session.total_dividends || session.dividend_income || 0,
              self_employment_income: session.total_self_employment || session.self_employment_income || 0,
              ira_contributions: session.ira_contributions || 0,
              student_loan_interest: session.student_loan_interest || 0,
              hsa_contributions: session.hsa_contributions || 0,
              itemized_deductions: session.itemized_deductions || 0,
              // ✅ FIXED: Properly restore dependent info
              has_dependents: session.has_dependents,
              dependents: dependentsArray,
              dependent_count: session.dependent_count || dependentsArray.length || 0,
              qualifying_children_under_17: childrenUnder17,
              other_dependents: otherDeps,
              first_name: session.first_name || "",
              last_name: session.last_name || "",
              ssn: session.ssn || "",
              documents: session.documents || [],
              w2_list: session.w2_list || [],
              w2_count: session.w2_count || 0
            }));
            
            // Determine current phase
            if (session.tax_calculated || session.calculation_done) {
              setPhase(PHASES.COMPLETE);
            } else if (session.deductions_done) {
              setPhase(PHASES.REVIEW);
            } else if (session.adjustments_done) {
              setPhase(PHASES.DEDUCTIONS);
            } else if (session.income_confirmed) {
              setPhase(PHASES.ADJUSTMENTS);
            } else if (session.dependents_done) {
              setPhase(PHASES.INCOME_REVIEW);
            } else if (session.filing_status) {
              setPhase(PHASES.DEPENDENTS);
            } else if (session.w2_count > 0 || session.documents?.length > 0) {
              setPhase(PHASES.FILING_STATUS);
            } else {
              setPhase(PHASES.UPLOAD_DOCS);
            }
          } else {
            showWelcomeMessage();
          }
        } else {
          showWelcomeMessage();
        }
      } catch (err) {
        console.error("❌ Load session error:", err);
        showWelcomeMessage();
      }
    };
    
    loadSession();
  }, []);

  // ============================================================
  // ✅ SHOW WELCOME MESSAGE - Uses translation
  // ============================================================
  const showWelcomeMessage = () => {
    const userName = user?.name || user?.firstName || "";
    const welcomeMsg = {
      role: "assistant",
      content: t(language, 'welcome', userName, taxYear),
      timestamp: new Date()
    };
    setMessages([welcomeMsg]);
    setPhase(PHASES.UPLOAD_DOCS);
    saveChatHistory("assistant", welcomeMsg.content);
  };

  // ============================================================
  // ADD MESSAGE HELPER
  // ============================================================
  const addMessage = (role, content) => {
    setMessages(prev => [...prev, { role, content, timestamp: new Date() }]);
    saveChatHistory(role, content);
  };

  // ============================================================
  // ✅ CALL BACKEND CHAT API - With language support
  // ============================================================
  const callBackendChat = async (userMessage) => {
    try {
      const token = localStorage.getItem("taxsky_token");
      const userId = localStorage.getItem("taxsky_userId") || user?.id || "guest";
      
      console.log(`🌐 [${language}] Calling backend chat API...`);
      
      const response = await fetch(`${API_BASE}/api/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          userId,
          message: userMessage,
          language,
          state: userState,
          taxYear,
          // ✅ Send current dependent info
          taxData: {
            has_dependents: taxData.has_dependents,
            dependents: taxData.dependents,
            dependent_count: taxData.dependent_count,
            qualifying_children_under_17: taxData.qualifying_children_under_17,
            other_dependents: taxData.other_dependents
          }
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update phase if returned
        if (data.phase) {
          const phaseMap = {
            "filing_status": PHASES.FILING_STATUS,
            "dependents": PHASES.DEPENDENTS,
            "dependent_details": PHASES.DEPENDENT_DETAILS,
            "dependent_count": PHASES.DEPENDENT_DETAILS,
            "income_review": PHASES.INCOME_REVIEW,
            "adjustments": PHASES.ADJUSTMENTS,
            "deductions": PHASES.DEDUCTIONS,
            "review": PHASES.REVIEW,
            "complete": PHASES.COMPLETE
          };
          if (phaseMap[data.phase]) {
            setPhase(phaseMap[data.phase]);
          }
        }
        
        // ✅ Update dependent info from response
        if (data.ctc_eligible !== undefined) {
          setTaxData(prev => ({
            ...prev,
            has_dependents: data.ctc_eligible
          }));
        }
        
        return data.message;
      }
      
      return data.error || "Sorry, something went wrong.";
    } catch (err) {
      console.error("Backend chat error:", err);
      return "I'm having trouble connecting. Please try again.";
    }
  };

  // ============================================================
  // ✅ GET TAX KNOWLEDGE - RAG with language
  // ============================================================
  const getTaxKnowledge = async (topic, state = "CA") => {
    try {
      const response = await fetch(`${API_BASE}/api/tax/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          question: topic, 
          state,
          language
        })
      });
      const data = await response.json();
      return data.answer || null;
    } catch (err) {
      console.error("RAG error:", err);
      return null;
    }
  };

  // ============================================================
  // ✅ PROCESS USER INPUT - Now calls backend with language
  // ============================================================
  const processUserInput = async (userMessage) => {
    const msg = userMessage.toLowerCase().trim();
    
    // Check for navigation commands
    if (msg.includes("dashboard") || msg.includes("view result") || msg.includes("see result") || msg.includes("my taxes")) {
      goToDashboard();
      return language === 'vi' ? "Đang chuyển đến Bảng điều khiển..." : 
             language === 'es' ? "Llevándote al Panel..." :
             "Taking you to the Dashboard...";
    }
    
    if (msg.includes("download") || msg.includes("form 1040") || msg.includes("get forms")) {
      goToDownloads();
      return language === 'vi' ? "Đang chuyển đến Tải xuống..." :
             language === 'es' ? "Llevándote a Descargas..." :
             "Taking you to Downloads...";
    }
    
    // ✅ Call backend - it will handle the interview flow
    return await callBackendChat(userMessage);
  };

  // ============================================================
  // HANDLE FILE UPLOAD
  // ============================================================
  const handleFileUpload = async (file) => {
    if (!file) return;
    
    setIsUploading(true);
    const uploadingMsg = language === 'vi' ? `📤 Đang tải lên: ${file.name}...` :
                         language === 'es' ? `📤 Subiendo: ${file.name}...` :
                         `📤 Uploading: ${file.name}...`;
    addMessage("user", uploadingMsg);
    
    try {
      const token = localStorage.getItem("taxsky_token");
      const userId = localStorage.getItem("taxsky_userId") || user?.id || "guest";
      
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", userId);
      formData.append("taxYear", taxYear);
      
      const response = await fetch(`${API_BASE}/api/forms/upload`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });
      
      const result = await response.json();
      
      if (result.success) {
        const { formType, extractedFields } = result;
        
        if (formType === "W-2") {
          const w2Wages = extractedFields.wages_tips_other_comp || 0;
          const w2FedWithheld = extractedFields.federal_income_tax_withheld || 0;
          const w2StateWithheld = extractedFields.state_income_tax || 0;
          
          setTaxData(prev => {
            const newWages = prev.wages + w2Wages;
            const newFedWithheld = prev.federal_withheld + w2FedWithheld;
            const newStateWithheld = prev.state_withheld + w2StateWithheld;
            
            const newW2List = [...prev.w2_list, {
              employer: extractedFields.employer_name || "Unknown",
              ein: extractedFields.employer_ein || "",
              wages: w2Wages,
              federal_withheld: w2FedWithheld,
              state_withheld: w2StateWithheld
            }];
            
            // Save to backend
            saveToBackend({
              total_wages: newWages,
              total_withheld: newFedWithheld,
              total_state_withheld: newStateWithheld,
              w2_list: newW2List,
              w2_count: newW2List.length
            });
            
            return {
              ...prev,
              wages: newWages,
              federal_withheld: newFedWithheld,
              state_withheld: newStateWithheld,
              w2_list: newW2List,
              w2_count: newW2List.length
            };
          });
          
          const successMsg = language === 'vi' 
            ? `✅ **W-2 đã được xử lý!**\n• Chủ lao động: ${extractedFields.employer_name || "Không rõ"}\n• Lương: $${w2Wages.toLocaleString()}\n• Thuế liên bang đã khấu trừ: $${w2FedWithheld.toLocaleString()}`
            : language === 'es'
            ? `✅ **¡W-2 procesado!**\n• Empleador: ${extractedFields.employer_name || "Desconocido"}\n• Salarios: $${w2Wages.toLocaleString()}\n• Impuesto federal retenido: $${w2FedWithheld.toLocaleString()}`
            : `✅ **W-2 processed!**\n• Employer: ${extractedFields.employer_name || "Unknown"}\n• Wages: $${w2Wages.toLocaleString()}\n• Federal withheld: $${w2FedWithheld.toLocaleString()}`;
          
          addMessage("assistant", successMsg);
          
          if (phase === PHASES.UPLOAD_DOCS || phase === PHASES.WELCOME) {
            setPhase(PHASES.FILING_STATUS);
            setTimeout(() => {
              addMessage("assistant", t(language, 'filingStatusQuestion', taxYear));
            }, 500);
          }
        }
      } else {
        const errorMsg = language === 'vi' 
          ? `❌ Không thể xử lý tài liệu: ${result.error || "Lỗi không xác định"}`
          : language === 'es'
          ? `❌ No se pudo procesar el documento: ${result.error || "Error desconocido"}`
          : `❌ Could not process document: ${result.error || "Unknown error"}`;
        addMessage("assistant", errorMsg);
      }
    } catch (err) {
      console.error("Upload error:", err);
      const errorMsg = language === 'vi'
        ? "❌ Lỗi tải lên. Vui lòng thử lại."
        : language === 'es'
        ? "❌ Error al subir. Por favor intenta de nuevo."
        : "❌ Upload error. Please try again.";
      addMessage("assistant", errorMsg);
    } finally {
      setIsUploading(false);
    }
  };

  // ============================================================
  // SEND MESSAGE
  // ============================================================
  const sendMessage = async () => {
    const userMessage = input.trim();
    if (!userMessage || isLoading) return;
    
    setInput("");
    addMessage("user", userMessage);
    setIsLoading(true);
    
    try {
      const response = await processUserInput(userMessage);
      addMessage("assistant", response);
    } catch (err) {
      console.error("Send message error:", err);
      const errorMsg = language === 'vi'
        ? "Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại."
        : language === 'es'
        ? "Lo siento, algo salió mal. Por favor intenta de nuevo."
        : "Sorry, something went wrong. Please try again.";
      addMessage("assistant", errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // RESET SESSION
  // ============================================================
  const handleResetSession = async () => {
    const confirmMsg = language === 'vi' 
      ? "Bạn có chắc muốn bắt đầu lại? Điều này sẽ xóa tất cả dữ liệu thuế của bạn."
      : language === 'es'
      ? "¿Estás seguro de que quieres empezar de nuevo? Esto borrará todos tus datos fiscales."
      : "Are you sure you want to start over? This will clear all your tax data.";
    
    if (!window.confirm(confirmMsg)) return;
    
    try {
      const token = localStorage.getItem("taxsky_token");
      const userId = localStorage.getItem("taxsky_userId") || user?.id || "guest";
      
      await fetch(`${API_BASE}/api/ai/reset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ userId })
      });
      
      // Reset local state
      setTaxData({
        filing_status: "",
        has_dependents: null,
        dependents: [],
        dependent_count: 0,
        qualifying_children_under_17: 0,
        other_dependents: 0,
        collecting_dependent_details: false,
        current_dependent_index: 0,
        spouse_has_income: null,
        spouse_first_name: "",
        spouse_last_name: "",
        spouse_ssn: "",
        spouse_wages: 0,
        spouse_federal_withheld: 0,
        spouse_state_withheld: 0,
        spouse_w2_uploaded: false,
        wages: 0,
        federal_withheld: 0,
        state_withheld: 0,
        interest_income: 0,
        dividend_income: 0,
        self_employment_income: 0,
        retirement_income: 0,
        social_security_benefits: 0,
        capital_gains: 0,
        other_income: 0,
        documents: [],
        w2_list: [],
        form_1099_list: [],
        w2_count: 0,
        nec_count: 0,
        int_count: 0,
        div_count: 0,
        first_name: "",
        last_name: "",
        ssn: "",
        itemized_deductions: 0,
        mortgage_interest: 0,
        property_taxes: 0,
        charitable_donations: 0,
        ira_contributions: 0,
        student_loan_interest: 0,
        hsa_contributions: 0,
        self_employment_health_insurance: 0,
        total_adjustments: 0
      });
      
      setMessages([]);
      setPhase(PHASES.WELCOME);
      showWelcomeMessage();
      
      console.log("🔄 Session reset");
    } catch (err) {
      console.error("Reset error:", err);
    }
  };

  // ============================================================
  // RENDER - DARK THEME
  // ============================================================
  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Header - Dark Theme */}
      <div className="bg-slate-800 border-b border-slate-700 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* TaxSky AI Logo */}
          <svg width="170" height="48" viewBox="0 0 180 50" fill="none">
            <defs>
              <linearGradient id="hexGradChat" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1"/>
                <stop offset="100%" stopColor="#8b5cf6"/>
              </linearGradient>
              <linearGradient id="textGradChat" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6"/>
                <stop offset="100%" stopColor="#06b6d4"/>
              </linearGradient>
            </defs>
            <polygon points="22,7 34,1 46,7 46,20 34,26 22,20" fill="url(#hexGradChat)" opacity="0.25"/>
            <polygon points="18,12 30,6 42,12 42,25 30,31 18,25" fill="url(#hexGradChat)" opacity="0.5"/>
            <polygon points="20,17 32,11 44,17 44,29 32,35 20,29" fill="url(#hexGradChat)"/>
            <path d="M32 20 L32 29 M28 22.5 Q32 20 36 22.5 Q32 25 28 27.5 Q32 30 36 27.5" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
            <text x="54" y="29" fontFamily="Space Grotesk, system-ui, sans-serif" fontSize="20" fontWeight="700" fill="white">Tax</text>
            <text x="88" y="29" fontFamily="Space Grotesk, system-ui, sans-serif" fontSize="20" fontWeight="700" fill="url(#textGradChat)">Sky</text>
            <text x="126" y="29" fontFamily="Space Grotesk, system-ui, sans-serif" fontSize="12" fontWeight="600" fill="#a78bfa">AI</text>
          </svg>
          
          <div className="flex items-center gap-1 ml-4">
            <button className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg text-sm font-medium">
              💬 Tax Chat
            </button>
            <button
              onClick={goToDashboard}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition"
            >
              📊 Dashboard
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <select 
            value={taxYear} 
            onChange={(e) => setTaxYear(parseInt(e.target.value))}
            className="bg-slate-700 rounded px-2 py-1 text-sm border-0 text-white"
          >
            <option value={2025}>Tax Year 2025</option>
            <option value={2024}>Tax Year 2024</option>
          </select>
          
          <span className="bg-slate-700 rounded px-2 py-1 text-sm">📍 {userState}</span>
          
          {/* ✅ Language Selector in Header */}
          <LanguageSelector />
          
          <span className="text-sm bg-emerald-500 px-2 py-1 rounded font-medium">CPA Expert</span>
          
          <div className="flex items-center gap-2">
            {user?.picture ? (
              <img src={user.picture} alt="" className="w-8 h-8 rounded-full ring-2 ring-slate-600" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold">
                {user?.name?.charAt(0) || "U"}
              </div>
            )}
            <span className="text-sm hidden md:inline text-slate-300">{user?.name || "Guest"}</span>
            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-white text-sm transition"
              title="Logout"
            >
              🚪
            </button>
          </div>
        </div>
      </div>

      {/* Messages - Dark Theme */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                  : "bg-slate-800 border border-slate-700 text-slate-200"
              }`}
            >
              <div className="whitespace-pre-wrap text-sm">
                {msg.content.split(/(\*\*.*?\*\*)/).map((part, i) => {
                  if (part.startsWith("**") && part.endsWith("**")) {
                    return <strong key={i} className="text-white">{part.slice(2, -2)}</strong>;
                  }
                  return part;
                })}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                <span className="text-slate-400 text-sm">
                  {language === 'vi' ? "Đang suy nghĩ..." : 
                   language === 'es' ? "Pensando..." : 
                   "Thinking..."}
                </span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Dark Theme */}
      <div className="border-t border-slate-700 bg-slate-800 p-4">
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*,.pdf"
            onChange={(e) => handleFileUpload(e.target.files[0])}
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="p-3 bg-slate-700 hover:bg-slate-600 rounded-xl transition text-white"
            title={language === 'vi' ? "Tải tài liệu" : "Upload Document"}
          >
            {isUploading ? "⏳" : "📎"}
          </button>
          
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            placeholder={t(language, 'placeholder')}
            className="flex-1 bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-400"
            disabled={isLoading}
          />
          
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl transition disabled:opacity-50"
          >
            {isLoading ? "⏳" : "📤"}
          </button>
        </div>
        
        {/* Quick Actions - Dark Theme */}
        <div className="flex gap-2 mt-3 flex-wrap">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-3 py-1.5 rounded-full border border-blue-500/30 transition"
          >
            {t(language, 'uploadW2')}
          </button>
          <button
            onClick={() => setInput(
              language === 'vi' ? "Mức khấu trừ tiêu chuẩn là bao nhiêu?" :
              language === 'es' ? "¿Cuál es la deducción estándar?" :
              "What is the standard deduction for 2025?"
            )}
            className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-full transition"
          >
            {t(language, 'standardDeduction')}
          </button>
          <button
            onClick={() => setInput(
              language === 'vi' ? "Tôi có đủ điều kiện nhận EITC không?" :
              language === 'es' ? "¿Soy elegible para EITC?" :
              "Am I eligible for EITC?"
            )}
            className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-full transition"
          >
            {t(language, 'checkEITC')}
          </button>
          <button
            onClick={() => setInput(
              language === 'vi' ? "tiếp tục" :
              language === 'es' ? "continuar" :
              "continue"
            )}
            className="text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-500/30 transition"
          >
            {t(language, 'continueFile')}
          </button>
          <button
            onClick={goToDashboard}
            className="text-xs bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 px-3 py-1.5 rounded-full border border-purple-500/30 transition"
          >
            {t(language, 'viewDashboard')}
          </button>
          <button
            onClick={handleResetSession}
            className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-full transition"
            title={language === 'vi' ? "Bắt đầu khai thuế mới" : "Start a new tax return"}
          >
            {t(language, 'reset')}
          </button>
          <button
            onClick={() => {
              console.log("📜 Full Chat History:", messages);
              console.log("📋 Tax Data:", taxData);
              alert(`Chat has ${messages.length} messages.\nDependents: ${taxData.dependent_count}\nChildren under 17: ${taxData.qualifying_children_under_17}`);
            }}
            className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-full transition"
          >
            {t(language, 'history')} ({messages.length})
          </button>
        </div>
      </div>
    </div>
  );
}