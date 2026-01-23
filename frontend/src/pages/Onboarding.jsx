// ============================================================
// TAXSKY AI ONBOARDING - MARKETING UPDATE v2.0
// ============================================================
// Updated: Focus on SECURE SSN entry, NO W-2 upload needed
// Added: FAQ Section, Privacy Policy, Terms of Service
// Design: Professional, security-focused messaging
// ============================================================

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const PYTHON_API = import.meta.env.VITE_PYTHON_API || "http://localhost:5002";

// ============================================================
// TAXSKY AI LOGO COMPONENT
// ============================================================
const TaxSkyLogo = ({ size = "default" }) => {
  const sizes = {
    small: { width: 170, height: 48, iconScale: 0.85 },
    default: { width: 220, height: 62, iconScale: 1.1 },
    large: { width: 300, height: 85, iconScale: 1.5 },
  };
  const s = sizes[size] || sizes.default;
  
  return (
    <svg width={s.width} height={s.height} viewBox="0 0 200 56" fill="none">
      <defs>
        <linearGradient id="hexGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1"/>
          <stop offset="100%" stopColor="#8b5cf6"/>
        </linearGradient>
        <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6"/>
          <stop offset="100%" stopColor="#06b6d4"/>
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <polygon points="28,8 42,2 56,8 56,24 42,30 28,24" fill="url(#hexGrad)" opacity="0.25"/>
      <polygon points="23,14 37,8 51,14 51,30 37,36 23,30" fill="url(#hexGrad)" opacity="0.5"/>
      <polygon points="26,20 39,14 52,20 52,34 39,42 26,34" fill="url(#hexGrad)" filter="url(#glow)"/>
      <path d="M39 24 L39 34 M35 27 Q39 24 43 27 Q39 30 35 33 Q39 36 43 33" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
      <text x="62" y="34" fontFamily="Space Grotesk, system-ui, sans-serif" fontSize="24" fontWeight="700" fill="white">Tax</text>
      <text x="102" y="34" fontFamily="Space Grotesk, system-ui, sans-serif" fontSize="24" fontWeight="700" fill="url(#textGrad)">Sky</text>
      <text x="148" y="34" fontFamily="Space Grotesk, system-ui, sans-serif" fontSize="14" fontWeight="600" fill="#a78bfa">AI</text>
    </svg>
  );
};

