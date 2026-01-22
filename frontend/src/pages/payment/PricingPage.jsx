// ============================================================
// TAXSKY AI - PRICING PAGE v2.1 (FIXED PAYMENT FLOW)
// ============================================================
// Updated UI colors to match TaxSky brand guidelines
// FIXED: handleSelectPlan now redirects to checkout properly
// ============================================================

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// ============================================================
// PRICING DATA
// ============================================================
const PRICING_PLANS = {
  free: {
    id: "free",
    name: "Free Estimate",
    price: 0,
    description: "See your refund before you pay",
    incomeLimit: "Any",
    formsIncluded: "Unlimited (estimate only)",
    features: [
      "Unlimited tax estimates",
      "AI-powered calculations",
      "See potential refund",
      "No credit card required",
    ],
    notIncluded: [
      "E-file to IRS",
      "Download Form 1040",
      "State return",
    ],
    cta: "Start Free",
    popular: false,
    color: "#64748b",
    gradient: "linear-gradient(135deg, #475569, #64748b)",
  },
  basic: {
    id: "basic",
    name: "Basic",
    price: 29.99,
    description: "Simple W-2 income only",
    incomeLimit: "Under $50,000",
    formsIncluded: "1 W-2",
    features: [
      "1 W-2 form",
      "Federal e-file",
      "Download Form 1040",
      "Max refund guarantee",
      "Chat support",
    ],
    notIncluded: [
      "Multiple W-2s",
      "1099 forms",
      "State return (+$19.99)",
    ],
    cta: "Choose Basic",
    popular: false,
    color: "#06b6d4",
    gradient: "linear-gradient(135deg, #0891b2, #06b6d4)",
  },
  standard: {
    id: "standard",
    name: "Standard",
    price: 49.99,
    description: "Most popular for employees",
    incomeLimit: "Under $100,000",
    formsIncluded: "Up to 3 forms",
    features: [
      "Up to 3 forms (W-2, 1099)",
      "Federal e-file",
      "Download Form 1040",
      "Interest & dividends",
      "Max refund guarantee",
      "Priority chat support",
    ],
    notIncluded: [
      "Self-employment income",
      "State return (+$19.99)",
    ],
    cta: "Choose Standard",
    popular: true,
    color: "#8b5cf6",
    gradient: "linear-gradient(135deg, #6366f1, #8b5cf6)",
  },
  plus: {
    id: "plus",
    name: "Plus",
    price: 79.99,
    description: "Multiple income sources",
    incomeLimit: "Under $200,000",
    formsIncluded: "Up to 5 forms",
    features: [
      "Up to 5 forms",
      "Federal e-file",
      "Retirement income (1099-R)",
      "Social Security (SSA-1099)",
      "Capital gains (1099-B)",
      "Rental income",
      "Max refund guarantee",
      "Priority support",
    ],
    notIncluded: [
      "Self-employment",
      "State return (+$19.99)",
    ],
    cta: "Choose Plus",
    popular: false,
    color: "#6366f1",
    gradient: "linear-gradient(135deg, #4f46e5, #6366f1)",
  },
  premium: {
    id: "premium",
    name: "Premium",
    price: 129.99,
    description: "High income & complex returns",
    incomeLimit: "$200,000+",
    formsIncluded: "Unlimited forms",
    features: [
      "Unlimited forms",
      "Federal e-file",
      "All income types",
      "Itemized deductions",
      "Investment income",
      "Rental properties",
      "Max refund guarantee",
      "Priority phone support",
      "Audit protection (1 year)",
    ],
    notIncluded: [
      "State return (+$19.99)",
    ],
    cta: "Choose Premium",
    popular: false,
    color: "#f59e0b",
    gradient: "linear-gradient(135deg, #d97706, #f59e0b)",
  },
  selfEmployed: {
    id: "selfEmployed",
    name: "Self-Employed",
    price: 89.99,
    description: "Freelancers & gig workers",
    incomeLimit: "Any",
    formsIncluded: "1099-NEC + Schedule C",
    features: [
      "1099-NEC processing",
      "Schedule C (business income)",
      "Business expense deductions",
      "Home office deduction",
      "Self-employment tax calc",
      "Quarterly estimate help",
      "Federal e-file",
      "Max refund guarantee",
    ],
    notIncluded: [
      "State return (+$19.99)",
    ],
    cta: "Choose Self-Employed",
    popular: false,
    color: "#10b981",
    gradient: "linear-gradient(135deg, #059669, #10b981)",
  },
};

