// ============================================================
// USER DASHBOARD - v4.3 WITH TAX HISTORY & CHAT
// ============================================================
// ✅ v4.2: Primary data source is Python API (not Node.js)
// ✅ v4.2: Shows data even if Node.js fails
// ✅ v4.3: Tax History tab shows chat history & uploaded docs
// Supports: English (en), Vietnamese (vi), Spanish (es)
// ============================================================

import React, { useState, useEffect, useCallback } from "react";
import SubmitFlow from "./SubmitFlow";

const API_BASE = import.meta.env?.VITE_API_URL || "http://localhost:3000";
const PYTHON_API = import.meta.env?.VITE_PYTHON_API || "http://localhost:5002";

// ✅ STATE LIST - Added NJ
const ALL_STATES = [
  { code: "CA", name: "California", icon: "🌴", group: "full" },
  { code: "NY", name: "New York", icon: "🗽", group: "full" },
  { code: "NJ", name: "New Jersey", icon: "🏛️", group: "full" },
  { code: "IL", name: "Illinois", icon: "🏙️", group: "full" },
  { code: "FL", name: "Florida", icon: "🌴", group: "no_tax" },
  { code: "TX", name: "Texas", icon: "🤠", group: "no_tax" },
  { code: "NV", name: "Nevada", icon: "🎰", group: "no_tax" },
  { code: "WA", name: "Washington", icon: "🌲", group: "no_tax" },
  { code: "TN", name: "Tennessee", icon: "🎸", group: "no_tax" },
  { code: "AK", name: "Alaska", icon: "🏔️", group: "no_tax" },
  { code: "WY", name: "Wyoming", icon: "🦬", group: "no_tax" },
  { code: "SD", name: "South Dakota", icon: "🌾", group: "no_tax" },
];

const getStateIcon = (code) => ALL_STATES.find(s => s.code === code)?.icon || "🏛️";

