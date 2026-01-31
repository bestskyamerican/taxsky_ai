// ============================================================
// USER DASHBOARD - v6.0 ALL 50 STATES + DC
// ============================================================
// ✅ v6.0: Added ALL 50 US States + Washington DC
//          - 9 No-Tax States
//          - 14 Flat Tax States
//          - 28 Progressive Tax States (including DC)
//          - Compare states feature
// ✅ v5.0: Mobile-first responsive design
// ✅ v4.8: Added OBBB Deductions display
// ✅ v4.7: Net result = federal + state (shows correct total)
// Supports: English (en), Vietnamese (vi), Spanish (es)
// ============================================================

import React, { useState, useEffect, useCallback } from "react";
import SubmitFlow from "./SubmitFlow";

const API_BASE = import.meta.env?.VITE_API_URL || "http://localhost:3000";
const PYTHON_API = import.meta.env?.VITE_PYTHON_API || "http://localhost:5002";

// ✅ ALL 50 US STATES + DC (51 total)
const ALL_STATES = [
  // No Tax States (9)
  { code: "AK", name: "Alaska", icon: "🏔️", group: "no_tax" },
  { code: "FL", name: "Florida", icon: "🌴", group: "no_tax" },
  { code: "NV", name: "Nevada", icon: "🎰", group: "no_tax" },
  { code: "NH", name: "New Hampshire", icon: "🏔️", group: "no_tax" },
  { code: "SD", name: "South Dakota", icon: "🌾", group: "no_tax" },
  { code: "TN", name: "Tennessee", icon: "🎸", group: "no_tax" },
  { code: "TX", name: "Texas", icon: "🤠", group: "no_tax" },
  { code: "WA", name: "Washington", icon: "🌲", group: "no_tax" },
  { code: "WY", name: "Wyoming", icon: "🦬", group: "no_tax" },
  
  // Flat Tax States (14)
  { code: "AZ", name: "Arizona", icon: "🌵", group: "flat", rate: "2.5%" },
  { code: "CO", name: "Colorado", icon: "⛰️", group: "flat", rate: "4.4%" },
  { code: "GA", name: "Georgia", icon: "🍑", group: "flat", rate: "5.49%" },
  { code: "ID", name: "Idaho", icon: "🥔", group: "flat", rate: "5.8%" },
  { code: "IL", name: "Illinois", icon: "🏙️", group: "flat", rate: "4.95%" },
  { code: "IN", name: "Indiana", icon: "🏎️", group: "flat", rate: "3.05%" },
  { code: "IA", name: "Iowa", icon: "🌽", group: "flat", rate: "3.8%" },
  { code: "KY", name: "Kentucky", icon: "🐴", group: "flat", rate: "4%" },
  { code: "MA", name: "Massachusetts", icon: "🦞", group: "flat", rate: "5%" },
  { code: "MI", name: "Michigan", icon: "🚗", group: "flat", rate: "4.25%" },
  { code: "MS", name: "Mississippi", icon: "🎺", group: "flat", rate: "4.7%" },
  { code: "NC", name: "North Carolina", icon: "🏖️", group: "flat", rate: "4.5%" },
  { code: "PA", name: "Pennsylvania", icon: "🔔", group: "flat", rate: "3.07%" },
  { code: "UT", name: "Utah", icon: "🏜️", group: "flat", rate: "4.65%" },
  
  // Progressive Tax States (28 including DC)
  { code: "AL", name: "Alabama", icon: "🏈", group: "progressive", topRate: "5%" },
  { code: "AR", name: "Arkansas", icon: "💎", group: "progressive", topRate: "4.4%" },
  { code: "CA", name: "California", icon: "🌴", group: "progressive", topRate: "13.3%" },
  { code: "CT", name: "Connecticut", icon: "🍂", group: "progressive", topRate: "6.99%" },
  { code: "DC", name: "Washington DC", icon: "🏛️", group: "progressive", topRate: "10.75%" },
  { code: "DE", name: "Delaware", icon: "🦀", group: "progressive", topRate: "6.6%" },
  { code: "HI", name: "Hawaii", icon: "🌺", group: "progressive", topRate: "11%" },
  { code: "KS", name: "Kansas", icon: "🌻", group: "progressive", topRate: "5.7%" },
  { code: "LA", name: "Louisiana", icon: "⚜️", group: "progressive", topRate: "4.25%" },
  { code: "ME", name: "Maine", icon: "🦞", group: "progressive", topRate: "7.15%" },
  { code: "MD", name: "Maryland", icon: "🦀", group: "progressive", topRate: "5.75%" },
  { code: "MN", name: "Minnesota", icon: "🏒", group: "progressive", topRate: "9.85%" },
  { code: "MO", name: "Missouri", icon: "🌉", group: "progressive", topRate: "4.8%" },
  { code: "MT", name: "Montana", icon: "🦌", group: "progressive", topRate: "5.9%" },
  { code: "NE", name: "Nebraska", icon: "🌾", group: "progressive", topRate: "5.84%" },
  { code: "NJ", name: "New Jersey", icon: "🏛️", group: "progressive", topRate: "10.75%" },
  { code: "NM", name: "New Mexico", icon: "🎨", group: "progressive", topRate: "5.9%" },
  { code: "NY", name: "New York", icon: "🗽", group: "progressive", topRate: "10.9%" },
  { code: "ND", name: "North Dakota", icon: "🦬", group: "progressive", topRate: "2.5%" },
  { code: "OH", name: "Ohio", icon: "🏈", group: "progressive", topRate: "3.5%" },
  { code: "OK", name: "Oklahoma", icon: "🤠", group: "progressive", topRate: "4.75%" },
  { code: "OR", name: "Oregon", icon: "🌲", group: "progressive", topRate: "9.9%" },
  { code: "RI", name: "Rhode Island", icon: "⛵", group: "progressive", topRate: "5.99%" },
  { code: "SC", name: "South Carolina", icon: "🌴", group: "progressive", topRate: "6.4%" },
  { code: "VT", name: "Vermont", icon: "🍁", group: "progressive", topRate: "8.75%" },
  { code: "VA", name: "Virginia", icon: "🏛️", group: "progressive", topRate: "5.75%" },
  { code: "WV", name: "West Virginia", icon: "⛰️", group: "progressive", topRate: "5.12%" },
  { code: "WI", name: "Wisconsin", icon: "🧀", group: "progressive", topRate: "7.65%" },
];