// ============================================================
// TAXSKY AI ICON COMPONENT
// ============================================================
const TaxSkyIcon = ({ size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <defs>
      <linearGradient id="iconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6366f1"/>
        <stop offset="100%" stopColor="#8b5cf6"/>
      </linearGradient>
      <linearGradient id="iconBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0f0f1a"/>
        <stop offset="100%" stopColor="#1a1a2e"/>
      </linearGradient>
    </defs>
    <rect width="48" height="48" rx="12" fill="url(#iconBg)"/>
    <polygon points="20,10 28,6 36,10 36,22 28,26 20,22" fill="url(#iconGrad)" opacity="0.4"/>
    <polygon points="17,15 25,11 33,15 33,27 25,31 17,27" fill="url(#iconGrad)" opacity="0.65"/>
    <polygon points="19,19 26,15 33,19 33,29 26,33 19,29" fill="url(#iconGrad)"/>
    <path d="M26 22 L26 29 M23 24 Q26 22 29 24 Q26 26 23 28 Q26 30 29 28" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
  </svg>
);

// ============================================================
// TRANSLATIONS - UPDATED FOR SECURITY FOCUS
// ============================================================
const translations = {
  en: {
    hero: {
      greeting: "👋 Welcome to",
      badge: "Tax Season 2025",
      title: "Your AI Tax",
      titleHighlight: "Assistant",
      subtitle: "File your taxes through a simple chat. Just answer questions - no forms to fill, no documents to upload.",
    },
    chat: {
      preview: "Hi! I'm your TaxSky AI assistant. Ready to help you file your taxes in minutes!",
      placeholder: "Ask me anything about your taxes...",
      messages: [
        { type: "ai", text: "Hi! 👋 I'm your TaxSky AI assistant. Let's get you the biggest refund possible!" },
        { type: "user", text: "I made $72,000 and have 2 kids" },
        { type: "ai", text: "Great! With 2 dependents, you qualify for up to $4,000 in Child Tax Credits! 🎉" },
        { type: "user", text: "I also work from home sometimes" },
        { type: "ai", text: "Home Office Deduction could add $1,500 more! Let me calculate..." },
        { type: "result", text: "$4,847", label: "Your Estimated Refund" },
      ],
    },
    form: {
      languageLabel: "Preferred Language",
      stateLabel: "Your State",
      stateHint: "I'll optimize for your state's tax rules",
      button: "Start Chatting with AI",
      buttonAlt: "or continue with Google",
      buttonLoading: "Setting up...",
      secureNote: "🔒 Bank-level encryption • IRS authorized",
    },
    stats: {
      users: "50K+",
      usersLabel: "Happy Filers",
      refund: "$3,247",
      refundLabel: "Avg. Refund",
      rating: "4.9",
      ratingLabel: "Rating",
      time: "15 min",
      timeLabel: "Avg. Time",
    },
    // ✅ UPDATED FEATURES - Security focused, no upload
    features: {
      title: "Why people love TaxSky AI",
      items: [
        { icon: "💬", title: "Chat to File", desc: "Just answer simple questions. No confusing forms or tax jargon." },
        { icon: "🔐", title: "Bank-Level Security", desc: "Your SSN is encrypted with 256-bit SSL. Same security as major banks." },
        { icon: "💰", title: "Max Refund Guarantee", desc: "AI finds every deduction you qualify for. Guaranteed or your money back." },
        { icon: "🌐", title: "Your Language", desc: "File in English, Vietnamese, Spanish, Chinese, and more." },
      ]
    },
    // ✅ NEW: FAQ Section
    faq: {
      title: "Frequently Asked Questions",
      items: [
        {
          q: "Do I need to upload my W-2?",
          a: "No! Just tell us your income and we'll handle the rest. Our AI asks simple questions - no documents needed."
        },
        {
          q: "Is my SSN safe?",
          a: "Absolutely. We use 256-bit bank-level encryption. Your data is protected by the same security used by major financial institutions. We are IRS-authorized e-file provider."
        },
        {
          q: "How long does it take?",
          a: "Most users complete their return in 15-20 minutes. Just chat naturally and answer questions about your income, dependents, and deductions."
        },
        {
          q: "What if I make a mistake?",
          a: "No worries! You can review everything before filing. Our AI double-checks for errors and suggests fixes. Plus, CPAs review complex returns."
        },
        {
          q: "Is TaxSky AI free?",
          a: "You can start for free and see your estimated refund. Filing fees start at $29.99 for simple returns. Much less than traditional tax preparers!"
        },
        {
          q: "What forms do you support?",
          a: "We support W-2, 1099-NEC, 1099-INT, 1099-DIV, 1099-R, SSA-1099, and more. Self-employed, freelancers, and gig workers welcome!"
        }
      ]
    },
    trust: ["IRS Authorized", "SOC 2 Certified", "256-bit Encryption"],
    support: { full: "Full Support", noTax: "No State Tax", flatTax: "Flat Tax", comingSoon: "Coming 2026" },
    footer: {
      copyright: "© 2025 TaxSky AI Inc. All rights reserved.",
      links: ["Privacy", "Terms", "Help"],
    }
  },
  vi: {
    hero: {
      greeting: "👋 Chào mừng đến",
      badge: "Mùa Thuế 2025",
      title: "Trợ Lý Thuế",
      titleHighlight: "AI Của Bạn",
      subtitle: "Khai thuế qua chat đơn giản. Chỉ cần trả lời câu hỏi - không cần điền form, không cần tải tài liệu.",
    },
    chat: {
      preview: "Xin chào! Tôi là trợ lý AI TaxSky. Sẵn sàng giúp bạn khai thuế trong vài phút!",
      placeholder: "Hỏi tôi bất cứ điều gì về thuế...",
      messages: [
        { type: "ai", text: "Xin chào! 👋 Tôi là trợ lý AI TaxSky. Hãy để tôi giúp bạn hoàn thuế nhiều nhất!" },
        { type: "user", text: "Tôi kiếm $72,000 và có 2 con" },
        { type: "ai", text: "Tuyệt vời! Với 2 người phụ thuộc, bạn có thể được $4,000 tín dụng thuế trẻ em! 🎉" },
        { type: "user", text: "Tôi cũng làm việc ở nhà đôi khi" },
        { type: "ai", text: "Khấu trừ văn phòng tại nhà có thể thêm $1,500! Để tôi tính..." },
        { type: "result", text: "$4,847", label: "Hoàn Thuế Ước Tính" },
      ],
    },
    form: {
      languageLabel: "Ngôn Ngữ",
      stateLabel: "Tiểu Bang",
      stateHint: "Tôi sẽ tối ưu theo luật thuế tiểu bang của bạn",
      button: "Bắt Đầu Chat với AI",
      buttonAlt: "hoặc tiếp tục với Google",
      buttonLoading: "Đang thiết lập...",
      secureNote: "🔒 Mã hóa cấp ngân hàng • IRS ủy quyền",
    },
    stats: {
      users: "50K+",
      usersLabel: "Người Dùng",
      refund: "$3,247",
      refundLabel: "Hoàn Thuế TB",
      rating: "4.9",
      ratingLabel: "Đánh Giá",
      time: "15 phút",
      timeLabel: "Thời Gian TB",
    },
    features: {
      title: "Tại sao mọi người yêu thích TaxSky AI",
      items: [
        { icon: "💬", title: "Chat Để Khai", desc: "Chỉ cần trả lời câu hỏi đơn giản. Không form phức tạp." },
        { icon: "🔐", title: "Bảo Mật Ngân Hàng", desc: "SSN được mã hóa 256-bit SSL. Bảo mật như ngân hàng lớn." },
        { icon: "💰", title: "Hoàn Thuế Tối Đa", desc: "AI tìm mọi khoản khấu trừ. Đảm bảo hoặc hoàn tiền." },
        { icon: "🌐", title: "Ngôn Ngữ Của Bạn", desc: "Khai bằng tiếng Anh, Việt, Tây Ban Nha, Trung Quốc." },
      ]
    },
    faq: {
      title: "Câu Hỏi Thường Gặp",
      items: [
        {
          q: "Tôi có cần tải lên W-2 không?",
          a: "Không! Chỉ cần cho chúng tôi biết thu nhập của bạn. AI của chúng tôi hỏi câu hỏi đơn giản - không cần tài liệu."
        },
        {
          q: "SSN của tôi có an toàn không?",
          a: "Tuyệt đối an toàn. Chúng tôi sử dụng mã hóa 256-bit cấp ngân hàng. Dữ liệu được bảo vệ như các tổ chức tài chính lớn. Chúng tôi được IRS ủy quyền."
        },
        {
          q: "Mất bao lâu?",
          a: "Hầu hết người dùng hoàn thành trong 15-20 phút. Chỉ cần chat tự nhiên và trả lời về thu nhập, người phụ thuộc, và khấu trừ."
        },
        {
          q: "Nếu tôi nhập sai thì sao?",
          a: "Không sao! Bạn có thể xem lại mọi thứ trước khi nộp. AI kiểm tra lỗi và đề xuất sửa. CPA xem xét các trường hợp phức tạp."
        },
        {
          q: "TaxSky AI có miễn phí không?",
          a: "Bạn có thể bắt đầu miễn phí và xem ước tính hoàn thuế. Phí nộp từ $29.99 cho khai đơn giản."
        },
        {
          q: "Hỗ trợ những form nào?",
          a: "Chúng tôi hỗ trợ W-2, 1099-NEC, 1099-INT, 1099-DIV, 1099-R, SSA-1099. Tự kinh doanh, freelancer đều được!"
        }
      ]
    },
    trust: ["IRS Ủy Quyền", "SOC 2 Chứng Nhận", "Mã Hóa 256-bit"],
    support: { full: "Hỗ Trợ Đầy Đủ", noTax: "Không Thuế Bang", flatTax: "Thuế Cố Định", comingSoon: "Sắp Ra Mắt" },
    footer: {
      copyright: "© 2025 TaxSky AI Inc. Bảo lưu mọi quyền.",
      links: ["Bảo Mật", "Điều Khoản", "Hỗ Trợ"],
    }
  },
  es: {
    hero: {
      greeting: "👋 Bienvenido a",
      badge: "Temporada 2025",
      title: "Tu Asistente",
      titleHighlight: "de Impuestos AI",
      subtitle: "Declara tus impuestos por chat. Solo responde preguntas - sin formularios, sin subir documentos.",
    },
    chat: {
      preview: "¡Hola! Soy tu asistente AI de TaxSky. ¡Listo para ayudarte a declarar en minutos!",
      placeholder: "Pregúntame sobre tus impuestos...",
      messages: [
        { type: "ai", text: "¡Hola! 👋 Soy tu asistente AI de TaxSky. ¡Te ayudaré a obtener el máximo reembolso!" },
        { type: "user", text: "Gané $72,000 y tengo 2 hijos" },
        { type: "ai", text: "¡Excelente! Con 2 dependientes, calificas para $4,000 en Créditos Tributarios! 🎉" },
        { type: "user", text: "También trabajo desde casa a veces" },
        { type: "ai", text: "¡Deducción de oficina en casa puede agregar $1,500 más! Calculando..." },
        { type: "result", text: "$4,847", label: "Tu Reembolso Estimado" },
      ],
    },
    form: {
      languageLabel: "Idioma",
      stateLabel: "Tu Estado",
      stateHint: "Optimizaré para las reglas de tu estado",
      button: "Empezar a Chatear con AI",
      buttonAlt: "o continuar con Google",
      buttonLoading: "Configurando...",
      secureNote: "🔒 Cifrado bancario • Autorizado IRS",
    },
    stats: {
      users: "50K+",
      usersLabel: "Usuarios",
      refund: "$3,247",
      refundLabel: "Reembolso Prom.",
      rating: "4.9",
      ratingLabel: "Calificación",
      time: "15 min",
      timeLabel: "Tiempo Prom.",
    },
    features: {
      title: "Por qué la gente ama TaxSky AI",
      items: [
        { icon: "💬", title: "Chatea para Declarar", desc: "Solo responde preguntas simples. Sin formularios confusos." },
        { icon: "🔐", title: "Seguridad Bancaria", desc: "Tu SSN está cifrado con SSL 256-bit. Igual que los bancos." },
        { icon: "💰", title: "Máximo Reembolso", desc: "AI encuentra todas las deducciones. Garantizado o te devolvemos." },
        { icon: "🌐", title: "Tu Idioma", desc: "Inglés, Vietnamita, Español, Chino y más." },
      ]
    },
    faq: {
      title: "Preguntas Frecuentes",
      items: [
        {
          q: "¿Necesito subir mi W-2?",
          a: "¡No! Solo dinos tu ingreso. Nuestro AI hace preguntas simples - no necesitas documentos."
        },
        {
          q: "¿Mi SSN está seguro?",
          a: "Absolutamente. Usamos cifrado 256-bit nivel bancario. Tus datos están protegidos como en instituciones financieras. Somos proveedores autorizados por el IRS."
        },
        {
          q: "¿Cuánto tiempo toma?",
          a: "La mayoría completa en 15-20 minutos. Solo chatea naturalmente sobre ingresos, dependientes y deducciones."
        },
        {
          q: "¿Si cometo un error?",
          a: "¡No te preocupes! Puedes revisar todo antes de enviar. Nuestro AI verifica errores. CPAs revisan casos complejos."
        },
        {
          q: "¿TaxSky AI es gratis?",
          a: "Puedes empezar gratis y ver tu reembolso estimado. Tarifas desde $29.99 para declaraciones simples."
        },
        {
          q: "¿Qué formularios soportan?",
          a: "Soportamos W-2, 1099-NEC, 1099-INT, 1099-DIV, 1099-R, SSA-1099. ¡Autónomos y freelancers bienvenidos!"
        }
      ]
    },
    trust: ["IRS Autorizado", "SOC 2 Certificado", "Cifrado 256-bit"],
    support: { full: "Soporte Completo", noTax: "Sin Impuesto", flatTax: "Tasa Fija", comingSoon: "Próximamente" },
    footer: {
      copyright: "© 2025 TaxSky AI Inc. Todos los derechos reservados.",
      links: ["Privacidad", "Términos", "Ayuda"],
    }
  }
};

// ============================================================
// CONSTANTS
// ============================================================
const LANGUAGES = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "vi", name: "Tiếng Việt", flag: "🇻🇳" },
  { code: "es", name: "Español", flag: "🇪🇸" },
];

