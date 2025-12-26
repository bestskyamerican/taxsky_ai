// ============================================================
// USER DASHBOARD - MULTI-LANGUAGE VERSION
// ============================================================
// Supports: English (en), Vietnamese (vi), Spanish (es)
// Language selector in header + Settings tab
// ============================================================

import React, { useState, useEffect } from "react";
import SubmitFlow from "./SubmitFlow";

const API_BASE = "http://localhost:3000";

// ============================================================
// TRANSLATIONS
// ============================================================
const translations = {
  en: {
    taxChat: "💬 Tax Chat",
    dashboard: "📊 Dashboard",
    taxYear: "Tax Year",
    logout: "🚪 Logout",
    tabs: { overview: "Overview", documents: "Documents", downloads: "Downloads", history: "Tax History", settings: "Settings" },
    filingProgress: "Filing Progress",
    complete: "complete",
    estimatedRefund: "💰 Estimated Total Refund",
    estimatedOwed: "💸 Estimated Amount Owed",
    federal: "🇺🇸 Federal",
    california: "🌴 California",
    fileNow: "📋 File Now",
    totalIncome: "Total Income",
    totalTax: "Total Tax",
    withheld: "Withheld",
    dependents: "Dependents",
    federalBreakdown: "🇺🇸 Federal Tax Breakdown",
    caBreakdown: "🌴 California Tax Breakdown",
    w2Wages: "W-2 Wages",
    selfEmployment: "Self-Employment (1099)",
    standardDeduction: "Standard Deduction",
    taxableIncome: "Taxable Income",
    federalTax: "Federal Tax",
    childTaxCredit: "Child Tax Credit",
    netRefund: "Net Refund",
    netOwed: "Net Owed",
    caAgi: "CA AGI",
    caDeduction: "CA Standard Deduction",
    caTaxable: "CA Taxable Income",
    caTax: "CA Tax",
    calEitc: "CalEITC",
    youngChildCredit: "Young Child Tax Credit",
    caWithheld: "CA Withheld",
    personalInfo: "👤 Personal Information",
    name: "Name",
    ssn: "SSN",
    address: "Address",
    filingStatus: "Filing Status",
    uploadedDocs: "📄 Uploaded Documents",
    noDocs: "No documents uploaded yet",
    uploadInChat: "Upload in Tax Chat",
    processed: "✓ Processed",
    downloadForms: "📥 Download Tax Forms",
    form1040: "Form 1040",
    form1040Desc: "U.S. Individual Income Tax Return",
    downloadPdf: "Download PDF",
    ca540: "CA Form 540",
    ca540Desc: "California Resident Income Tax Return",
    comingSoon: "Coming Soon",
    taxHistory: "📜 Tax History",
    filed: "Filed on",
    inProgress: "In Progress",
    notStarted: "Not Started",
    refund: "Refund",
    owed: "Owed",
    fed: "Fed",
    state: "State",
    settingsTitle: "⚙️ Settings",
    language: "Language",
    languageDesc: "Select your preferred language",
    notifications: "Email Notifications",
    notificationsDesc: "Receive updates about your tax return",
    autoSave: "Auto-Save",
    autoSaveDesc: "Automatically save your progress",
    filingStatuses: { single: "Single", married_filing_jointly: "Married Filing Jointly", married_filing_separately: "Married Filing Separately", head_of_household: "Head of Household" },
    notSelected: "Not selected",
    loading: "Loading...",
  },
  vi: {
    taxChat: "💬 Chat Thuế",
    dashboard: "📊 Bảng Điều Khiển",
    taxYear: "Năm Thuế",
    logout: "🚪 Đăng Xuất",
    tabs: { overview: "Tổng Quan", documents: "Tài Liệu", downloads: "Tải Xuống", history: "Lịch Sử", settings: "Cài Đặt" },
    filingProgress: "Tiến Độ Khai Thuế",
    complete: "hoàn thành",
    estimatedRefund: "💰 Ước Tính Hoàn Thuế",
    estimatedOwed: "💸 Ước Tính Số Tiền Nợ",
    federal: "🇺🇸 Liên Bang",
    california: "🌴 California",
    fileNow: "📋 Nộp Ngay",
    totalIncome: "Tổng Thu Nhập",
    totalTax: "Tổng Thuế",
    withheld: "Đã Khấu Trừ",
    dependents: "Người Phụ Thuộc",
    federalBreakdown: "🇺🇸 Chi Tiết Thuế Liên Bang",
    caBreakdown: "🌴 Chi Tiết Thuế California",
    w2Wages: "Lương W-2",
    selfEmployment: "Tự Kinh Doanh (1099)",
    standardDeduction: "Khấu Trừ Tiêu Chuẩn",
    taxableIncome: "Thu Nhập Chịu Thuế",
    federalTax: "Thuế Liên Bang",
    childTaxCredit: "Tín Dụng Trẻ Em",
    netRefund: "Hoàn Thuế",
    netOwed: "Nợ Thuế",
    caAgi: "CA AGI",
    caDeduction: "Khấu Trừ CA",
    caTaxable: "Thu Nhập Chịu Thuế CA",
    caTax: "Thuế CA",
    calEitc: "CalEITC",
    youngChildCredit: "Tín Dụng Trẻ Nhỏ",
    caWithheld: "Đã Khấu Trừ CA",
    personalInfo: "👤 Thông Tin Cá Nhân",
    name: "Họ Tên",
    ssn: "Số An Sinh",
    address: "Địa Chỉ",
    filingStatus: "Tình Trạng",
    uploadedDocs: "📄 Tài Liệu Đã Tải",
    noDocs: "Chưa có tài liệu nào",
    uploadInChat: "Tải lên trong Chat",
    processed: "✓ Đã xử lý",
    downloadForms: "📥 Tải Biểu Mẫu Thuế",
    form1040: "Mẫu 1040",
    form1040Desc: "Tờ Khai Thuế Thu Nhập Cá Nhân Hoa Kỳ",
    downloadPdf: "Tải PDF",
    ca540: "Mẫu CA 540",
    ca540Desc: "Tờ Khai Thuế Cư Dân California",
    comingSoon: "Sắp Ra Mắt",
    taxHistory: "📜 Lịch Sử Thuế",
    filed: "Đã nộp ngày",
    inProgress: "Đang Xử Lý",
    notStarted: "Chưa Bắt Đầu",
    refund: "Hoàn thuế",
    owed: "Nợ thuế",
    fed: "Liên bang",
    state: "Tiểu bang",
    settingsTitle: "⚙️ Cài Đặt",
    language: "Ngôn Ngữ",
    languageDesc: "Chọn ngôn ngữ của bạn",
    notifications: "Thông Báo Email",
    notificationsDesc: "Nhận cập nhật về tờ khai thuế",
    autoSave: "Tự Động Lưu",
    autoSaveDesc: "Tự động lưu tiến trình",
    filingStatuses: { single: "Độc Thân", married_filing_jointly: "Vợ Chồng Khai Chung", married_filing_separately: "Vợ Chồng Khai Riêng", head_of_household: "Chủ Hộ" },
    notSelected: "Chưa chọn",
    loading: "Đang tải...",
  },
  es: {
    taxChat: "💬 Chat de Impuestos",
    dashboard: "📊 Panel",
    taxYear: "Año Fiscal",
    logout: "🚪 Cerrar Sesión",
    tabs: { overview: "Resumen", documents: "Documentos", downloads: "Descargas", history: "Historial", settings: "Configuración" },
    filingProgress: "Progreso de Declaración",
    complete: "completo",
    estimatedRefund: "💰 Reembolso Estimado",
    estimatedOwed: "💸 Cantidad Estimada a Deber",
    federal: "🇺🇸 Federal",
    california: "🌴 California",
    fileNow: "📋 Presentar Ahora",
    totalIncome: "Ingreso Total",
    totalTax: "Impuesto Total",
    withheld: "Retenido",
    dependents: "Dependientes",
    federalBreakdown: "🇺🇸 Desglose Federal",
    caBreakdown: "🌴 Desglose California",
    w2Wages: "Salarios W-2",
    selfEmployment: "Independiente (1099)",
    standardDeduction: "Deducción Estándar",
    taxableIncome: "Ingreso Gravable",
    federalTax: "Impuesto Federal",
    childTaxCredit: "Crédito por Hijos",
    netRefund: "Reembolso Neto",
    netOwed: "Deuda Neta",
    caAgi: "AGI de CA",
    caDeduction: "Deducción CA",
    caTaxable: "Ingreso Gravable CA",
    caTax: "Impuesto CA",
    calEitc: "CalEITC",
    youngChildCredit: "Crédito Niño Pequeño",
    caWithheld: "Retenido CA",
    personalInfo: "👤 Información Personal",
    name: "Nombre",
    ssn: "Seguro Social",
    address: "Dirección",
    filingStatus: "Estado Civil",
    uploadedDocs: "📄 Documentos Subidos",
    noDocs: "No hay documentos subidos",
    uploadInChat: "Subir en Chat",
    processed: "✓ Procesado",
    downloadForms: "📥 Descargar Formularios",
    form1040: "Formulario 1040",
    form1040Desc: "Declaración de Impuestos de EE.UU.",
    downloadPdf: "Descargar PDF",
    ca540: "Formulario CA 540",
    ca540Desc: "Declaración de California",
    comingSoon: "Próximamente",
    taxHistory: "📜 Historial de Impuestos",
    filed: "Presentado el",
    inProgress: "En Progreso",
    notStarted: "No Iniciado",
    refund: "Reembolso",
    owed: "Adeudado",
    fed: "Fed",
    state: "Estado",
    settingsTitle: "⚙️ Configuración",
    language: "Idioma",
    languageDesc: "Selecciona tu idioma",
    notifications: "Notificaciones",
    notificationsDesc: "Recibir actualizaciones",
    autoSave: "Guardado Automático",
    autoSaveDesc: "Guardar automáticamente",
    filingStatuses: { single: "Soltero/a", married_filing_jointly: "Casado/a Juntos", married_filing_separately: "Casado/a Separado", head_of_household: "Jefe/a de Familia" },
    notSelected: "No seleccionado",
    loading: "Cargando...",
  },
};

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'es', name: 'Español', flag: '🇲🇽' },
];

