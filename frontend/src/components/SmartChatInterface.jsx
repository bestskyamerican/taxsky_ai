// ============================================================
// TAXSKY 2025 - SMART AI CHAT INTERFACE v3.0
// ============================================================
// ✅ FIXED: Correct API endpoints
// ✅ FIXED: Check hasCompletedTax on welcome
// ✅ FIXED: Properly loads existing session
// ============================================================

import React, { useState, useEffect, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5001";

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
// ✅ TRANSLATIONS
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
    placeholder: "Type your message or ask a tax question...",
    uploadW2: "📄 Upload W-2",
    standardDeduction: "❓ Standard Deduction",
    checkEITC: "💰 Check EITC",
    continueFile: "➡️ Continue Filing",
    viewDashboard: "📊 View Dashboard",
    reset: "🔄 Reset",
    history: "📜 History",
    thinking: "Thinking...",
    uploadError: "❌ Upload error. Please try again.",
    connectionError: "I'm having trouble connecting. Please try again."
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
    placeholder: "Nhập tin nhắn hoặc hỏi câu hỏi về thuế...",
    uploadW2: "📄 Tải W-2",
    standardDeduction: "❓ Khấu trừ tiêu chuẩn",
    checkEITC: "💰 Kiểm tra EITC",
    continueFile: "➡️ Tiếp tục khai",
    viewDashboard: "📊 Xem bảng điều khiển",
    reset: "🔄 Đặt lại",
    history: "📜 Lịch sử",
    thinking: "Đang suy nghĩ...",
    uploadError: "❌ Lỗi tải lên. Vui lòng thử lại.",
    connectionError: "Tôi gặp sự cố kết nối. Vui lòng thử lại."
  },
  es: {
    welcome: (name, year) => `👋 ¡Hola${name ? ` ${name}` : ""}! Soy tu Asistente CPA de TaxSky.

Te ayudaré a presentar tus impuestos de ${year} paso a paso.

📤 **Comencemos subiendo tus documentos fiscales:**
• W-2 (ingresos de empleo)
• 1099-NEC (trabajo por cuenta propia)
• 1099-INT (intereses)
• 1099-DIV (dividendos)
• 1099-R (jubilación)
• SSA-1099 (Seguro Social)

Haz clic en el botón 📎 o arrastra y suelta tus documentos.`,
    placeholder: "Escribe tu mensaje o haz una pregunta sobre impuestos...",
    uploadW2: "📄 Subir W-2",
    standardDeduction: "❓ Deducción estándar",
    checkEITC: "💰 Verificar EITC",
    continueFile: "➡️ Continuar",
    viewDashboard: "📊 Ver panel",
    reset: "🔄 Reiniciar",
    history: "📜 Historial",
    thinking: "Pensando...",
    uploadError: "❌ Error al subir. Por favor intenta de nuevo.",
    connectionError: "Tengo problemas de conexión. Por favor intenta de nuevo."
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
    window.location.reload();
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
  const [language, setLanguageState] = useState(getLanguage());
  
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
  
  // ✅ NEW: Completed tax state
  const [hasCompletedTax, setHasCompletedTax] = useState(false);
  const [taxData, setTaxData] = useState(null);
  
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
  // SCROLL TO BOTTOM
  // ============================================================
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ============================================================
  // ✅ FIXED: LOAD SESSION - Check for completed tax
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
        
        console.log("🔍 Loading session for user:", userId);
        
        // ✅ FIXED: Call /api/ai/welcome to check for completed tax
        const response = await fetch(`${API_BASE}/api/ai/welcome`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ 
            userId, 
            taxYear,
            language 
          })
        });
        
        const data = await response.json();
        console.log("📋 Welcome response:", data);
        
        if (data.success) {
          // ✅ CHECK: Does user have completed tax?
          if (data.hasCompletedTax) {
            console.log("✅ User has completed tax - showing summary");
            setHasCompletedTax(true);
            setTaxData(data.taxData);
            setPhase(PHASES.COMPLETE);
            
            // Show the completed tax message
            addMessage("assistant", data.message);
          } else {
            // No completed tax - show normal welcome or resume
            console.log("📝 No completed tax - normal flow");
            setHasCompletedTax(false);
            
            if (data.message) {
              addMessage("assistant", data.message);
            } else {
              showWelcomeMessage();
            }
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
  // SHOW WELCOME MESSAGE
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
  };

  // ============================================================
  // ADD MESSAGE HELPER
  // ============================================================
  const addMessage = (role, content) => {
    setMessages(prev => [...prev, { role, content, timestamp: new Date() }]);
  };

  // ============================================================
  // ✅ FIXED: CALL BACKEND CHAT API
  // ============================================================
  const callBackendChat = async (userMessage) => {
    try {
      const token = localStorage.getItem("taxsky_token");
      const userId = localStorage.getItem("taxsky_userId") || user?.id || "guest";
      
      console.log(`🌐 Calling chat API...`);
      
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
          taxYear
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // ✅ Check if interview is now complete
        if (data.hasCompletedTax) {
          setHasCompletedTax(true);
          setTaxData(data.taxData);
          setPhase(PHASES.COMPLETE);
        }
        
        return data.message;
      }
      
      return data.error || t(language, 'connectionError');
    } catch (err) {
      console.error("Backend chat error:", err);
      return t(language, 'connectionError');
    }
  };

  // ============================================================
  // PROCESS USER INPUT
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
    
    // ✅ Handle "Review Details" action
    if (msg.includes("review") || msg.includes("details") || msg.includes("xem chi tiết")) {
      goToDashboard();
      return "Taking you to the Dashboard...";
    }
    
    // ✅ Handle "Start Fresh" action
    if (msg.includes("start fresh") || msg.includes("start over") || msg.includes("bắt đầu mới")) {
      await handleResetSession();
      return "Starting fresh...";
    }
    
    // ✅ Handle "Update Info" action
    if (msg.includes("update") || msg.includes("change") || msg.includes("cập nhật")) {
      setHasCompletedTax(false);
      // Continue with normal chat to allow updates
    }
    
    return await callBackendChat(userMessage);
  };

  // ============================================================
  // HANDLE FILE UPLOAD
  // ============================================================
  const handleFileUpload = async (file) => {
    if (!file) return;
    
    setIsUploading(true);
    addMessage("user", `📤 Uploading: ${file.name}...`);
    
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
          const successMsg = `✅ **W-2 processed!**
• Employer: ${extractedFields.employer_name || "Unknown"}
• Wages: $${(extractedFields.wages_tips_other_comp || 0).toLocaleString()}
• Federal withheld: $${(extractedFields.federal_income_tax_withheld || 0).toLocaleString()}`;
          
          addMessage("assistant", successMsg);
        }
      } else {
        addMessage("assistant", t(language, 'uploadError'));
      }
    } catch (err) {
      console.error("Upload error:", err);
      addMessage("assistant", t(language, 'uploadError'));
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
      addMessage("assistant", t(language, 'connectionError'));
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // RESET SESSION
  // ============================================================
  const handleResetSession = async () => {
    const confirmMsg = language === 'vi' 
      ? "Bạn có chắc muốn bắt đầu lại?"
      : language === 'es'
      ? "¿Estás seguro de que quieres empezar de nuevo?"
      : "Are you sure you want to start over?";
    
    if (!window.confirm(confirmMsg)) return;
    
    try {
      const token = localStorage.getItem("taxsky_token");
      const userId = localStorage.getItem("taxsky_userId") || user?.id || "guest";
      
      // ✅ FIXED: Use correct endpoint
      await fetch(`${API_BASE}/api/ai/start-fresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ userId, taxYear })
      });
      
      // Reset local state
      setMessages([]);
      setPhase(PHASES.WELCOME);
      setHasCompletedTax(false);
      setTaxData(null);
      showWelcomeMessage();
      
      console.log("🔄 Session reset");
    } catch (err) {
      console.error("Reset error:", err);
    }
  };

  // ============================================================
  // ✅ COMPLETED TAX CARD COMPONENT
  // ============================================================
  const CompletedTaxCard = () => {
    if (!taxData) return null;
    
    const formatMoney = (amt) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amt || 0);
    };
    
    const filingStatusDisplay = {
      'single': 'Single',
      'married_filing_jointly': 'Married Filing Jointly',
      'married_filing_separately': 'Married Filing Separately',
      'head_of_household': 'Head of Household',
    };
    
    return (
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-6 mx-4 my-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">🎉</span>
          <h2 className="text-xl font-bold text-white">
            {language === 'vi' ? 'Hồ sơ thuế 2025 đã hoàn tất!' : 'Your 2025 Tax Return is Complete!'}
          </h2>
        </div>
        
        {/* Summary Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-slate-700/50 rounded-xl p-3">
            <span className="text-slate-400 text-sm block">Filing Status</span>
            <span className="text-white font-semibold">
              {filingStatusDisplay[taxData?.filing_status] || taxData?.filing_status}
            </span>
          </div>
          <div className="bg-slate-700/50 rounded-xl p-3">
            <span className="text-slate-400 text-sm block">Total Income</span>
            <span className="text-white font-semibold">{formatMoney(taxData?.total_income)}</span>
          </div>
          <div className="bg-slate-700/50 rounded-xl p-3">
            <span className="text-slate-400 text-sm block">AGI</span>
            <span className="text-white font-semibold">{formatMoney(taxData?.agi)}</span>
          </div>
          <div className="bg-slate-700/50 rounded-xl p-3">
            <span className="text-slate-400 text-sm block">Withheld</span>
            <span className="text-white font-semibold">{formatMoney(taxData?.withholding)}</span>
          </div>
        </div>
        
        {/* Refund or Owed */}
        <div className={`rounded-xl p-4 mb-4 ${taxData?.refund > 0 ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-amber-500/20 border border-amber-500/30'}`}>
          <div className="flex justify-between items-center">
            <span className="text-white text-lg">
              {taxData?.refund > 0 ? '💰 Refund' : '💳 Amount Owed'}
            </span>
            <span className={`text-2xl font-bold ${taxData?.refund > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {formatMoney(taxData?.refund > 0 ? taxData.refund : taxData?.amount_owed)}
            </span>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={goToDashboard}
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white py-3 px-4 rounded-xl font-medium transition"
          >
            📊 Review Details
          </button>
          <button 
            onClick={goToDownloads}
            className="bg-slate-700 hover:bg-slate-600 text-white py-3 px-4 rounded-xl font-medium transition"
          >
            📥 Download Form 1040
          </button>
          <button 
            onClick={() => {
              setHasCompletedTax(false);
              addMessage("assistant", "What would you like to update? You can change:\n• Personal info\n• Income\n• Deductions\n• Dependents\n\nJust tell me what you'd like to change!");
            }}
            className="bg-slate-700 hover:bg-slate-600 text-white py-3 px-4 rounded-xl font-medium transition"
          >
            ✏️ Update Info
          </button>
          <button 
            onClick={handleResetSession}
            className="bg-slate-700 hover:bg-slate-600 text-red-400 py-3 px-4 rounded-xl font-medium transition border border-red-500/30"
          >
            🔄 Start Fresh
          </button>
        </div>
      </div>
    );
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
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
            <button onClick={goToDashboard} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition">
              📊 Dashboard
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <select value={taxYear} onChange={(e) => setTaxYear(parseInt(e.target.value))} className="bg-slate-700 rounded px-2 py-1 text-sm border-0 text-white">
            <option value={2025}>Tax Year 2025</option>
            <option value={2024}>Tax Year 2024</option>
          </select>
          
          <span className="bg-slate-700 rounded px-2 py-1 text-sm">📍 {userState}</span>
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
            <button onClick={handleLogout} className="text-slate-400 hover:text-white text-sm transition" title="Logout">🚪</button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              msg.role === "user"
                ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                : "bg-slate-800 border border-slate-700 text-slate-200"
            }`}>
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
                <span className="text-slate-400 text-sm">{t(language, 'thinking')}</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* ✅ Show Completed Tax Card if user has completed tax */}
      {hasCompletedTax && taxData && <CompletedTaxCard />}

      {/* Input Area - Only show if NOT completed OR user wants to update */}
      {!hasCompletedTax && (
        <div className="border-t border-slate-700 bg-slate-800 p-4">
          <div className="flex items-center gap-2">
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e.target.files[0])} />
            
            <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="p-3 bg-slate-700 hover:bg-slate-600 rounded-xl transition text-white">
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
            
            <button onClick={sendMessage} disabled={isLoading || !input.trim()} className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl transition disabled:opacity-50">
              {isLoading ? "⏳" : "📤"}
            </button>
          </div>
          
          {/* Quick Actions */}
          <div className="flex gap-2 mt-3 flex-wrap">
            <button onClick={() => fileInputRef.current?.click()} className="text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-3 py-1.5 rounded-full border border-blue-500/30 transition">
              {t(language, 'uploadW2')}
            </button>
            <button onClick={() => setInput("What is the standard deduction for 2025?")} className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-full transition">
              {t(language, 'standardDeduction')}
            </button>
            <button onClick={() => setInput("Am I eligible for EITC?")} className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-full transition">
              {t(language, 'checkEITC')}
            </button>
            <button onClick={() => setInput("continue")} className="text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-500/30 transition">
              {t(language, 'continueFile')}
            </button>
            <button onClick={goToDashboard} className="text-xs bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 px-3 py-1.5 rounded-full border border-purple-500/30 transition">
              {t(language, 'viewDashboard')}
            </button>
            <button onClick={handleResetSession} className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-full transition">
              {t(language, 'reset')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}