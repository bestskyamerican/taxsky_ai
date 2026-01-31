// ============================================================
// TAXSKY 2025 - SMART AI CHAT INTERFACE v5.0 MOBILE
// ============================================================
// ✅ v5.0: Mobile-first responsive design
//          - Compact mobile header
//          - Touch-friendly input area
//          - Full-width chat bubbles on mobile
//          - Sticky input with safe area padding
// ✅ v4.0: Calls Python API for accurate federal + state tax
// ============================================================

import React, { useState, useEffect, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5001";
const PYTHON_API = import.meta.env.VITE_PYTHON_API || "http://localhost:5002";

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
// TRANSLATIONS
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
    placeholder: "Type a message...",
    uploadW2: "📄 W-2",
    standardDeduction: "❓ Std Ded",
    checkEITC: "💰 EITC",
    continueFile: "➡️ Continue",
    viewDashboard: "📊 Dashboard",
    reset: "🔄 Reset",
    thinking: "Thinking...",
    uploadError: "❌ Upload error. Please try again.",
    connectionError: "Connection error. Please try again."
  },
  vi: {
    welcome: (name, year) => `👋 Xin chào${name ? ` ${name}` : ""}! Tôi là Trợ lý CPA của TaxSky.

Tôi sẽ giúp bạn khai thuế ${year} từng bước.

📤 **Hãy bắt đầu bằng cách tải lên tài liệu thuế:**
• W-2 (thu nhập từ việc làm)
• 1099-NEC (tự kinh doanh)
• 1099-INT (lãi suất)
• 1099-DIV (cổ tức)

Nhấp vào nút 📎 hoặc kéo và thả tài liệu.`,
    placeholder: "Nhập tin nhắn...",
    uploadW2: "📄 W-2",
    standardDeduction: "❓ Khấu trừ",
    checkEITC: "💰 EITC",
    continueFile: "➡️ Tiếp tục",
    viewDashboard: "📊 Bảng",
    reset: "🔄 Lại",
    thinking: "Đang nghĩ...",
    uploadError: "❌ Lỗi tải lên.",
    connectionError: "Lỗi kết nối."
  },
  es: {
    welcome: (name, year) => `👋 ¡Hola${name ? ` ${name}` : ""}! Soy tu Asistente CPA.

Te ayudaré a presentar tus impuestos de ${year} paso a paso.

📤 **Comencemos subiendo tus documentos:**
• W-2 (ingresos de empleo)
• 1099-NEC (trabajo por cuenta propia)
• 1099-INT (intereses)
• 1099-DIV (dividendos)

Haz clic en el botón 📎 o arrastra tus documentos.`,
    placeholder: "Escribe un mensaje...",
    uploadW2: "📄 W-2",
    standardDeduction: "❓ Deducción",
    checkEITC: "💰 EITC",
    continueFile: "➡️ Continuar",
    viewDashboard: "📊 Panel",
    reset: "🔄 Reiniciar",
    thinking: "Pensando...",
    uploadError: "❌ Error al subir.",
    connectionError: "Error de conexión."
  }
};

const t = (lang, key, ...args) => {
  const translations = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const value = translations[key];
  if (typeof value === 'function') return value(...args);
  return value || TRANSLATIONS.en[key] || key;
};

// ============================================================
// MOBILE DETECTION HOOK
// ============================================================
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return isMobile;
};