// ============================================================
// ADD-ON PRICING
// ============================================================
const ADDONS = [
  { id: "state", name: "State Tax Return", price: 19.99, description: "File your state taxes" },
  { id: "extra_w2", name: "Additional W-2", price: 9.99, description: "Per extra W-2 form" },
  { id: "1099_nec", name: "1099-NEC", price: 14.99, description: "Self-employment income" },
  { id: "1099_int", name: "1099-INT", price: 4.99, description: "Interest income" },
  { id: "1099_div", name: "1099-DIV", price: 4.99, description: "Dividend income" },
  { id: "1099_r", name: "1099-R", price: 9.99, description: "Retirement distribution" },
  { id: "1099_g", name: "1099-G", price: 4.99, description: "Unemployment income" },
  { id: "1099_b", name: "1099-B", price: 14.99, description: "Capital gains/stocks" },
  { id: "ssa_1099", name: "SSA-1099", price: 4.99, description: "Social Security benefits" },
  { id: "schedule_c", name: "Schedule C", price: 29.99, description: "Business income/expenses" },
  { id: "schedule_e", name: "Schedule E", price: 29.99, description: "Rental income" },
  { id: "cpa_review", name: "CPA Review", price: 49.99, description: "Licensed CPA reviews your return" },
  { id: "audit_protection", name: "Audit Protection", price: 39.99, description: "3-year audit assistance" },
  { id: "priority_support", name: "Priority Support", price: 19.99, description: "Phone & chat priority" },
];

