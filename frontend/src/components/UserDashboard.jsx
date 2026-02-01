// ============================================================
// USER DASHBOARD - v5.6 FIX WITHHOLDING AGGREGATION
// ============================================================
// ✅ v5.6: Fixed federal/state withholding aggregation from W-2 answers
//          - Aggregates w2_1_federal_withheld, w2_2_federal_withheld, etc.
//          - Recalculates refund/owed using correct withholding
// ✅ v5.4: Fixed API endpoint from /calculate/state to /calculate/state/{code}
// ✅ v5.3: Fixed nested response handling (rawResponse.state || rawResponse)
// ✅ v5.2: Fixed state tax field mapping
// ✅ v5.1: Added ALL 50 states + DC support
// ============================================================

import React, { useState, useEffect, useCallback } from "react";
import SubmitFlow from "./SubmitFlow";

const API_BASE = import.meta.env?.VITE_API_URL || "http://localhost:5001";
const PYTHON_API = import.meta.env?.VITE_PYTHON_API || "http://localhost:5002";

// ✅ STATE LIST - ALL 50 STATES + DC
const ALL_STATES = [
  // No Income Tax States
  { code: "AK", name: "Alaska", icon: "🏔️", group: "no_tax" },
  { code: "FL", name: "Florida", icon: "🌴", group: "no_tax" },
  { code: "NV", name: "Nevada", icon: "🎰", group: "no_tax" },
  { code: "NH", name: "New Hampshire", icon: "🏔️", group: "no_tax" },
  { code: "SD", name: "South Dakota", icon: "🌾", group: "no_tax" },
  { code: "TN", name: "Tennessee", icon: "🎸", group: "no_tax" },
  { code: "TX", name: "Texas", icon: "🤠", group: "no_tax" },
  { code: "WA", name: "Washington", icon: "🌲", group: "no_tax" },
  { code: "WY", name: "Wyoming", icon: "🦬", group: "no_tax" },
  // Income Tax States - Full Support
  { code: "AL", name: "Alabama", icon: "🏈", group: "full" },
  { code: "AR", name: "Arkansas", icon: "💎", group: "full" },
  { code: "AZ", name: "Arizona", icon: "🌵", group: "full" },
  { code: "CA", name: "California", icon: "🌴", group: "full" },
  { code: "CO", name: "Colorado", icon: "🏔️", group: "full" },
  { code: "CT", name: "Connecticut", icon: "🍂", group: "full" },
  { code: "DC", name: "Washington DC", icon: "🏛️", group: "full" },
  { code: "DE", name: "Delaware", icon: "🐓", group: "full" },
  { code: "GA", name: "Georgia", icon: "🍑", group: "full" },
  { code: "HI", name: "Hawaii", icon: "🌺", group: "full" },
  { code: "IA", name: "Iowa", icon: "🌽", group: "full" },
  { code: "ID", name: "Idaho", icon: "🥔", group: "full" },
  { code: "IL", name: "Illinois", icon: "🏙️", group: "full" },
  { code: "IN", name: "Indiana", icon: "🏎️", group: "full" },
  { code: "KS", name: "Kansas", icon: "🌻", group: "full" },
  { code: "KY", name: "Kentucky", icon: "🐴", group: "full" },
  { code: "LA", name: "Louisiana", icon: "🎺", group: "full" },
  { code: "MA", name: "Massachusetts", icon: "🦞", group: "full" },
  { code: "MD", name: "Maryland", icon: "🦀", group: "full" },
  { code: "ME", name: "Maine", icon: "🦞", group: "full" },
  { code: "MI", name: "Michigan", icon: "🚗", group: "full" },
  { code: "MN", name: "Minnesota", icon: "❄️", group: "full" },
  { code: "MO", name: "Missouri", icon: "⚾", group: "full" },
  { code: "MS", name: "Mississippi", icon: "🎸", group: "full" },
  { code: "MT", name: "Montana", icon: "🦌", group: "full" },
  { code: "NC", name: "North Carolina", icon: "🏀", group: "full" },
  { code: "ND", name: "North Dakota", icon: "🌾", group: "full" },
  { code: "NE", name: "Nebraska", icon: "🌽", group: "full" },
  { code: "NJ", name: "New Jersey", icon: "🏛️", group: "full" },
  { code: "NM", name: "New Mexico", icon: "🌵", group: "full" },
  { code: "NY", name: "New York", icon: "🗽", group: "full" },
  { code: "OH", name: "Ohio", icon: "🏈", group: "full" },
  { code: "OK", name: "Oklahoma", icon: "🤠", group: "full" },
  { code: "OR", name: "Oregon", icon: "🌲", group: "full" },
  { code: "PA", name: "Pennsylvania", icon: "🔔", group: "full" },
  { code: "RI", name: "Rhode Island", icon: "⛵", group: "full" },
  { code: "SC", name: "South Carolina", icon: "🌴", group: "full" },
  { code: "UT", name: "Utah", icon: "🏔️", group: "full" },
  { code: "VA", name: "Virginia", icon: "🏛️", group: "full" },
  { code: "VT", name: "Vermont", icon: "🍁", group: "full" },
  { code: "WI", name: "Wisconsin", icon: "🧀", group: "full" },
  { code: "WV", name: "West Virginia", icon: "⛰️", group: "full" },
];

const getStateIcon = (code) => ALL_STATES.find(s => s.code === code)?.icon || "🏛️";

