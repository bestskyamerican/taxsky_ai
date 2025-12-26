// ============================================================
// TAXSKY - SMART AI CHAT INTERFACE - MULTI-LANGUAGE
// ============================================================
// Supports: English (en), Vietnamese (vi), Spanish (es)
// Sends language to backend for AI responses
// ============================================================

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

const API_BASE = "http://localhost:3000";

const api = axios.create({ baseURL: API_BASE });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("taxsky_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ============================================================
// TRANSLATIONS
// ============================================================
const translations = {
  en: {
    title: "TaxSky AI",
    taxYear: "Tax Year",
    dashboard: "Dashboard",
    showData: "Show Data",
    hideData: "Hide Data",
    placeholder: "Ask me anything about your taxes...",
    send: "Send",
    uploading: "Uploading",
    downloadForm: "📄 Download 1040",
    startOver: "🔄 Start Over",
    yourTaxData: "📊 Your Tax Data",
    name: "Name",
    filingStatus: "Filing Status",
    address: "Address",
    dependents: "Dependents",
    none: "None",
    notProvided: "Not provided",
    notSelected: "Not selected",
    w2Wages: "W-2 Wages",
    federalWithheld: "Federal Withheld",
    estimatedRefund: "Estimated Refund",
    amountOwed: "Amount Owed",
    refresh: "🔄 Refresh",
    loading: "Loading...",
    error: "❌ Sorry, there was an error. Please try again.",
    welcome: "👋 Hello! I'm TaxSky AI. How can I help you with your taxes today?",
    quickActions: {
      uploadW2: "📄 Upload W-2",
      filingStatus: "👤 Filing Status",
      addDependent: "👶 Add Dependent",
      checkRefund: "💰 Check Refund"
    },
    filingStatuses: {
      single: "Single",
      married_filing_jointly: "Married Filing Jointly",
      married_filing_separately: "Married Filing Separately",
      head_of_household: "Head of Household"
    }
  },
  vi: {
    title: "TaxSky AI",
    taxYear: "Năm Thuế",
    dashboard: "Bảng Điều Khiển",
    showData: "Xem Dữ Liệu",
    hideData: "Ẩn Dữ Liệu",
    placeholder: "Hỏi tôi bất cứ điều gì về thuế của bạn...",
    send: "Gửi",
    uploading: "Đang tải",
    downloadForm: "📄 Tải Mẫu 1040",
    startOver: "🔄 Làm Lại",
    yourTaxData: "📊 Dữ Liệu Thuế",
    name: "Họ Tên",
    filingStatus: "Tình Trạng",
    address: "Địa Chỉ",
    dependents: "Người Phụ Thuộc",
    none: "Không có",
    notProvided: "Chưa có",
    notSelected: "Chưa chọn",
    w2Wages: "Lương W-2",
    federalWithheld: "Thuế LB Đã Khấu Trừ",
    estimatedRefund: "Hoàn Thuế Ước Tính",
    amountOwed: "Số Tiền Nợ",
    refresh: "🔄 Làm Mới",
    loading: "Đang tải...",
    error: "❌ Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.",
    welcome: "👋 Xin chào! Tôi là TaxSky AI. Tôi có thể giúp gì cho bạn về thuế?",
    quickActions: {
      uploadW2: "📄 Tải W-2",
      filingStatus: "👤 Tình Trạng",
      addDependent: "👶 Thêm Người Phụ Thuộc",
      checkRefund: "💰 Kiểm Tra Hoàn Thuế"
    },
    filingStatuses: {
      single: "Độc Thân",
      married_filing_jointly: "Vợ Chồng Khai Chung",
      married_filing_separately: "Vợ Chồng Khai Riêng",
      head_of_household: "Chủ Hộ"
    }
  },
  es: {
    title: "TaxSky AI",
    taxYear: "Año Fiscal",
    dashboard: "Panel",
    showData: "Ver Datos",
    hideData: "Ocultar Datos",
    placeholder: "Pregúntame cualquier cosa sobre tus impuestos...",
    send: "Enviar",
    uploading: "Subiendo",
    downloadForm: "📄 Descargar 1040",
    startOver: "🔄 Empezar de Nuevo",
    yourTaxData: "📊 Tus Datos Fiscales",
    name: "Nombre",
    filingStatus: "Estado Civil",
    address: "Dirección",
    dependents: "Dependientes",
    none: "Ninguno",
    notProvided: "No proporcionado",
    notSelected: "No seleccionado",
    w2Wages: "Salarios W-2",
    federalWithheld: "Impuesto Fed Retenido",
    estimatedRefund: "Reembolso Estimado",
    amountOwed: "Cantidad Adeudada",
    refresh: "🔄 Actualizar",
    loading: "Cargando...",
    error: "❌ Lo siento, ocurrió un error. Por favor intenta de nuevo.",
    welcome: "👋 ¡Hola! Soy TaxSky AI. ¿Cómo puedo ayudarte con tus impuestos?",
    quickActions: {
      uploadW2: "📄 Subir W-2",
      filingStatus: "👤 Estado Civil",
      addDependent: "👶 Agregar Dependiente",
      checkRefund: "💰 Ver Reembolso"
    },
    filingStatuses: {
      single: "Soltero/a",
      married_filing_jointly: "Casado/a Juntos",
      married_filing_separately: "Casado/a Separado",
      head_of_household: "Jefe/a de Familia"
    }
  }
};

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'es', name: 'Español', flag: '🇲🇽' },
];