// ============================================================
// COMPONENT
// ============================================================
export default function UserDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [taxData, setTaxData] = useState(null);
  const [userData, setUserData] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [selectedYear, setSelectedYear] = useState("2024");
  const [showSubmitFlow, setShowSubmitFlow] = useState(false);
  const [settings, setSettings] = useState({ language: "en", notifications: true, darkMode: false, autoSave: true });
  const [taxHistory, setTaxHistory] = useState([]);
  const [lang, setLang] = useState(() => localStorage.getItem("taxsky_language") || "en");
  
  const t = translations[lang] || translations.en;

  const changeLang = (newLang) => {
    setLang(newLang);
    localStorage.setItem("taxsky_language", newLang);
    setSettings(prev => ({ ...prev, language: newLang }));
  };

  const getUser = () => { try { return JSON.parse(localStorage.getItem("taxsky_user") || "{}"); } catch { return {}; } };
  const getToken = () => localStorage.getItem("taxsky_token");
  const getUserId = () => getUser().id || localStorage.getItem("taxsky_userId");

  useEffect(() => {
    const currentUser = getUser();
    setUser(currentUser);
    const savedLang = localStorage.getItem("taxsky_language");
    if (savedLang) setLang(savedLang);
    fetchTaxData();
    fetchDocuments();
    fetchTaxHistory();
  }, [selectedYear]);

  const fetchTaxData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/ai/data`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` },
        body: JSON.stringify({ userId: getUserId(), taxYear: selectedYear })
      });
      const result = await res.json();
      if (result.success) { setTaxData(result.tax); setUserData(result.data); }
    } catch (err) { console.error("Error:", err); }
    finally { setLoading(false); }
  };

  const fetchDocuments = async () => { setDocuments([]); };

  const fetchTaxHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/ai/data`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` },
        body: JSON.stringify({ userId: getUserId() })
      });
      const result = await res.json();
      if (result.success && result.tax) {
        const fedNet = (result.tax?.federalRefund || 0) - (result.tax?.federalOwed || 0);
        const stateNet = (result.tax?.stateRefund || 0) - (result.tax?.stateOwed || 0);
        setTaxHistory([{ year: "2024", status: "in_progress", federalRefund: fedNet, stateRefund: stateNet, filed: null }]);
      } else {
        setTaxHistory([{ year: "2024", status: "not_started", federalRefund: 0, stateRefund: 0, filed: null }]);
      }
    } catch (err) { setTaxHistory([]); }
  };

  const fmt = (num) => (!num && num !== 0) ? "$0" : "$" + Math.abs(Math.round(num)).toLocaleString();
  const getFederalNet = () => (taxData?.federalRefund || 0) - (taxData?.federalOwed || 0);
  const getStateNet = () => (taxData?.stateRefund || 0) - (taxData?.stateOwed || 0);
  const getTotalNet = () => getFederalNet() + getStateNet();
  const formatFilingStatus = (status) => t.filingStatuses?.[status] || status || t.notSelected;
  const getProgressPercentage = () => {
    if (!userData) return 0;
    const fields = ['first_name', 'last_name', 'ssn', 'address', 'city', 'state', 'zip', 'filing_status', 'total_wages', 'total_withheld'];
    return Math.round((fields.filter(f => userData[f]).length / fields.length) * 100);
  };

  const handleLogout = () => { localStorage.removeItem("taxsky_token"); localStorage.removeItem("taxsky_user"); window.location.href = "/"; };
  const saveSettings = (newSettings) => { setSettings(newSettings); localStorage.setItem("taxsky_settings", JSON.stringify(newSettings)); if (newSettings.language) changeLang(newSettings.language); };

  const handleDownload1040 = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/tax/1040`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` },
        body: JSON.stringify({ userId: getUserId(), taxYear: parseInt(selectedYear) }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = `Form_1040_${selectedYear}.pdf`; a.click();
        window.URL.revokeObjectURL(url);
      } else { alert((await res.json()).message || "Error"); }
    } catch (err) { alert("Error: " + err.message); }
  };

  const tabs = [
    { id: "overview", label: t.tabs.overview, icon: "📊" },
    { id: "documents", label: t.tabs.documents, icon: "📄" },
    { id: "downloads", label: t.tabs.downloads, icon: "📥" },
    { id: "history", label: t.tabs.history, icon: "📜" },
    { id: "settings", label: t.tabs.settings, icon: "⚙️" },
  ];

  const goToTaxChat = () => { window.location.href = "/taxchat"; };

  const totalNet = getTotalNet();
  const federalNet = getFederalNet();
  const stateNet = getStateNet();
  const isRefund = totalNet >= 0;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🌟</span>
              <span className="text-xl font-bold text-blue-600">TaxSky</span>
            </div>
            <div className="hidden md:flex items-center gap-1">
              <button onClick={goToTaxChat} className="px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition">{t.taxChat}</button>
              <span className="px-4 py-2 text-blue-600 bg-blue-50 rounded-lg font-medium">{t.dashboard}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <select value={lang} onChange={(e) => changeLang(e.target.value)} className="border rounded-lg px-3 py-2 text-sm font-medium">
              {languages.map((l) => <option key={l.code} value={l.code}>{l.flag} {l.name}</option>)}
            </select>
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="border rounded-lg px-3 py-2 text-sm font-medium">
              <option value="2024">{t.taxYear} 2024</option>
              <option value="2023">{t.taxYear} 2023</option>
              <option value="2022">{t.taxYear} 2022</option>
            </select>
            <div className="flex items-center gap-3">
              {user?.picture ? <img src={user.picture} alt="" className="w-10 h-10 rounded-full" /> : <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">{user?.name?.charAt(0) || "U"}</div>}
              <div className="hidden md:block">
                <p className="font-medium text-sm">{user?.name || "User"}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <button onClick={handleLogout} className="ml-2 text-gray-400 hover:text-red-500 transition" title={t.logout}>🚪</button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-md p-4">
              <div className="space-y-2">
                {tabs.map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === tab.id ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                    <span>{tab.icon}</span><span>{tab.label}</span>
                  </button>
                ))}
              </div>
              <div className="mt-6 p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl">
                <p className="text-sm font-medium text-gray-700">{t.filingProgress}</p>
                <div className="mt-2 bg-white rounded-full h-3 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-500" style={{ width: `${getProgressPercentage()}%` }} />
                </div>
                <p className="text-xs text-gray-500 mt-2">{getProgressPercentage()}% {t.complete}</p>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {loading ? (
              <div className="bg-white rounded-xl shadow-md p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 mt-4">{t.loading}</p>
              </div>
            ) : (
              <>
                {/* Overview Tab */}
                {activeTab === "overview" && (
                  <div className="space-y-6">
                    <div className={`rounded-2xl p-8 text-white shadow-lg ${isRefund ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-red-500 to-orange-500'}`}>
                      <p className="text-lg opacity-90">{isRefund ? t.estimatedRefund : t.estimatedOwed}</p>
                      <p className="text-5xl font-bold mt-2">{fmt(totalNet)}</p>
                      <div className="flex justify-between items-end mt-6">
                        <div className="flex gap-8">
                          <div><p className="opacity-75 text-sm">{t.federal}</p><p className="text-2xl font-semibold">{federalNet >= 0 ? '' : '-'}{fmt(federalNet)}</p></div>
                          <div className="border-l border-white/30 pl-8"><p className="opacity-75 text-sm">{t.california}</p><p className="text-2xl font-semibold">{stateNet >= 0 ? '' : '-'}{fmt(stateNet)}</p></div>
                        </div>
                        <button onClick={() => setShowSubmitFlow(true)} className={`px-6 py-3 rounded-xl font-bold shadow-lg transition ${isRefund ? 'bg-white text-green-600 hover:bg-green-50' : 'bg-white text-red-600 hover:bg-red-50'}`}>{t.fileNow}</button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white rounded-xl shadow-md p-4"><p className="text-gray-500 text-sm">{t.totalIncome}</p><p className="text-2xl font-bold text-gray-800">{fmt(taxData?.totalIncome)}</p></div>
                      <div className="bg-white rounded-xl shadow-md p-4"><p className="text-gray-500 text-sm">{t.totalTax}</p><p className="text-2xl font-bold text-gray-800">{fmt(taxData?.totalTaxOwed)}</p></div>
                      <div className="bg-white rounded-xl shadow-md p-4"><p className="text-gray-500 text-sm">{t.withheld}</p><p className="text-2xl font-bold text-green-600">{fmt(taxData?.withholding)}</p></div>
                      <div className="bg-white rounded-xl shadow-md p-4"><p className="text-gray-500 text-sm">{t.dependents}</p><p className="text-2xl font-bold text-gray-800">{userData?.dependent_count || 0}</p></div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="bg-white rounded-xl shadow-md overflow-hidden">
                        <div className="bg-blue-600 text-white px-6 py-3 font-semibold">{t.federalBreakdown}</div>
                        <div className="p-6 space-y-3">
                          <div className="flex justify-between"><span>{t.w2Wages}</span><span className="font-medium">{fmt(taxData?.totalIncome)}</span></div>
                          <div className="flex justify-between"><span>{t.selfEmployment}</span><span className="font-medium">$0</span></div>
                          <div className="flex justify-between text-green-600"><span>{t.standardDeduction}</span><span>-{fmt(taxData?.standardDeduction)}</span></div>
                          <hr />
                          <div className="flex justify-between"><span>{t.taxableIncome}</span><span className="font-medium">{fmt(taxData?.taxableIncome)}</span></div>
                          <div className="flex justify-between"><span>{t.federalTax}</span><span className="font-medium">{fmt(taxData?.federalTax)}</span></div>
                          <div className="flex justify-between text-green-600"><span>{t.withheld}</span><span>-{fmt(taxData?.withholding)}</span></div>
                          {taxData?.childTaxCredit > 0 && <div className="flex justify-between text-green-600"><span>{t.childTaxCredit}</span><span>-{fmt(taxData?.childTaxCredit)}</span></div>}
                          <hr />
                          <div className={`flex justify-between font-bold text-lg ${federalNet >= 0 ? 'text-green-600' : 'text-red-600'}`}><span>{federalNet >= 0 ? t.netRefund : t.netOwed}</span><span>{fmt(federalNet)}</span></div>
                        </div>
                      </div>
                      <div className="bg-white rounded-xl shadow-md overflow-hidden">
                        <div className="bg-amber-500 text-white px-6 py-3 font-semibold">{t.caBreakdown}</div>
                        <div className="p-6 space-y-3">
                          <div className="flex justify-between"><span>{t.caAgi}</span><span className="font-medium">{fmt(taxData?.caAgi)}</span></div>
                          <div className="flex justify-between text-green-600"><span>{t.caDeduction}</span><span>-{fmt(taxData?.caStdDeduction)}</span></div>
                          <div className="flex justify-between"><span>{t.caTaxable}</span><span className="font-medium">{fmt(taxData?.caTaxableIncome)}</span></div>
                          <hr />
                          <div className="flex justify-between"><span>{t.caTax}</span><span className="font-medium">{fmt(taxData?.caTax)}</span></div>
                          <div className="flex justify-between text-green-600"><span>{t.calEitc}</span><span>-{fmt(taxData?.calEitc)}</span></div>
                          <div className="flex justify-between text-green-600"><span>{t.youngChildCredit}</span><span>-{fmt(taxData?.yctc)}</span></div>
                          <div className="flex justify-between text-green-600"><span>{t.caWithheld}</span><span>-{fmt(taxData?.caWithholding)}</span></div>
                          <hr />
                          <div className={`flex justify-between font-bold text-lg ${stateNet >= 0 ? 'text-green-600' : 'text-red-600'}`}><span>{stateNet >= 0 ? t.netRefund : t.netOwed}</span><span>{stateNet >= 0 ? '' : '-'}{fmt(stateNet)}</span></div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-md p-6">
                      <h2 className="text-xl font-semibold mb-4">{t.personalInfo}</h2>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div><span className="text-gray-500">{t.name}:</span> <span className="font-medium">{userData?.first_name} {userData?.last_name}</span></div>
                        <div><span className="text-gray-500">{t.ssn}:</span> <span className="font-medium">***-**-{String(userData?.ssn || '').slice(-4)}</span></div>
                        <div><span className="text-gray-500">{t.address}:</span> <span className="font-medium">{userData?.address}, {userData?.city}, {userData?.state} {userData?.zip}</span></div>
                        <div><span className="text-gray-500">{t.filingStatus}:</span> <span className="font-medium">{formatFilingStatus(userData?.filing_status)}</span></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Documents Tab */}
                {activeTab === "documents" && (
                  <div className="bg-white rounded-xl shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4">{t.uploadedDocs}</h2>
                    {documents.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-6xl mb-4">📁</p>
                        <p className="text-gray-500">{t.noDocs}</p>
                        <button onClick={goToTaxChat} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t.uploadInChat}</button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {documents.map((doc, i) => (
                          <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3"><span className="text-2xl">📄</span><div><p className="font-medium">{doc.name}</p><p className="text-sm text-gray-500">{doc.type}</p></div></div>
                            <span className="text-green-500">{t.processed}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Downloads Tab */}
                {activeTab === "downloads" && (
                  <div className="bg-white rounded-xl shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4">{t.downloadForms}</h2>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3"><span className="text-3xl">📋</span><div><p className="font-semibold">{t.form1040}</p><p className="text-sm text-gray-500">{t.form1040Desc}</p></div></div>
                        <button onClick={handleDownload1040} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t.downloadPdf}</button>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg opacity-50">
                        <div className="flex items-center gap-3"><span className="text-3xl">📋</span><div><p className="font-semibold">{t.ca540}</p><p className="text-sm text-gray-500">{t.ca540Desc}</p></div></div>
                        <span className="px-4 py-2 bg-gray-300 text-gray-600 rounded-lg">{t.comingSoon}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* History Tab */}
                {activeTab === "history" && (
                  <div className="bg-white rounded-xl shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4">{t.taxHistory}</h2>
                    <div className="space-y-4">
                      {taxHistory.map((year, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-4">
                            <span className="text-2xl">📅</span>
                            <div><p className="font-semibold">{t.taxYear} {year.year}</p><p className="text-sm text-gray-500">{year.status === 'filed' ? `${t.filed} ${year.filed}` : year.status === 'in_progress' ? t.inProgress : t.notStarted}</p></div>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${(year.federalRefund + year.stateRefund) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{(year.federalRefund + year.stateRefund) >= 0 ? t.refund : t.owed}: {fmt(year.federalRefund + year.stateRefund)}</p>
                            <p className="text-sm text-gray-500">{t.fed}: {fmt(year.federalRefund)} | {t.state}: {fmt(year.stateRefund)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Settings Tab */}
                {activeTab === "settings" && (
                  <div className="bg-white rounded-xl shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-6">{t.settingsTitle}</h2>
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div><p className="font-medium">{t.language}</p><p className="text-sm text-gray-500">{t.languageDesc}</p></div>
                        <select value={lang} onChange={(e) => changeLang(e.target.value)} className="border rounded-lg px-4 py-2">
                          {languages.map((l) => <option key={l.code} value={l.code}>{l.flag} {l.name}</option>)}
                        </select>
                      </div>
                      <div className="flex items-center justify-between">
                        <div><p className="font-medium">{t.notifications}</p><p className="text-sm text-gray-500">{t.notificationsDesc}</p></div>
                        <button onClick={() => saveSettings({ ...settings, notifications: !settings.notifications })} className={`w-12 h-6 rounded-full transition ${settings.notifications ? 'bg-blue-600' : 'bg-gray-300'}`}>
                          <div className={`w-5 h-5 rounded-full bg-white shadow transform transition ${settings.notifications ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div><p className="font-medium">{t.autoSave}</p><p className="text-sm text-gray-500">{t.autoSaveDesc}</p></div>
                        <button onClick={() => saveSettings({ ...settings, autoSave: !settings.autoSave })} className={`w-12 h-6 rounded-full transition ${settings.autoSave ? 'bg-blue-600' : 'bg-gray-300'}`}>
                          <div className={`w-5 h-5 rounded-full bg-white shadow transform transition ${settings.autoSave ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>
                      <div className="border-t pt-6"><button onClick={handleLogout} className="px-6 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition">{t.logout}</button></div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {showSubmitFlow && <SubmitFlow onClose={() => setShowSubmitFlow(false)} taxData={taxData} userData={userData} />}
    </div>
  );
}