// TRANSLATIONS
const translations = {
  en: {
    taxChat: "💬 Chat", dashboard: "📊 Dashboard", taxYear: "Tax Year", logout: "Logout",
    tabs: { overview: "Overview", documents: "Docs", downloads: "Downloads", history: "History", settings: "Settings" },
    tabIcons: { overview: "📊", documents: "📄", downloads: "📥", history: "💬", settings: "⚙️" },
    estimatedRefund: "Estimated Refund", estimatedOwed: "Amount Owed",
    federal: "🇺🇸 Federal", fileNow: "📋 File Now", totalIncome: "Total Income", withheld: "Withheld",
    federalBreakdown: "🇺🇸 Federal Tax", w2Wages: "W-2 Wages", standardDeduction: "Std Deduction",
    taxableIncome: "Taxable Income", federalTax: "Federal Tax", netRefund: "Refund", netOwed: "Owed",
    obbbDeductions: "OBBB Deductions",
    downloadForms: "📥 Download Forms", form1040: "Form 1040", form1040Desc: "U.S. Individual Tax Return",
    downloadPdf: "Download", settingsTitle: "⚙️ Settings", language: "Language", languageDesc: "Select language",
    loading: "Loading...", errorNoUserId: "⚠️ Please login again", noDataYet: "Complete interview to see results",
    startInterview: "Start Interview", adjustments: "Adjustments", state: "State",
    downloadFederal: "📥 Form 1040", downloadState: "📥 State Form",
    payToDownload: "🔒 Pay to Download", unlockForms: "Complete payment to download",
  },
  vi: {
    taxChat: "💬 Chat", dashboard: "📊 Bảng", taxYear: "Năm", logout: "Thoát",
    tabs: { overview: "Tổng Quan", documents: "Tài Liệu", downloads: "Tải", history: "Lịch Sử", settings: "Cài Đặt" },
    tabIcons: { overview: "📊", documents: "📄", downloads: "📥", history: "💬", settings: "⚙️" },
    estimatedRefund: "Hoàn Thuế", estimatedOwed: "Số Tiền Nợ",
    federal: "🇺🇸 Liên Bang", fileNow: "📋 Nộp", totalIncome: "Tổng Thu Nhập", withheld: "Khấu Trừ",
    federalBreakdown: "🇺🇸 Thuế Liên Bang", w2Wages: "Lương W-2", standardDeduction: "Khấu Trừ TC",
    taxableIncome: "Thu Nhập Thuế", federalTax: "Thuế LB", netRefund: "Hoàn", netOwed: "Nợ",
    downloadForms: "📥 Tải Mẫu", form1040: "Mẫu 1040", form1040Desc: "Tờ Khai Thuế",
    downloadPdf: "Tải", settingsTitle: "⚙️ Cài Đặt", language: "Ngôn Ngữ", languageDesc: "Chọn ngôn ngữ",
    loading: "Đang tải...", errorNoUserId: "⚠️ Đăng nhập lại", noDataYet: "Hoàn thành phỏng vấn",
    startInterview: "Bắt Đầu", adjustments: "Điều Chỉnh", state: "Bang",
    downloadFederal: "📥 Mẫu 1040", downloadState: "📥 Mẫu Bang",
    payToDownload: "🔒 Thanh Toán", unlockForms: "Thanh toán để tải",
  },
  es: {
    taxChat: "💬 Chat", dashboard: "📊 Panel", taxYear: "Año", logout: "Salir",
    tabs: { overview: "Resumen", documents: "Docs", downloads: "Descargas", history: "Historia", settings: "Ajustes" },
    tabIcons: { overview: "📊", documents: "📄", downloads: "📥", history: "💬", settings: "⚙️" },
    estimatedRefund: "Reembolso", estimatedOwed: "Adeudado",
    federal: "🇺🇸 Federal", fileNow: "📋 Presentar", totalIncome: "Ingreso Total", withheld: "Retenido",
    federalBreakdown: "🇺🇸 Federal", w2Wages: "Salarios W-2", standardDeduction: "Deducción",
    taxableIncome: "Gravable", federalTax: "Impuesto", netRefund: "Reembolso", netOwed: "Adeudado",
    downloadForms: "📥 Descargar", form1040: "Form 1040", form1040Desc: "Declaración EE.UU.",
    downloadPdf: "Descargar", settingsTitle: "⚙️ Ajustes", language: "Idioma", languageDesc: "Seleccione",
    loading: "Cargando...", errorNoUserId: "⚠️ Inicie sesión", noDataYet: "Complete entrevista",
    startInterview: "Iniciar", adjustments: "Ajustes", state: "Estado",
    downloadFederal: "📥 Form 1040", downloadState: "📥 Estado",
    payToDownload: "🔒 Pagar", unlockForms: "Pague para descargar",
  }
};

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'es', name: 'Español', flag: '🇲🇽' },
];

// ✅ MOBILE DETECTION HOOK
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
// TAXSKY LOGO - Properly Sized for Header
// ============================================================
const TaxSkyLogo = ({ isMobile = false, isPaid = false }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
    {/* Hexagon Icon */}
    <svg width={isMobile ? 36 : 44} height={isMobile ? 36 : 44} viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="hexGradDash" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1"/>
          <stop offset="100%" stopColor="#8b5cf6"/>
        </linearGradient>
        <filter id="glowDash">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      {/* Back hexagon */}
      <polygon points="25,5 40,12 40,30 25,37 10,30 10,12" fill="url(#hexGradDash)" opacity="0.25"/>
      {/* Middle hexagon */}
      <polygon points="25,10 37,16 37,32 25,38 13,32 13,16" fill="url(#hexGradDash)" opacity="0.5"/>
      {/* Front hexagon */}
      <polygon points="25,14 35,19 35,33 25,38 15,33 15,19" fill="url(#hexGradDash)" filter="url(#glowDash)"/>
      {/* $ symbol */}
      <path d="M25 20 L25 32 M21 23 Q25 20 29 23 Q25 26 21 29 Q25 32 29 29" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
    </svg>
    {/* Text */}
    <div style={{ display: 'flex', alignItems: 'baseline' }}>
      <span style={{ fontSize: isMobile ? '20px' : '22px', fontWeight: 700, color: '#fff' }}>Tax</span>
      <span style={{ 
        fontSize: isMobile ? '20px' : '22px', 
        fontWeight: 700, 
        background: 'linear-gradient(135deg, #3b82f6, #06b6d4)', 
        WebkitBackgroundClip: 'text', 
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text'
      }}>Sky</span>
      <span style={{ fontSize: isMobile ? '12px' : '14px', fontWeight: 600, color: '#a78bfa', marginLeft: '4px' }}>AI</span>
    </div>
    {isPaid && <span style={{ fontSize: '10px', padding: '2px 8px', background: 'rgba(16,185,129,0.3)', borderRadius: '4px', color: '#10b981', fontWeight: 600 }}>PAID</span>}
  </div>
);