// ============================================================
// TRANSLATIONS
// ============================================================
const translations = {
  en: {
    title: "Simple, Transparent Pricing",
    subtitle: "No hidden fees. Pay only when you file.",
    calculator: {
      title: "💰 Calculate Your Price",
      income: "Your Total Income",
      w2Count: "Number of W-2s",
      has1099: "Do you have 1099 income?",
      hasState: "File state return?",
      result: "Your Estimated Price",
      recommended: "Recommended Plan",
    },
    features: {
      title: "All Plans Include",
      items: [
        "🔐 Bank-level 256-bit encryption",
        "✅ IRS e-file authorized",
        "💰 Maximum refund guarantee",
        "🤖 AI-powered accuracy check",
        "📱 File from any device",
        "💬 Chat support",
      ],
    },
    guarantee: {
      title: "Our Guarantees",
      items: [
        {
          icon: "💰",
          title: "Max Refund Guarantee",
          desc: "Get the biggest refund you're entitled to, or we'll pay you the difference.",
        },
        {
          icon: "✅",
          title: "100% Accuracy",
          desc: "If there's an IRS error due to our calculations, we pay the penalty.",
        },
        {
          icon: "🔒",
          title: "Secure & Private",
          desc: "Your data is encrypted and never sold. SOC 2 certified.",
        },
        {
          icon: "😊",
          title: "Satisfaction Guarantee",
          desc: "Not happy? Get a full refund before filing.",
        },
      ],
    },
    faq: {
      title: "Pricing FAQ",
      items: [
        {
          q: "When do I pay?",
          a: "You only pay when you're ready to file. Estimate your refund for free, then pay to e-file to the IRS.",
        },
        {
          q: "What if I need more forms than my plan includes?",
          a: "You can add extra forms à la carte, or upgrade to a higher plan. We'll recommend the best option.",
        },
        {
          q: "Is state filing included?",
          a: "State filing is $19.99 extra for all plans. Some states have no income tax, so you may not need it.",
        },
        {
          q: "What's included in CPA Review?",
          a: "A licensed CPA reviews your entire return for accuracy and optimization before filing. They'll suggest additional deductions you may have missed.",
        },
        {
          q: "Can I get a refund?",
          a: "Yes! If you're not satisfied before filing, we offer a full refund. After filing, refunds are not available as we've already submitted to the IRS.",
        },
        {
          q: "Do you support all states?",
          a: "We currently support California fully, plus all no-income-tax states (TX, FL, WA, etc.) and flat-tax states. More states coming soon!",
        },
      ],
    },
    cta: {
      title: "Ready to File?",
      subtitle: "Start your free estimate now. No credit card required.",
      button: "Start Free Estimate",
    },
    perYear: "/year",
    popular: "Most Popular",
    included: "Included",
    notIncluded: "Not included",
    addons: "Add-Ons",
    comparePlans: "Compare All Plans",
  },
  vi: {
    title: "Giá Đơn Giản, Minh Bạch",
    subtitle: "Không phí ẩn. Chỉ trả khi bạn nộp thuế.",
    calculator: {
      title: "💰 Tính Giá Của Bạn",
      income: "Tổng Thu Nhập",
      w2Count: "Số lượng W-2",
      has1099: "Bạn có thu nhập 1099?",
      hasState: "Nộp thuế tiểu bang?",
      result: "Giá Ước Tính",
      recommended: "Gói Đề Xuất",
    },
    features: {
      title: "Tất Cả Gói Bao Gồm",
      items: [
        "🔐 Mã hóa 256-bit cấp ngân hàng",
        "✅ IRS ủy quyền e-file",
        "💰 Đảm bảo hoàn thuế tối đa",
        "🤖 AI kiểm tra chính xác",
        "📱 Nộp từ mọi thiết bị",
        "💬 Hỗ trợ chat",
      ],
    },
    guarantee: {
      title: "Cam Kết Của Chúng Tôi",
      items: [
        {
          icon: "💰",
          title: "Đảm Bảo Hoàn Thuế Tối Đa",
          desc: "Nhận hoàn thuế lớn nhất bạn được quyền, hoặc chúng tôi trả chênh lệch.",
        },
        {
          icon: "✅",
          title: "Chính Xác 100%",
          desc: "Nếu có lỗi IRS do tính toán của chúng tôi, chúng tôi trả tiền phạt.",
        },
        {
          icon: "🔒",
          title: "An Toàn & Riêng Tư",
          desc: "Dữ liệu được mã hóa và không bao giờ bán. Chứng nhận SOC 2.",
        },
        {
          icon: "😊",
          title: "Đảm Bảo Hài Lòng",
          desc: "Không hài lòng? Hoàn tiền đầy đủ trước khi nộp.",
        },
      ],
    },
    faq: {
      title: "Câu Hỏi Về Giá",
      items: [
        {
          q: "Khi nào tôi phải trả?",
          a: "Bạn chỉ trả khi sẵn sàng nộp. Ước tính hoàn thuế miễn phí, sau đó trả để e-file đến IRS.",
        },
        {
          q: "Nếu tôi cần nhiều form hơn gói bao gồm?",
          a: "Bạn có thể thêm form riêng lẻ, hoặc nâng cấp gói cao hơn. Chúng tôi sẽ đề xuất tùy chọn tốt nhất.",
        },
        {
          q: "Nộp thuế tiểu bang có bao gồm không?",
          a: "Nộp tiểu bang thêm $19.99 cho tất cả gói. Một số tiểu bang không có thuế thu nhập.",
        },
        {
          q: "CPA Review bao gồm gì?",
          a: "CPA có giấy phép xem xét toàn bộ tờ khai của bạn về độ chính xác và tối ưu hóa trước khi nộp.",
        },
        {
          q: "Tôi có thể hoàn tiền không?",
          a: "Có! Nếu không hài lòng trước khi nộp, chúng tôi hoàn tiền đầy đủ.",
        },
        {
          q: "Bạn hỗ trợ tất cả tiểu bang?",
          a: "Chúng tôi hiện hỗ trợ California đầy đủ, cộng với các tiểu bang không thuế thu nhập và thuế cố định.",
        },
      ],
    },
    cta: {
      title: "Sẵn Sàng Nộp?",
      subtitle: "Bắt đầu ước tính miễn phí. Không cần thẻ tín dụng.",
      button: "Bắt Đầu Miễn Phí",
    },
    perYear: "/năm",
    popular: "Phổ Biến Nhất",
    included: "Bao gồm",
    notIncluded: "Không bao gồm",
    addons: "Dịch Vụ Thêm",
    comparePlans: "So Sánh Tất Cả Gói",
  },
  es: {
    title: "Precios Simples y Transparentes",
    subtitle: "Sin cargos ocultos. Paga solo cuando declares.",
    calculator: {
      title: "💰 Calcula Tu Precio",
      income: "Tu Ingreso Total",
      w2Count: "Número de W-2s",
      has1099: "¿Tienes ingresos 1099?",
      hasState: "¿Declarar impuestos estatales?",
      result: "Tu Precio Estimado",
      recommended: "Plan Recomendado",
    },
    features: {
      title: "Todos los Planes Incluyen",
      items: [
        "🔐 Cifrado 256-bit nivel bancario",
        "✅ IRS autorizado para e-file",
        "💰 Garantía de reembolso máximo",
        "🤖 Verificación de precisión con AI",
        "📱 Declara desde cualquier dispositivo",
        "💬 Soporte por chat",
      ],
    },
    guarantee: {
      title: "Nuestras Garantías",
      items: [
        {
          icon: "💰",
          title: "Garantía de Reembolso Máximo",
          desc: "Obtén el mayor reembolso al que tienes derecho, o te pagamos la diferencia.",
        },
        {
          icon: "✅",
          title: "100% Precisión",
          desc: "Si hay un error del IRS debido a nuestros cálculos, pagamos la penalidad.",
        },
        {
          icon: "🔒",
          title: "Seguro y Privado",
          desc: "Tus datos están cifrados y nunca se venden. Certificado SOC 2.",
        },
        {
          icon: "😊",
          title: "Garantía de Satisfacción",
          desc: "¿No estás contento? Reembolso completo antes de declarar.",
        },
      ],
    },
    faq: {
      title: "Preguntas de Precios",
      items: [
        {
          q: "¿Cuándo pago?",
          a: "Solo pagas cuando estés listo para declarar. Estima tu reembolso gratis, luego paga para e-file al IRS.",
        },
        {
          q: "¿Qué si necesito más formularios?",
          a: "Puedes agregar formularios extra individualmente, o actualizar a un plan superior.",
        },
        {
          q: "¿Está incluida la declaración estatal?",
          a: "La declaración estatal es $19.99 extra para todos los planes.",
        },
        {
          q: "¿Qué incluye la Revisión CPA?",
          a: "Un CPA licenciado revisa toda tu declaración para precisión y optimización antes de enviar.",
        },
        {
          q: "¿Puedo obtener un reembolso?",
          a: "¡Sí! Si no estás satisfecho antes de declarar, ofrecemos reembolso completo.",
        },
        {
          q: "¿Soportan todos los estados?",
          a: "Actualmente soportamos California completamente, más estados sin impuesto sobre la renta y estados de tasa fija.",
        },
      ],
    },
    cta: {
      title: "¿Listo para Declarar?",
      subtitle: "Comienza tu estimación gratis. No se requiere tarjeta de crédito.",
      button: "Comenzar Gratis",
    },
    perYear: "/año",
    popular: "Más Popular",
    included: "Incluido",
    notIncluded: "No incluido",
    addons: "Complementos",
    comparePlans: "Comparar Todos los Planes",
  },
};