// ============================================================
// COMPONENT
// ============================================================
export default function ChatInterface({ currentUser, showHeader = true, onNavigate }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [refundAmount, setRefundAmount] = useState(0);
  const [animatedRefund, setAnimatedRefund] = useState(0);
  const [taxYear, setTaxYear] = useState("2024");
  const [showDataPanel, setShowDataPanel] = useState(false);
  const [serverData, setServerData] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Language state
  const [lang, setLang] = useState(() => localStorage.getItem("taxsky_language") || "en");
  const t = translations[lang] || translations.en;

  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);
  
  const navigate = onNavigate || ((path) => { window.location.href = path; });
  const userId = currentUser?.id || localStorage.getItem("taxsky_userId");

  // Change language handler
  const changeLang = (newLang) => {
    setLang(newLang);
    localStorage.setItem("taxsky_language", newLang);
    // Reload welcome message in new language
    loadWelcomeMessage(newLang);
  };

  const calculateNetFromTax = (tax) => {
    if (!tax) return 0;
    const fedNet = (tax.federalRefund || 0) - (tax.federalOwed || 0);
    const stateNet = (tax.stateRefund || 0) - (tax.stateOwed || 0);
    return fedNet + stateNet;
  };

  useEffect(() => {
    loadWelcomeMessage(lang);
  }, []);

  const loadWelcomeMessage = async (language = lang) => {
    try {
      const res = await api.post("/api/ai/welcome", {
        userId,
        userName: currentUser?.firstName || currentUser?.name?.split(" ")[0],
        taxYear: parseInt(taxYear),
        language: language  // <-- Send language to backend
      });

      if (res.data.message) {
        setMessages([{ sender: "ai", text: formatMessage(res.data.message) }]);
      }
      if (res.data.tax) {
        setRefundAmount(calculateNetFromTax(res.data.tax));
      } else if (res.data.refund !== undefined) {
        setRefundAmount(res.data.refund);
      }
    } catch (err) {
      console.error("Welcome error:", err);
      setMessages([{ sender: "ai", text: t.welcome }]);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  const fetchServerData = async () => {
    try {
      const res = await api.post("/api/ai/data", { userId });
      if (res.data.success) {
        setServerData(res.data.data);
        if (res.data.tax) {
          setRefundAmount(calculateNetFromTax(res.data.tax));
        }
      }
    } catch (err) {
      console.log("Fetch data error:", err.message);
    }
  };

  useEffect(() => {
    if (showDataPanel) fetchServerData();
  }, [showDataPanel]);

  const sendMessage = async (customMessage = null) => {
    const userMsg = customMessage || input;
    if (!userMsg.trim() || isLoading) return;

    setInput("");
    setMessages((prev) => [...prev, { sender: "user", text: userMsg }]);
    setIsLoading(true);

    try {
      const res = await api.post("/api/ai/chat", {
        userId,
        message: userMsg,
        taxYear: parseInt(taxYear),
        language: lang  // <-- Send language to backend
      });

      const aiReply = res.data.reply || res.data.message || "I'm here to help!";
      setMessages((prev) => [...prev, { sender: "ai", text: formatMessage(aiReply) }]);

      if (res.data.tax) {
        setRefundAmount(calculateNetFromTax(res.data.tax));
      } else if (res.data.refund !== undefined) {
        setRefundAmount(res.data.refund);
      }

      if (showDataPanel) fetchServerData();
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [...prev, { sender: "ai", text: t.error }]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatMessage = (text) => {
    return text
      .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
      .replace(/\*(.+?)\*/g, "<i>$1</i>")
      .replace(/\n/g, "<br/>");
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setMessages((prev) => [...prev, { sender: "user", text: `📤 ${t.uploading}: ${file.name}...` }]);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", userId);
      formData.append("taxYear", taxYear);
      formData.append("language", lang);

      const res = await api.post("/api/forms/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        const extracted = res.data.extractedFields || {};
        const formType = res.data.formType || "Document";

        // Labels based on language
        const labels = {
          en: { 
            uploaded: 'Uploaded Successfully!',
            employee: '👤 EMPLOYEE INFO',
            name: 'Name', ssn: 'SSN', address: 'Address',
            employer: '🏢 EMPLOYER INFO',
            empName: 'Company', empEin: 'EIN', empAddress: 'Address',
            income: '💰 INCOME & TAXES',
            wages: 'Wages (Box 1)', 
            fedWith: 'Federal Withheld (Box 2)',
            ssWages: 'Social Security Wages (Box 3)',
            ssTax: 'Social Security Tax (Box 4)',
            medWages: 'Medicare Wages (Box 5)',
            medTax: 'Medicare Tax (Box 6)',
            state: '🏛️ STATE',
            stateCode: 'State',
            stateWages: 'State Wages (Box 16)',
            stateWith: 'State Tax Withheld (Box 17)',
            confirm: '✅ Is this information correct?'
          },
          vi: { 
            uploaded: 'Đã Tải Lên Thành Công!',
            employee: '👤 THÔNG TIN NHÂN VIÊN',
            name: 'Họ tên', ssn: 'Số An Sinh', address: 'Địa chỉ',
            employer: '🏢 THÔNG TIN CÔNG TY',
            empName: 'Công ty', empEin: 'EIN', empAddress: 'Địa chỉ',
            income: '💰 THU NHẬP & THUẾ',
            wages: 'Lương (Box 1)', 
            fedWith: 'Thuế LB khấu trừ (Box 2)',
            ssWages: 'Lương An Sinh XH (Box 3)',
            ssTax: 'Thuế An Sinh XH (Box 4)',
            medWages: 'Lương Medicare (Box 5)',
            medTax: 'Thuế Medicare (Box 6)',
            state: '🏛️ TIỂU BANG',
            stateCode: 'Tiểu bang',
            stateWages: 'Lương TB (Box 16)',
            stateWith: 'Thuế TB khấu trừ (Box 17)',
            confirm: '✅ Thông tin này đúng không?'
          },
          es: { 
            uploaded: '¡Subido Exitosamente!',
            employee: '👤 INFO DEL EMPLEADO',
            name: 'Nombre', ssn: 'Seguro Social', address: 'Dirección',
            employer: '🏢 INFO DEL EMPLEADOR',
            empName: 'Empresa', empEin: 'EIN', empAddress: 'Dirección',
            income: '💰 INGRESOS E IMPUESTOS',
            wages: 'Salarios (Box 1)', 
            fedWith: 'Imp. Fed. Retenido (Box 2)',
            ssWages: 'Salarios Seg. Social (Box 3)',
            ssTax: 'Imp. Seg. Social (Box 4)',
            medWages: 'Salarios Medicare (Box 5)',
            medTax: 'Imp. Medicare (Box 6)',
            state: '🏛️ ESTADO',
            stateCode: 'Estado',
            stateWages: 'Salarios Est. (Box 16)',
            stateWith: 'Imp. Est. Retenido (Box 17)',
            confirm: '✅ ¿Es correcta esta información?'
          }
        };
        const lbl = labels[lang] || labels.en;

        // Build comprehensive confirmation message
        let confirmMsg = `✅ <b>${formType} ${lbl.uploaded}</b>\n\n`;
        
        // ===== EMPLOYEE INFO =====
        confirmMsg += `<b>${lbl.employee}</b>\n`;
        
        // Name
        const empName = extracted.employee_name || 
          `${extracted.employee_first_name || ''} ${extracted.employee_last_name || ''}`.trim();
        if (empName) {
          confirmMsg += `• ${lbl.name}: <b>${empName}</b>\n`;
        }
        
        // SSN (masked)
        if (extracted.employee_ssn) {
          const ssn = String(extracted.employee_ssn).replace(/-/g, '');
          confirmMsg += `• ${lbl.ssn}: <b>***-**-${ssn.slice(-4)}</b>\n`;
        }
        
        // Address
        const empAddr = [
          extracted.employee_address,
          extracted.employee_city,
          extracted.employee_state,
          extracted.employee_zip
        ].filter(Boolean).join(', ');
        if (empAddr) {
          confirmMsg += `• ${lbl.address}: <b>${empAddr}</b>\n`;
        }
        
        // ===== EMPLOYER INFO =====
        confirmMsg += `\n<b>${lbl.employer}</b>\n`;
        
        if (extracted.employer_name) {
          confirmMsg += `• ${lbl.empName}: <b>${extracted.employer_name}</b>\n`;
        }
        if (extracted.employer_ein) {
          confirmMsg += `• ${lbl.empEin}: <b>${extracted.employer_ein}</b>\n`;
        }
        const emplAddr = [
          extracted.employer_address,
          extracted.employer_city,
          extracted.employer_state,
          extracted.employer_zip
        ].filter(Boolean).join(', ');
        if (emplAddr) {
          confirmMsg += `• ${lbl.empAddress}: <b>${emplAddr}</b>\n`;
        }
        
        // ===== INCOME & TAXES =====
        confirmMsg += `\n<b>${lbl.income}</b>\n`;
        
        if (extracted.wages_tips_other_comp) {
          confirmMsg += `• ${lbl.wages}: <b>$${Number(extracted.wages_tips_other_comp).toLocaleString()}</b>\n`;
        }
        if (extracted.federal_income_tax_withheld) {
          confirmMsg += `• ${lbl.fedWith}: <b>$${Number(extracted.federal_income_tax_withheld).toLocaleString()}</b>\n`;
        }
        if (extracted.social_security_wages) {
          confirmMsg += `• ${lbl.ssWages}: <b>$${Number(extracted.social_security_wages).toLocaleString()}</b>\n`;
        }
        if (extracted.social_security_tax_withheld || extracted.social_security_tax) {
          const ssTax = extracted.social_security_tax_withheld || extracted.social_security_tax;
          confirmMsg += `• ${lbl.ssTax}: <b>$${Number(ssTax).toLocaleString()}</b>\n`;
        }
        if (extracted.medicare_wages) {
          confirmMsg += `• ${lbl.medWages}: <b>$${Number(extracted.medicare_wages).toLocaleString()}</b>\n`;
        }
        if (extracted.medicare_tax_withheld || extracted.medicare_tax) {
          const medTax = extracted.medicare_tax_withheld || extracted.medicare_tax;
          confirmMsg += `• ${lbl.medTax}: <b>$${Number(medTax).toLocaleString()}</b>\n`;
        }
        
        // ===== STATE =====
        if (extracted.state || extracted.state_wages || extracted.state_income_tax) {
          confirmMsg += `\n<b>${lbl.state}</b>\n`;
          
          if (extracted.state) {
            confirmMsg += `• ${lbl.stateCode}: <b>${extracted.state}</b>\n`;
          }
          if (extracted.state_wages) {
            confirmMsg += `• ${lbl.stateWages}: <b>$${Number(extracted.state_wages).toLocaleString()}</b>\n`;
          }
          if (extracted.state_income_tax) {
            confirmMsg += `• ${lbl.stateWith}: <b>$${Number(extracted.state_income_tax).toLocaleString()}</b>\n`;
          }
        }
        
        confirmMsg += `\n${lbl.confirm}`;

        setMessages((prev) => [...prev, { sender: "ai", text: confirmMsg }]);

        if (res.data.tax) {
          setRefundAmount(calculateNetFromTax(res.data.tax));
        }
        if (showDataPanel) fetchServerData();
      }
    } catch (err) {
      console.error("Upload error:", err);
      setMessages((prev) => [...prev, { sender: "ai", text: t.error }]);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const download1040 = async () => {
    try {
      const res = await api.post("/api/tax/1040", { userId, taxYear: parseInt(taxYear) }, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `Form_1040_${taxYear}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
      alert(lang === 'vi' ? "Lỗi tải form" : lang === 'es' ? "Error al descargar" : "Error downloading form");
    }
  };

  const resetSession = async () => {
    const confirmMsg = lang === 'vi' ? "Bạn có chắc muốn xóa tất cả dữ liệu?" :
                       lang === 'es' ? "¿Seguro que quieres borrar todos los datos?" :
                       "Are you sure you want to clear all data?";
    if (!window.confirm(confirmMsg)) return;
    
    try {
      await api.post("/api/ai/reset", { userId });
      setMessages([]);
      setRefundAmount(0);
      setServerData(null);
      loadWelcomeMessage(lang);
    } catch (err) {
      console.error("Reset error:", err);
    }
  };

  const formatFilingStatus = (status) => {
    return t.filingStatuses?.[status] || status || t.notSelected;
  };

  const quickActions = [
    { label: t.quickActions.uploadW2, action: () => fileInputRef.current?.click() },
    { label: t.quickActions.filingStatus, message: lang === 'vi' ? "Tình trạng khai thuế của tôi là gì?" : 
                                                   lang === 'es' ? "¿Cuál es mi estado civil tributario?" : 
                                                   "What is my filing status?" },
    { label: t.quickActions.addDependent, message: lang === 'vi' ? "Tôi muốn thêm người phụ thuộc" : 
                                                   lang === 'es' ? "Quiero agregar un dependiente" : 
                                                   "I want to add a dependent" },
    { label: t.quickActions.checkRefund, message: lang === 'vi' ? "Hoàn thuế của tôi là bao nhiêu?" : 
                                                  lang === 'es' ? "¿Cuánto es mi reembolso?" : 
                                                  "What is my refund?" },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        {showHeader && (
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <span className="text-xl font-bold">🌟 {t.title}</span>
                <select
                  value={taxYear}
                  onChange={(e) => setTaxYear(e.target.value)}
                  className="bg-white/20 text-white border border-white/30 rounded px-2 py-1 text-sm"
                >
                  <option value="2024" className="text-gray-800">{t.taxYear} 2024</option>
                  <option value="2023" className="text-gray-800">{t.taxYear} 2023</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                {/* Language Selector */}
                <select
                  value={lang}
                  onChange={(e) => changeLang(e.target.value)}
                  className="bg-white/20 text-white border border-white/30 rounded-lg px-3 py-1.5 text-sm cursor-pointer"
                >
                  {languages.map((l) => (
                    <option key={l.code} value={l.code} className="text-gray-800">
                      {l.flag} {l.name}
                    </option>
                  ))}
                </select>

                {/* Refund Display */}
                <div className={`px-4 py-2 rounded-lg font-bold ${
                  animatedRefund >= 0 ? 'bg-green-500' : 'bg-red-500'
                }`}>
                  {animatedRefund >= 0 ? '💰' : '💸'} ${Math.abs(animatedRefund).toLocaleString()}
                </div>

                <button
                  onClick={() => setShowDataPanel(!showDataPanel)}
                  className="px-3 py-2 bg-white/20 rounded-lg hover:bg-white/30 text-sm"
                >
                  📊 {showDataPanel ? t.hideData : t.showData}
                </button>
                
                <button
                  onClick={() => navigate("/dashboard")}
                  className="px-3 py-2 bg-white/20 rounded-lg hover:bg-white/30 text-sm"
                >
                  {t.dashboard}
                </button>

                {currentUser && (
                  <div className="flex items-center gap-2">
                    <img 
                      src={currentUser.picture} 
                      alt={currentUser.name} 
                      className="w-8 h-8 rounded-full border-2 border-white/30"
                    />
                    <span className="text-sm hidden md:block">{currentUser.firstName || currentUser.name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                  msg.sender === "user"
                    ? "bg-blue-600 text-white rounded-br-md"
                    : "bg-white shadow-md rounded-bl-md"
                }`}
                dangerouslySetInnerHTML={{ __html: msg.text }}
              />
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white shadow-md rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Quick Actions */}
        <div className="px-4 py-2 bg-gray-50 border-t flex gap-2 overflow-x-auto">
          {quickActions.map((action, i) => (
            <button
              key={i}
              onClick={() => (action.action ? action.action() : sendMessage(action.message))}
              className="px-3 py-2 bg-white border rounded-full text-sm whitespace-nowrap hover:bg-blue-50 hover:border-blue-300"
            >
              {action.label}
            </button>
          ))}
          <button
            onClick={download1040}
            className="px-3 py-2 bg-green-100 border border-green-300 rounded-full text-sm whitespace-nowrap hover:bg-green-200"
          >
            {t.downloadForm}
          </button>
          <button
            onClick={resetSession}
            className="px-3 py-2 bg-red-100 border border-red-300 rounded-full text-sm whitespace-nowrap hover:bg-red-200"
          >
            {t.startOver}
          </button>
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t">
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-4 py-3 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-50"
            >
              📎
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder={t.placeholder}
              className="flex-1 px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={() => sendMessage()}
              disabled={isLoading || !input.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
            >
              {t.send}
            </button>
          </div>
        </div>
      </div>

      {/* Data Panel Sidebar */}
      {showDataPanel && (
        <div className="w-80 bg-white border-l shadow-lg overflow-y-auto p-4">
          <h2 className="font-bold text-lg mb-4">{t.yourTaxData}</h2>

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
                <span className="text-gray-500">{t.name}:</span>{" "}
                <b>{serverData.first_name && serverData.last_name
                  ? `${serverData.first_name} ${serverData.last_name}`
                  : t.notProvided}</b>
              </div>
              <div>
                <span className="text-gray-500">{t.filingStatus}:</span>{" "}
                <b>{formatFilingStatus(serverData.filing_status)}</b>
              </div>
              <div>
                <span className="text-gray-500">{t.address}:</span>{" "}
                <b>{serverData.address || t.notProvided}</b>
              </div>
              <div>
                <span className="text-gray-500">{t.dependents}:</span>{" "}
                <b>{serverData.dependent_count > 0 ? serverData.dependent_count : t.none}</b>
              </div>

              {serverData.dependent_count > 0 && (
                <div className="ml-3 text-xs text-gray-600 space-y-1">
                  {[1, 2, 3, 4].map((i) => {
                    const name = serverData[`dependent_${i}_name`];
                    const age = serverData[`dependent_${i}_age`];
                    const under17 = serverData[`dependent_${i}_under_17`];
                    if (!name) return null;
                    return (
                      <div key={i}>
                        • {name} {age ? `(${age} yrs)` : ""}{" "}
                        {under17 === "yes" && <span className="text-green-600">✓ CTC</span>}
                      </div>
                    );
                  })}
                </div>
              )}

              <div>
                <span className="text-gray-500">{t.w2Wages}:</span>{" "}
                <b>{serverData.total_wages > 0 ? `$${Number(serverData.total_wages).toLocaleString()}` : t.none}</b>
              </div>
              <div>
                <span className="text-gray-500">{t.federalWithheld}:</span>{" "}
                <b>{serverData.total_withheld > 0 ? `$${Number(serverData.total_withheld).toLocaleString()}` : "—"}</b>
              </div>

              <div className="pt-3 border-t">
                <div className="text-gray-500">
                  {refundAmount >= 0 ? t.estimatedRefund : t.amountOwed}:
                </div>
                <div className={`text-2xl font-bold ${refundAmount >= 0 ? "text-green-600" : "text-red-600"}`}>
                  ${Math.abs(refundAmount).toLocaleString()}
                </div>
              </div>

              <button
                onClick={fetchServerData}
                className="w-full py-2 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 mt-4"
              >
                {t.refresh}
              </button>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
              <p className="text-gray-500 mt-2 text-sm">{t.loading}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}