const ALL_STATES = [
  { code: "CA", name: "California", level: "full" },
  { code: "AK", name: "Alaska", level: "no_tax" },
  { code: "FL", name: "Florida", level: "no_tax" },
  { code: "NV", name: "Nevada", level: "no_tax" },
  { code: "SD", name: "South Dakota", level: "no_tax" },
  { code: "TN", name: "Tennessee", level: "no_tax" },
  { code: "TX", name: "Texas", level: "no_tax" },
  { code: "WA", name: "Washington", level: "no_tax" },
  { code: "WY", name: "Wyoming", level: "no_tax" },
  { code: "AZ", name: "Arizona", level: "flat" },
  { code: "CO", name: "Colorado", level: "flat" },
  { code: "GA", name: "Georgia", level: "flat" },
  { code: "ID", name: "Idaho", level: "flat" },
  { code: "IL", name: "Illinois", level: "flat" },
  { code: "IN", name: "Indiana", level: "flat" },
  { code: "KY", name: "Kentucky", level: "flat" },
  { code: "MA", name: "Massachusetts", level: "flat" },
  { code: "MI", name: "Michigan", level: "flat" },
  { code: "NC", name: "North Carolina", level: "flat" },
  { code: "PA", name: "Pennsylvania", level: "flat" },
  { code: "UT", name: "Utah", level: "flat" },
  { code: "NY", name: "New York", level: "coming_soon" },
  { code: "NJ", name: "New Jersey", level: "coming_soon" },
  { code: "OH", name: "Ohio", level: "coming_soon" },
  { code: "VA", name: "Virginia", level: "coming_soon" },
];