// ============================================================
// PRICING CALCULATOR COMPONENT
// ============================================================
const PricingCalculator = ({ language, onSelectPlan }) => {
  const t = translations[language].calculator;
  const [income, setIncome] = useState(50000);
  const [w2Count, setW2Count] = useState(1);
  const [has1099, setHas1099] = useState(false);
  const [hasState, setHasState] = useState(true);

  // Calculate recommended plan
  const getRecommendedPlan = () => {
    if (has1099) return PRICING_PLANS.selfEmployed;
    
    const totalForms = w2Count + (has1099 ? 1 : 0);
    
    if (income >= 200000) return PRICING_PLANS.premium;
    if (income >= 100000 || totalForms > 3) return PRICING_PLANS.plus;
    if (totalForms > 1 || income >= 50000) return PRICING_PLANS.standard;
    return PRICING_PLANS.basic;
  };

  const recommended = getRecommendedPlan();
  const statePrice = hasState ? 19.99 : 0;
  const extraW2Price = Math.max(0, w2Count - (recommended.id === 'basic' ? 1 : recommended.id === 'standard' ? 2 : 5)) * 9.99;
  const totalPrice = recommended.price + statePrice + extraW2Price;

  return (
    <div style={styles.calculator}>
      <h3 style={styles.calculatorTitle}>{t.title}</h3>
      
      <div style={styles.calculatorGrid}>
        {/* Income Slider */}
        <div style={styles.calcField}>
          <label style={styles.calcLabel}>{t.income}</label>
          <input
            type="range"
            min="10000"
            max="500000"
            step="10000"
            value={income}
            onChange={(e) => setIncome(parseInt(e.target.value))}
            style={styles.slider}
          />
          <div style={styles.sliderValue}>${income.toLocaleString()}</div>
        </div>

        {/* W-2 Count */}
        <div style={styles.calcField}>
          <label style={styles.calcLabel}>{t.w2Count}</label>
          <div style={styles.counterRow}>
            <button 
              onClick={() => setW2Count(Math.max(0, w2Count - 1))}
              style={styles.counterBtn}
            >−</button>
            <span style={styles.counterValue}>{w2Count}</span>
            <button 
              onClick={() => setW2Count(w2Count + 1)}
              style={styles.counterBtn}
            >+</button>
          </div>
        </div>

        {/* 1099 Toggle */}
        <div style={styles.calcField}>
          <label style={styles.calcLabel}>{t.has1099}</label>
          <div style={styles.toggleRow}>
            <button
              onClick={() => setHas1099(false)}
              style={{
                ...styles.toggleBtn,
                ...(has1099 ? {} : styles.toggleBtnActive)
              }}
            >No</button>
            <button
              onClick={() => setHas1099(true)}
              style={{
                ...styles.toggleBtn,
                ...(has1099 ? styles.toggleBtnActive : {})
              }}
            >Yes</button>
          </div>
        </div>

        {/* State Toggle */}
        <div style={styles.calcField}>
          <label style={styles.calcLabel}>{t.hasState}</label>
          <div style={styles.toggleRow}>
            <button
              onClick={() => setHasState(false)}
              style={{
                ...styles.toggleBtn,
                ...(hasState ? {} : styles.toggleBtnActive)
              }}
            >No</button>
            <button
              onClick={() => setHasState(true)}
              style={{
                ...styles.toggleBtn,
                ...(hasState ? styles.toggleBtnActive : {})
              }}
            >Yes (+$19.99)</button>
          </div>
        </div>
      </div>

      {/* Result */}
      <div style={styles.calcResult}>
        <div style={styles.calcResultRow}>
          <span style={styles.calcResultLabel}>{t.recommended}</span>
          <span style={styles.calcResultPlan}>{recommended.name}</span>
        </div>
        <div style={styles.calcResultRow}>
          <span style={styles.calcResultLabel}>{t.result}</span>
          <span style={styles.calcResultPrice}>${totalPrice.toFixed(2)}</span>
        </div>
        <button 
          onClick={() => onSelectPlan(recommended.id)}
          style={styles.calcCta}
        >
          Choose {recommended.name} →
        </button>
      </div>
    </div>
  );
};