// TRANSLATIONS
const translations = {
  en: {
    taxChat: "💬 Tax Chat", dashboard: "📊 Dashboard", taxYear: "Tax Year", logout: "🚪 Logout",
    tabs: { overview: "Overview", documents: "Documents", downloads: "Downloads", history: "Tax History", settings: "Settings" },
    estimatedRefund: "💰 Estimated Total Refund", estimatedOwed: "💸 Estimated Amount Owed",
    federal: "🇺🇸 Federal", fileNow: "📋 File Now", totalIncome: "Total Income", withheld: "Withheld",
    federalBreakdown: "🇺🇸 Federal Tax Breakdown", w2Wages: "W-2 Wages", standardDeduction: "Standard Deduction",
    taxableIncome: "Taxable Income", federalTax: "Federal Tax", netRefund: "Net Refund", netOwed: "Net Owed",
    downloadForms: "📥 Download Tax Forms", form1040: "Form 1040", form1040Desc: "U.S. Individual Income Tax Return",
    downloadPdf: "Download PDF", settingsTitle: "⚙️ Settings", language: "Language", languageDesc: "Select your preferred language",
    loading: "Loading...", errorNoUserId: "⚠️ Please login again", noDataYet: "Complete the tax interview to see your results",
    startInterview: "Start Tax Interview", adjustments: "Adjustments", state: "State",
    downloadFederal: "📥 Download Form 1040", downloadState: "📥 Download State Form",
    payToDownload: "🔒 Pay to Download", unlockForms: "Complete payment to download your tax forms",
  },
  vi: {
    taxChat: "💬 Chat Thuế", dashboard: "📊 Bảng Điều Khiển", taxYear: "Năm Thuế", logout: "🚪 Đăng Xuất",
    tabs: { overview: "Tổng Quan", documents: "Tài Liệu", downloads: "Tải Xuống", history: "Lịch Sử", settings: "Cài Đặt" },
    estimatedRefund: "💰 Ước Tính Hoàn Thuế", estimatedOwed: "💸 Ước Tính Số Tiền Nợ",
    federal: "🇺🇸 Liên Bang", fileNow: "📋 Nộp Ngay", totalIncome: "Tổng Thu Nhập", withheld: "Đã Khấu Trừ",
    federalBreakdown: "🇺🇸 Chi Tiết Thuế Liên Bang", w2Wages: "Lương W-2", standardDeduction: "Khấu Trừ Tiêu Chuẩn",
    taxableIncome: "Thu Nhập Chịu Thuế", federalTax: "Thuế Liên Bang", netRefund: "Hoàn Thuế", netOwed: "Nợ Thuế",
    downloadForms: "📥 Tải Biểu Mẫu", form1040: "Mẫu 1040", form1040Desc: "Tờ Khai Thuế Hoa Kỳ",
    downloadPdf: "Tải PDF", settingsTitle: "⚙️ Cài Đặt", language: "Ngôn Ngữ", languageDesc: "Chọn ngôn ngữ",
    loading: "Đang tải...", errorNoUserId: "⚠️ Vui lòng đăng nhập lại", noDataYet: "Hoàn thành phỏng vấn để xem kết quả",
    startInterview: "Bắt Đầu Phỏng Vấn", adjustments: "Điều Chỉnh", state: "Tiểu Bang",
    downloadFederal: "📥 Tải Mẫu 1040", downloadState: "📥 Tải Mẫu Tiểu Bang",
    payToDownload: "🔒 Thanh Toán để Tải", unlockForms: "Thanh toán để tải biểu mẫu",
  },
  es: {
    taxChat: "💬 Chat", dashboard: "📊 Panel", taxYear: "Año", logout: "🚪 Salir",
    tabs: { overview: "Resumen", documents: "Documentos", downloads: "Descargas", history: "Historial", settings: "Ajustes" },
    estimatedRefund: "💰 Reembolso Estimado", estimatedOwed: "💸 Monto Adeudado",
    federal: "🇺🇸 Federal", fileNow: "📋 Presentar", totalIncome: "Ingreso Total", withheld: "Retenido",
    federalBreakdown: "🇺🇸 Desglose Federal", w2Wages: "Salarios W-2", standardDeduction: "Deducción Estándar",
    taxableIncome: "Ingreso Gravable", federalTax: "Impuesto Federal", netRefund: "Reembolso", netOwed: "Adeudado",
    downloadForms: "📥 Descargar", form1040: "Formulario 1040", form1040Desc: "Declaración EE.UU.",
    downloadPdf: "Descargar PDF", settingsTitle: "⚙️ Configuración", language: "Idioma", languageDesc: "Seleccione idioma",
    loading: "Cargando...", errorNoUserId: "⚠️ Inicie sesión", noDataYet: "Complete la entrevista",
    startInterview: "Iniciar", adjustments: "Ajustes", state: "Estado",
    downloadFederal: "📥 Descargar 1040", downloadState: "📥 Descargar Estado",
    payToDownload: "🔒 Pagar para Descargar", unlockForms: "Pague para descargar formularios",
  }
};

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'es', name: 'Español', flag: '🇲🇽' },
];

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
  const [isPaid, setIsPaid] = useState(false);  // ✅ Payment status
  const [chatHistory, setChatHistory] = useState([]);  // ✅ NEW: Chat history
  const [uploadedDocs, setUploadedDocs] = useState([]); // ✅ NEW: Uploaded documents
  
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
    console.log(`[DASHBOARD] 🔄 Calculating ${stateCode}...`);
    
    try {
      const answers = userData?.answers || {};
      const res = await fetch(`${PYTHON_API}/calculate/state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state: stateCode, filing_status: userData?.filing_status || "single",
          federal_agi: taxData.agi, agi: taxData.agi, wages: taxData.wages || 0,
          earned_income: taxData.wages || 0, state_withholding: taxData.caWithholding || 0,
          is_renter: answers.is_renter || false, num_children: answers.qualifying_children_under_17 || 0,
          has_child_under_6: answers.has_child_under_6 || false, is_nyc: answers.is_nyc || false,
        }),
      });
      const result = await res.json();
      console.log(`[DASHBOARD] ✅ ${stateCode}:`, result);
      
      setTaxData(prev => ({
        ...prev,
        state: stateCode, stateName: result.state_name || stateCode,
        hasStateTax: result.has_income_tax !== false, supportLevel: result.support_level || "unknown",
        caAgi: result.ca_agi || result.nj_agi || result.ny_agi || result.il_income || result.federal_agi || prev.agi,
        caStdDeduction: result.standard_deduction || result.exemptions || 0,
        caTaxableIncome: result.taxable_income || 0, caTax: result.total_tax || result.base_tax || 0,
        calEitc: result.caleitc || 0, yctc: result.yctc || 0, ilEic: result.il_eic || 0,
        caWithholding: result.withholding || prev.caWithholding || 0,
        stateRefund: result.refund || 0, stateOwed: result.amount_owed || 0,
        effectiveRate: result.effective_rate || 0, taxRate: result.tax_rate || null,
        totalRefund: (prev.federalRefund || 0) + (result.refund || 0),
        totalOwed: (prev.federalOwed || 0) + (result.amount_owed || 0),
      }));
    } catch (err) { console.error(`[DASHBOARD] ❌ Error:`, err); }
    finally { setStateLoading(false); }
  }, [taxData?.agi, taxData?.wages, userData]);

  // Auto-calculate on state change
  useEffect(() => {
    if (selectedState && taxData?.agi > 0 && !loading) calculateStateTax(selectedState);
  }, [selectedState]);

  // Load data
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
      
      // ✅ Step 1: Get session data from Node.js (answers, messages)
      let result = { success: false, answers: {} };
      try {
        const res = await fetch(`${API_BASE}/api/ai/data/${userId}?taxYear=${selectedYear}`, {
          headers: { "Authorization": `Bearer ${getToken()}` }
        });
        result = await res.json();
        console.log("[DASHBOARD] 📥 Node.js response:", result);
      } catch (nodeErr) {
        console.log("[DASHBOARD] ⚠️ Node.js API error:", nodeErr);
      }
      
      // ✅ Step 2: Get form1040 from Python API (extracted tax data) - THIS IS THE PRIMARY SOURCE!
      let form1040 = null;
      try {
        const pythonRes = await fetch(`${PYTHON_API}/api/extract/json/${userId}?tax_year=${selectedYear}`);
        const pythonData = await pythonRes.json();
        if (pythonData.success && pythonData.form1040) {
          form1040 = pythonData.form1040;
          console.log("[DASHBOARD] ✅ Got form1040 from Python API:", form1040);
        }
      } catch (pythonErr) {
        console.log("[DASHBOARD] ⚠️ Python API not available:", pythonErr);
        form1040 = result.form1040 || null;  // Fallback to Node.js
      }
      
      // ✅ If we have form1040 from Python, use it (even if Node.js failed)
      if (form1040?.income) {
        const answers = result.answers || {};
        setForm1040Data(form1040);
        
        // ✅ Check payment/filing status
        setIsPaid(
          result.paymentStatus === 'paid' || 
          result.isPaid === true || 
          result.filed === true ||
          result.filingStatus === 'filed' ||
          answers.payment_complete === true ||
          answers.filed === true
        );
        
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
        
        console.log("[DASHBOARD] 📊 Processing form1040:", { wages: income.line_1_wages, agi: federalAgi });
        
        // Initial state calc
        let stateData = { state: userState, stateName: userState, caAgi: federalAgi, caWithholding: stateWithholding, stateRefund: 0, stateOwed: 0, hasStateTax: true };
        try {
          const stateRes = await fetch(`${PYTHON_API}/calculate/state`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ state: userState, filing_status: form1040?.header?.filing_status || "single", federal_agi: federalAgi, wages: income.line_1_wages || 0, state_withholding: stateWithholding }),
          });
          const sr = await stateRes.json();
          console.log("[DASHBOARD] 🏛️ State tax result:", sr);
          if (sr && !sr.error) {
            stateData = { state: userState, stateName: sr.state_name || userState, hasStateTax: sr.has_income_tax !== false, supportLevel: sr.support_level,
              caAgi: sr.ca_agi || sr.nj_agi || sr.federal_agi || federalAgi, caStdDeduction: sr.standard_deduction || sr.exemptions || 0,
              caTaxableIncome: sr.taxable_income || 0, caTax: sr.total_tax || 0, calEitc: sr.caleitc || 0, yctc: sr.yctc || 0, ilEic: sr.il_eic || 0,
              caWithholding: sr.withholding || stateWithholding, stateRefund: sr.refund || 0, stateOwed: sr.amount_owed || 0, effectiveRate: sr.effective_rate || 0, taxRate: sr.tax_rate };
          }
        } catch (e) { console.error("State calc error:", e); }
        
        const federalRefund = refundOrOwe.line_35_refund || refundOrOwe.line_35a_refund || 0;
        const federalOwed = refundOrOwe.line_37_amount_owe || refundOrOwe.line_37_amount_owed || 0;
        
        setTaxData({
          wages: income.line_1_wages || income.line_1a_w2_wages || 0, 
          totalIncome: income.line_9_total_income || form1040.summary?.total_income || 0,
          totalAdjustments: adjustments.line_10_schedule_1_adjustments || 0, 
          agi: federalAgi,
          standardDeduction: deductions.line_12_deduction || deductions.line_12_standard_deduction || 0, 
          taxableIncome: deductions.line_15_taxable_income || 0,
          federalTax: taxCredits.line_16_tax || 0, 
          withholding: payments.line_25d_total_withholding || 0,
          federalRefund: federalRefund, 
          federalOwed: federalOwed,
          ...stateData,
          totalRefund: federalRefund + (stateData.stateRefund || 0),
          totalOwed: federalOwed + (stateData.stateOwed || 0),
        });
        
        // ✅ NEW: Set chat history from Node.js response
        if (result.messages && result.messages.length > 0) {
          setChatHistory(result.messages);
          console.log("[DASHBOARD] 💬 Chat history loaded:", result.messages.length, "messages");
        }
        
        console.log("[DASHBOARD] ✅ taxData set successfully!");
      } else {
        console.log("[DASHBOARD] ⚠️ No form1040.income found, showing interview prompt");
      }
      
      // ✅ NEW: Load uploaded documents
      try {
        const docsRes = await fetch(`${API_BASE}/api/forms/user/${userId}?taxYear=${selectedYear}`, {
          headers: { "Authorization": `Bearer ${getToken()}` }
        });
        const docsData = await docsRes.json();
        if (docsData.files && docsData.files.length > 0) {
          setUploadedDocs(docsData.files);
          console.log("[DASHBOARD] 📄 Uploaded docs loaded:", docsData.files.length);
        }
      } catch (docsErr) {
        console.log("[DASHBOARD] ⚠️ No uploaded docs or error:", docsErr);
      }
      
    } catch (err) { console.error("Error:", err); }
    finally { setLoading(false); }
  };

  // ✅ DOWNLOAD HANDLERS WITH PAYMENT CHECK
  const handleDownload1040 = async () => {
    // ✅ Payment check
    if (!isPaid) {
      alert(t.unlockForms);
      setShowSubmitFlow(true);
      return;
    }
    
    const userId = getUserId();
    if (!userId) { alert(t.errorNoUserId); return; }
    try {
      const form1040 = form1040Data || {};
      const answers = userData?.answers || {};
      const res = await fetch(`${PYTHON_API}/generate/1040`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: userId,
          mask_ssn: false,  // ✅ Real SSN for paid users
          is_official_submission: true,
          personal: { 
            first_name: form1040?.header?.first_name || answers.first_name || "", 
            last_name: form1040?.header?.last_name || answers.last_name || "", 
            ssn: answers?.ssn || "",
            address: answers?.address || "",
            apt: answers?.apt || "",
            city: answers?.city || "",
            state: answers?.state || selectedState || "CA",
            zip: answers?.zip || "",
            filing_status: form1040?.header?.filing_status || answers?.filing_status || "single",
            spouse_first_name: answers?.spouse_first_name || "",
            spouse_last_name: answers?.spouse_last_name || "",
            spouse_ssn: answers?.spouse_ssn || "",
          },
          dependents: answers?.dependents || [],
          form1040: {
            income: {
              line_1_wages: taxData?.wages || form1040?.income?.line_1_wages || 0,
              line_9_total_income: taxData?.totalIncome || form1040?.income?.line_9_total_income || 0,
            },
            adjustments: {
              line_10_schedule_1_adjustments: taxData?.totalAdjustments || 0,
              line_11_agi: taxData?.agi || form1040?.adjustments?.line_11_agi || 0,
            },
            deductions: {
              line_12_deduction: taxData?.standardDeduction || form1040?.deductions?.line_12_deduction || 0,
              line_15_taxable_income: taxData?.taxableIncome || form1040?.deductions?.line_15_taxable_income || 0,
            },
            tax_and_credits: {
              line_16_tax: taxData?.federalTax || form1040?.tax_and_credits?.line_16_tax || 0,
              line_24_total_tax: taxData?.federalTax || form1040?.tax_and_credits?.line_24_total_tax || 0,
            },
            payments: {
              line_25d_total_withholding: taxData?.withholding || form1040?.payments?.line_25d_total_withholding || 0,
              line_33_total_payments: taxData?.withholding || form1040?.payments?.line_33_total_payments || 0,
            },
            refund_or_owe: {
              line_35_refund: taxData?.federalRefund || form1040?.refund_or_owe?.line_35_refund || 0,
              line_37_amount_owe: taxData?.federalOwed || form1040?.refund_or_owe?.line_37_amount_owe || 0,
            },
          },
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
    // ✅ Payment check
    if (!isPaid) {
      alert(t.unlockForms);
      setShowSubmitFlow(true);
      return;
    }
    
    // Skip download for no-tax states
    if (taxData?.hasStateTax === false) {
      alert(`${taxData?.stateName || selectedState} has no state income tax. No form needed!`);
      return;
    }
    
    const userId = getUserId();
    if (!userId) { alert(t.errorNoUserId); return; }
    try {
      const res = await fetch(`${PYTHON_API}/generate/ca540`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: userId,
          mask_ssn: false,  // ✅ Real SSN for paid users
          personal: { first_name: form1040Data?.header?.first_name || "", last_name: form1040Data?.header?.last_name || "", ssn: userData?.answers?.ssn || "", state: selectedState },
          california: { filing_status: form1040Data?.header?.filing_status || "single", federal_agi: taxData?.agi || 0, ca_agi: taxData?.caAgi || 0, standard_deduction: taxData?.caStdDeduction || 0, taxable_income: taxData?.caTaxableIncome || 0, tax: taxData?.caTax || 0, withholding: taxData?.caWithholding || 0, refund: taxData?.stateRefund || 0, amount_owed: taxData?.stateOwed || 0 },
        }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const a = document.createElement("a"); a.href = window.URL.createObjectURL(blob); a.download = `${selectedState}_Form_${selectedYear}.pdf`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
      }
    } catch (err) { alert("Error: " + err.message); }
  };

  const totalRefund = (taxData?.federalRefund || 0) + (taxData?.stateRefund || 0);
  const totalOwed = (taxData?.federalOwed || 0) + (taxData?.stateOwed || 0);

  // ✅ DOWNLOAD BUTTON COMPONENT
  const DownloadButton = ({ onClick, label, locked, type = "federal" }) => (
    <button 
      onClick={onClick} 
      style={{ 
        width: '100%', 
        padding: '14px 20px', 
        border: locked ? '1px dashed rgba(255,255,255,0.2)' : 'none',
        borderRadius: '12px', 
        fontWeight: 600, 
        cursor: locked ? 'not-allowed' : 'pointer', 
        marginTop: '20px',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        gap: '8px',
        fontSize: '14px',
        transition: 'all 0.2s ease',
        background: locked 
          ? 'rgba(255,255,255,0.03)' 
          : (type === 'federal' 
              ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' 
              : 'linear-gradient(135deg, #f59e0b, #d97706)'),
        color: locked ? '#64748b' : '#fff',
      }}
    >
      {locked ? t.payToDownload : label}
    </button>
  );

  if (loading) return <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a, #1e293b)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><div style={{ textAlign: 'center' }}><div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div><p>{t.loading}</p></div></div>;
  if (userIdError) return <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a, #1e293b)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><div style={{ textAlign: 'center', padding: '40px' }}><div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div><p>{t.errorNoUserId}</p><button onClick={() => window.location.href = "/"} style={{ marginTop: '24px', padding: '12px 32px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer' }}>Login</button></div></div>;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)', color: '#e2e8f0' }}>
      {/* Header */}
      <div style={{ background: 'rgba(15, 23, 42, 0.95)', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {/* TaxSky AI Logo */}
          <svg width="170" height="48" viewBox="0 0 180 50" fill="none">
            <defs>
              <linearGradient id="hexGradDash" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1"/>
                <stop offset="100%" stopColor="#8b5cf6"/>
              </linearGradient>
              <linearGradient id="textGradDash" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6"/>
                <stop offset="100%" stopColor="#06b6d4"/>
              </linearGradient>
            </defs>
            <polygon points="22,7 34,1 46,7 46,20 34,26 22,20" fill="url(#hexGradDash)" opacity="0.25"/>
            <polygon points="18,12 30,6 42,12 42,25 30,31 18,25" fill="url(#hexGradDash)" opacity="0.5"/>
            <polygon points="20,17 32,11 44,17 44,29 32,35 20,29" fill="url(#hexGradDash)"/>
            <path d="M32 20 L32 29 M28 22.5 Q32 20 36 22.5 Q32 25 28 27.5 Q32 30 36 27.5" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
            <text x="54" y="29" fontFamily="Space Grotesk, system-ui, sans-serif" fontSize="20" fontWeight="700" fill="white">Tax</text>
            <text x="88" y="29" fontFamily="Space Grotesk, system-ui, sans-serif" fontSize="20" fontWeight="700" fill="url(#textGradDash)">Sky</text>
            <text x="126" y="29" fontFamily="Space Grotesk, system-ui, sans-serif" fontSize="12" fontWeight="600" fill="#a78bfa">AI</text>
          </svg>
          <button onClick={goToChat} style={{ padding: '8px 16px', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', color: '#60a5fa', cursor: 'pointer' }}>{t.taxChat}</button>
          <span style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: '8px', color: '#fff', fontWeight: 600 }}>{t.dashboard}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: '#fff' }}><option value="2025">{t.taxYear} 2025</option><option value="2024">{t.taxYear} 2024</option></select>
          <select value={lang} onChange={(e) => changeLang(e.target.value)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: '#fff' }}>{languages.map(l => <option key={l.code} value={l.code}>{l.flag} {l.name}</option>)}</select>
          {/* ✅ PAID Badge */}
          {isPaid && <span style={{ padding: '4px 12px', background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '6px', color: '#10b981', fontSize: '12px', fontWeight: 600 }}>✅ PAID</span>}
          <span style={{ color: '#94a3b8' }}>{user?.name || 'Guest'}</span>
          <button onClick={handleLogout} style={{ padding: '8px 16px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#f87171', cursor: 'pointer' }}>{t.logout}</button>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px' }}>
          {Object.entries(t.tabs).map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)} style={{ padding: '10px 20px', background: activeTab === key ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px', color: activeTab === key ? '#fff' : '#94a3b8', cursor: 'pointer', fontWeight: activeTab === key ? 600 : 400 }}>{label}</button>
          ))}
        </div>

        {/* Overview */}
        {activeTab === "overview" && (
          <>
            {!taxData?.wages && (
              <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '16px', padding: '32px', textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                <p style={{ color: '#94a3b8', marginBottom: '16px' }}>{t.noDataYet}</p>
                <button onClick={goToChat} style={{ padding: '12px 32px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer' }}>{t.startInterview}</button>
              </div>
            )}

            {taxData?.wages > 0 && (
              <>
                {/* Summary */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ background: totalRefund > 0 ? 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(6,95,70,0.2))' : 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(127,29,29,0.2))', border: `1px solid ${totalRefund > 0 ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: '16px', padding: '24px' }}>
                    <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '8px' }}>{totalRefund > 0 ? t.estimatedRefund : t.estimatedOwed}</p>
                    <p style={{ fontSize: '36px', fontWeight: 700, color: totalRefund > 0 ? '#10b981' : '#ef4444' }}>{fmt(totalRefund > 0 ? totalRefund : totalOwed)}</p>
                    <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}><span style={{ fontSize: '14px', color: '#94a3b8' }}>{t.federal}: {fmt(taxData?.federalRefund || -taxData?.federalOwed)}</span><span style={{ fontSize: '14px', color: '#94a3b8' }}>{t.state}: {fmt(taxData?.stateRefund || -taxData?.stateOwed)}</span></div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}><p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '8px' }}>{t.totalIncome}</p><p style={{ fontSize: '28px', fontWeight: 700, color: '#fff' }}>{fmt(taxData?.totalIncome)}</p></div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}><p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '8px' }}>{t.withheld}</p><p style={{ fontSize: '28px', fontWeight: 700, color: '#fff' }}>{fmt(taxData?.withholding)}</p></div>
                  <div style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.2))', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '16px', padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><button onClick={() => setShowSubmitFlow(true)} style={{ padding: '16px 48px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: 600, cursor: 'pointer' }}>{t.fileNow}</button></div>
                </div>

                {/* Breakdown */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
                  {/* ✅ Federal Card with Download Button */}
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '24px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px', color: '#fff' }}>{t.federalBreakdown}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>{t.w2Wages}</span><span style={{ color: '#fff' }}>{fmt(taxData?.wages)}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>{t.adjustments}</span><span style={{ color: '#ef4444' }}>-{fmt(taxData?.totalAdjustments)}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}><span style={{ color: '#94a3b8' }}>AGI</span><span style={{ color: '#fff', fontWeight: 600 }}>{fmt(taxData?.agi)}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>{t.standardDeduction}</span><span style={{ color: '#ef4444' }}>-{fmt(taxData?.standardDeduction)}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}><span style={{ color: '#94a3b8' }}>{t.taxableIncome}</span><span style={{ color: '#fff', fontWeight: 600 }}>{fmt(taxData?.taxableIncome)}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>{t.federalTax}</span><span style={{ color: '#ef4444' }}>{fmt(taxData?.federalTax)}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>{t.withheld}</span><span style={{ color: '#10b981' }}>+{fmt(taxData?.withholding)}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid rgba(255,255,255,0.2)', paddingTop: '12px', marginTop: '8px' }}><span style={{ fontWeight: 600, color: '#fff' }}>{taxData?.federalRefund > 0 ? t.netRefund : t.netOwed}</span><span style={{ fontWeight: 700, fontSize: '20px', color: taxData?.federalRefund > 0 ? '#10b981' : '#ef4444' }}>{fmt(taxData?.federalRefund > 0 ? taxData.federalRefund : taxData?.federalOwed)}</span></div>
                    </div>
                    {/* ✅ Download Button */}
                    <DownloadButton onClick={handleDownload1040} label={t.downloadFederal} locked={!isPaid} type="federal" />
                  </div>

                  {/* ✅ STATE WITH DROPDOWN and Download Button */}
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {getStateIcon(selectedState)} {taxData?.stateName || selectedState} Tax
                        {taxData?.supportLevel && <span style={{ fontSize: '11px', padding: '3px 8px', background: taxData.supportLevel === 'full' ? 'rgba(16,185,129,0.2)' : taxData.supportLevel === 'no_tax' ? 'rgba(59,130,246,0.2)' : 'rgba(234,179,8,0.2)', borderRadius: '6px', color: taxData.supportLevel === 'full' ? '#10b981' : taxData.supportLevel === 'no_tax' ? '#60a5fa' : '#eab308' }}>{taxData.supportLevel === 'full' ? 'Full' : taxData.supportLevel === 'no_tax' ? 'No Tax' : 'Basic'}</span>}
                      </h3>
                      <select value={selectedState} onChange={(e) => setSelectedState(e.target.value)} disabled={stateLoading} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '13px', cursor: stateLoading ? 'wait' : 'pointer', opacity: stateLoading ? 0.7 : 1 }}>
                        <optgroup label="✅ Full Support" style={{ background: '#1e293b' }}>{ALL_STATES.filter(s => s.group === 'full').map(s => <option key={s.code} value={s.code} style={{ background: '#1e293b' }}>{s.icon} {s.name}</option>)}</optgroup>
                        <optgroup label="🎉 No Income Tax" style={{ background: '#1e293b' }}>{ALL_STATES.filter(s => s.group === 'no_tax').map(s => <option key={s.code} value={s.code} style={{ background: '#1e293b' }}>{s.icon} {s.name}</option>)}</optgroup>
                      </select>
                    </div>

                    {stateLoading && <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}><div style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#3b82f6', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />Calculating {selectedState}...</div>}

                    {!stateLoading && taxData?.hasStateTax === false && (
                      <div style={{ textAlign: 'center', padding: '32px', color: '#10b981' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
                        <p style={{ fontSize: '18px', fontWeight: 600 }}>{taxData?.stateName || selectedState} has no state income tax!</p>
                        <p style={{ color: '#94a3b8', marginTop: '8px' }}>You only need to file federal taxes.</p>
                        <div style={{ marginTop: '16px', padding: '12px 24px', background: 'rgba(16,185,129,0.15)', borderRadius: '10px', display: 'inline-block' }}><span style={{ color: '#10b981', fontWeight: 600 }}>State Tax: $0</span></div>
                      </div>
                    )}

                    {!stateLoading && taxData?.hasStateTax !== false && (
                      <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>{selectedState} AGI</span><span style={{ color: '#fff' }}>{fmt(taxData?.caAgi)}</span></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>Standard Deduction</span><span style={{ color: '#ef4444' }}>-{fmt(taxData?.caStdDeduction)}</span></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}><span style={{ color: '#94a3b8' }}>Taxable Income</span><span style={{ color: '#fff', fontWeight: 600 }}>{fmt(taxData?.caTaxableIncome)}</span></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>{selectedState} Tax{taxData?.taxRate ? ` (${(taxData.taxRate * 100).toFixed(2)}%)` : ''}</span><span style={{ color: '#ef4444' }}>{fmt(taxData?.caTax)}</span></div>
                          {taxData?.calEitc > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '12px' }}><span style={{ color: '#64748b', fontSize: '13px' }}>CalEITC</span><span style={{ color: '#10b981', fontSize: '13px' }}>+{fmt(taxData?.calEitc)}</span></div>}
                          {taxData?.yctc > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '12px' }}><span style={{ color: '#64748b', fontSize: '13px' }}>Young Child Credit</span><span style={{ color: '#10b981', fontSize: '13px' }}>+{fmt(taxData?.yctc)}</span></div>}
                          {taxData?.ilEic > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '12px' }}><span style={{ color: '#64748b', fontSize: '13px' }}>IL EIC</span><span style={{ color: '#10b981', fontSize: '13px' }}>+{fmt(taxData?.ilEic)}</span></div>}
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>Withheld</span><span style={{ color: '#10b981' }}>+{fmt(taxData?.caWithholding)}</span></div>
                          {taxData?.effectiveRate > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b', fontSize: '14px' }}>Effective Rate</span><span style={{ color: '#64748b', fontSize: '14px' }}>{taxData.effectiveRate.toFixed(2)}%</span></div>}
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid rgba(255,255,255,0.2)', paddingTop: '12px', marginTop: '8px' }}><span style={{ fontWeight: 600, color: '#fff' }}>{taxData?.stateRefund > 0 ? '💰 Refund' : '💸 Owed'}</span><span style={{ fontWeight: 700, fontSize: '20px', color: taxData?.stateRefund > 0 ? '#10b981' : '#ef4444' }}>{fmt(taxData?.stateRefund > 0 ? taxData.stateRefund : taxData?.stateOwed)}</span></div>
                        </div>
                        {/* ✅ Download Button */}
                        <DownloadButton onClick={handleDownloadState} label={`${t.downloadState} (${selectedState})`} locked={!isPaid} type="state" />
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Downloads Tab */}
        {activeTab === "downloads" && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', marginBottom: '16px' }}>{t.downloadForms}</h2>
            
            {/* ✅ Payment Warning */}
            {!isPaid && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '24px' }}>🔒</span>
                <div style={{ flex: 1 }}>
                  <p style={{ color: '#f87171', fontWeight: 600 }}>{t.payToDownload}</p>
                  <p style={{ color: '#94a3b8', fontSize: '14px' }}>{t.unlockForms}</p>
                </div>
                <button onClick={() => setShowSubmitFlow(true)} style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}>{t.fileNow}</button>
              </div>
            )}
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', opacity: isPaid ? 1 : 0.6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><span style={{ fontSize: '32px' }}>📋</span><div><p style={{ fontWeight: 600, color: '#e2e8f0' }}>{t.form1040}</p><p style={{ fontSize: '14px', color: '#64748b' }}>{t.form1040Desc}</p></div></div>
                <button onClick={handleDownload1040} disabled={!isPaid} style={{ padding: '10px 20px', background: isPaid ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'rgba(255,255,255,0.1)', color: isPaid ? '#fff' : '#64748b', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: isPaid ? 'pointer' : 'not-allowed' }}>{isPaid ? t.downloadPdf : t.payToDownload}</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', opacity: isPaid ? 1 : 0.6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><span style={{ fontSize: '32px' }}>📋</span><div><p style={{ fontWeight: 600, color: '#e2e8f0' }}>{getStateIcon(selectedState)} {selectedState} Form</p><p style={{ fontSize: '14px', color: '#64748b' }}>{taxData?.stateName || selectedState} State Return</p></div></div>
                <button onClick={handleDownloadState} disabled={!isPaid} style={{ padding: '10px 20px', background: isPaid ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(255,255,255,0.1)', color: isPaid ? '#fff' : '#64748b', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: isPaid ? 'pointer' : 'not-allowed' }}>{isPaid ? t.downloadPdf : t.payToDownload}</button>
              </div>
            </div>
          </div>
        )}

        {/* Tax History Tab - Chat History & Uploaded Documents */}
        {activeTab === "history" && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Uploaded Documents Section */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📄 Uploaded Documents ({uploadedDocs.length})
              </h2>
              
              {uploadedDocs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
                  <p>No documents uploaded yet</p>
                  <p style={{ fontSize: '14px', marginTop: '8px' }}>Upload your W-2s, 1099s during the filing process</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {uploadedDocs.map((doc, idx) => (
                    <div key={doc._id || idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '16px',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.06)'
                    }}>
                      <span style={{ fontSize: '28px' }}>
                        {doc.formType?.startsWith('W') ? '📄' : doc.formType?.startsWith('1099') ? '📋' : '📎'}
                      </span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>{doc.formType || 'Document'}</p>
                        <p style={{ fontSize: '13px', color: '#64748b' }}>
                          {doc.originalName || doc.fileName || 'Uploaded file'} • 
                          {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : ''}
                        </p>
                      </div>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: doc.status === 'approved' ? 'rgba(16,185,129,0.2)' : doc.status === 'rejected' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                        color: doc.status === 'approved' ? '#10b981' : doc.status === 'rejected' ? '#ef4444' : '#f59e0b'
                      }}>
                        {doc.status === 'approved' ? '✅ Approved' : doc.status === 'rejected' ? '❌ Rejected' : '⏳ Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Chat History Section */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                💬 Interview Chat History ({chatHistory.length} messages)
              </h2>
              
              {chatHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>💬</div>
                  <p>No chat history yet</p>
                  <p style={{ fontSize: '14px', marginTop: '8px' }}>Complete the tax interview to see your conversation</p>
                  <button onClick={goToChat} style={{ marginTop: '16px', padding: '10px 24px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}>
                    Start Tax Interview
                  </button>
                </div>
              ) : (
                <div style={{ maxHeight: '500px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {chatHistory.map((msg, idx) => {
                    const isUser = msg.sender === 'user' || msg.role === 'user';
                    const messageText = msg.text || msg.content || msg.message || '';
                    const messageTime = msg.timestamp || msg.createdAt;
                    
                    return (
                      <div key={idx} style={{
                        padding: '14px 18px',
                        borderRadius: '16px',
                        marginLeft: isUser ? '40px' : '0',
                        marginRight: isUser ? '0' : '40px',
                        background: isUser ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.03)',
                        border: isUser ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255,255,255,0.06)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: isUser ? '#60a5fa' : '#a78bfa' }}>
                            {isUser ? '👤 You' : '🤖 TaxSky AI'}
                          </span>
                          {messageTime && (
                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                              {new Date(messageTime).toLocaleString()}
                            </span>
                          )}
                        </div>
                        <p style={{ margin: 0, fontSize: '14px', color: '#e2e8f0', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                          {messageText || <span style={{ color: '#64748b', fontStyle: 'italic' }}>(empty message)</span>}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings */}
        {activeTab === "settings" && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', marginBottom: '24px' }}>{t.settingsTitle}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><div><p style={{ fontWeight: 500, color: '#e2e8f0' }}>{t.language}</p><p style={{ fontSize: '14px', color: '#64748b' }}>{t.languageDesc}</p></div><select value={lang} onChange={(e) => changeLang(e.target.value)} style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff' }}>{languages.map(l => <option key={l.code} value={l.code} style={{ background: '#1e293b' }}>{l.flag} {l.name}</option>)}</select></div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '24px' }}><button onClick={handleLogout} style={{ padding: '12px 24px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', color: '#f87171', fontWeight: 500, cursor: 'pointer' }}>{t.logout}</button></div>
            </div>
          </div>
        )}
      </div>

      {showSubmitFlow && <SubmitFlow onClose={() => { setShowSubmitFlow(false); fetchTaxData(); }} userId={getUserId()} token={getToken()} taxData={taxData} userData={userData} />}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap'); * { font-family: 'Plus Jakarta Sans', sans-serif; box-sizing: border-box; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}