// ============================================================
// FAQ ACCORDION COMPONENT
// ============================================================
const FAQItem = ({ question, answer, isOpen, onClick }) => (
  <div style={styles.faqItem}>
    <button 
      onClick={onClick} 
      style={styles.faqQuestion}
      aria-expanded={isOpen}
    >
      <span>{question}</span>
      <span style={{
        ...styles.faqIcon,
        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
      }}>▼</span>
    </button>
    <div style={{
      ...styles.faqAnswer,
      maxHeight: isOpen ? '200px' : '0',
      opacity: isOpen ? 1 : 0,
      padding: isOpen ? '16px 20px' : '0 20px',
    }}>
      {answer}
    </div>
  </div>
);

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function Onboarding() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState("en");
  const [state, setState] = useState("CA");
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const t = translations[language];
  const selectedState = ALL_STATES.find(s => s.code === state);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("taxsky_state");
    if (saved) setState(saved);
    const savedLang = localStorage.getItem("taxsky_language");
    if (savedLang) setLanguage(savedLang);
  }, []);

  const handleContinue = async () => {
    setError(null);
    setIsValidating(true);

    try {
      const response = await fetch(`${PYTHON_API}/states/validate/${state}`);
      const result = await response.json();

      if (!result.valid) {
        setError(result.message || `${state} is not supported yet.`);
        setIsValidating(false);
        return;
      }

      localStorage.setItem("taxsky_language", language);
      localStorage.setItem("taxsky_state", state);
      localStorage.setItem("taxsky_state_name", result.state_name || state);
      localStorage.setItem("taxsky_has_state_tax", result.has_income_tax ? "true" : "false");

      navigate("/login");

    } catch (err) {
      console.error("Validation error:", err);
      setError("Cannot connect to server. Please try again.");
    } finally {
      setIsValidating(false);
    }
  };

  const getStateBadge = () => {
    const level = selectedState?.level;
    if (level === "full") return { text: "✓ " + t.support.full, color: "#10b981", bg: "rgba(16, 185, 129, 0.15)" };
    if (level === "no_tax") return { text: "✓ " + t.support.noTax, color: "#3b82f6", bg: "rgba(59, 130, 246, 0.15)" };
    if (level === "flat") return { text: "✓ " + t.support.flatTax, color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.15)" };
    return { text: t.support.comingSoon, color: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)" };
  };

  const stateBadge = getStateBadge();

  return (
    <div style={styles.page}>
      {/* Animated Background */}
      <div style={styles.bgGradient} />
      <div style={styles.bgOrbs}>
        <div style={{...styles.orb, ...styles.orb1}} />
        <div style={{...styles.orb, ...styles.orb2}} />
        <div style={{...styles.orb, ...styles.orb3}} />
      </div>

      <div style={{...styles.container, opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(20px)'}}>
        
        {/* Header */}
        <header style={styles.header}>
          <TaxSkyLogo size="default" />
          <div style={styles.langSwitch}>
            {LANGUAGES.map(l => (
              <button
                key={l.code}
                onClick={() => setLanguage(l.code)}
                style={{
                  ...styles.langBtn,
                  ...(language === l.code ? styles.langBtnActive : {})
                }}
                title={l.name}
              >
                {l.flag}
              </button>
            ))}
          </div>
        </header>

        {/* Main Content - Two Column Layout */}
        <div style={styles.mainContent} className="main-content-grid">
          
          {/* Left Column - Hero & Chat Preview */}
          <div style={styles.leftColumn}>
            <div style={styles.greeting}>{t.hero.greeting}</div>
            <h1 style={styles.heroTitle} className="hero-title-main">
              {t.hero.title}
              <span style={styles.heroHighlight}> {t.hero.titleHighlight}</span>
            </h1>
            <p style={styles.heroSubtitle}>{t.hero.subtitle}</p>

            {/* Chat Preview Card */}
            <div 
              style={styles.chatPreview}
              onClick={handleContinue}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
              className="chat-preview-hover"
            >
              <div style={styles.chatHeader}>
                <TaxSkyIcon size={32} />
                <div style={styles.chatHeaderText}>
                  <span style={styles.chatName}>TaxSky AI</span>
                  <span style={styles.chatStatus}>
                    <span style={styles.onlineDot}></span>
                    Online
                  </span>
                </div>
              </div>
              
              <div style={styles.chatMessages}>
                {t.chat.messages && t.chat.messages.map((msg, index) => (
                  <div 
                    key={index} 
                    style={{
                      ...styles.chatMessage,
                      ...(msg.type === 'user' ? styles.chatMessageUser : {}),
                      ...(msg.type === 'result' ? styles.chatMessageResult : {}),
                      animationDelay: `${index * 0.15}s`,
                    }}
                  >
                    {msg.type === 'ai' && (
                      <div style={styles.chatMessageAI}>
                        <span style={styles.chatAIAvatar}>🤖</span>
                        <span style={styles.chatMessageText}>{msg.text}</span>
                      </div>
                    )}
                    {msg.type === 'user' && (
                      <div style={styles.chatMessageUserBubble}>
                        <span style={styles.chatMessageText}>{msg.text}</span>
                      </div>
                    )}
                    {msg.type === 'result' && (
                      <div style={styles.chatResultCard}>
                        <span style={styles.chatResultLabel}>{msg.label}</span>
                        <span style={styles.chatResultAmount}>{msg.text}</span>
                        <span style={styles.chatResultConfetti}>🎉</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div style={styles.chatInputPreview}>
                <input
                  type="text"
                  placeholder={t.chat.placeholder}
                  style={styles.chatInput}
                  onFocus={handleContinue}
                  readOnly
                />
                <button style={styles.chatSendBtn} aria-label="Start chatting">→</button>
              </div>
              <div style={styles.chatClickHint}>
                👆 Click anywhere to start chatting
              </div>
            </div>

            {/* Stats */}
            <div style={styles.statsRow} className="stats-row-grid">
              <div style={styles.statItem}>
                <span style={styles.statValue}>{t.stats.users}</span>
                <span style={styles.statLabel}>{t.stats.usersLabel}</span>
              </div>
              <div style={styles.statItem}>
                <span style={styles.statValue}>{t.stats.refund}</span>
                <span style={styles.statLabel}>{t.stats.refundLabel}</span>
              </div>
              <div style={styles.statItem}>
                <span style={styles.statValue}>{t.stats.rating} ⭐</span>
                <span style={styles.statLabel}>{t.stats.ratingLabel}</span>
              </div>
              <div style={styles.statItem}>
                <span style={styles.statValue}>{t.stats.time}</span>
                <span style={styles.statLabel}>{t.stats.timeLabel}</span>
              </div>
            </div>
          </div>

          {/* Right Column - Login Form */}
          <div style={styles.rightColumn} className="right-column-form">
            <div style={styles.formCard} className="form-card-main">
              <h2 style={styles.formTitle}>Get Started Free</h2>
              
              {/* Language Select */}
              <div style={styles.formGroup}>
                <label style={styles.label}>🌐 {t.form.languageLabel}</label>
                <div style={styles.selectWrap}>
                  <select 
                    style={styles.select} 
                    value={language} 
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    {LANGUAGES.map(l => (
                      <option key={l.code} value={l.code}>{l.flag} {l.name}</option>
                    ))}
                  </select>
                  <div style={styles.selectArrow}>▼</div>
                </div>
              </div>

              {/* State Select */}
              <div style={styles.formGroup}>
                <label style={styles.label}>📍 {t.form.stateLabel}</label>
                <div style={styles.selectWrap}>
                  <select 
                    style={styles.select} 
                    value={state} 
                    onChange={(e) => { setState(e.target.value); setError(null); }}
                  >
                    <optgroup label={`✨ ${t.support.full}`}>
                      {ALL_STATES.filter(s => s.level === "full").map(s => (
                        <option key={s.code} value={s.code}>{s.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label={`💎 ${t.support.noTax}`}>
                      {ALL_STATES.filter(s => s.level === "no_tax").map(s => (
                        <option key={s.code} value={s.code}>{s.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label={`📊 ${t.support.flatTax}`}>
                      {ALL_STATES.filter(s => s.level === "flat").map(s => (
                        <option key={s.code} value={s.code}>{s.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label={`⏳ ${t.support.comingSoon}`}>
                      {ALL_STATES.filter(s => s.level === "coming_soon").map(s => (
                        <option key={s.code} value={s.code}>{s.name}</option>
                      ))}
                    </optgroup>
                  </select>
                  <div style={styles.selectArrow}>▼</div>
                </div>
                <div style={{
                  ...styles.stateBadge, 
                  backgroundColor: stateBadge.bg, 
                  color: stateBadge.color,
                  borderColor: stateBadge.color + '40'
                }}>
                  {stateBadge.text}
                </div>
                <p style={styles.hint}>{t.form.stateHint}</p>
              </div>

              {/* Error */}
              {error && (
                <div style={styles.error}>
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Primary CTA Button */}
              <button 
                onClick={handleContinue} 
                disabled={isValidating}
                style={{
                  ...styles.ctaButton, 
                  opacity: isValidating ? 0.7 : 1, 
                  cursor: isValidating ? 'wait' : 'pointer'
                }}
              >
                {isValidating ? (
                  <span style={styles.buttonContent}>
                    <span style={styles.spinner}></span>
                    {t.form.buttonLoading}
                  </span>
                ) : (
                  <span style={styles.buttonContent}>
                    💬 {t.form.button}
                  </span>
                )}
              </button>

              {/* Google Alternative */}
              <div style={styles.dividerRow}>
                <div style={styles.dividerLine}></div>
                <span style={styles.dividerText}>{t.form.buttonAlt}</span>
                <div style={styles.dividerLine}></div>
              </div>

              <button onClick={handleContinue} style={styles.googleButton}>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              {/* Security Note */}
              <div style={styles.secureNote}>
                {t.form.secureNote}
              </div>

              {/* Trust Badges */}
              <div style={styles.trustBadges}>
                {t.trust.map((item, i) => (
                  <span key={i} style={styles.trustBadge}>✓ {item}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Features Section - UPDATED */}
        <div style={styles.features}>
          <h2 style={styles.featuresTitle}>{t.features.title}</h2>
          <div style={styles.featuresGrid}>
            {t.features.items.map((f, i) => (
              <div key={i} style={styles.featureCard}>
                <div style={styles.featureIcon}>{f.icon}</div>
                <h3 style={styles.featureTitle}>{f.title}</h3>
                <p style={styles.featureDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ✅ NEW: Comparison Section - TaxSky vs Competitors */}
        <div style={styles.comparisonSection}>
          <div style={styles.comparisonHeader}>
            <span style={styles.comparisonBadge}>⚡ Compare</span>
            <h2 style={styles.comparisonTitle}>Why Choose TaxSky AI?</h2>
            <p style={styles.comparisonSubtitle}>See how we stack up against the competition</p>
          </div>
          
          {/* Comparison Table */}
          <div style={styles.comparisonTable} className="comparison-table">
            {/* Header Row */}
            <div style={styles.comparisonHeaderRow}>
              <div style={styles.comparisonFeatureHeader}>Features</div>
              <div style={styles.comparisonBrandHeader}>
                <div style={styles.comparisonBrandLogo}>
                  <span style={styles.taxskyMini}>🚀</span>
                  <span style={styles.comparisonBrandName}>TaxSky AI</span>
                </div>
              </div>
              <div style={styles.comparisonCompetitorHeader}>TurboTax</div>
              <div style={styles.comparisonCompetitorHeader}>H&R Block</div>
              <div style={styles.comparisonCompetitorHeader}>TaxAct</div>
            </div>
            
            {/* Row 1: AI Chat Filing */}
            <div style={styles.comparisonRow}>
              <div style={styles.comparisonFeature}>
                <span style={styles.featureIcon}>💬</span>
                <span>AI Chat Filing</span>
              </div>
              <div style={styles.comparisonCheck}>✅</div>
              <div style={styles.comparisonX}>❌</div>
              <div style={styles.comparisonX}>❌</div>
              <div style={styles.comparisonX}>❌</div>
            </div>
            
            {/* Row 2: No Forms Required */}
            <div style={styles.comparisonRow}>
              <div style={styles.comparisonFeature}>
                <span style={styles.featureIcon}>📝</span>
                <span>No Forms to Fill</span>
              </div>
              <div style={styles.comparisonCheck}>✅</div>
              <div style={styles.comparisonX}>❌</div>
              <div style={styles.comparisonX}>❌</div>
              <div style={styles.comparisonX}>❌</div>
            </div>
            
            {/* Row 3: Average Time */}
            <div style={styles.comparisonRow}>
              <div style={styles.comparisonFeature}>
                <span style={styles.featureIcon}>⏱️</span>
                <span>Average Filing Time</span>
              </div>
              <div style={styles.comparisonHighlight}>15 min</div>
              <div style={styles.comparisonNeutral}>45+ min</div>
              <div style={styles.comparisonNeutral}>60+ min</div>
              <div style={styles.comparisonNeutral}>50+ min</div>
            </div>
            
            {/* Row 4: Starting Price */}
            <div style={styles.comparisonRow}>
              <div style={styles.comparisonFeature}>
                <span style={styles.featureIcon}>💰</span>
                <span>Starting Price</span>
              </div>
              <div style={styles.comparisonHighlight}>$29.99</div>
              <div style={styles.comparisonNeutral}>$89+</div>
              <div style={styles.comparisonNeutral}>$55+</div>
              <div style={styles.comparisonNeutral}>$49+</div>
            </div>
            
            {/* Row 5: Multilingual */}
            <div style={styles.comparisonRow}>
              <div style={styles.comparisonFeature}>
                <span style={styles.featureIcon}>🌐</span>
                <span>Multilingual Support</span>
              </div>
              <div style={styles.comparisonCheck}>✅ 5+ Languages</div>
              <div style={styles.comparisonPartial}>🟡 Limited</div>
              <div style={styles.comparisonPartial}>🟡 Limited</div>
              <div style={styles.comparisonX}>❌</div>
            </div>
            
            {/* Row 6: Max Refund Guarantee */}
            <div style={styles.comparisonRow}>
              <div style={styles.comparisonFeature}>
                <span style={styles.featureIcon}>🎯</span>
                <span>Max Refund Guarantee</span>
              </div>
              <div style={styles.comparisonCheck}>✅</div>
              <div style={styles.comparisonCheck}>✅</div>
              <div style={styles.comparisonCheck}>✅</div>
              <div style={styles.comparisonCheck}>✅</div>
            </div>
            
            {/* Row 7: CPA Review */}
            <div style={styles.comparisonRow}>
              <div style={styles.comparisonFeature}>
                <span style={styles.featureIcon}>👨‍💼</span>
                <span>CPA Review Option</span>
              </div>
              <div style={styles.comparisonHighlight}>$49.99</div>
              <div style={styles.comparisonNeutral}>$169+</div>
              <div style={styles.comparisonNeutral}>$89+</div>
              <div style={styles.comparisonX}>❌</div>
            </div>
            
            {/* Row 8: State Filing */}
            <div style={styles.comparisonRow}>
              <div style={styles.comparisonFeature}>
                <span style={styles.featureIcon}>🏛️</span>
                <span>State Filing</span>
              </div>
              <div style={styles.comparisonHighlight}>$19.99</div>
              <div style={styles.comparisonNeutral}>$54+</div>
              <div style={styles.comparisonNeutral}>$45+</div>
              <div style={styles.comparisonNeutral}>$39+</div>
            </div>
          </div>
          
          {/* Bottom CTA */}
          <div style={styles.comparisonCTA}>
            <p style={styles.comparisonCTAText}>Ready to try the smarter way to file?</p>
            <button onClick={handleContinue} style={styles.comparisonCTAButton}>
              Start FREE with TaxSky AI →
            </button>
          </div>
        </div>

        {/* ✅ IMPROVED: Professional 4-Column Footer */}
        <footer style={styles.footerSection}>
          <div style={styles.footerGrid}>
            {/* Column 1: Contact */}
            <div style={styles.footerColumn}>
              <h4 style={styles.footerHeading}>CONTACT</h4>
              <div style={styles.footerItem}>
                <span style={styles.footerIconEmoji}>📍</span>
                <span>123 Tax Street, Suite 100<br/>San Jose, CA 95110</span>
              </div>
              <div style={styles.footerItem}>
                <span style={styles.footerIconEmoji}>📞</span>
                <a href="tel:+18448297591" style={styles.footerLinkInline}>+1-844-TAX-SKY1</a>
              </div>
              <div style={styles.footerItem}>
                <span style={styles.footerIconEmoji}>✉️</span>
                <a href="mailto:support@taxsky.ai" style={styles.footerLinkInline}>support@taxsky.ai</a>
              </div>
              <div style={styles.socialLinks}>
                <a href="https://twitter.com/taxskyai" style={styles.socialIcon} target="_blank" rel="noopener noreferrer" aria-label="Twitter">𝕏</a>
                <a href="https://linkedin.com/company/taxsky" style={styles.socialIcon} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">in</a>
                <a href="https://youtube.com/@taxskyai" style={styles.socialIcon} target="_blank" rel="noopener noreferrer" aria-label="YouTube">▶</a>
                <a href="https://instagram.com/taxskyai" style={styles.socialIcon} target="_blank" rel="noopener noreferrer" aria-label="Instagram">📷</a>
              </div>
            </div>

            {/* Column 2: Services */}
            <div style={styles.footerColumn}>
              <h4 style={styles.footerHeading}>SERVICES</h4>
              <a href="/services/federal" style={styles.footerLink}>Federal Tax Filing</a>
              <a href="/services/state" style={styles.footerLink}>State Tax Filing</a>
              <a href="/services/self-employment" style={styles.footerLink}>Self-Employment Taxes</a>
              <a href="/services/1099" style={styles.footerLink}>1099 Processing</a>
              <a href="/calculator" style={styles.footerLink}>Tax Refund Calculator</a>
              <a href="/cpa" style={styles.footerLink}>🧑‍💼 CPA Portal</a>
            </div>

            {/* Column 3: Company (NEW!) */}
            <div style={styles.footerColumn}>
              <h4 style={styles.footerHeading}>COMPANY</h4>
              <a href="/faq" style={styles.footerLink}>FAQ</a>
              <a href="/investor" style={styles.footerLink}>Investor Relations</a>
              <a href="/career" style={styles.footerLink}>Careers</a>
              <a href="/news" style={styles.footerLink}>News</a>
              <a href="/pricing" style={styles.footerLink}>Pricing</a>
              <a href="/about" style={styles.footerLink}>About Us</a>
            </div>

            {/* Column 4: About & Trust Badges */}
            <div style={styles.footerColumn}>
              <h4 style={styles.footerHeading}>ABOUT TAXSKY</h4>
              <p style={styles.footerAbout}>
                TaxSky AI is dedicated to providing smart, AI-powered tax preparation solutions. 
                Our mission is to maximize your refund while minimizing your stress. 
                File taxes through simple chat - no forms, no uploads, just answers.
              </p>
              <div style={styles.footerBadges}>
                <span style={styles.trustBadgeSmall}>✓ IRS E-File</span>
                <span style={styles.trustBadgeSmall}>✓ SOC 2</span>
                <span style={styles.trustBadgeSmall}>✓ 256-bit SSL</span>
              </div>
            </div>
          </div>

          {/* Footer Bottom with Policy Links */}
          <div style={styles.footerBottom}>
            <p style={styles.footerCopyright}>{t.footer.copyright}</p>
            <div style={styles.footerBottomLinks}>
              <a href="/privacy" style={styles.footerBottomLink}>Privacy Policy</a>
              <span style={styles.footerDivider}>•</span>
              <a href="/terms" style={styles.footerBottomLink}>Terms of Service</a>
              <span style={styles.footerDivider}>•</span>
              <a href="/security" style={styles.footerBottomLink}>Security</a>
            </div>
          </div>
        </footer>
      </div>

      {/* Global Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
          font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .chat-preview-hover:hover {
          border-color: rgba(99, 102, 241, 0.5) !important;
          box-shadow: 0 8px 32px rgba(99, 102, 241, 0.2) !important;
          transform: translateY(-2px);
        }
        
        /* Mobile Responsive Fixes */
        @media (min-width: 900px) {
          .main-content-grid {
            grid-template-columns: 1fr 420px !important;
            gap: 60px !important;
          }
        }
        
        @media (max-width: 899px) {
          .main-content-grid {
            grid-template-columns: 1fr !important;
            gap: 30px !important;
          }
          
          .right-column-form {
            order: -1;
          }
          
          .hero-title-main {
            font-size: 32px !important;
          }
        }
        
        @media (max-width: 480px) {
          .hero-title-main {
            font-size: 28px !important;
          }
          
          .stats-row-grid {
            gap: 16px !important;
          }
          
          .form-card-main {
            padding: 20px !important;
          }
          
          .comparison-table {
            overflow-x: auto;
          }
        }
        
        ::selection {
          background: #6366f1;
          color: white;
        }
      `}</style>
    </div>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = {
  page: {
    minHeight: '100vh',
    background: '#0a0a0f',
    position: 'relative',
    overflowX: 'hidden',
    overflowY: 'auto',
  },
  
  bgGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'radial-gradient(ellipse at 30% 0%, rgba(99, 102, 241, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 70% 100%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)',
  },
  
  bgOrbs: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  
  orb: {
    position: 'absolute',
    borderRadius: '50%',
    filter: 'blur(80px)',
    animation: 'pulse 10s ease-in-out infinite',
  },
  
  orb1: {
    width: 500,
    height: 500,
    background: 'rgba(99, 102, 241, 0.15)',
    top: '-15%',
    left: '-10%',
  },
  
  orb2: {
    width: 400,
    height: 400,
    background: 'rgba(139, 92, 246, 0.12)',
    bottom: '-10%',
    right: '-5%',
    animationDelay: '3s',
  },
  
  orb3: {
    width: 250,
    height: 250,
    background: 'rgba(6, 182, 212, 0.1)',
    top: '50%',
    right: '20%',
    animationDelay: '6s',
  },
  
  container: {
    position: 'relative',
    maxWidth: 1200,
    margin: '0 auto',
    padding: '30px 24px',
    transition: 'all 0.6s ease-out',
  },
  
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  
  langSwitch: {
    display: 'flex',
    gap: 6,
    background: 'rgba(255,255,255,0.05)',
    padding: 4,
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.08)',
  },
  
  langBtn: {
    width: 38,
    height: 38,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    background: 'transparent',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  
  langBtnActive: {
    background: 'rgba(99, 102, 241, 0.3)',
    boxShadow: '0 0 12px rgba(99, 102, 241, 0.3)',
  },
  
  mainContent: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: 40,
    alignItems: 'start',
    marginBottom: 60,
  },
  
  leftColumn: {
    paddingTop: 20,
  },
  
  greeting: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 8,
  },
  
  heroTitle: {
    fontSize: 48,
    fontWeight: 700,
    color: '#fff',
    lineHeight: 1.1,
    marginBottom: 16,
  },
  
  heroHighlight: {
    background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  
  heroSubtitle: {
    fontSize: 18,
    color: '#94a3b8',
    lineHeight: 1.6,
    marginBottom: 32,
  },
  
  chatPreview: {
    background: 'rgba(15, 23, 42, 0.8)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 20,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  
  chatHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  
  chatHeaderText: {
    display: 'flex',
    flexDirection: 'column',
  },
  
  chatName: {
    fontSize: 15,
    fontWeight: 600,
    color: '#fff',
  },
  
  chatStatus: {
    fontSize: 12,
    color: '#10b981',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  
  onlineDot: {
    width: 6,
    height: 6,
    background: '#10b981',
    borderRadius: '50%',
  },
  
  chatMessages: {
    maxHeight: 200,
    overflowY: 'auto',
    marginBottom: 12,
  },
  
  chatMessage: {
    marginBottom: 10,
    animation: 'fadeInUp 0.4s ease forwards',
  },
  
  chatMessageUser: {
    textAlign: 'right',
  },
  
  chatMessageResult: {
    textAlign: 'center',
  },
  
  chatMessageAI: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
  },
  
  chatAIAvatar: {
    fontSize: 18,
  },
  
  chatMessageText: {
    fontSize: 14,
    color: '#e2e8f0',
    lineHeight: 1.5,
  },
  
  chatMessageUserBubble: {
    display: 'inline-block',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    padding: '8px 14px',
    borderRadius: 16,
    borderBottomRightRadius: 4,
  },
  
  chatResultCard: {
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    padding: '16px 24px',
    borderRadius: 16,
    marginTop: 8,
  },
  
  chatResultLabel: {
    fontSize: 12,
    color: '#10b981',
    marginBottom: 4,
  },
  
  chatResultAmount: {
    fontSize: 28,
    fontWeight: 700,
    color: '#10b981',
  },
  
  chatResultConfetti: {
    fontSize: 20,
    marginTop: 4,
  },
  
  chatInputPreview: {
    display: 'flex',
    gap: 8,
  },
  
  chatInput: {
    flex: 1,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: '12px 16px',
    fontSize: 14,
    color: '#fff',
    outline: 'none',
  },
  
  chatSendBtn: {
    width: 44,
    height: 44,
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    border: 'none',
    borderRadius: 12,
    color: '#fff',
    fontSize: 18,
    cursor: 'pointer',
  },
  
  chatClickHint: {
    textAlign: 'center',
    fontSize: 12,
    color: '#64748b',
    marginTop: 12,
  },
  
  statsRow: {
    display: 'flex',
    gap: 24,
    marginTop: 32,
    flexWrap: 'wrap',
  },
  
  statItem: {
    display: 'flex',
    flexDirection: 'column',
  },
  
  statValue: {
    fontSize: 24,
    fontWeight: 700,
    color: '#fff',
  },
  
  statLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  
  rightColumn: {},
  
  formCard: {
    background: 'rgba(15, 23, 42, 0.8)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 24,
    padding: 32,
  },
  
  formTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: '#fff',
    marginBottom: 24,
    textAlign: 'center',
  },
  
  formGroup: {
    marginBottom: 20,
  },
  
  label: {
    display: 'block',
    fontSize: 14,
    fontWeight: 600,
    color: '#e2e8f0',
    marginBottom: 8,
  },
  
  selectWrap: {
    position: 'relative',
  },
  
  select: {
    width: '100%',
    padding: '14px 16px',
    fontSize: 15,
    color: '#fff',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 12,
    appearance: 'none',
    cursor: 'pointer',
    outline: 'none',
  },
  
  selectArrow: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#64748b',
    fontSize: 10,
    pointerEvents: 'none',
  },
  
  stateBadge: {
    display: 'inline-block',
    padding: '6px 12px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    marginTop: 10,
    border: '1px solid',
  },
  
  hint: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 8,
  },
  
  error: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 16px',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    color: '#fca5a5',
    fontSize: 14,
    marginBottom: 16,
  },
  
  ctaButton: {
    width: '100%',
    padding: '16px 24px',
    fontSize: 16,
    fontWeight: 700,
    color: '#fff',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    border: 'none',
    borderRadius: 14,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  
  buttonContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  
  spinner: {
    width: 18,
    height: 18,
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  
  dividerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    margin: '20px 0',
  },
  
  dividerLine: {
    flex: 1,
    height: 1,
    background: 'rgba(255,255,255,0.1)',
  },
  
  dividerText: {
    fontSize: 13,
    color: '#64748b',
  },
  
  googleButton: {
    width: '100%',
    padding: '14px 24px',
    fontSize: 15,
    fontWeight: 600,
    color: '#fff',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 14,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    transition: 'all 0.2s',
  },
  
  secureNote: {
    textAlign: 'center',
    fontSize: 13,
    color: '#64748b',
    marginTop: 20,
  },
  
  trustBadges: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
  },
  
  trustBadge: {
    fontSize: 11,
    color: '#10b981',
    background: 'rgba(16, 185, 129, 0.1)',
    padding: '4px 10px',
    borderRadius: 6,
  },
  
  // Features Section
  features: {
    marginBottom: 60,
  },
  
  featuresTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 36,
  },
  
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 20,
  },
  
  featureCard: {
    padding: 24,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 16,
    transition: 'all 0.3s ease',
    textAlign: 'center',
  },
  
  featureIcon: {
    fontSize: 36,
    marginBottom: 16,
  },
  
  featureTitle: {
    fontSize: 17,
    fontWeight: 700,
    color: '#fff',
    marginBottom: 8,
  },
  
  featureDesc: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 1.5,
  },
  
  // ✅ NEW: Comparison Section Styles
  comparisonSection: {
    marginBottom: 80,
    maxWidth: 1000,
    margin: '0 auto 80px',
    padding: '0 20px',
  },

  comparisonHeader: {
    textAlign: 'center',
    marginBottom: 40,
  },

  comparisonBadge: {
    display: 'inline-block',
    fontSize: 14,
    fontWeight: 600,
    color: '#10b981',
    background: 'rgba(16, 185, 129, 0.1)',
    padding: '8px 16px',
    borderRadius: 20,
    marginBottom: 16,
  },
  
  comparisonTitle: {
    fontSize: 32,
    fontWeight: 700,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },

  comparisonSubtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
  },

  comparisonTable: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20,
    overflow: 'hidden',
  },

  comparisonHeaderRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1.2fr 1fr 1fr 1fr',
    background: 'rgba(99, 102, 241, 0.1)',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },

  comparisonFeatureHeader: {
    padding: '18px 24px',
    fontSize: 14,
    fontWeight: 700,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  comparisonBrandHeader: {
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(99, 102, 241, 0.15)',
  },

  comparisonBrandLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },

  taxskyMini: {
    fontSize: 18,
  },

  comparisonBrandName: {
    fontSize: 14,
    fontWeight: 700,
    color: '#fff',
  },

  comparisonCompetitorHeader: {
    padding: '18px 16px',
    fontSize: 13,
    fontWeight: 600,
    color: '#64748b',
    textAlign: 'center',
    borderLeft: '1px solid rgba(255,255,255,0.05)',
  },

  comparisonRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1.2fr 1fr 1fr 1fr',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    transition: 'background 0.2s ease',
  },

  comparisonFeature: {
    padding: '16px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    fontSize: 14,
    color: '#e2e8f0',
  },

  comparisonCheck: {
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    color: '#10b981',
    fontWeight: 600,
    background: 'rgba(16, 185, 129, 0.08)',
  },

  comparisonX: {
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    color: '#ef4444',
    borderLeft: '1px solid rgba(255,255,255,0.05)',
  },

  comparisonHighlight: {
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    fontWeight: 700,
    color: '#10b981',
    background: 'rgba(16, 185, 129, 0.08)',
  },

  comparisonNeutral: {
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    color: '#94a3b8',
    borderLeft: '1px solid rgba(255,255,255,0.05)',
  },

  comparisonPartial: {
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    color: '#f59e0b',
    borderLeft: '1px solid rgba(255,255,255,0.05)',
  },

  comparisonCTA: {
    textAlign: 'center',
    marginTop: 40,
    padding: '30px',
    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(16, 185, 129, 0.1))',
    borderRadius: 20,
    border: '1px solid rgba(99, 102, 241, 0.2)',
  },

  comparisonCTAText: {
    fontSize: 18,
    color: '#e2e8f0',
    marginBottom: 16,
  },

  comparisonCTAButton: {
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    border: 'none',
    padding: '16px 32px',
    borderRadius: 12,
    fontSize: 16,
    fontWeight: 700,
    color: '#fff',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  
  // Footer Styles - IMPROVED 4-Column Layout
  footerSection: {
    marginTop: 80,
    paddingTop: 60,
    borderTop: '1px solid rgba(255,255,255,0.08)',
  },
  
  footerGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 40,
    marginBottom: 48,
  },

  '@media (max-width: 1024px)': {
    footerGrid: {
      gridTemplateColumns: 'repeat(2, 1fr)',
    },
  },

  '@media (max-width: 640px)': {
    footerGrid: {
      gridTemplateColumns: '1fr',
    },
  },
  
  footerColumn: {
    display: 'flex',
    flexDirection: 'column',
  },
  
  footerHeading: {
    fontSize: 13,
    fontWeight: 700,
    color: '#fff',
    marginBottom: 24,
    letterSpacing: '1px',
    textTransform: 'uppercase',
  },
  
  footerItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 16,
    lineHeight: 1.6,
  },
  
  footerIconEmoji: {
    fontSize: 16,
    marginTop: 2,
  },
  
  footerLink: {
    display: 'block',
    fontSize: 14,
    color: '#94a3b8',
    textDecoration: 'none',
    marginBottom: 14,
    transition: 'color 0.2s',
  },

  footerLinkInline: {
    color: '#94a3b8',
    textDecoration: 'none',
    transition: 'color 0.2s',
  },
  
  footerAbout: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 1.7,
    marginBottom: 20,
  },
  
  footerBadges: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  
  trustBadgeSmall: {
    fontSize: 11,
    color: '#64748b',
    background: 'rgba(255,255,255,0.05)',
    padding: '6px 12px',
    borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.08)',
  },
  
  socialLinks: {
    display: 'flex',
    gap: 10,
    marginTop: 20,
  },
  
  socialIcon: {
    width: 38,
    height: 38,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    color: '#94a3b8',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 600,
    transition: 'all 0.2s',
  },
  
  footerBottom: {
    paddingTop: 32,
    borderTop: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
  
  footerCopyright: {
    fontSize: 13,
    color: '#475569',
  },
  
  footerBottomLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  
  footerBottomLink: {
    fontSize: 13,
    color: '#64748b',
    textDecoration: 'none',
    transition: 'color 0.2s',
  },
  
  footerDivider: {
    color: '#334155',
  },
};