// ============================================================
// PLAN CARD COMPONENT
// ============================================================
const PlanCard = ({ plan, language, onSelect }) => {
  const t = translations[language];
  
  return (
    <div style={{
      ...styles.planCard,
      ...(plan.popular ? styles.planCardPopular : {}),
      borderColor: plan.popular ? plan.color : 'rgba(255,255,255,0.1)',
    }}>
      {plan.popular && (
        <div style={{...styles.popularBadge, background: plan.gradient}}>
          ⭐ {t.popular}
        </div>
      )}
      
      <div style={styles.planHeader}>
        <h3 style={{...styles.planName, color: plan.color}}>{plan.name}</h3>
        <p style={styles.planDesc}>{plan.description}</p>
      </div>
      
      <div style={styles.planPrice}>
        <span style={styles.planPriceAmount}>
          {plan.price === 0 ? 'Free' : `$${plan.price}`}
        </span>
        {plan.price > 0 && <span style={styles.planPricePer}>{t.perYear}</span>}
      </div>
      
      <div style={styles.planMeta}>
        <div style={styles.planMetaItem}>
          <span style={styles.planMetaLabel}>Income Limit:</span>
          <span style={styles.planMetaValue}>{plan.incomeLimit}</span>
        </div>
        <div style={styles.planMetaItem}>
          <span style={styles.planMetaLabel}>Forms:</span>
          <span style={styles.planMetaValue}>{plan.formsIncluded}</span>
        </div>
      </div>
      
      <ul style={styles.planFeatures}>
        {plan.features.map((feature, i) => (
          <li key={i} style={styles.planFeature}>
            <span style={styles.featureCheck}>✓</span>
            {feature}
          </li>
        ))}
        {plan.notIncluded && plan.notIncluded.map((item, i) => (
          <li key={`not-${i}`} style={styles.planFeatureNot}>
            <span style={styles.featureX}>✗</span>
            {item}
          </li>
        ))}
      </ul>
      
      <button 
        onClick={() => onSelect(plan.id)}
        style={{
          ...styles.planCta,
          background: plan.popular 
            ? plan.gradient
            : 'rgba(255,255,255,0.08)',
          borderColor: plan.popular ? 'transparent' : plan.color,
        }}
        onMouseEnter={(e) => {
          if (!plan.popular) {
            e.target.style.background = plan.gradient;
            e.target.style.borderColor = 'transparent';
          }
        }}
        onMouseLeave={(e) => {
          if (!plan.popular) {
            e.target.style.background = 'rgba(255,255,255,0.08)';
            e.target.style.borderColor = plan.color;
          }
        }}
      >
        {plan.cta}
      </button>
    </div>
  );
};