const getStateIcon = (code) => ALL_STATES.find(s => s.code === code)?.icon || "🏛️";
const getStateInfo = (code) => ALL_STATES.find(s => s.code === code) || { name: code, icon: "🏛️", group: "progressive" };

// Form endpoints mapping
const STATE_FORM_ENDPOINTS = {
  "AL": "al-40", "AR": "ar-ar1000f", "AZ": "az-140", "CA": "ca540", "CO": "co-104",
  "CT": "ct-1040", "DC": "dc-d40", "DE": "de-200", "GA": "ga-500", "HI": "hi-n11",
  "IA": "ia-1040", "ID": "id-40", "IL": "il-1040", "IN": "in-it40", "KS": "ks-k40",
  "KY": "ky-740", "LA": "la-it540", "MA": "ma-1", "MD": "md-502", "ME": "me-1040",
  "MI": "mi-1040", "MN": "mn-m1", "MO": "mo-1040", "MS": "ms-80105", "MT": "mt-2",
  "NC": "nc-d400", "ND": "nd-1", "NE": "ne-1040n", "NJ": "nj-1040", "NM": "nm-pit1",
  "NY": "ny-it201", "OH": "oh-it1040", "OK": "ok-511", "OR": "or-40", "PA": "pa-40",
  "RI": "ri-1040", "SC": "sc-1040", "UT": "ut-tc40", "VA": "va-760", "VT": "vt-in111",
  "WI": "wi-1", "WV": "wv-it140"
};

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
    noTaxStates: "🎉 No Income Tax", flatTaxStates: "📊 Flat Tax", progressiveTaxStates: "📈 Progressive Tax",
    compareStates: "Compare States", effectiveRate: "Effective Rate",
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
    noTaxStates: "🎉 Không Thuế", flatTaxStates: "📊 Thuế Đồng Đều", progressiveTaxStates: "📈 Thuế Lũy Tiến",
    compareStates: "So Sánh Bang", effectiveRate: "Tỷ Lệ Thực",
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
    noTaxStates: "🎉 Sin Impuesto", flatTaxStates: "📊 Tasa Fija", progressiveTaxStates: "📈 Tasa Progresiva",
    compareStates: "Comparar Estados", effectiveRate: "Tasa Efectiva",
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
// TAXSKY LOGO
// ============================================================
const TaxSkyLogo = ({ isMobile = false, isPaid = false }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
    <svg width={isMobile ? 36 : 44} height={isMobile ? 36 : 44} viewBox="0 0 50 50" fill="none">
      <defs>
        <linearGradient id="hexGradDash" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1"/><stop offset="100%" stopColor="#8b5cf6"/>
        </linearGradient>
      </defs>
      <polygon points="25,5 40,12 40,30 25,37 10,30 10,12" fill="url(#hexGradDash)" opacity="0.25"/>
      <polygon points="25,10 37,16 37,32 25,38 13,32 13,16" fill="url(#hexGradDash)" opacity="0.5"/>
      <polygon points="25,14 35,19 35,33 25,38 15,33 15,19" fill="url(#hexGradDash)"/>
      <path d="M25 20 L25 32 M21 23 Q25 20 29 23 Q25 26 21 29 Q25 32 29 29" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
    </svg>
    <div style={{ display: 'flex', alignItems: 'baseline' }}>
      <span style={{ fontSize: isMobile ? '20px' : '22px', fontWeight: 700, color: '#fff' }}>Tax</span>
      <span style={{ fontSize: isMobile ? '20px' : '22px', fontWeight: 700, background: 'linear-gradient(135deg, #3b82f6, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Sky</span>
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
  const [showStateCompare, setShowStateCompare] = useState(false);
  const [stateComparison, setStateComparison] = useState(null);
  
  const isMobile = useIsMobile();
  const t = translations[lang] || translations.en;

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

  // ✅ CALCULATE STATE TAX - All 51 states
  const calculateStateTax = useCallback(async (stateCode) => {
    if (!taxData?.agi || taxData.agi <= 0) return;
    setStateLoading(true);
    try {
      const stateInfo = getStateInfo(stateCode);
      const res = await fetch(`${PYTHON_API}/generate/states/calculate/${stateCode}?federal_agi=${taxData.agi}&filing_status=${userData?.filing_status || 'single'}&num_dependents=${userData?.answers?.num_dependents || 0}&withholding=${taxData.stateWithholding || taxData.caWithholding || 0}`);
      const result = await res.json();
      
      setTaxData(prev => ({
        ...prev, state: stateCode, stateName: result.state_name || stateInfo.name,
        hasStateTax: result.has_income_tax !== false, stateForm: result.form || '',
        stateTaxType: result.tax_type || stateInfo.group, stateTaxRate: result.tax_rate || '',
        caAgi: result.state_agi || result.federal_agi || prev.agi,
        caStdDeduction: result.standard_deduction || 0, caTaxableIncome: result.taxable_income || 0,
        caTax: result.state_tax || 0, calEitc: result.caleitc || 0, yctc: result.yctc || 0,
        caWithholding: result.withholding || prev.caWithholding || 0,
        stateRefund: result.refund || 0, stateOwed: result.amount_owed || 0,
        effectiveRate: result.effective_rate || 0,
        totalRefund: (prev.federalRefund || 0) + (result.refund || 0),
        totalOwed: (prev.federalOwed || 0) + (result.amount_owed || 0),
      }));
    } catch (err) { 
      console.error(`State tax error:`, err);
      const stateInfo = getStateInfo(stateCode);
      if (stateInfo.group === 'no_tax') {
        setTaxData(prev => ({ ...prev, state: stateCode, stateName: stateInfo.name, hasStateTax: false, stateRefund: prev.caWithholding || 0, stateOwed: 0 }));
      }
    }
    finally { setStateLoading(false); }
  }, [taxData?.agi, taxData?.stateWithholding, taxData?.caWithholding, userData]);

  // ✅ COMPARE ALL STATES
  const compareAllStates = async () => {
    if (!taxData?.agi) return;
    try {
      const res = await fetch(`${PYTHON_API}/generate/states/compare?federal_agi=${taxData.agi}&filing_status=${userData?.filing_status || 'single'}`);
      const result = await res.json();
      setStateComparison(result);
      setShowStateCompare(true);
    } catch (err) { console.error("Compare error:", err); }
  };

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
        const res = await fetch(`${API_BASE}/api/ai/data/${userId}?taxYear=${selectedYear}`, { headers: { "Authorization": `Bearer ${getToken()}` } });
        result = await res.json();
      } catch (nodeErr) { console.log("Node API error:", nodeErr); }
      
      const answers = result.answers || {};
      const totals = result.totals || {};
      let form1040 = result.form1040 || null;
      
      if (totals.wages > 0 && (!form1040?.income?.line_1_wages)) {
        form1040 = {
          header: { tax_year: 2025, filing_status: answers.filing_status || totals.filing_status || 'single', state: answers.state || 'CA' },
          income: { line_1_wages: totals.wages || 0, line_9_total_income: totals.total_income || totals.wages || 0 },
          adjustments: { line_10_schedule_1_adjustments: totals.total_adjustments || 0, line_11_agi: totals.agi || totals.wages },
          deductions: { line_12_deduction: totals.standard_deduction || 30000, line_15_taxable_income: totals.taxable_income || 0 },
          tax_and_credits: { line_16_tax: totals.federal_tax || 0 },
          payments: { line_25d_total_withholding: totals.federal_withheld || 0 },
          refund_or_owe: { line_35_refund: totals.refund || 0, line_37_amount_owe: totals.amount_owed || 0 },
        };
      }
      
      if (form1040) {
        setForm1040Data(form1040);
        const userState = form1040?.header?.state || answers.state || "CA";
        setSelectedState(userState);
        setUserData({ ...result.data, answers, form1040, filing_status: form1040?.header?.filing_status || answers.filing_status, state: userState });
        
        const income = form1040.income || {};
        const adjustments = form1040.adjustments || {};
        const deductions = form1040.deductions || {};
        const taxCredits = form1040.tax_and_credits || {};
        const payments = form1040.payments || {};
        const refundOrOwe = form1040.refund_or_owe || {};
        const federalAgi = adjustments.line_11_agi || 0;
        const stateWithholding = form1040.state_tax?.state_withholding || answers.state_withholding || 0;
        
        let stateData = { state: userState, stateName: userState, caAgi: federalAgi, caWithholding: stateWithholding, stateRefund: 0, stateOwed: 0, hasStateTax: true };
        try {
          const stateRes = await fetch(`${PYTHON_API}/generate/states/calculate/${userState}?federal_agi=${federalAgi}&filing_status=${form1040?.header?.filing_status || 'single'}&withholding=${stateWithholding}`);
          const sr = await stateRes.json();
          if (sr && !sr.error) {
            stateData = {
              state: userState, stateName: sr.state_name || userState, hasStateTax: sr.has_income_tax !== false,
              stateForm: sr.form || '', stateTaxType: sr.tax_type || '',
              caAgi: sr.state_agi || federalAgi, caStdDeduction: sr.standard_deduction || 0,
              caTaxableIncome: sr.taxable_income || 0, caTax: sr.state_tax || 0,
              calEitc: sr.caleitc || 0, yctc: sr.yctc || 0,
              caWithholding: sr.withholding || stateWithholding,
              stateRefund: sr.refund || 0, stateOwed: sr.amount_owed || 0, effectiveRate: sr.effective_rate || 0,
            };
          }
        } catch (e) { console.error("State calc error:", e); }
        
        const federalRefund = refundOrOwe.line_35_refund || 0;
        const federalOwed = refundOrOwe.line_37_amount_owe || 0;
        
        setTaxData({
          wages: income.line_1_wages || 0, totalIncome: income.line_9_total_income || 0,
          totalAdjustments: adjustments.line_10_schedule_1_adjustments || 0, agi: federalAgi,
          standardDeduction: deductions.line_12_deduction || 0,
          totalObbbDeduction: form1040.obbb?.total_obbb_deduction || 0,
          taxableIncome: deductions.line_15_taxable_income || 0,
          federalTax: taxCredits.line_16_tax || 0,
          withholding: payments.line_25d_total_withholding || 0,
          federalRefund, federalOwed, filing_status: form1040?.header?.filing_status || 'single',
          ...stateData,
          totalRefund: federalRefund + (stateData.stateRefund || 0),
          totalOwed: federalOwed + (stateData.stateOwed || 0),
        });
        
        if (result.messages?.length > 0) setChatHistory(result.messages);
      }
      
      try {
        const docsRes = await fetch(`${API_BASE}/api/forms/user/${userId}?taxYear=${selectedYear}`, { headers: { "Authorization": `Bearer ${getToken()}` } });
        if (docsRes.ok) {
          const docsData = await docsRes.json();
          if (docsData.files?.length > 0) setUploadedDocs(docsData.files);
        }
      } catch (docsErr) { }
    } catch (err) { console.error("Error:", err); }
    finally { setLoading(false); }
  };

  const handleDownload1040 = async () => {
    if (!isPaid) { alert(t.unlockForms); setShowSubmitFlow(true); return; }
    const userId = getUserId();
    if (!userId) { alert(t.errorNoUserId); return; }
    try {
      const res = await fetch(`${PYTHON_API}/generate/1040`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: userId, mask_ssn: false, is_official_submission: true,
          personal: { first_name: form1040Data?.header?.first_name || "", last_name: form1040Data?.header?.last_name || "", ssn: form1040Data?.header?.ssn || "", address: form1040Data?.header?.address || "", city: form1040Data?.header?.city || "", state: selectedState, zip: form1040Data?.header?.zip || "" },
          income: { wages: taxData?.wages || 0 },
          federal: { filing_status: form1040Data?.header?.filing_status || "single", agi: taxData?.agi || 0, standard_deduction: taxData?.standardDeduction || 0, taxable_income: taxData?.taxableIncome || 0, tax: taxData?.federalTax || 0, withholding: taxData?.withholding || 0, refund: taxData?.federalRefund || 0, amount_owed: taxData?.federalOwed || 0 },
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
      const endpoint = STATE_FORM_ENDPOINTS[selectedState];
      if (!endpoint) { alert(`State form for ${selectedState} not yet available`); return; }
      
      const res = await fetch(`${PYTHON_API}/generate/${endpoint}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: userId, mask_ssn: false,
          personal: { first_name: form1040Data?.header?.first_name || "", last_name: form1040Data?.header?.last_name || "", ssn: form1040Data?.header?.ssn || "", address: form1040Data?.header?.address || "", city: form1040Data?.header?.city || "", state: selectedState, zip: form1040Data?.header?.zip || "" },
          federal: { filing_status: form1040Data?.header?.filing_status || "single", agi: taxData?.agi || 0 },
          state: { state_agi: taxData?.caAgi || taxData?.agi || 0, standard_deduction: taxData?.caStdDeduction || 0, taxable_income: taxData?.caTaxableIncome || 0, state_tax: taxData?.caTax || 0, withholding: taxData?.caWithholding || 0, refund: taxData?.stateRefund || 0, amount_owed: taxData?.stateOwed || 0 },
        }),
      });
      
      if (res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType?.includes('application/pdf')) {
          const blob = await res.blob();
          const a = document.createElement("a"); a.href = window.URL.createObjectURL(blob); a.download = `${selectedState}_Tax_Return_${selectedYear}.pdf`;
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
        } else {
          const result = await res.json();
          alert(`State tax calculated: ${fmt(result.state_tax || 0)}`);
        }
      }
    } catch (err) { alert("Error: " + err.message); }
  };

  const netResult = (taxData?.federalRefund || 0) - (taxData?.federalOwed || 0) + (taxData?.stateRefund || 0) - (taxData?.stateOwed || 0);
  const isNetRefund = netResult > 0;
  const netAmount = Math.abs(netResult);

  const styles = {
    container: { minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)', color: '#e2e8f0', paddingBottom: isMobile ? '80px' : '0' },
    header: { background: 'rgba(15, 23, 42, 0.98)', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: isMobile ? '12px 16px' : '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 },
    content: { maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '16px' : '24px' },
    card: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: isMobile ? '16px' : '20px', padding: isMobile ? '16px' : '24px', marginBottom: '16px' },
    summaryCard: { background: isNetRefund ? 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(6,95,70,0.2))' : 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(127,29,29,0.2))', border: `1px solid ${isNetRefund ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: isMobile ? '16px' : '20px', padding: isMobile ? '20px' : '24px', textAlign: isMobile ? 'center' : 'left' },
    bigNumber: { fontSize: isMobile ? '32px' : '42px', fontWeight: 800, color: isNetRefund ? '#10b981' : '#ef4444' },
    grid: { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' },
    button: { width: '100%', padding: isMobile ? '16px' : '14px 20px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 600, fontSize: isMobile ? '16px' : '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
    bottomNav: { position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(15, 23, 42, 0.98)', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-around', padding: '8px 0 20px 0', zIndex: 1000 },
    navItem: (active) => ({ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '8px 12px', borderRadius: '12px', background: active ? 'rgba(59, 130, 246, 0.2)' : 'transparent', color: active ? '#60a5fa' : '#64748b', border: 'none', cursor: 'pointer', minWidth: '60px' }),
    row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }
  };

  if (loading) return (<div style={{ ...styles.container, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ textAlign: 'center' }}><div style={{ fontSize: '48px', marginBottom: '16px' }}>💰</div><p style={{ color: '#94a3b8' }}>{t.loading}</p></div></div>);
  if (userIdError) return (<div style={{ ...styles.container, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}><div style={{ textAlign: 'center' }}><div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div><p style={{ marginBottom: '20px' }}>{t.errorNoUserId}</p><button onClick={() => window.location.href = "/"} style={styles.button}>Login</button></div></div>);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <TaxSkyLogo isMobile={isMobile} isPaid={isPaid} />
        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={goToChat} style={{ padding: '8px 16px', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', color: '#60a5fa', cursor: 'pointer' }}>{t.taxChat}</button>
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: '#fff' }}><option value="2025">2025</option><option value="2024">2024</option></select>
            <select value={lang} onChange={(e) => changeLang(e.target.value)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: '#fff' }}>{languages.map(l => <option key={l.code} value={l.code}>{l.flag}</option>)}</select>
            <span style={{ color: '#94a3b8', fontSize: '14px' }}>{user?.name || 'Guest'}</span>
            <button onClick={handleLogout} style={{ padding: '8px 16px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#f87171', cursor: 'pointer' }}>🚪</button>
          </div>
        )}
        {isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={goToChat} style={{ padding: '10px', background: 'rgba(59, 130, 246, 0.2)', border: 'none', borderRadius: '10px', fontSize: '18px' }}>💬</button>
            <button onClick={() => setShowMobileMenu(!showMobileMenu)} style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '10px', fontSize: '18px' }}>☰</button>
          </div>
        )}
      </div>

      {isMobile && showMobileMenu && (
        <div style={{ background: 'rgba(15, 23, 42, 0.98)', padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: '#94a3b8' }}>Year</span><select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 16px', color: '#fff' }}><option value="2025">2025</option><option value="2024">2024</option></select></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: '#94a3b8' }}>Language</span><select value={lang} onChange={(e) => changeLang(e.target.value)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 16px', color: '#fff' }}>{languages.map(l => <option key={l.code} value={l.code}>{l.flag} {l.name}</option>)}</select></div>
            <button onClick={handleLogout} style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', color: '#f87171' }}>{t.logout}</button>
          </div>
        </div>
      )}

      {!isMobile && (
        <div style={{ ...styles.content, paddingBottom: '0' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px' }}>
            {Object.entries(t.tabs).map(([key, label]) => (<button key={key} onClick={() => setActiveTab(key)} style={{ padding: '10px 20px', background: activeTab === key ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px', color: activeTab === key ? '#fff' : '#94a3b8', cursor: 'pointer', fontWeight: activeTab === key ? 600 : 400 }}>{label}</button>))}
          </div>
        </div>
      )}

      <div style={styles.content}>
        {activeTab === "overview" && (
          <>
            {!taxData?.wages && (<div style={{ ...styles.card, textAlign: 'center', padding: '40px 20px' }}><div style={{ fontSize: '64px', marginBottom: '16px' }}>📋</div><p style={{ color: '#94a3b8', marginBottom: '20px' }}>{t.noDataYet}</p><button onClick={goToChat} style={styles.button}>{t.startInterview}</button></div>)}
            {taxData?.wages > 0 && (
              <>
                <div style={styles.summaryCard}>
                  <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '8px' }}>{isNetRefund ? t.estimatedRefund : t.estimatedOwed}</p>
                  <p style={styles.bigNumber}>{fmt(netAmount)}</p>
                  <div style={{ display: 'flex', gap: '16px', marginTop: '12px', justifyContent: isMobile ? 'center' : 'flex-start', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', color: taxData?.federalRefund > 0 ? '#10b981' : '#ef4444', background: 'rgba(0,0,0,0.2)', padding: '4px 10px', borderRadius: '6px' }}>Fed: {taxData?.federalRefund > 0 ? '+' : '-'}{fmt(taxData?.federalRefund || taxData?.federalOwed)}</span>
                    <span style={{ fontSize: '13px', color: taxData?.stateRefund > 0 ? '#10b981' : (taxData?.hasStateTax === false ? '#10b981' : '#ef4444'), background: 'rgba(0,0,0,0.2)', padding: '4px 10px', borderRadius: '6px' }}>{selectedState}: {taxData?.hasStateTax === false ? '🎉 $0' : (taxData?.stateRefund > 0 ? '+' : '-') + fmt(taxData?.stateRefund || taxData?.stateOwed)}</span>
                  </div>
                  <button onClick={() => setShowSubmitFlow(true)} style={{ ...styles.button, marginTop: '20px' }}>{t.fileNow}</button>
                </div>

                <div style={{ ...styles.grid, marginTop: '16px' }}>
                  <div style={styles.card}><p style={{ color: '#94a3b8', fontSize: '13px' }}>{t.totalIncome}</p><p style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>{fmt(taxData?.totalIncome)}</p></div>
                  <div style={styles.card}><p style={{ color: '#94a3b8', fontSize: '13px' }}>{t.withheld}</p><p style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>{fmt(taxData?.withholding)}</p></div>
                </div>

                <div style={{ ...styles.card, marginTop: '16px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#fff' }}>{t.federalBreakdown}</h3>
                  <div style={styles.row}><span style={{ color: '#94a3b8' }}>{t.w2Wages}</span><span style={{ color: '#fff' }}>{fmt(taxData?.wages)}</span></div>
                  <div style={styles.row}><span style={{ color: '#94a3b8' }}>AGI</span><span style={{ color: '#fff', fontWeight: 600 }}>{fmt(taxData?.agi)}</span></div>
                  <div style={styles.row}><span style={{ color: '#94a3b8' }}>{t.standardDeduction}</span><span style={{ color: '#ef4444' }}>-{fmt(taxData?.standardDeduction)}</span></div>
                  <div style={styles.row}><span style={{ color: '#94a3b8' }}>{t.taxableIncome}</span><span style={{ color: '#fff', fontWeight: 600 }}>{fmt(taxData?.taxableIncome)}</span></div>
                  <div style={styles.row}><span style={{ color: '#94a3b8' }}>{t.federalTax}</span><span style={{ color: '#ef4444' }}>{fmt(taxData?.federalTax)}</span></div>
                  <div style={styles.row}><span style={{ color: '#94a3b8' }}>{t.withheld}</span><span style={{ color: '#10b981' }}>+{fmt(taxData?.withholding)}</span></div>
                  <div style={{ ...styles.row, borderTop: '2px solid rgba(255,255,255,0.2)', marginTop: '8px', paddingTop: '12px', borderBottom: 'none' }}><span style={{ fontWeight: 600, color: '#fff' }}>{taxData?.federalRefund > 0 ? t.netRefund : t.netOwed}</span><span style={{ fontWeight: 700, fontSize: '20px', color: taxData?.federalRefund > 0 ? '#10b981' : '#ef4444' }}>{fmt(taxData?.federalRefund > 0 ? taxData.federalRefund : taxData?.federalOwed)}</span></div>
                  <button onClick={handleDownload1040} style={{ ...styles.button, marginTop: '16px', background: isPaid ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'rgba(255,255,255,0.1)', color: isPaid ? '#fff' : '#64748b' }}>{isPaid ? t.downloadFederal : t.payToDownload}</button>
                </div>

                <div style={{ ...styles.card, marginTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {getStateIcon(selectedState)} {taxData?.stateName || getStateInfo(selectedState).name}
                      {taxData?.stateTaxType && (<span style={{ fontSize: '10px', padding: '2px 8px', background: taxData.stateTaxType === 'flat' ? 'rgba(59,130,246,0.2)' : 'rgba(168,85,247,0.2)', borderRadius: '4px', color: taxData.stateTaxType === 'flat' ? '#60a5fa' : '#a78bfa' }}>{taxData.stateTaxType === 'flat' ? '📊 Flat' : '📈 Progressive'}</span>)}
                    </h3>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <select value={selectedState} onChange={(e) => setSelectedState(e.target.value)} disabled={stateLoading} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '13px', maxWidth: '180px' }}>
                        <optgroup label={t.noTaxStates}>{ALL_STATES.filter(s => s.group === 'no_tax').map(s => (<option key={s.code} value={s.code}>{s.icon} {s.name}</option>))}</optgroup>
                        <optgroup label={t.flatTaxStates}>{ALL_STATES.filter(s => s.group === 'flat').map(s => (<option key={s.code} value={s.code}>{s.icon} {s.name} ({s.rate})</option>))}</optgroup>
                        <optgroup label={t.progressiveTaxStates}>{ALL_STATES.filter(s => s.group === 'progressive').map(s => (<option key={s.code} value={s.code}>{s.icon} {s.name}</option>))}</optgroup>
                      </select>
                      <button onClick={compareAllStates} style={{ padding: '8px 12px', background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '8px', color: '#a78bfa', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>📊 Compare</button>
                    </div>
                  </div>

                  {stateLoading && (<div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}><div style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#3b82f6', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />Loading {getStateInfo(selectedState).name}...</div>)}

                  {!stateLoading && taxData?.hasStateTax === false && (<div style={{ textAlign: 'center', padding: '24px', color: '#10b981' }}><div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div><p style={{ fontSize: '16px', fontWeight: 600 }}>No state income tax!</p><p style={{ color: '#94a3b8', marginTop: '8px', fontSize: '14px' }}>{taxData?.stateName || selectedState} has no state income tax</p>{taxData?.caWithholding > 0 && (<p style={{ color: '#10b981', marginTop: '12px', fontSize: '18px', fontWeight: 700 }}>💰 State Refund: {fmt(taxData.caWithholding)}</p>)}</div>)}

                  {!stateLoading && taxData?.hasStateTax !== false && (
                    <>
                      <div style={styles.row}><span style={{ color: '#94a3b8' }}>{selectedState} AGI</span><span style={{ color: '#fff' }}>{fmt(taxData?.caAgi)}</span></div>
                      <div style={styles.row}><span style={{ color: '#94a3b8' }}>Deduction</span><span style={{ color: '#ef4444' }}>-{fmt(taxData?.caStdDeduction)}</span></div>
                      <div style={styles.row}><span style={{ color: '#94a3b8' }}>Taxable</span><span style={{ color: '#fff', fontWeight: 600 }}>{fmt(taxData?.caTaxableIncome)}</span></div>
                      <div style={styles.row}><span style={{ color: '#94a3b8' }}>Tax {taxData?.stateTaxRate && `(${taxData.stateTaxRate})`}</span><span style={{ color: '#ef4444' }}>{fmt(taxData?.caTax)}</span></div>
                      <div style={styles.row}><span style={{ color: '#94a3b8' }}>Withheld</span><span style={{ color: '#10b981' }}>+{fmt(taxData?.caWithholding)}</span></div>
                      {taxData?.effectiveRate > 0 && (<div style={styles.row}><span style={{ color: '#64748b', fontSize: '13px' }}>{t.effectiveRate}</span><span style={{ color: '#94a3b8', fontSize: '13px' }}>{taxData.effectiveRate}%</span></div>)}
                      <div style={{ ...styles.row, borderTop: '2px solid rgba(255,255,255,0.2)', marginTop: '8px', paddingTop: '12px', borderBottom: 'none' }}><span style={{ fontWeight: 600, color: '#fff' }}>{taxData?.stateRefund > 0 ? '💰 Refund' : '💸 Owed'}</span><span style={{ fontWeight: 700, fontSize: '20px', color: taxData?.stateRefund > 0 ? '#10b981' : '#ef4444' }}>{fmt(taxData?.stateRefund > 0 ? taxData.stateRefund : taxData?.stateOwed)}</span></div>
                      <button onClick={handleDownloadState} style={{ ...styles.button, marginTop: '16px', background: isPaid ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(255,255,255,0.1)', color: isPaid ? '#fff' : '#64748b' }}>{isPaid ? `${t.downloadState} (${selectedState})` : t.payToDownload}</button>
                    </>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {activeTab === "downloads" && (<div style={styles.card}><h2 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', marginBottom: '16px' }}>{t.downloadForms}</h2>{!isPaid && (<div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}><div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><span style={{ fontSize: '24px' }}>🔒</span><div style={{ flex: 1 }}><p style={{ color: '#f87171', fontWeight: 600 }}>{t.payToDownload}</p><p style={{ color: '#94a3b8', fontSize: '13px' }}>{t.unlockForms}</p></div></div><button onClick={() => setShowSubmitFlow(true)} style={{ ...styles.button, marginTop: '12px' }}>{t.fileNow}</button></div>)}<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', flexWrap: 'wrap', gap: '12px' }}><div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><span style={{ fontSize: '28px' }}>📋</span><div><p style={{ fontWeight: 600, color: '#e2e8f0' }}>{t.form1040}</p><p style={{ fontSize: '13px', color: '#64748b' }}>{t.form1040Desc}</p></div></div><button onClick={handleDownload1040} disabled={!isPaid} style={{ padding: '10px 20px', background: isPaid ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'rgba(255,255,255,0.1)', color: isPaid ? '#fff' : '#64748b', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: isPaid ? 'pointer' : 'not-allowed' }}>{isPaid ? t.downloadPdf : '🔒'}</button></div><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', flexWrap: 'wrap', gap: '12px' }}><div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><span style={{ fontSize: '28px' }}>{getStateIcon(selectedState)}</span><div><p style={{ fontWeight: 600, color: '#e2e8f0' }}>{selectedState} {taxData?.stateForm || 'Form'}</p><p style={{ fontSize: '13px', color: '#64748b' }}>{taxData?.stateName || getStateInfo(selectedState).name} Return</p></div></div><button onClick={handleDownloadState} disabled={!isPaid || taxData?.hasStateTax === false} style={{ padding: '10px 20px', background: taxData?.hasStateTax === false ? 'rgba(16,185,129,0.2)' : (isPaid ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(255,255,255,0.1)'), color: taxData?.hasStateTax === false ? '#10b981' : (isPaid ? '#fff' : '#64748b'), border: 'none', borderRadius: '10px', fontWeight: 600, cursor: (isPaid && taxData?.hasStateTax !== false) ? 'pointer' : 'not-allowed' }}>{taxData?.hasStateTax === false ? '🎉 No Tax' : (isPaid ? t.downloadPdf : '🔒')}</button></div></div></div>)}

        {activeTab === "history" && (<><div style={styles.card}><h2 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '16px' }}>📄 Documents ({uploadedDocs.length})</h2>{uploadedDocs.length === 0 ? (<div style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}><div style={{ fontSize: '40px', marginBottom: '8px' }}>📭</div><p style={{ fontSize: '14px' }}>No documents yet</p></div>) : (<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>{uploadedDocs.map((doc, idx) => (<div key={doc._id || idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px' }}><span style={{ fontSize: '24px' }}>{doc.formType?.startsWith('W') ? '📄' : '📋'}</span><div style={{ flex: 1, minWidth: 0 }}><p style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '14px' }}>{doc.formType || 'Document'}</p><p style={{ fontSize: '12px', color: '#64748b' }}>{doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : ''}</p></div><span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: doc.status === 'approved' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)', color: doc.status === 'approved' ? '#10b981' : '#f59e0b' }}>{doc.status === 'approved' ? '✅' : '⏳'}</span></div>))}</div>)}</div><div style={{ ...styles.card, marginTop: '16px' }}><h2 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '16px' }}>💬 Chat ({chatHistory.length})</h2>{chatHistory.length === 0 ? (<div style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}><div style={{ fontSize: '40px', marginBottom: '8px' }}>💬</div><p style={{ fontSize: '14px', marginBottom: '16px' }}>No chat history</p><button onClick={goToChat} style={styles.button}>{t.startInterview}</button></div>) : (<div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>{chatHistory.slice(-20).map((msg, idx) => { const isUser = msg.sender === 'user' || msg.role === 'user'; return (<div key={idx} style={{ padding: '12px', borderRadius: '12px', marginLeft: isUser ? '20%' : '0', marginRight: isUser ? '0' : '20%', background: isUser ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.03)', border: isUser ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255,255,255,0.06)' }}><span style={{ fontSize: '11px', fontWeight: 600, color: isUser ? '#60a5fa' : '#a78bfa' }}>{isUser ? '👤 You' : '🤖 AI'}</span><p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#e2e8f0', lineHeight: 1.5 }}>{msg.text || msg.content || ''}</p></div>); })}</div>)}</div></>)}

        {activeTab === "settings" && (<div style={styles.card}><h2 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', marginBottom: '24px' }}>{t.settingsTitle}</h2><div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}><div><p style={{ fontWeight: 500, color: '#e2e8f0' }}>{t.language}</p><p style={{ fontSize: '13px', color: '#64748b' }}>{t.languageDesc}</p></div><select value={lang} onChange={(e) => changeLang(e.target.value)} style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', minWidth: '140px' }}>{languages.map(l => <option key={l.code} value={l.code} style={{ background: '#1e293b' }}>{l.flag} {l.name}</option>)}</select></div><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}><div><p style={{ fontWeight: 500, color: '#e2e8f0' }}>Tax Year</p><p style={{ fontSize: '13px', color: '#64748b' }}>Select tax year</p></div><select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', minWidth: '140px' }}><option value="2025" style={{ background: '#1e293b' }}>2025</option><option value="2024" style={{ background: '#1e293b' }}>2024</option></select></div><div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}><button onClick={handleLogout} style={{ padding: '14px 24px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', color: '#f87171', fontWeight: 500, cursor: 'pointer', width: isMobile ? '100%' : 'auto' }}>{t.logout}</button></div></div></div>)}

        {activeTab === "documents" && (<div style={styles.card}><h2 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', marginBottom: '16px' }}>📄 Tax Documents</h2><div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}><div style={{ fontSize: '48px', marginBottom: '16px' }}>📤</div><p style={{ marginBottom: '16px' }}>Upload your W-2s, 1099s during the interview</p><button onClick={goToChat} style={styles.button}>Go to Interview</button></div></div>)}
      </div>

      {isMobile && (<div style={styles.bottomNav}>{Object.entries(t.tabs).slice(0, 5).map(([key, label]) => (<button key={key} onClick={() => setActiveTab(key)} style={styles.navItem(activeTab === key)}><span style={{ fontSize: '20px' }}>{t.tabIcons[key]}</span><span style={{ fontSize: '10px', fontWeight: 500 }}>{label}</span></button>))}</div>)}

      {showStateCompare && stateComparison && (<div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}><div style={{ background: '#1e293b', borderRadius: '20px', maxWidth: '600px', width: '100%', maxHeight: '80vh', overflow: 'hidden' }}><div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h2 style={{ color: '#fff', fontSize: '18px', fontWeight: 600 }}>📊 {t.compareStates}</h2><button onClick={() => setShowStateCompare(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', padding: '8px 12px', color: '#fff', cursor: 'pointer' }}>✕</button></div><div style={{ padding: '20px', overflowY: 'auto', maxHeight: 'calc(80vh - 80px)' }}><div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}><div style={{ flex: 1, padding: '12px', background: 'rgba(16,185,129,0.1)', borderRadius: '12px', textAlign: 'center' }}><p style={{ color: '#10b981', fontSize: '12px' }}>Lowest Tax</p><p style={{ color: '#fff', fontWeight: 700 }}>{stateComparison.lowest_tax?.state_name}</p><p style={{ color: '#10b981', fontSize: '18px', fontWeight: 700 }}>{fmt(stateComparison.lowest_tax?.state_tax || 0)}</p></div><div style={{ flex: 1, padding: '12px', background: 'rgba(239,68,68,0.1)', borderRadius: '12px', textAlign: 'center' }}><p style={{ color: '#ef4444', fontSize: '12px' }}>Highest Tax</p><p style={{ color: '#fff', fontWeight: 700 }}>{stateComparison.highest_tax?.state_name}</p><p style={{ color: '#ef4444', fontSize: '18px', fontWeight: 700 }}>{fmt(stateComparison.highest_tax?.state_tax || 0)}</p></div></div><div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>{stateComparison.comparison?.slice(0, 20).map((s, idx) => (<div key={s.state} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: selectedState === s.state ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.02)', borderRadius: '8px', cursor: 'pointer' }} onClick={() => { setSelectedState(s.state); setShowStateCompare(false); }}><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ color: '#64748b', fontSize: '12px', width: '20px' }}>#{idx + 1}</span><span>{getStateIcon(s.state)}</span><span style={{ color: '#fff', fontSize: '14px' }}>{s.state_name}</span>{s.has_income_tax === false && <span style={{ fontSize: '10px', padding: '2px 6px', background: 'rgba(16,185,129,0.2)', borderRadius: '4px', color: '#10b981' }}>No Tax</span>}</div><div style={{ textAlign: 'right' }}><span style={{ color: s.state_tax === 0 ? '#10b981' : '#fff', fontWeight: 600 }}>{fmt(s.state_tax)}</span><span style={{ color: '#64748b', fontSize: '11px', marginLeft: '8px' }}>{s.effective_rate}%</span></div></div>))}</div></div></div></div>)}

      {showSubmitFlow && <SubmitFlow onClose={() => { setShowSubmitFlow(false); fetchTaxData(); }} userId={getUserId()} token={getToken()} taxData={taxData} userData={userData} />}

      <div style={{ textAlign: 'center', padding: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '10px', color: '#475569', lineHeight: 1.5, marginTop: '20px' }}>TaxSky AI is tax preparation software, not a licensed CPA or tax advisor. You are preparing your own tax return.<br /><a href="/terms" style={{ color: '#64748b', marginRight: '12px', textDecoration: 'none' }}>Terms</a><a href="/privacy" style={{ color: '#64748b', textDecoration: 'none' }}>Privacy</a></div>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');* { font-family: 'Plus Jakarta Sans', sans-serif; box-sizing: border-box; margin: 0; padding: 0; }@keyframes spin { to { transform: rotate(360deg); } }@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }select option { background: #1e293b; }::-webkit-scrollbar { width: 6px; height: 6px; }::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 3px; }::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 3px; }::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }`}</style>
    </div>
  );
}