// ============================================================
// TAXSKY LOGO - Current Logo from SVG
// ============================================================
const TaxSkyLogo = ({ isMobile = false }) => (
  <svg width={isMobile ? 200 : 260} height={isMobile ? 54 : 70} viewBox="0 0 300 80" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="hexGradChat" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6366f1"/>
        <stop offset="100%" stopColor="#8b5cf6"/>
      </linearGradient>
      <linearGradient id="textGradChat" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3b82f6"/>
        <stop offset="100%" stopColor="#06b6d4"/>
      </linearGradient>
      <filter id="glowChat">
        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    {/* Hexagon layers */}
    <polygon points="42,12 62,2 82,12 82,35 62,45 42,35" fill="url(#hexGradChat)" opacity="0.25"/>
    <polygon points="35,22 55,12 75,22 75,45 55,55 35,45" fill="url(#hexGradChat)" opacity="0.5"/>
    <polygon points="40,32 58,23 76,32 76,52 58,62 40,52" fill="url(#hexGradChat)" filter="url(#glowChat)"/>
    {/* Dollar sign */}
    <path d="M58 38 L58 52 M52 42 Q58 38 64 42 Q58 46 52 50 Q58 54 64 50" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
    {/* Text */}
    <text x="95" y="50" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="36" fontWeight="700" fill="white">Tax</text>
    <text x="155" y="50" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="36" fontWeight="700" fill="url(#textGradChat)">Sky</text>
    <text x="225" y="50" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="20" fontWeight="600" fill="#a78bfa">AI</text>
  </svg>
);

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function SmartChatInterface() {
  const isMobile = useIsMobile();
  const [language, setLanguageState] = useState(getLanguage());
  
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("taxsky_user") || "{}"); } 
    catch { return {}; }
  });
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [phase, setPhase] = useState(PHASES.WELCOME);
  const [taxYear, setTaxYear] = useState(2025);
  const [userState, setUserState] = useState(() => localStorage.getItem("taxsky_state") || "CA");
  const [hasCompletedTax, setHasCompletedTax] = useState(false);
  const [taxData, setTaxData] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // ============================================================
  // NAVIGATION
  // ============================================================
  const goToDashboard = () => { window.location.href = "/dashboard"; };
  const goToDownloads = () => { window.location.href = "/dashboard?tab=downloads"; };
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
  // LOAD SESSION
  // ============================================================
  useEffect(() => {
    const loadSession = async () => {
      try {
        const token = localStorage.getItem("taxsky_token");
        const userId = localStorage.getItem("taxsky_userId") || user?.id;
        
        if (!userId || !token) { showWelcomeMessage(); return; }
        
        const response = await fetch(`${API_BASE}/api/ai/welcome`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({ userId, taxYear, language })
        });
        
        const data = await response.json();
        
        if (data.success) {
          if (data.hasCompletedTax) {
            setIsCalculating(true);
            let fullTaxData = data.taxData || {};
            
            try {
              const dataRes = await fetch(`${API_BASE}/api/ai/data/${userId}?taxYear=${taxYear}`, {
                headers: { "Authorization": `Bearer ${token}` }
              });
              const fullData = await dataRes.json();
              
              if (fullData.success) {
                const totals = fullData.totals || {};
                const answers = fullData.answers || {};
                
                const taxpayerWages = parseFloat(answers.taxpayer_wages) || 0;
                const spouseWages = parseFloat(answers.spouse_wages) || 0;
                const totalWages = totals.wages || (taxpayerWages + spouseWages);
                
                const taxpayerWithheld = parseFloat(answers.taxpayer_federal_withheld) || 0;
                const spouseWithheld = parseFloat(answers.spouse_federal_withheld) || 0;
                const totalWithheld = totals.federal_withheld || (taxpayerWithheld + spouseWithheld);
                
                const taxpayerStateWithheld = parseFloat(answers.taxpayer_state_withheld) || 0;
                const spouseStateWithheld = parseFloat(answers.spouse_state_withheld) || 0;
                const totalStateWithheld = totals.state_withheld || (taxpayerStateWithheld + spouseStateWithheld);
                
                const filingStatus = fullData.filing_status || answers.filing_status || 'single';
                const state = answers.state || 'CA';
                
                const federalTax = totals.federal_tax || 0;
                const standardDeduction = filingStatus === 'married_filing_jointly' ? 31500 : 
                                          filingStatus === 'head_of_household' ? 23850 : 15700;
                const taxableIncome = Math.max(0, totalWages - standardDeduction);
                const federalOwed = Math.max(0, federalTax - totalWithheld);
                const federalRefund = Math.max(0, totalWithheld - federalTax);
                
                fullTaxData = {
                  filing_status: filingStatus, state, total_income: totalWages, wages: totalWages,
                  agi: totals.agi || totalWages, federal_withheld: totalWithheld, state_withheld: totalStateWithheld,
                  federal_tax: federalTax, taxable_income: totals.taxable_income || taxableIncome,
                  standard_deduction: totals.standard_deduction || standardDeduction,
                  refund: federalRefund, amount_owed: federalOwed,
                };
                
                try {
                  const stateRes = await fetch(`${PYTHON_API}/calculate/state/${state}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ filing_status: filingStatus, federal_agi: fullTaxData.agi, wages: totalWages, state_withholding: totalStateWithheld })
                  });
                  const stateResult = await stateRes.json();
                  const stateData = stateResult.state || stateResult;
                  if (stateData) {
                    fullTaxData.state_agi = stateData.ca_agi || stateData.federal_agi || fullTaxData.agi;
                    fullTaxData.state_tax = stateData.total_tax || 0;
                    fullTaxData.state_deduction = stateData.standard_deduction || 0;
                    fullTaxData.state_taxable = stateData.taxable_income || 0;
                    fullTaxData.state_refund = stateData.refund || 0;
                    fullTaxData.state_owed = stateData.amount_owed || 0;
                    fullTaxData.state_withheld = stateData.withholding || totalStateWithheld;
                  }
                } catch (stateErr) { console.log("State calc error:", stateErr); }
              }
            } catch (dataErr) { console.log("Data fetch error:", dataErr); }
            
            setHasCompletedTax(true);
            setTaxData(fullTaxData);
            setPhase(PHASES.COMPLETE);
            setIsCalculating(false);
            addMessage("assistant", data.message);
          } else {
            setHasCompletedTax(false);
            if (data.message) { addMessage("assistant", data.message); }
            else { showWelcomeMessage(); }
          }
        } else { showWelcomeMessage(); }
      } catch (err) { console.error("Load session error:", err); showWelcomeMessage(); }
    };
    loadSession();
  }, []);

  // ============================================================
  // HELPERS
  // ============================================================
  const showWelcomeMessage = () => {
    const userName = user?.name || user?.firstName || "";
    setMessages([{ role: "assistant", content: t(language, 'welcome', userName, taxYear), timestamp: new Date() }]);
    setPhase(PHASES.UPLOAD_DOCS);
  };

  const addMessage = (role, content) => {
    setMessages(prev => [...prev, { role, content, timestamp: new Date() }]);
  };

  // ============================================================
  // CHAT API
  // ============================================================
  const callBackendChat = async (userMessage) => {
    try {
      const token = localStorage.getItem("taxsky_token");
      const userId = localStorage.getItem("taxsky_userId") || user?.id || "guest";
      
      const response = await fetch(`${API_BASE}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ userId, message: userMessage, language, state: userState, taxYear })
      });
      
      const data = await response.json();
      
      if (data.success) {
        if (data.hasCompletedTax) {
          setHasCompletedTax(true);
          setTaxData(data.taxData);
          setPhase(PHASES.COMPLETE);
        }
        return data.message;
      }
      return data.error || t(language, 'connectionError');
    } catch (err) { console.error("Chat error:", err); return t(language, 'connectionError'); }
  };

  // ============================================================
  // PROCESS INPUT
  // ============================================================
  const processUserInput = async (userMessage) => {
    const msg = userMessage.toLowerCase().trim();
    
    if (msg.includes("dashboard") || msg.includes("view result")) { goToDashboard(); return "Taking you to Dashboard..."; }
    if (msg.includes("download") || msg.includes("form 1040")) { goToDownloads(); return "Taking you to Downloads..."; }
    if (msg.includes("review") || msg.includes("details")) { goToDashboard(); return "Taking you to Dashboard..."; }
    if (msg.includes("start fresh") || msg.includes("start over")) { await handleResetSession(); return "Starting fresh..."; }
    if (msg.includes("update") || msg.includes("change")) { setHasCompletedTax(false); }
    
    return await callBackendChat(userMessage);
  };

  // ============================================================
  // FILE UPLOAD
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
          addMessage("assistant", `✅ **W-2 processed!**
• Employer: ${extractedFields.employer_name || "Unknown"}
• Wages: $${(extractedFields.wages_tips_other_comp || 0).toLocaleString()}
• Fed withheld: $${(extractedFields.federal_income_tax_withheld || 0).toLocaleString()}`);
        }
      } else { addMessage("assistant", t(language, 'uploadError')); }
    } catch (err) { console.error("Upload error:", err); addMessage("assistant", t(language, 'uploadError')); }
    finally { setIsUploading(false); }
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
    } catch (err) { addMessage("assistant", t(language, 'connectionError')); }
    finally { setIsLoading(false); }
  };

  // ============================================================
  // RESET SESSION
  // ============================================================
  const handleResetSession = async () => {
    const confirmMsg = language === 'vi' ? "Bạn có chắc muốn bắt đầu lại?" : 
                       language === 'es' ? "¿Estás seguro?" : "Are you sure you want to start over?";
    if (!window.confirm(confirmMsg)) return;
    
    try {
      const token = localStorage.getItem("taxsky_token");
      const userId = localStorage.getItem("taxsky_userId") || user?.id || "guest";
      
      await fetch(`${API_BASE}/api/ai/start-fresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ userId, taxYear })
      });
      
      setMessages([]);
      setPhase(PHASES.WELCOME);
      setHasCompletedTax(false);
      setTaxData(null);
      showWelcomeMessage();
    } catch (err) { console.error("Reset error:", err); }
  };

  // ============================================================
  // COMPLETED TAX CARD
  // ============================================================
  const CompletedTaxCard = () => {
    if (!taxData) return null;
    
    const fmt = (amt) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(Math.abs(amt || 0));
    
    const filingStatusDisplay = {
      'single': 'Single',
      'married_filing_jointly': 'Married Filing Jointly',
      'married_filing_separately': 'Married Filing Separately',
      'head_of_household': 'Head of Household',
    };
    
    const federalResult = (taxData?.refund || 0) - (taxData?.amount_owed || 0);
    const stateResult = (taxData?.state_refund || 0) - (taxData?.state_owed || 0);
    const netResult = federalResult + stateResult;

    return (
      <div style={{
        background: 'linear-gradient(135deg, rgba(30,41,59,1), rgba(15,23,42,1))',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '16px',
        padding: isMobile ? '16px' : '24px',
        margin: isMobile ? '12px' : '16px'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <span style={{ fontSize: '28px' }}>🎉</span>
          <h2 style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: 700, color: '#fff', margin: 0 }}>
            {language === 'vi' ? 'Thuế 2025 hoàn tất!' : 'Your 2025 Taxes Complete!'}
          </h2>
        </div>
        
        {/* Filing Status & Income */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '12px' }}>
            <span style={{ color: '#94a3b8', fontSize: '12px', display: 'block' }}>Status</span>
            <span style={{ color: '#fff', fontWeight: 600, fontSize: isMobile ? '13px' : '14px' }}>
              {filingStatusDisplay[taxData?.filing_status] || 'Single'}
            </span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '12px' }}>
            <span style={{ color: '#94a3b8', fontSize: '12px', display: 'block' }}>Income</span>
            <span style={{ color: '#fff', fontWeight: 600, fontSize: isMobile ? '13px' : '14px' }}>{fmt(taxData?.total_income)}</span>
          </div>
        </div>
        
        {/* Federal */}
        <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '12px', padding: '12px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span>🇺🇸</span>
            <span style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>Federal</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '12px' }}>
            <div><span style={{ color: '#94a3b8', display: 'block' }}>AGI</span><span style={{ color: '#fff' }}>{fmt(taxData?.agi)}</span></div>
            <div><span style={{ color: '#94a3b8', display: 'block' }}>Tax</span><span style={{ color: '#fff' }}>{fmt(taxData?.federal_tax)}</span></div>
            <div><span style={{ color: '#94a3b8', display: 'block' }}>Withheld</span><span style={{ color: '#fff' }}>{fmt(taxData?.federal_withheld)}</span></div>
          </div>
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(59,130,246,0.2)', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#fff' }}>{federalResult >= 0 ? '💰 Refund' : '💳 Owed'}</span>
            <span style={{ fontWeight: 700, color: federalResult >= 0 ? '#10b981' : '#ef4444' }}>{fmt(federalResult)}</span>
          </div>
        </div>
        
        {/* State */}
        <div style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '12px', padding: '12px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span>🏛️</span>
            <span style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>{taxData?.state || 'CA'} State</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '12px' }}>
            <div><span style={{ color: '#94a3b8', display: 'block' }}>Tax</span><span style={{ color: '#fff' }}>{fmt(taxData?.state_tax)}</span></div>
            <div><span style={{ color: '#94a3b8', display: 'block' }}>Withheld</span><span style={{ color: '#fff' }}>{fmt(taxData?.state_withheld)}</span></div>
            <div><span style={{ color: '#94a3b8', display: 'block' }}>{stateResult >= 0 ? 'Refund' : 'Owed'}</span><span style={{ color: stateResult >= 0 ? '#10b981' : '#ef4444' }}>{fmt(stateResult)}</span></div>
          </div>
        </div>
        
        {/* Net Total */}
        <div style={{
          background: netResult >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
          border: `1px solid ${netResult >= 0 ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ color: '#fff', fontSize: '16px' }}>{netResult >= 0 ? '💰 Total Refund' : '💳 Total Owed'}</span>
          <span style={{ fontSize: isMobile ? '24px' : '28px', fontWeight: 800, color: netResult >= 0 ? '#10b981' : '#f59e0b' }}>{fmt(netResult)}</span>
        </div>
        
        {/* Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
          <button onClick={goToDashboard} style={{ padding: '14px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}>📊 Review Details</button>
          <button onClick={goToDownloads} style={{ padding: '14px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}>📥 Download Forms</button>
          <button onClick={() => { setHasCompletedTax(false); addMessage("assistant", "What would you like to update?"); }} style={{ padding: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#94a3b8', fontWeight: 500, cursor: 'pointer', fontSize: '14px' }}>✏️ Update Info</button>
          <button onClick={handleResetSession} style={{ padding: '14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', color: '#f87171', fontWeight: 500, cursor: 'pointer', fontSize: '14px' }}>🔄 Start Fresh</button>
        </div>
      </div>
    );
  };

  // ============================================================
  // STYLES
  // ============================================================
  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      color: '#e2e8f0',
      overflow: 'hidden'
    },
    header: {
      background: 'rgba(30, 41, 59, 0.98)',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      padding: isMobile ? '12px 16px' : '12px 24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      backdropFilter: 'blur(10px)',
      zIndex: 100
    },
    logo: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: isMobile ? '18px' : '20px',
      fontWeight: 700
    },
    messagesContainer: {
      flex: 1,
      overflowY: 'auto',
      padding: isMobile ? '12px' : '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    },
    inputContainer: {
      borderTop: '1px solid rgba(255,255,255,0.1)',
      background: 'rgba(30, 41, 59, 0.98)',
      padding: isMobile ? '12px 12px 24px 12px' : '16px',
      backdropFilter: 'blur(10px)'
    },
    inputRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    input: {
      flex: 1,
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '12px',
      padding: isMobile ? '14px 16px' : '12px 16px',
      color: '#fff',
      fontSize: '16px',
      outline: 'none'
    },
    sendBtn: {
      padding: isMobile ? '14px' : '12px',
      background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
      border: 'none',
      borderRadius: '12px',
      color: '#fff',
      fontSize: '18px',
      cursor: 'pointer',
      minWidth: '48px'
    },
    quickActions: {
      display: 'flex',
      gap: '8px',
      marginTop: '10px',
      flexWrap: 'wrap',
      overflowX: 'auto',
      paddingBottom: '4px'
    },
    quickBtn: {
      fontSize: '12px',
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '20px',
      padding: '8px 12px',
      color: '#94a3b8',
      cursor: 'pointer',
      whiteSpace: 'nowrap'
    }
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '16px' }}>
          {/* Logo */}
          <TaxSkyLogo isMobile={isMobile} />
          
          {/* Nav Buttons */}
          {!isMobile && (
            <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
              <span style={{ padding: '8px 12px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>💬 Chat</span>
              <button onClick={goToDashboard} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px', fontSize: '13px', color: '#94a3b8', cursor: 'pointer' }}>📊 Dashboard</button>
            </div>
          )}
        </div>
        
        {/* Right Side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px' }}>
          {isMobile ? (
            <>
              <button onClick={goToDashboard} style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '10px', fontSize: '16px' }}>📊</button>
              <button onClick={() => setShowMobileMenu(!showMobileMenu)} style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '10px', fontSize: '16px' }}>☰</button>
            </>
          ) : (
            <>
              <select value={taxYear} onChange={(e) => setTaxYear(parseInt(e.target.value))} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: '#fff', fontSize: '13px' }}>
                <option value={2025}>2025</option>
                <option value={2024}>2024</option>
              </select>
              <span style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', fontSize: '12px', color: '#94a3b8' }}>📍 {userState}</span>
              <select value={language} onChange={(e) => { localStorage.setItem("taxsky_language", e.target.value); window.location.reload(); }} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: '#fff', fontSize: '13px' }}>
                <option value="en">🇺🇸</option>
                <option value="vi">🇻🇳</option>
                <option value="es">🇪🇸</option>
              </select>
              <span style={{ padding: '6px 10px', background: 'rgba(16,185,129,0.2)', borderRadius: '6px', fontSize: '11px', color: '#10b981', fontWeight: 600 }}>CPA Expert</span>
              <span style={{ fontSize: '13px', color: '#94a3b8' }}>{user?.name?.split(' ')[0] || 'Guest'}</span>
              <button onClick={handleLogout} style={{ padding: '6px 10px', background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: '6px', color: '#f87171', cursor: 'pointer', fontSize: '14px' }}>🚪</button>
            </>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobile && showMobileMenu && (
        <div style={{ background: 'rgba(30, 41, 59, 0.98)', padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#94a3b8', fontSize: '14px' }}>Tax Year</span>
              <select value={taxYear} onChange={(e) => setTaxYear(parseInt(e.target.value))} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 16px', color: '#fff' }}>
                <option value={2025}>2025</option>
                <option value={2024}>2024</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#94a3b8', fontSize: '14px' }}>Language</span>
              <select value={language} onChange={(e) => { localStorage.setItem("taxsky_language", e.target.value); window.location.reload(); }} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 16px', color: '#fff' }}>
                <option value="en">🇺🇸 English</option>
                <option value="vi">🇻🇳 Tiếng Việt</option>
                <option value="es">🇪🇸 Español</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#94a3b8', fontSize: '14px' }}>State</span>
              <span style={{ color: '#fff', fontWeight: 600 }}>📍 {userState}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#94a3b8', fontSize: '14px' }}>User</span>
              <span style={{ color: '#fff' }}>{user?.name || 'Guest'}</span>
            </div>
            <button onClick={handleLogout} style={{ padding: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', color: '#f87171', fontWeight: 500 }}>🚪 Logout</button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div style={styles.messagesContainer}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: isMobile ? '90%' : '75%',
              padding: isMobile ? '12px 16px' : '14px 18px',
              borderRadius: '16px',
              background: msg.role === 'user' 
                ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' 
                : 'rgba(255,255,255,0.05)',
              border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
              fontSize: isMobile ? '14px' : '15px',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap'
            }}>
              {msg.content.split(/(\*\*.*?\*\*)/).map((part, i) => {
                if (part.startsWith("**") && part.endsWith("**")) {
                  return <strong key={i} style={{ color: '#fff' }}>{part.slice(2, -2)}</strong>;
                }
                return part;
              })}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '16px', height: '16px', border: '2px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <span style={{ color: '#94a3b8', fontSize: '14px' }}>{t(language, 'thinking')}</span>
            </div>
          </div>
        )}
        
        {isCalculating && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '16px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '16px', height: '16px', border: '2px solid #10b981', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <span style={{ color: '#10b981', fontSize: '14px' }}>Calculating taxes...</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Completed Tax Card */}
      {hasCompletedTax && taxData && <CompletedTaxCard />}

      {/* Input Area */}
      {!hasCompletedTax && (
        <div style={styles.inputContainer}>
          <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*,.pdf" onChange={(e) => handleFileUpload(e.target.files[0])} />
          
          <div style={styles.inputRow}>
            <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} style={{ padding: isMobile ? '14px' : '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '18px', cursor: 'pointer', minWidth: '48px' }}>
              {isUploading ? '⏳' : '📎'}
            </button>
            
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder={t(language, 'placeholder')}
              style={styles.input}
              disabled={isLoading}
            />
            
            <button onClick={sendMessage} disabled={isLoading || !input.trim()} style={{ ...styles.sendBtn, opacity: isLoading || !input.trim() ? 0.5 : 1 }}>
              {isLoading ? '⏳' : '📤'}
            </button>
          </div>
          
          {/* Quick Actions */}
          <div style={styles.quickActions}>
            <button onClick={() => fileInputRef.current?.click()} style={{ ...styles.quickBtn, background: 'rgba(59,130,246,0.15)', borderColor: 'rgba(59,130,246,0.3)', color: '#60a5fa' }}>{t(language, 'uploadW2')}</button>
            <button onClick={() => setInput("What is the standard deduction for 2025?")} style={styles.quickBtn}>{t(language, 'standardDeduction')}</button>
            <button onClick={() => setInput("Am I eligible for EITC?")} style={styles.quickBtn}>{t(language, 'checkEITC')}</button>
            <button onClick={() => setInput("continue")} style={{ ...styles.quickBtn, background: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.3)', color: '#10b981' }}>{t(language, 'continueFile')}</button>
            <button onClick={goToDashboard} style={{ ...styles.quickBtn, background: 'rgba(139,92,246,0.15)', borderColor: 'rgba(139,92,246,0.3)', color: '#a78bfa' }}>{t(language, 'viewDashboard')}</button>
            <button onClick={handleResetSession} style={styles.quickBtn}>{t(language, 'reset')}</button>
          </div>
        </div>
      )}

      {/* Global Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        * { font-family: 'Plus Jakarta Sans', sans-serif; box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: #64748b; }
        select option { background: #1e293b; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
      `}</style>
    </div>
  );
}