// ============================================================
// FAQ ITEM COMPONENT
// ============================================================
const FAQItem = ({ question, answer, isOpen, onClick }) => (
  <div style={styles.faqItem}>
    <button onClick={onClick} style={styles.faqQuestion}>
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
// MAIN PRICING PAGE COMPONENT
// ============================================================
export default function Pricing() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState("en");
  const [openFAQ, setOpenFAQ] = useState(null);
  const [showAllPlans, setShowAllPlans] = useState(false);

  useEffect(() => {
    const savedLang = localStorage.getItem("taxsky_language");
    if (savedLang) setLanguage(savedLang);
  }, []);

  const t = translations[language];

  // ============================================================
  // ✅ FIXED: handleSelectPlan with proper checkout redirect
  // ============================================================
  const handleSelectPlan = (planId) => {
    // Store selected plan
    localStorage.setItem("taxsky_selected_plan", planId);
    
    // Check if user is already logged in
    const token = localStorage.getItem('taxsky_token') || localStorage.getItem('token');
    const user = localStorage.getItem('taxsky_user') || localStorage.getItem('user');
    
    if (token && user) {
      // ✅ User is logged in - go directly to checkout
      navigate(`/checkout/${planId}`);
    } else {
      // ❌ User not logged in - go to login first, then redirect to checkout
      localStorage.setItem("taxsky_redirect_after_login", `/checkout/${planId}`);
      navigate("/login");
    }
  };
  // ============================================================

  const mainPlans = [
    PRICING_PLANS.free,
    PRICING_PLANS.basic,
    PRICING_PLANS.standard,
    PRICING_PLANS.plus,
  ];

  const allPlans = [
    ...mainPlans,
    PRICING_PLANS.premium,
    PRICING_PLANS.selfEmployed,
  ];

  return (
    <div style={styles.page}>
      {/* Background Effects */}
      <div style={styles.bgGradient} />
      <div style={styles.bgGradient2} />

      <div style={styles.container}>
        {/* Header */}
        <header style={styles.header}>
          <a href="/" style={styles.logoLink}>
            <div style={styles.logoContainer}>
              {/* TaxSky Logo SVG */}
              <svg viewBox="0 0 40 40" style={styles.logoSvg} fill="none">
                <defs>
                  <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6366f1"/>
                    <stop offset="100%" stopColor="#8b5cf6"/>
                  </linearGradient>
                </defs>
                <polygon points="20,4 32,10 32,26 20,32 8,26 8,10" fill="url(#logo-grad)" opacity="0.3"/>
                <polygon points="20,8 28,12 28,24 20,28 12,24 12,12" fill="url(#logo-grad)" opacity="0.6"/>
                <polygon points="20,12 26,15 26,22 20,25 14,22 14,15" fill="url(#logo-grad)"/>
                <path d="M20 15 L20 22 M17 17 Q20 15 23 17 Q20 19 17 21 Q20 23 23 21" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
              </svg>
              <span style={styles.logoText}>Tax<span style={styles.logoHighlight}>Sky</span> <span style={styles.logoAI}>AI</span></span>
            </div>
          </a>
          <div style={styles.headerRight}>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={styles.langSelect}
            >
              <option value="en">🇺🇸 English</option>
              <option value="vi">🇻🇳 Tiếng Việt</option>
              <option value="es">🇪🇸 Español</option>
            </select>
            <a href="/login" style={styles.loginBtn}>Log In</a>
          </div>
        </header>

        {/* Hero */}
        <div style={styles.hero}>
          <h1 style={styles.title}>{t.title}</h1>
          <p style={styles.subtitle}>{t.subtitle}</p>
        </div>

        {/* Pricing Calculator */}
        <PricingCalculator language={language} onSelectPlan={handleSelectPlan} />

        {/* Plans Grid */}
        <div style={styles.plansSection}>
          <div style={styles.plansGrid}>
            {(showAllPlans ? allPlans : mainPlans).map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                language={language}
                onSelect={handleSelectPlan}
              />
            ))}
          </div>
          
          {!showAllPlans && (
            <button
              onClick={() => setShowAllPlans(true)}
              style={styles.showMoreBtn}
            >
              {t.comparePlans} →
            </button>
          )}
        </div>

        {/* Add-ons Section */}
        <div style={styles.addonsSection}>
          <h2 style={styles.sectionTitle}>{t.addons}</h2>
          <div style={styles.addonsGrid}>
            {ADDONS.map((addon) => (
              <div key={addon.id} style={styles.addonCard}>
                <div style={styles.addonInfo}>
                  <span style={styles.addonName}>{addon.name}</span>
                  <span style={styles.addonDesc}>{addon.description}</span>
                </div>
                <span style={styles.addonPrice}>+${addon.price}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Features Section */}
        <div style={styles.featuresSection}>
          <h2 style={styles.sectionTitle}>{t.features.title}</h2>
          <div style={styles.featuresGrid}>
            {t.features.items.map((item, i) => (
              <div key={i} style={styles.featureItem}>{item}</div>
            ))}
          </div>
        </div>

        {/* Guarantees */}
        <div style={styles.guaranteeSection}>
          <h2 style={styles.sectionTitle}>{t.guarantee.title}</h2>
          <div style={styles.guaranteeGrid}>
            {t.guarantee.items.map((item, i) => (
              <div key={i} style={styles.guaranteeCard}>
                <span style={styles.guaranteeIcon}>{item.icon}</span>
                <h3 style={styles.guaranteeTitle}>{item.title}</h3>
                <p style={styles.guaranteeDesc}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div style={styles.faqSection}>
          <h2 style={styles.sectionTitle}>{t.faq.title}</h2>
          <div style={styles.faqList}>
            {t.faq.items.map((item, i) => (
              <FAQItem
                key={i}
                question={item.q}
                answer={item.a}
                isOpen={openFAQ === i}
                onClick={() => setOpenFAQ(openFAQ === i ? null : i)}
              />
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={styles.ctaSection}>
          <h2 style={styles.ctaTitle}>{t.cta.title}</h2>
          <p style={styles.ctaSubtitle}>{t.cta.subtitle}</p>
          <button onClick={() => navigate("/")} style={styles.ctaButton}>
            {t.cta.button}
          </button>
        </div>

        {/* Footer */}
        <footer style={styles.footer}>
          <p style={styles.footerText}>© 2025 TaxSky AI Inc. All rights reserved.</p>
          <div style={styles.footerLinks}>
            <a href="/privacy" style={styles.footerLink}>Privacy Policy</a>
            <span style={styles.footerDivider}>•</span>
            <a href="/terms" style={styles.footerLink}>Terms of Service</a>
            <span style={styles.footerDivider}>•</span>
            <a href="/" style={styles.footerLink}>Home</a>
          </div>
        </footer>
      </div>

      {/* Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Space Grotesk', sans-serif; }
        
        /* Custom slider styling */
        input[type="range"] {
          -webkit-appearance: none;
          width: 100%;
          height: 8px;
          background: linear-gradient(90deg, #6366f1, #8b5cf6);
          border-radius: 4px;
          outline: none;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 20px;
          height: 20px;
          background: #fff;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: #fff;
          border-radius: 50%;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        
        /* Responsive adjustments */
        @media (max-width: 768px) {
          .plans-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// STYLES - Updated with TaxSky brand colors
// ============================================================
const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)',
    color: '#fff',
    position: 'relative',
    overflow: 'hidden',
  },
  
  bgGradient: {
    position: 'fixed',
    top: '-50%',
    right: '-30%',
    width: '60%',
    height: '100%',
    background: 'radial-gradient(ellipse, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  
  bgGradient2: {
    position: 'fixed',
    bottom: '-30%',
    left: '-20%',
    width: '50%',
    height: '80%',
    background: 'radial-gradient(ellipse, rgba(139, 92, 246, 0.1) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  
  container: {
    position: 'relative',
    maxWidth: 1200,
    margin: '0 auto',
    padding: '24px',
  },
  
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 48,
  },
  
  logoLink: {
    textDecoration: 'none',
  },
  
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  
  logoSvg: {
    width: 40,
    height: 40,
  },
  
  logoText: {
    fontSize: 24,
    fontWeight: 700,
    color: '#fff',
  },
  
  logoHighlight: {
    background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  
  logoAI: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 4,
  },
  
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  
  langSelect: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: '10px 14px',
    color: '#fff',
    fontSize: 14,
    cursor: 'pointer',
    outline: 'none',
  },
  
  loginBtn: {
    padding: '10px 24px',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    border: 'none',
    borderRadius: 10,
    color: '#fff',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 600,
    transition: 'all 0.2s',
  },
  
  hero: {
    textAlign: 'center',
    marginBottom: 48,
  },
  
  title: {
    fontSize: 48,
    fontWeight: 700,
    marginBottom: 16,
    background: 'linear-gradient(135deg, #fff 0%, #94a3b8 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  
  subtitle: {
    fontSize: 20,
    color: '#94a3b8',
  },
  
  // Calculator
  calculator: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(99, 102, 241, 0.2)',
    borderRadius: 24,
    padding: 32,
    marginBottom: 48,
    backdropFilter: 'blur(10px)',
  },
  
  calculatorTitle: {
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 24,
    textAlign: 'center',
  },
  
  calculatorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 24,
    marginBottom: 24,
  },
  
  calcField: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  
  calcLabel: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: 500,
  },
  
  slider: {
    width: '100%',
    height: 8,
    background: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    appearance: 'none',
    cursor: 'pointer',
  },
  
  sliderValue: {
    fontSize: 22,
    fontWeight: 700,
    color: '#fff',
  },
  
  counterRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  
  counterBtn: {
    width: 40,
    height: 40,
    background: 'rgba(99, 102, 241, 0.2)',
    border: '1px solid rgba(99, 102, 241, 0.3)',
    borderRadius: 10,
    color: '#fff',
    fontSize: 20,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  
  counterValue: {
    fontSize: 22,
    fontWeight: 700,
    minWidth: 30,
    textAlign: 'center',
  },
  
  toggleRow: {
    display: 'flex',
    gap: 8,
  },
  
  toggleBtn: {
    flex: 1,
    padding: '10px 16px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  
  toggleBtnActive: {
    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(139, 92, 246, 0.3))',
    border: '1px solid rgba(99, 102, 241, 0.5)',
    color: '#fff',
  },
  
  calcResult: {
    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(6, 182, 212, 0.1))',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: 16,
    padding: 24,
  },
  
  calcResultRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  
  calcResultLabel: {
    fontSize: 14,
    color: '#94a3b8',
  },
  
  calcResultPlan: {
    fontSize: 18,
    fontWeight: 700,
    color: '#10b981',
  },
  
  calcResultPrice: {
    fontSize: 32,
    fontWeight: 700,
    color: '#10b981',
  },
  
  calcCta: {
    width: '100%',
    marginTop: 16,
    padding: '14px 24px',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    border: 'none',
    borderRadius: 12,
    color: '#fff',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  
  // Plans
  plansSection: {
    marginBottom: 48,
  },
  
  plansGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 20,
  },
  
  planCard: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 28,
    position: 'relative',
    transition: 'all 0.3s',
  },
  
  planCardPopular: {
    background: 'rgba(139, 92, 246, 0.08)',
    transform: 'scale(1.02)',
    boxShadow: '0 20px 50px rgba(139, 92, 246, 0.2)',
  },
  
  popularBadge: {
    position: 'absolute',
    top: -12,
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '6px 16px',
    borderRadius: 20,
    color: '#fff',
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: 'nowrap',
  },
  
  planHeader: {
    marginBottom: 20,
  },
  
  planName: {
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 4,
  },
  
  planDesc: {
    fontSize: 14,
    color: '#94a3b8',
  },
  
  planPrice: {
    marginBottom: 20,
  },
  
  planPriceAmount: {
    fontSize: 42,
    fontWeight: 700,
  },
  
  planPricePer: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 4,
  },
  
  planMeta: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  
  planMetaItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 13,
    marginBottom: 6,
  },
  
  planMetaLabel: {
    color: '#64748b',
  },
  
  planMetaValue: {
    color: '#fff',
    fontWeight: 600,
  },
  
  planFeatures: {
    listStyle: 'none',
    marginBottom: 24,
  },
  
  planFeature: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    fontSize: 14,
    color: '#e2e8f0',
    marginBottom: 10,
  },
  
  planFeatureNot: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    fontSize: 14,
    color: '#64748b',
    marginBottom: 10,
  },
  
  featureCheck: {
    color: '#10b981',
    fontWeight: 700,
  },
  
  featureX: {
    color: '#64748b',
  },
  
  planCta: {
    width: '100%',
    padding: '14px 24px',
    border: '1px solid',
    borderRadius: 12,
    color: '#fff',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  
  showMoreBtn: {
    display: 'block',
    margin: '32px auto 0',
    padding: '14px 32px',
    background: 'transparent',
    border: '1px solid rgba(99, 102, 241, 0.3)',
    borderRadius: 12,
    color: '#6366f1',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  
  // Add-ons
  addonsSection: {
    marginBottom: 48,
  },
  
  sectionTitle: {
    fontSize: 28,
    fontWeight: 700,
    textAlign: 'center',
    marginBottom: 32,
  },
  
  addonsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 12,
  },
  
  addonCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: '16px 20px',
    transition: 'all 0.2s',
  },
  
  addonInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  
  addonName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#fff',
  },
  
  addonDesc: {
    fontSize: 12,
    color: '#64748b',
  },
  
  addonPrice: {
    fontSize: 16,
    fontWeight: 700,
    color: '#10b981',
  },
  
  // Features
  featuresSection: {
    marginBottom: 48,
  },
  
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 16,
  },
  
  featureItem: {
    background: 'rgba(99, 102, 241, 0.08)',
    border: '1px solid rgba(99, 102, 241, 0.15)',
    borderRadius: 12,
    padding: '18px 22px',
    fontSize: 14,
    color: '#e2e8f0',
    fontWeight: 500,
  },
  
  // Guarantees
  guaranteeSection: {
    marginBottom: 48,
  },
  
  guaranteeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 20,
  },
  
  guaranteeCard: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 28,
    textAlign: 'center',
    transition: 'all 0.2s',
  },
  
  guaranteeIcon: {
    fontSize: 40,
    marginBottom: 16,
    display: 'block',
  },
  
  guaranteeTitle: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 10,
  },
  
  guaranteeDesc: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 1.6,
  },
  
  // FAQ
  faqSection: {
    marginBottom: 48,
    maxWidth: 800,
    margin: '0 auto 48px',
  },
  
  faqList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  
  faqItem: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14,
    overflow: 'hidden',
  },
  
  faqQuestion: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '18px 22px',
    fontSize: 15,
    fontWeight: 600,
    color: '#fff',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
  },
  
  faqIcon: {
    fontSize: 10,
    color: '#6366f1',
    transition: 'transform 0.3s ease',
  },
  
  faqAnswer: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 1.7,
    background: 'rgba(99, 102, 241, 0.05)',
    overflow: 'hidden',
    transition: 'all 0.3s ease',
  },
  
  // CTA
  ctaSection: {
    textAlign: 'center',
    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15))',
    border: '1px solid rgba(99, 102, 241, 0.25)',
    borderRadius: 28,
    padding: 56,
    marginBottom: 48,
  },
  
  ctaTitle: {
    fontSize: 36,
    fontWeight: 700,
    marginBottom: 14,
  },
  
  ctaSubtitle: {
    fontSize: 18,
    color: '#94a3b8',
    marginBottom: 28,
  },
  
  ctaButton: {
    padding: '18px 48px',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    border: 'none',
    borderRadius: 14,
    color: '#fff',
    fontSize: 18,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 8px 30px rgba(99, 102, 241, 0.4)',
    transition: 'all 0.2s',
  },
  
  // Footer
  footer: {
    borderTop: '1px solid rgba(255,255,255,0.08)',
    paddingTop: 32,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
  
  footerText: {
    fontSize: 13,
    color: '#64748b',
  },
  
  footerLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  
  footerLink: {
    fontSize: 13,
    color: '#64748b',
    textDecoration: 'none',
    transition: 'color 0.2s',
  },
  
  footerDivider: {
    color: '#334155',
  },
};