export default function UserDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [taxData, setTaxData] = useState(null);
  const [userData, setUserData] = useState(null);
  const [selectedYear, setSelectedYear] = useState("2025");
  const [showSubmitFlow, setShowSubmitFlow] = useState(false);
  const [lang, setLang] = useState(() => localStorage.getItem("taxsky_language") || "en");
  const [userIdError, setUserIdError] = useState(false);
  const [form1040Data, setForm1040Data] = useState(null);
  const [selectedState, setSelectedState] = useState("CA");
  const [stateLoading, setStateLoading] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  const isMobile = useIsMobile();
  const t = translations[lang] || translations.en;

  // Helpers
  const changeLang = (newLang) => { setLang(newLang); localStorage.setItem("taxsky_language", newLang); };
  const getUser = () => { try { return JSON.parse(localStorage.getItem("taxsky_user") || "{}"); } catch { return {}; } };
  const getToken = () => localStorage.getItem("taxsky_token");
  const getUserId = () => {
    const user = getUser();
    const userId = user?.id || user?.odtUserId || localStorage.getItem("taxsky_userId");
    if (!userId || userId === 'undefined' || userId === 'null') return null;
    return userId;
  };
  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(Math.abs(n || 0));
  const goToChat = () => { window.location.href = "/smart-chat"; };
  const handleLogout = () => { localStorage.removeItem("taxsky_token"); localStorage.removeItem("taxsky_user"); window.location.href = "/"; };

  // ✅ CALCULATE STATE TAX
  const calculateStateTax = useCallback(async (stateCode) => {
    if (!taxData?.agi || taxData.agi <= 0) return;
    setStateLoading(true);
    try {
      const answers = userData?.answers || {};
      const res = await fetch(`${PYTHON_API}/calculate/state/${stateCode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filing_status: userData?.filing_status || "single",
          federal_agi: taxData.agi, agi: taxData.agi, wages: taxData.wages || 0,
          earned_income: taxData.wages || 0, state_withholding: taxData.stateWithholding || taxData.caWithholding || 0,
          is_renter: answers.is_renter || false, num_children: answers.qualifying_children_under_17 || 0,
          has_child_under_6: answers.has_child_under_6 || false, is_nyc: answers.is_nyc || false,
        }),
      });
      const result = await res.json();
      const stateResult = result.state || result;
      setTaxData(prev => ({
        ...prev,
        state: stateCode, stateName: stateResult.state_name || stateCode,
        hasStateTax: stateResult.has_income_tax !== false, supportLevel: stateResult.support_level || "unknown",
        caAgi: stateResult.ca_agi || stateResult.federal_agi || prev.agi,
        caStdDeduction: stateResult.standard_deduction || 0,
        caTaxableIncome: stateResult.taxable_income || 0, caTax: stateResult.total_tax || 0,
        calEitc: stateResult.caleitc || 0, yctc: stateResult.yctc || 0,
        caWithholding: stateResult.withholding || prev.caWithholding || 0,
        stateRefund: stateResult.refund || 0, stateOwed: stateResult.amount_owed || 0,
        effectiveRate: stateResult.effective_rate || 0,
        totalRefund: (prev.federalRefund || 0) + (stateResult.refund || 0),
        totalOwed: (prev.federalOwed || 0) + (stateResult.amount_owed || 0),
      }));
    } catch (err) { console.error(`[DASHBOARD] ❌ Error:`, err); }
    finally { setStateLoading(false); }
  }, [taxData?.agi, taxData?.wages, userData]);

  useEffect(() => {
    if (selectedState && taxData?.agi > 0 && !loading) calculateStateTax(selectedState);
  }, [selectedState]);

  useEffect(() => {
    setUser(getUser());
    const userId = getUserId();
    if (!userId) { setUserIdError(true); setLoading(false); return; }
    fetchTaxData();
  }, [selectedYear]);

  const fetchTaxData = async () => {
    const userId = getUserId();
    if (!userId) return;
    try {
      setLoading(true);
      let result = { success: false, answers: {}, totals: {}, form1040: {} };
      try {
        const res = await fetch(`${API_BASE}/api/ai/data/${userId}?taxYear=${selectedYear}`, {
          headers: { "Authorization": `Bearer ${getToken()}` }
        });
        result = await res.json();
      } catch (nodeErr) { console.log("[DASHBOARD] ⚠️ Node.js API error:", nodeErr); }
      
      const answers = result.answers || {};
      const totals = result.totals || {};
      let form1040 = result.form1040 || null;
      
      // ✅ v5.6 FIX: Aggregate W-2 withholding from answers if totals is missing
      let federalWithheld = totals.federal_withheld || 0;
      let stateWithheld = totals.state_withheld || 0;
      let totalWages = totals.wages || 0;
      
      // Look for W-2 data in answers (w2_1_*, w2_2_*, etc.)
      for (let i = 1; i <= 5; i++) {
        const fedWithheld = parseFloat(answers[`w2_${i}_federal_withheld`] || answers[`w2_${i}_federal_withholding`] || 0);
        const stWithheld = parseFloat(answers[`w2_${i}_state_withheld`] || answers[`w2_${i}_state_withholding`] || 0);
        const wages = parseFloat(answers[`w2_${i}_wages`] || answers[`w2_${i}_income`] || 0);
        if (fedWithheld > 0) federalWithheld += fedWithheld;
        if (stWithheld > 0) stateWithheld += stWithheld;
        if (wages > 0 && totalWages === 0) totalWages += wages;
      }
      
      // Also check single W-2 fields
      if (federalWithheld === 0) {
        federalWithheld = parseFloat(answers.federal_withheld || answers.federal_withholding || answers.w2_federal_withheld || 0);
      }
      if (stateWithheld === 0) {
        stateWithheld = parseFloat(answers.state_withheld || answers.state_withholding || answers.w2_state_withheld || 0);
      }
      if (totalWages === 0) {
        totalWages = parseFloat(answers.w2_wages || answers.wages || answers.total_wages || 0);
      }
      
      // Update totals with aggregated values
      totals.federal_withheld = federalWithheld || totals.federal_withheld || 0;
      totals.state_withheld = stateWithheld || totals.state_withheld || 0;
      totals.wages = totalWages || totals.wages || 0;
      
      console.log("[DASHBOARD] 💰 Aggregated withholding:", { federalWithheld, stateWithheld, totalWages });
      
      if (totals.wages > 0 && (!form1040?.income?.line_1_wages)) {
        form1040 = {
          header: { tax_year: 2025, filing_status: answers.filing_status || totals.filing_status || 'single', state: answers.state || 'CA' },
          income: { line_1_wages: totals.wages || 0, line_1a_w2_wages: totals.wages || 0, line_1z_total_wages: totals.wages || 0, line_9_total_income: totals.total_income || totals.wages || 0 },
          adjustments: { line_10_schedule_1_adjustments: totals.total_adjustments || 0, line_11_agi: totals.agi || (totals.wages - (totals.total_adjustments || 0)) },
          deductions: { line_12_deduction: totals.standard_deduction || 30000, line_12_standard_deduction: totals.standard_deduction || 30000, line_15_taxable_income: totals.taxable_income || 0 },
          tax_and_credits: { line_15_taxable_income: totals.taxable_income || 0, line_16_tax: totals.federal_tax || 0, line_24_total_tax: totals.federal_tax || 0 },
          payments: { line_25a_w2_withholding: totals.federal_withheld || 0, line_25d_total_withholding: totals.federal_withheld || 0 },
          refund_or_owe: { line_35_refund: totals.refund || 0, line_37_amount_owe: totals.amount_owed || 0 },
          state_tax: { state: answers.state || 'CA', state_withholding: totals.state_withheld || 0 },
          summary: { total_income: totals.total_income || totals.wages || 0, agi: totals.agi || 0, taxable_income: totals.taxable_income || 0 }
        };
      }
      
      if (!form1040?.income?.line_1_wages && (!totals.wages || totals.wages === 0)) {
        try {
          const pythonRes = await fetch(`${PYTHON_API}/api/extract/json/${userId}?tax_year=${selectedYear}`);
          const pythonData = await pythonRes.json();
          if (pythonData.success && pythonData.form1040) { form1040 = pythonData.form1040; }
        } catch (pythonErr) { console.log("[DASHBOARD] ⚠️ Python API not available:", pythonErr); }
      }
      
      if (form1040?.income) {
        setForm1040Data(form1040);
        setIsPaid(result.paymentStatus === 'paid' || result.isPaid === true || result.filed === true || result.filingStatus === 'filed' || answers.payment_complete === true || answers.filed === true);
        
        const userState = form1040?.header?.state || form1040?.state_tax?.state || answers.state || "CA";
        setSelectedState(userState);
        setUserData({ ...result.data, answers, form1040, filing_status: form1040?.header?.filing_status || answers.filing_status, state: userState });
        
        const income = form1040.income || {};
        const adjustments = form1040.adjustments || {};
        const deductions = form1040.deductions || {};
        const taxCredits = form1040.tax_and_credits || {};
        const payments = form1040.payments || {};
        const refundOrOwe = form1040.refund_or_owe || form1040.refund || {};
        const federalAgi = adjustments.line_11_agi || form1040.summary?.agi || 0;
        const stateWithholding = form1040.state_tax?.state_withholding || answers.state_withholding || 0;
        
        let stateData = { state: userState, stateName: userState, caAgi: federalAgi, caWithholding: stateWithholding, stateRefund: 0, stateOwed: 0, hasStateTax: true };
        try {
          // ✅ v5.4 FIX: Use correct endpoint /calculate/state/{state_code}
          const stateRes = await fetch(`${PYTHON_API}/calculate/state/${userState}`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ state: userState, filing_status: form1040?.header?.filing_status || "single", federal_agi: federalAgi, wages: income.line_1_wages || 0, state_withholding: stateWithholding }),
          });
          const rawResponse = await stateRes.json();
          console.log("[DASHBOARD] 🏛️ Raw state API response:", rawResponse);
          
          // ✅ v5.3 FIX: Handle BOTH response formats
          // Format 1: /calculate/state returns result directly
          // Format 2: /calculate/state/{code} returns {success: true, state: result}
          const sr = rawResponse.state || rawResponse;
          console.log("[DASHBOARD] 🏛️ Extracted state data:", sr);
          
          if (sr && !sr.error) {
            // ✅ v5.3 FIX: Handle all possible field name variations from Python API
            // Including CA.py line-based field names (line_17_ca_agi, line_18_deduction, etc.)
            stateData = { 
              state: userState, 
              stateName: sr.state_name || userState, 
              hasStateTax: sr.has_income_tax !== false, 
              supportLevel: sr.support_level,
              // AGI - check CA.py line-based names AND generic names
              caAgi: sr.ca_agi || sr.line_17_ca_agi || sr.state_agi || sr.agi || sr.nj_agi || sr.federal_agi || federalAgi, 
              // Standard Deduction - check CA.py line-based names AND generic names
              caStdDeduction: sr.standard_deduction || sr.line_18_deduction || sr.deduction_used || sr.ca_standard_deduction || sr.state_standard_deduction || sr.exemptions || sr.deduction || 0,
              // Taxable Income - check CA.py line-based names AND generic names
              caTaxableIncome: sr.taxable_income || sr.line_19_taxable_income || sr.ca_taxable_income || sr.state_taxable_income || 0, 
              // Tax - check CA.py line-based names AND generic names
              caTax: sr.total_tax || sr.line_64_total_tax || sr.ca_tax || sr.state_tax || sr.tax || sr.net_tax || sr.tax_before_credits || 0, 
              // Credits - CA.py line-based names
              calEitc: sr.caleitc || sr.line_75_caleitc || sr.cal_eitc || sr.ca_eitc || 0, 
              yctc: sr.yctc || sr.line_76_yctc || sr.ca_yctc || 0, 
              ilEic: sr.il_eic || 0,
              // Withholding - CA.py line-based names
              caWithholding: sr.withholding || sr.line_71_withholding || sr.state_withholding || stateWithholding, 
              // Refund/Owed - CA.py line-based names
              stateRefund: sr.refund || sr.line_115_refund || sr.state_refund || 0, 
              stateOwed: sr.amount_owed || sr.line_111_amount_owed || sr.owed || sr.state_owed || 0, 
              effectiveRate: sr.effective_rate || 0, 
              taxRate: sr.tax_rate || 0 
            };
            console.log("[DASHBOARD] 🏛️ Mapped stateData:", stateData);
          }
        } catch (e) { console.error("State calc error:", e); }
        
        const federalRefund = refundOrOwe.line_35_refund || refundOrOwe.line_35a_refund || 0;
        const federalOwed = refundOrOwe.line_37_amount_owe || refundOrOwe.line_37_amount_owed || 0;
        
        // ✅ v5.6 FIX: Get withholding from corrected totals or payments
        const federalWithholdingAmount = payments.line_25a_w2_withholding || payments.line_25d_total_withholding || totals.federal_withheld || 0;
        const federalTaxAmount = taxCredits.line_16_tax || taxCredits.line_24_total_tax || 0;
        
        // Recalculate refund/owed if withholding is available but refund/owed is 0
        let calculatedRefund = federalRefund;
        let calculatedOwed = federalOwed;
        
        if (federalWithholdingAmount > 0 && federalRefund === 0 && federalOwed === 0) {
          if (federalWithholdingAmount > federalTaxAmount) {
            calculatedRefund = federalWithholdingAmount - federalTaxAmount;
            calculatedOwed = 0;
          } else {
            calculatedRefund = 0;
            calculatedOwed = federalTaxAmount - federalWithholdingAmount;
          }
          console.log("[DASHBOARD] 🔄 Recalculated refund/owed:", { federalTaxAmount, federalWithholdingAmount, calculatedRefund, calculatedOwed });
        }
        
        setTaxData({
          wages: income.line_1_wages || income.line_1a_w2_wages || 0, 
          totalIncome: income.line_9_total_income || form1040.summary?.total_income || 0,
          totalAdjustments: adjustments.line_10_schedule_1_adjustments || 0, agi: federalAgi,
          standardDeduction: deductions.line_12_deduction || deductions.line_12_standard_deduction || 0,
          totalObbbDeduction: form1040.obbb?.total_obbb_deduction || deductions.obbb_total_deduction || result.totals?.obbb_total_deduction || 0,
          taxableIncome: deductions.line_15_taxable_income || taxCredits.line_15_taxable_income || 0,
          federalTax: federalTaxAmount,
          federalWithholding: federalWithholdingAmount,
          withholding: federalWithholdingAmount,
          federalRefund: calculatedRefund, 
          federalOwed: calculatedOwed,
          filing_status: form1040?.header?.filing_status || 'single',
          ...stateData,
          totalRefund: calculatedRefund + (stateData.stateRefund || 0),
          totalOwed: calculatedOwed + (stateData.stateOwed || 0),
        });
        
        if (result.messages && result.messages.length > 0) { setChatHistory(result.messages); }
      }
      
      try {
        const docsRes = await fetch(`${API_BASE}/api/forms/user/${userId}?taxYear=${selectedYear}`, {
          headers: { "Authorization": `Bearer ${getToken()}` }
        });
        if (docsRes.ok) {
          const docsData = await docsRes.json();
          if (docsData.files && docsData.files.length > 0) { setUploadedDocs(docsData.files); }
        }
      } catch (docsErr) { console.log("[DASHBOARD] ℹ️ Documents not available"); }
    } catch (err) { console.error("Error:", err); }
    finally { setLoading(false); }
  };

  // ✅ DOWNLOAD HANDLERS
  const handleDownload1040 = async () => {
    if (!isPaid) { alert(t.unlockForms); setShowSubmitFlow(true); return; }
    const userId = getUserId();
    if (!userId) { alert(t.errorNoUserId); return; }
    try {
      const form1040 = form1040Data || {};
      const answers = userData?.answers || {};
      const res = await fetch(`${PYTHON_API}/generate/1040`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: userId, mask_ssn: false, is_official_submission: true,
          personal: { first_name: form1040?.header?.first_name || answers.first_name || "", last_name: form1040?.header?.last_name || answers.last_name || "", ssn: form1040?.header?.ssn || answers.ssn || "", spouse_first_name: form1040?.header?.spouse_first_name || answers.spouse_first_name || "", spouse_last_name: form1040?.header?.spouse_last_name || answers.spouse_last_name || "", spouse_ssn: form1040?.header?.spouse_ssn || answers.spouse_ssn || "", address: form1040?.header?.address || answers.address || "", city: form1040?.header?.city || answers.city || "", state: answers.state || "CA", zip: form1040?.header?.zip || answers.zip || "" },
          income: { wages: taxData?.wages || 0, interest: taxData?.interest || 0, dividends: taxData?.dividends || 0 },
          federal: { filing_status: form1040?.header?.filing_status || answers.filing_status || "single", agi: taxData?.agi || 0, standard_deduction: taxData?.standardDeduction || 0, taxable_income: taxData?.taxableIncome || 0, tax: taxData?.federalTax || 0, withholding: taxData?.withholding || 0, refund: taxData?.federalRefund || 0, amount_owed: taxData?.federalOwed || 0 },
          dependents: userData?.dependents || [],
        }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const a = document.createElement("a"); a.href = window.URL.createObjectURL(blob); a.download = `Form_1040_${selectedYear}.pdf`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
      }
    } catch (err) { alert("Error: " + err.message); }
  };

  const handleDownloadState = async () => {
    if (!isPaid) { alert(t.unlockForms); setShowSubmitFlow(true); return; }
    if (taxData?.hasStateTax === false) { alert(`${taxData?.stateName || selectedState} has no state income tax!`); return; }
    const userId = getUserId();
    if (!userId) { alert(t.errorNoUserId); return; }
    try {
      const res = await fetch(`${PYTHON_API}/generate/ca540`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: userId, mask_ssn: false,
          personal: { first_name: form1040Data?.header?.first_name || userData?.answers?.first_name || "", last_name: form1040Data?.header?.last_name || userData?.answers?.last_name || "", ssn: form1040Data?.header?.ssn || userData?.answers?.ssn || "", spouse_first_name: form1040Data?.header?.spouse_first_name || userData?.answers?.spouse_first_name || "", spouse_last_name: form1040Data?.header?.spouse_last_name || userData?.answers?.spouse_last_name || "", spouse_ssn: form1040Data?.header?.spouse_ssn || userData?.answers?.spouse_ssn || "", address: form1040Data?.header?.address || userData?.answers?.address || "", city: form1040Data?.header?.city || userData?.answers?.city || "", state: "CA", zip: form1040Data?.header?.zip || userData?.answers?.zip || "" },
          federal: { filing_status: form1040Data?.header?.filing_status || userData?.answers?.filing_status || "single", wages: taxData?.wages || form1040Data?.income?.line_1_wages || 0, agi: taxData?.agi || form1040Data?.adjustments?.line_11_agi || 0 },
          state: { ca_agi: taxData?.caAgi || taxData?.agi || 0, standard_deduction: taxData?.caStdDeduction || 0, taxable_income: taxData?.caTaxableIncome || 0, base_tax: taxData?.caTax || 0, total_tax: taxData?.caTax || 0, tax_after_credits: taxData?.caTax || 0, withholding: taxData?.caWithholding || 0, caleitc: taxData?.calEitc || 0, yctc: taxData?.yctc || 0, refund: taxData?.stateRefund || 0, amount_owed: taxData?.stateOwed || 0 },
          dependents: userData?.dependents || [],
        }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const a = document.createElement("a"); a.href = window.URL.createObjectURL(blob); a.download = `${selectedState}_Form_${selectedYear}.pdf`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
      }
    } catch (err) { alert("Error: " + err.message); }
  };

  const netResult = (taxData?.federalRefund || 0) - (taxData?.federalOwed || 0) + (taxData?.stateRefund || 0) - (taxData?.stateOwed || 0);
  const isNetRefund = netResult > 0;
  const netAmount = Math.abs(netResult);

  // ✅ STYLES
  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      color: '#e2e8f0',
      paddingBottom: isMobile ? '80px' : '0'
    },
    header: {
      background: 'rgba(15, 23, 42, 0.98)',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      padding: isMobile ? '12px 16px' : '16px 24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backdropFilter: 'blur(10px)'
    },
    logo: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: isMobile ? '18px' : '20px',
      fontWeight: 700,
      background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent'
    },
    content: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: isMobile ? '16px' : '24px'
    },
    card: {
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: isMobile ? '16px' : '20px',
      padding: isMobile ? '16px' : '24px',
      marginBottom: '16px'
    },
    summaryCard: {
      background: isNetRefund 
        ? 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(6,95,70,0.2))' 
        : 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(127,29,29,0.2))',
      border: `1px solid ${isNetRefund ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
      borderRadius: isMobile ? '16px' : '20px',
      padding: isMobile ? '20px' : '24px',
      textAlign: isMobile ? 'center' : 'left'
    },
    bigNumber: {
      fontSize: isMobile ? '32px' : '42px',
      fontWeight: 800,
      color: isNetRefund ? '#10b981' : '#ef4444'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '16px'
    },
    button: {
      width: '100%',
      padding: isMobile ? '16px' : '14px 20px',
      background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
      border: 'none',
      borderRadius: '12px',
      color: '#fff',
      fontWeight: 600,
      fontSize: isMobile ? '16px' : '14px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px'
    },
    bottomNav: {
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'rgba(15, 23, 42, 0.98)',
      borderTop: '1px solid rgba(255,255,255,0.1)',
      display: 'flex',
      justifyContent: 'space-around',
      padding: '8px 0 20px 0',
      zIndex: 1000,
      backdropFilter: 'blur(10px)'
    },
    navItem: (active) => ({
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px',
      padding: '8px 12px',
      borderRadius: '12px',
      background: active ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
      color: active ? '#60a5fa' : '#64748b',
      border: 'none',
      cursor: 'pointer',
      minWidth: '60px'
    }),
    row: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 0',
      borderBottom: '1px solid rgba(255,255,255,0.05)'
    }
  };

  // ✅ LOADING STATE
  if (loading) return (
    <div style={{ ...styles.container, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px', animation: 'pulse 2s infinite' }}>💰</div>
        <p style={{ color: '#94a3b8' }}>{t.loading}</p>
      </div>
    </div>
  );

  // ✅ ERROR STATE  
  if (userIdError) return (
    <div style={{ ...styles.container, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
        <p style={{ marginBottom: '20px' }}>{t.errorNoUserId}</p>
        <button onClick={() => window.location.href = "/"} style={styles.button}>Login</button>
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      {/* ✅ HEADER */}
      <div style={styles.header}>
        <TaxSkyLogo isMobile={isMobile} isPaid={isPaid} />
        
        {/* Desktop Header Actions */}
        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={goToChat} style={{ padding: '8px 16px', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', color: '#60a5fa', cursor: 'pointer' }}>{t.taxChat}</button>
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: '#fff' }}>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
            <select value={lang} onChange={(e) => changeLang(e.target.value)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: '#fff' }}>
              {languages.map(l => <option key={l.code} value={l.code}>{l.flag}</option>)}
            </select>
            <span style={{ color: '#94a3b8', fontSize: '14px' }}>{user?.name || 'Guest'}</span>
            <button onClick={handleLogout} style={{ padding: '8px 16px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#f87171', cursor: 'pointer' }}>🚪</button>
          </div>
        )}
        
        {/* Mobile Header Actions */}
        {isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={goToChat} style={{ padding: '10px', background: 'rgba(59, 130, 246, 0.2)', border: 'none', borderRadius: '10px', fontSize: '18px' }}>💬</button>
            <button onClick={() => setShowMobileMenu(!showMobileMenu)} style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '10px', fontSize: '18px' }}>☰</button>
          </div>
        )}
      </div>

      {/* ✅ MOBILE MENU DROPDOWN */}
      {isMobile && showMobileMenu && (
        <div style={{ background: 'rgba(15, 23, 42, 0.98)', padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#94a3b8' }}>Year</span>
              <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 16px', color: '#fff' }}>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#94a3b8' }}>Language</span>
              <select value={lang} onChange={(e) => changeLang(e.target.value)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 16px', color: '#fff' }}>
                {languages.map(l => <option key={l.code} value={l.code}>{l.flag} {l.name}</option>)}
              </select>
            </div>
            <button onClick={handleLogout} style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', color: '#f87171' }}>{t.logout}</button>
          </div>
        </div>
      )}

      {/* ✅ DESKTOP TABS */}
      {!isMobile && (
        <div style={{ ...styles.content, paddingBottom: '0' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px', overflowX: 'auto' }}>
            {Object.entries(t.tabs).map(([key, label]) => (
              <button key={key} onClick={() => setActiveTab(key)} style={{ padding: '10px 20px', background: activeTab === key ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px', color: activeTab === key ? '#fff' : '#94a3b8', cursor: 'pointer', fontWeight: activeTab === key ? 600 : 400, whiteSpace: 'nowrap' }}>{label}</button>
            ))}
          </div>
        </div>
      )}

      {/* ✅ MAIN CONTENT */}
      <div style={styles.content}>
        
        {/* ========== OVERVIEW TAB ========== */}
        {activeTab === "overview" && (
          <>
            {/* No Data State */}
            {!taxData?.wages && (
              <div style={{ ...styles.card, textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>📋</div>
                <p style={{ color: '#94a3b8', marginBottom: '20px', fontSize: isMobile ? '16px' : '18px' }}>{t.noDataYet}</p>
                <button onClick={goToChat} style={styles.button}>{t.startInterview}</button>
              </div>
            )}

            {/* Has Tax Data */}
            {taxData?.wages > 0 && (
              <>
                {/* Summary Card */}
                <div style={styles.summaryCard}>
                  <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '8px' }}>
                    {isNetRefund ? t.estimatedRefund : t.estimatedOwed}
                  </p>
                  <p style={styles.bigNumber}>{fmt(netAmount)}</p>
                  <div style={{ display: 'flex', gap: '16px', marginTop: '12px', justifyContent: isMobile ? 'center' : 'flex-start', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', color: taxData?.federalRefund > 0 ? '#10b981' : '#ef4444', background: 'rgba(0,0,0,0.2)', padding: '4px 10px', borderRadius: '6px' }}>
                      Fed: {taxData?.federalRefund > 0 ? '+' : '-'}{fmt(taxData?.federalRefund || taxData?.federalOwed)}
                    </span>
                    <span style={{ fontSize: '13px', color: taxData?.stateRefund > 0 ? '#10b981' : '#ef4444', background: 'rgba(0,0,0,0.2)', padding: '4px 10px', borderRadius: '6px' }}>
                      {selectedState}: {taxData?.stateRefund > 0 ? '+' : '-'}{fmt(taxData?.stateRefund || taxData?.stateOwed)}
                    </span>
                  </div>
                  <button onClick={() => setShowSubmitFlow(true)} style={{ ...styles.button, marginTop: '20px' }}>{t.fileNow}</button>
                </div>

                {/* Quick Stats */}
                <div style={{ ...styles.grid, marginTop: '16px' }}>
                  <div style={styles.card}>
                    <p style={{ color: '#94a3b8', fontSize: '13px' }}>{t.totalIncome}</p>
                    <p style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>{fmt(taxData?.totalIncome)}</p>
                  </div>
                  <div style={styles.card}>
                    <p style={{ color: '#94a3b8', fontSize: '13px' }}>{t.withheld}</p>
                    <p style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>{fmt(taxData?.withholding)}</p>
                  </div>
                </div>

                {/* Federal Breakdown */}
                <div style={{ ...styles.card, marginTop: '16px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#fff' }}>{t.federalBreakdown}</h3>
                  <div style={styles.row}><span style={{ color: '#94a3b8' }}>{t.w2Wages}</span><span style={{ color: '#fff' }}>{fmt(taxData?.wages)}</span></div>
                  <div style={styles.row}><span style={{ color: '#94a3b8' }}>{t.adjustments}</span><span style={{ color: '#ef4444' }}>-{fmt(taxData?.totalAdjustments)}</span></div>
                  <div style={styles.row}><span style={{ color: '#94a3b8' }}>AGI</span><span style={{ color: '#fff', fontWeight: 600 }}>{fmt(taxData?.agi)}</span></div>
                  <div style={styles.row}><span style={{ color: '#94a3b8' }}>{t.standardDeduction}</span><span style={{ color: '#ef4444' }}>-{fmt(taxData?.standardDeduction)}</span></div>
                  {taxData?.totalObbbDeduction > 0 && (
                    <div style={styles.row}>
                      <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        OBBB <span style={{ fontSize: '9px', padding: '2px 6px', background: 'rgba(16,185,129,0.2)', borderRadius: '4px', color: '#10b981' }}>NEW</span>
                      </span>
                      <span style={{ color: '#10b981' }}>-{fmt(taxData?.totalObbbDeduction)}</span>
                    </div>
                  )}
                  <div style={styles.row}><span style={{ color: '#94a3b8' }}>{t.taxableIncome}</span><span style={{ color: '#fff', fontWeight: 600 }}>{fmt(taxData?.taxableIncome)}</span></div>
                  <div style={styles.row}><span style={{ color: '#94a3b8' }}>{t.federalTax}</span><span style={{ color: '#ef4444' }}>{fmt(taxData?.federalTax)}</span></div>
                  <div style={styles.row}><span style={{ color: '#94a3b8' }}>{t.withheld}</span><span style={{ color: '#10b981' }}>+{fmt(taxData?.withholding)}</span></div>
                  <div style={{ ...styles.row, borderTop: '2px solid rgba(255,255,255,0.2)', marginTop: '8px', paddingTop: '12px', borderBottom: 'none' }}>
                    <span style={{ fontWeight: 600, color: '#fff' }}>{taxData?.federalRefund > 0 ? t.netRefund : t.netOwed}</span>
                    <span style={{ fontWeight: 700, fontSize: '20px', color: taxData?.federalRefund > 0 ? '#10b981' : '#ef4444' }}>{fmt(taxData?.federalRefund > 0 ? taxData.federalRefund : taxData?.federalOwed)}</span>
                  </div>
                  <button onClick={handleDownload1040} style={{ ...styles.button, marginTop: '16px', background: isPaid ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'rgba(255,255,255,0.1)', color: isPaid ? '#fff' : '#64748b' }}>
                    {isPaid ? t.downloadFederal : t.payToDownload}
                  </button>
                </div>

                {/* State Breakdown */}
                <div style={{ ...styles.card, marginTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {getStateIcon(selectedState)} {taxData?.stateName || selectedState}
                    </h3>
                    <select value={selectedState} onChange={(e) => setSelectedState(e.target.value)} disabled={stateLoading} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '13px' }}>
                      <optgroup label="✅ Full Support">{ALL_STATES.filter(s => s.group === 'full').map(s => <option key={s.code} value={s.code}>{s.icon} {s.name}</option>)}</optgroup>
                      <optgroup label="🎉 No Tax">{ALL_STATES.filter(s => s.group === 'no_tax').map(s => <option key={s.code} value={s.code}>{s.icon} {s.name}</option>)}</optgroup>
                    </select>
                  </div>

                  {stateLoading && <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}><div style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#3b82f6', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />Loading...</div>}

                  {!stateLoading && taxData?.hasStateTax === false && (
                    <div style={{ textAlign: 'center', padding: '24px', color: '#10b981' }}>
                      <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
                      <p style={{ fontSize: '16px', fontWeight: 600 }}>No state income tax!</p>
                      <p style={{ color: '#94a3b8', marginTop: '8px', fontSize: '14px' }}>Only federal taxes needed</p>
                    </div>
                  )}

                  {!stateLoading && taxData?.hasStateTax !== false && (
                    <>
                      <div style={styles.row}><span style={{ color: '#94a3b8' }}>{selectedState} AGI</span><span style={{ color: '#fff' }}>{fmt(taxData?.caAgi)}</span></div>
                      <div style={styles.row}><span style={{ color: '#94a3b8' }}>Deduction</span><span style={{ color: '#ef4444' }}>-{fmt(taxData?.caStdDeduction)}</span></div>
                      <div style={styles.row}><span style={{ color: '#94a3b8' }}>Taxable</span><span style={{ color: '#fff', fontWeight: 600 }}>{fmt(taxData?.caTaxableIncome)}</span></div>
                      <div style={styles.row}><span style={{ color: '#94a3b8' }}>Tax</span><span style={{ color: '#ef4444' }}>{fmt(taxData?.caTax)}</span></div>
                      {taxData?.calEitc > 0 && <div style={styles.row}><span style={{ color: '#64748b', fontSize: '13px' }}>CalEITC</span><span style={{ color: '#10b981', fontSize: '13px' }}>+{fmt(taxData?.calEitc)}</span></div>}
                      {taxData?.yctc > 0 && <div style={styles.row}><span style={{ color: '#64748b', fontSize: '13px' }}>YCTC</span><span style={{ color: '#10b981', fontSize: '13px' }}>+{fmt(taxData?.yctc)}</span></div>}
                      <div style={styles.row}><span style={{ color: '#94a3b8' }}>Withheld</span><span style={{ color: '#10b981' }}>+{fmt(taxData?.caWithholding)}</span></div>
                      <div style={{ ...styles.row, borderTop: '2px solid rgba(255,255,255,0.2)', marginTop: '8px', paddingTop: '12px', borderBottom: 'none' }}>
                        <span style={{ fontWeight: 600, color: '#fff' }}>{taxData?.stateRefund > 0 ? '💰 Refund' : '💸 Owed'}</span>
                        <span style={{ fontWeight: 700, fontSize: '20px', color: taxData?.stateRefund > 0 ? '#10b981' : '#ef4444' }}>{fmt(taxData?.stateRefund > 0 ? taxData.stateRefund : taxData?.stateOwed)}</span>
                      </div>
                      <button onClick={handleDownloadState} style={{ ...styles.button, marginTop: '16px', background: isPaid ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(255,255,255,0.1)', color: isPaid ? '#fff' : '#64748b' }}>
                        {isPaid ? `${t.downloadState} (${selectedState})` : t.payToDownload}
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* ========== DOWNLOADS TAB ========== */}
        {activeTab === "downloads" && (
          <div style={styles.card}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', marginBottom: '16px' }}>{t.downloadForms}</h2>
            
            {!isPaid && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '24px' }}>🔒</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: '#f87171', fontWeight: 600 }}>{t.payToDownload}</p>
                    <p style={{ color: '#94a3b8', fontSize: '13px' }}>{t.unlockForms}</p>
                  </div>
                </div>
                <button onClick={() => setShowSubmitFlow(true)} style={{ ...styles.button, marginTop: '12px' }}>{t.fileNow}</button>
              </div>
            )}
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '28px' }}>📋</span>
                  <div>
                    <p style={{ fontWeight: 600, color: '#e2e8f0' }}>{t.form1040}</p>
                    <p style={{ fontSize: '13px', color: '#64748b' }}>{t.form1040Desc}</p>
                  </div>
                </div>
                <button onClick={handleDownload1040} disabled={!isPaid} style={{ padding: '10px 20px', background: isPaid ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'rgba(255,255,255,0.1)', color: isPaid ? '#fff' : '#64748b', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: isPaid ? 'pointer' : 'not-allowed' }}>{isPaid ? t.downloadPdf : '🔒'}</button>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '28px' }}>{getStateIcon(selectedState)}</span>
                  <div>
                    <p style={{ fontWeight: 600, color: '#e2e8f0' }}>{selectedState} Form</p>
                    <p style={{ fontSize: '13px', color: '#64748b' }}>{taxData?.stateName || selectedState} Return</p>
                  </div>
                </div>
                <button onClick={handleDownloadState} disabled={!isPaid} style={{ padding: '10px 20px', background: isPaid ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(255,255,255,0.1)', color: isPaid ? '#fff' : '#64748b', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: isPaid ? 'pointer' : 'not-allowed' }}>{isPaid ? t.downloadPdf : '🔒'}</button>
              </div>
            </div>
          </div>
        )}

        {/* ========== HISTORY TAB ========== */}
        {activeTab === "history" && (
          <>
            {/* Uploaded Documents */}
            <div style={styles.card}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '16px' }}>📄 Documents ({uploadedDocs.length})</h2>
              {uploadedDocs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                  <div style={{ fontSize: '40px', marginBottom: '8px' }}>📭</div>
                  <p style={{ fontSize: '14px' }}>No documents yet</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {uploadedDocs.map((doc, idx) => (
                    <div key={doc._id || idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px' }}>
                      <span style={{ fontSize: '24px' }}>{doc.formType?.startsWith('W') ? '📄' : '📋'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.formType || 'Document'}</p>
                        <p style={{ fontSize: '12px', color: '#64748b' }}>{doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : ''}</p>
                      </div>
                      <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: doc.status === 'approved' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)', color: doc.status === 'approved' ? '#10b981' : '#f59e0b' }}>
                        {doc.status === 'approved' ? '✅' : '⏳'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Chat History */}
            <div style={{ ...styles.card, marginTop: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '16px' }}>💬 Chat ({chatHistory.length})</h2>
              {chatHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                  <div style={{ fontSize: '40px', marginBottom: '8px' }}>💬</div>
                  <p style={{ fontSize: '14px', marginBottom: '16px' }}>No chat history</p>
                  <button onClick={goToChat} style={styles.button}>{t.startInterview}</button>
                </div>
              ) : (
                <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {chatHistory.slice(-20).map((msg, idx) => {
                    const isUser = msg.sender === 'user' || msg.role === 'user';
                    return (
                      <div key={idx} style={{ padding: '12px', borderRadius: '12px', marginLeft: isUser ? '20%' : '0', marginRight: isUser ? '0' : '20%', background: isUser ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.03)', border: isUser ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255,255,255,0.06)' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: isUser ? '#60a5fa' : '#a78bfa' }}>{isUser ? '👤 You' : '🤖 AI'}</span>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#e2e8f0', lineHeight: 1.5 }}>{msg.text || msg.content || ''}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* ========== SETTINGS TAB ========== */}
        {activeTab === "settings" && (
          <div style={styles.card}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', marginBottom: '24px' }}>{t.settingsTitle}</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <p style={{ fontWeight: 500, color: '#e2e8f0' }}>{t.language}</p>
                  <p style={{ fontSize: '13px', color: '#64748b' }}>{t.languageDesc}</p>
                </div>
                <select value={lang} onChange={(e) => changeLang(e.target.value)} style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', minWidth: '140px' }}>
                  {languages.map(l => <option key={l.code} value={l.code} style={{ background: '#1e293b' }}>{l.flag} {l.name}</option>)}
                </select>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <p style={{ fontWeight: 500, color: '#e2e8f0' }}>Tax Year</p>
                  <p style={{ fontSize: '13px', color: '#64748b' }}>Select tax year</p>
                </div>
                <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', minWidth: '140px' }}>
                  <option value="2025" style={{ background: '#1e293b' }}>2025</option>
                  <option value="2024" style={{ background: '#1e293b' }}>2024</option>
                </select>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
                <button onClick={handleLogout} style={{ padding: '14px 24px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', color: '#f87171', fontWeight: 500, cursor: 'pointer', width: isMobile ? '100%' : 'auto' }}>{t.logout}</button>
              </div>
            </div>
          </div>
        )}

        {/* ========== DOCUMENTS TAB ========== */}
        {activeTab === "documents" && (
          <div style={styles.card}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', marginBottom: '16px' }}>📄 Tax Documents</h2>
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📤</div>
              <p style={{ marginBottom: '16px' }}>Upload your W-2s, 1099s during the interview</p>
              <button onClick={goToChat} style={styles.button}>Go to Interview</button>
            </div>
          </div>
        )}
      </div>

      {/* ✅ MOBILE BOTTOM NAVIGATION */}
      {isMobile && (
        <div style={styles.bottomNav}>
          {Object.entries(t.tabs).slice(0, 5).map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)} style={styles.navItem(activeTab === key)}>
              <span style={{ fontSize: '20px' }}>{t.tabIcons[key]}</span>
              <span style={{ fontSize: '10px', fontWeight: 500 }}>{label}</span>
            </button>
          ))}
        </div>
      )}

      {/* ✅ SUBMIT FLOW MODAL */}
      {showSubmitFlow && <SubmitFlow onClose={() => { setShowSubmitFlow(false); fetchTaxData(); }} userId={getUserId()} token={getToken()} taxData={taxData} userData={userData} />}

      {/* ✅ FOOTER DISCLAIMER - Legal compliance */}
      <div style={{ 
        textAlign: 'center',
        padding: '16px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        fontSize: '10px',
        color: '#475569',
        lineHeight: 1.5,
        marginTop: '20px'
      }}>
        TaxSky AI is tax preparation software, not a licensed CPA or tax advisor. You are preparing your own tax return.
        <br />
        <a href="/terms" style={{ color: '#64748b', marginRight: '12px', textDecoration: 'none' }}>Terms</a>
        <a href="/privacy" style={{ color: '#64748b', textDecoration: 'none' }}>Privacy</a>
      </div>

      {/* ✅ GLOBAL STYLES */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        * { font-family: 'Plus Jakarta Sans', sans-serif; box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        select option { background: #1e293b; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 3px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }
      `}</style>
    </div>
  );
}