// ============================================================
// TAXSKY AI - PRICING PAGE v3.0 (CPA PRICING MODEL)
// ============================================================
// PRICING LOGIC:
// - WITHOUT CPA = $0 (FREE self-file, download PDF, mail yourself)
// - WITH CPA = Plan Price + ($59 × number of forms)
// ============================================================

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// ============================================================
// CPA FEE
// ============================================================
const CPA_FEE_PER_FORM = 59; // $59 per form (Federal=1, State=1)

// ============================================================
// PRICING DATA - Prices only apply when CPA is selected
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
      "Download Form 1040",
      "CPA Review",
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
      "Download Form 1040 PDF",
      "Print & mail to IRS",
      "Max refund guarantee",
      "Chat support",
    ],
    notIncluded: [
      "Multiple W-2s",
      "1099 forms",
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
      "Download Form 1040 PDF",
      "Print & mail to IRS",
      "Interest & dividends",
      "Max refund guarantee",
      "Priority chat support",
    ],
    notIncluded: [
      "Self-employment income",
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
      "Download Form 1040 PDF",
      "Retirement income (1099-R)",
      "Social Security (SSA-1099)",
      "Capital gains (1099-B)",
      "Rental income",
      "Max refund guarantee",
    ],
    notIncluded: [
      "Self-employment",
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
      "Download Form 1040 PDF",
      "All income types",
      "Itemized deductions",
      "Investment income",
      "Rental properties",
      "Max refund guarantee",
      "Priority phone support",
    ],
    notIncluded: [],
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
      "Download Form 1040 PDF",
      "Max refund guarantee",
    ],
    notIncluded: [],
    cta: "Choose Self-Employed",
    popular: false,
    color: "#10b981",
    gradient: "linear-gradient(135deg, #059669, #10b981)",
  },
};

// ============================================================
// TRANSLATIONS
// ============================================================
const translations = {
  en: {
    title: "Free Tax Filing",
    subtitle: "File your taxes FREE. Only pay if you want CPA review.",
    selfFile: "Self-File (FREE)",
    selfFileDesc: "Download PDF, print & mail to IRS yourself",
    withCPA: "With CPA Review",
    withCPADesc: "CPA reviews, signs & files for you",
    cpaFee: "CPA Fee",
    perForm: "per form",
    federal: "Federal",
    state: "State",
    total: "Total",
    selectPlan: "Select Plan",
    includeCPA: "Include CPA Review?",
    includeState: "Include State Return?",
    features: {
      title: "All Plans Include",
      items: [
        "🔐 Bank-level 256-bit encryption",
        "✅ IRS-accurate calculations",
        "💰 Maximum refund guarantee",
        "🤖 AI-powered accuracy check",
        "📱 File from any device",
        "💬 Chat support",
      ],
    },
    faq: {
      title: "Pricing FAQ",
      items: [
        {
          q: "Is it really free?",
          a: "Yes! You can prepare your taxes and download the PDF completely free. Only pay if you want a CPA to review and sign your return.",
        },
        {
          q: "What does CPA Review include?",
          a: "A licensed CPA reviews your entire return for accuracy, finds additional deductions, signs your return, and submits it to the IRS on your behalf.",
        },
        {
          q: "How much is CPA Review?",
          a: "CPA Review is your plan price + $59 per form. For example: Standard ($49.99) + Federal ($59) + State ($59) = $167.99 total.",
        },
        {
          q: "Can I file without CPA?",
          a: "Yes! Download your completed Form 1040 PDF for free, print it, sign it, and mail it to the IRS yourself.",
        },
        {
          q: "What states do you support?",
          a: "We fully support California (Form 540). All no-income-tax states (TX, FL, WA, etc.) don't need a state return.",
        },
      ],
    },
    cta: {
      title: "Ready to File?",
      subtitle: "Start your free tax return now. No credit card required.",
      button: "Start Free",
    },
  },
  vi: {
    title: "Khai Thuế Miễn Phí",
    subtitle: "Khai thuế MIỄN PHÍ. Chỉ trả nếu bạn muốn CPA xem xét.",
    selfFile: "Tự Nộp (MIỄN PHÍ)",
    selfFileDesc: "Tải PDF, in và gửi đến IRS",
    withCPA: "Với CPA Xem Xét",
    withCPADesc: "CPA xem xét, ký và nộp cho bạn",
    cpaFee: "Phí CPA",
    perForm: "mỗi form",
    federal: "Liên Bang",
    state: "Tiểu Bang",
    total: "Tổng",
    selectPlan: "Chọn Gói",
    includeCPA: "Bao gồm CPA?",
    includeState: "Bao gồm Thuế Tiểu Bang?",
    features: {
      title: "Tất Cả Gói Bao Gồm",
      items: [
        "🔐 Mã hóa 256-bit",
        "✅ Tính toán chính xác IRS",
        "💰 Đảm bảo hoàn thuế tối đa",
        "🤖 AI kiểm tra chính xác",
        "📱 Nộp từ mọi thiết bị",
        "💬 Hỗ trợ chat",
      ],
    },
    cta: {
      title: "Sẵn Sàng Khai Thuế?",
      subtitle: "Bắt đầu khai thuế miễn phí ngay.",
      button: "Bắt Đầu Miễn Phí",
    },
  },
  es: {
    title: "Declaración Gratis",
    subtitle: "Declara tus impuestos GRATIS. Solo paga si quieres revisión CPA.",
    selfFile: "Auto-Declarar (GRATIS)",
    selfFileDesc: "Descarga PDF, imprime y envía al IRS",
    withCPA: "Con Revisión CPA",
    withCPADesc: "CPA revisa, firma y envía por ti",
    cpaFee: "Tarifa CPA",
    perForm: "por formulario",
    federal: "Federal",
    state: "Estatal",
    total: "Total",
    selectPlan: "Seleccionar Plan",
    includeCPA: "¿Incluir CPA?",
    includeState: "¿Incluir Declaración Estatal?",
    features: {
      title: "Todos Los Planes Incluyen",
      items: [
        "🔐 Encriptación 256-bit",
        "✅ Cálculos precisos IRS",
        "💰 Garantía de máximo reembolso",
        "🤖 Verificación AI",
        "📱 Declara desde cualquier dispositivo",
        "💬 Soporte por chat",
      ],
    },
    cta: {
      title: "¿Listo para Declarar?",
      subtitle: "Comienza tu declaración gratis ahora.",
      button: "Comenzar Gratis",
    },
  },
};

// ============================================================
// PLAN CARD WITH CPA TOGGLE
// ============================================================
const PlanCard = ({ plan, language, onSelect, includeCPA, includeState }) => {
  const t = translations[language];
  
  // Calculate prices
  const selfFilePrice = 0; // Always free without CPA
  const formCount = includeState ? 2 : 1; // Federal + State
  const cpaPrice = plan.price + (CPA_FEE_PER_FORM * formCount);
  
  const displayPrice = includeCPA ? cpaPrice : selfFilePrice;
  const originalPrice = plan.price;
  
  return (
    <div style={{
      ...styles.planCard,
      ...(plan.popular ? styles.planCardPopular : {}),
      borderColor: plan.popular ? plan.color : 'rgba(255,255,255,0.1)',
    }}>
      {plan.popular && (
        <div style={{...styles.popularBadge, background: plan.gradient}}>
          ⭐ Most Popular
        </div>
      )}
      
      <div style={styles.planHeader}>
        <h3 style={{...styles.planName, color: plan.color}}>{plan.name}</h3>
        <p style={styles.planDesc}>{plan.description}</p>
      </div>
      
      {/* Price Display - Shows original price with strikethrough */}
      <div style={styles.planPrice}>
        {includeCPA ? (
          <>
            <span style={styles.planPriceAmount}>${cpaPrice.toFixed(2)}</span>
            <div style={styles.priceBreakdownSmall}>
              <span>Plan: ${plan.price.toFixed(2)}</span>
              <span>+ CPA: ${(CPA_FEE_PER_FORM * formCount).toFixed(2)}</span>
            </div>
          </>
        ) : (
          <>
            {/* Show original price crossed out, then FREE */}
            {plan.price > 0 ? (
              <div>
                <span style={{ color: '#64748b', fontSize: '18px', textDecoration: 'line-through', marginRight: '8px' }}>
                  ${plan.price.toFixed(2)}
                </span>
                <span style={{...styles.planPriceAmount, color: '#10b981'}}>$0.00</span>
                <div style={{ marginTop: '4px' }}>
                  <span style={{ 
                    display: 'inline-block',
                    padding: '4px 8px', 
                    background: 'rgba(16, 185, 129, 0.15)', 
                    borderRadius: '4px',
                    fontSize: '11px', 
                    color: '#10b981',
                    fontWeight: '600'
                  }}>
                    🎉 FREE this year!
                  </span>
                </div>
              </div>
            ) : (
              <span style={{...styles.planPriceAmount, color: '#10b981'}}>FREE</span>
            )}
            {plan.price > 0 && (
              <span style={styles.originalPrice}>
                With CPA: ${cpaPrice.toFixed(2)}
              </span>
            )}
          </>
        )}
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
        {/* Show CPA feature if selected */}
        {includeCPA && plan.id !== 'free' && (
          <li style={{...styles.planFeature, color: '#a78bfa'}}>
            <span style={{...styles.featureCheck, color: '#a78bfa'}}>✓</span>
            <strong>CPA Review & E-File</strong>
          </li>
        )}
        {plan.notIncluded && plan.notIncluded.map((item, i) => (
          <li key={`not-${i}`} style={styles.planFeatureNot}>
            <span style={styles.featureX}>✗</span>
            {item}
          </li>
        ))}
      </ul>
      
      <button 
        onClick={() => onSelect(plan.id, includeCPA, includeState)}
        style={{
          ...styles.planCta,
          background: plan.popular 
            ? plan.gradient
            : includeCPA ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : 'linear-gradient(135deg, #10b981, #34d399)',
          borderColor: 'transparent',
        }}
      >
        {includeCPA ? `Get CPA Review - $${cpaPrice.toFixed(2)}` : 'Start Free'}
      </button>
    </div>
  );
};

// ============================================================
// PRICING CALCULATOR
// ============================================================
const PricingCalculator = ({ language, onSelectPlan }) => {
  const t = translations[language];
  const [selectedPlan, setSelectedPlan] = useState('standard');
  const [includeCPA, setIncludeCPA] = useState(false);
  const [includeState, setIncludeState] = useState(true);
  
  const plan = PRICING_PLANS[selectedPlan];
  const formCount = includeState ? 2 : 1;
  
  // Calculate prices
  const selfFilePrice = 0;
  const cpaFee = CPA_FEE_PER_FORM * formCount;
  const totalWithCPA = plan.price + cpaFee;
  const totalPrice = includeCPA ? totalWithCPA : selfFilePrice;
  
  return (
    <div style={styles.calculator}>
      <h3 style={styles.calculatorTitle}>💰 Calculate Your Price</h3>
      
      {/* Plan Selection - Shows original price with strikethrough */}
      <div style={styles.calcSection}>
        <label style={styles.calcLabel}>{t.selectPlan}</label>
        <div style={styles.planButtonsGrid}>
          {Object.values(PRICING_PLANS).filter(p => p.id !== 'free').map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPlan(p.id)}
              style={{
                ...styles.planButton,
                ...(selectedPlan === p.id ? {
                  background: p.gradient,
                  borderColor: 'transparent',
                  color: 'white'
                } : {})
              }}
            >
              <span style={styles.planButtonName}>{p.name}</span>
              <span style={styles.planButtonPrice}>
                <span style={{ textDecoration: 'line-through', marginRight: '4px' }}>${p.price}</span>
                <span style={{ color: '#10b981', fontWeight: '600' }}>$0</span>
              </span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Include State Toggle */}
      <div style={styles.calcSection}>
        <label style={styles.calcLabel}>{t.includeState}</label>
        <div style={styles.toggleRow}>
          <button
            onClick={() => setIncludeState(false)}
            style={{
              ...styles.toggleBtn,
              ...(!includeState ? styles.toggleBtnActive : {})
            }}
          >No (Federal only)</button>
          <button
            onClick={() => setIncludeState(true)}
            style={{
              ...styles.toggleBtn,
              ...(includeState ? styles.toggleBtnActive : {})
            }}
          >Yes (+ State)</button>
        </div>
      </div>
      
      {/* CPA Toggle */}
      <div style={styles.calcSection}>
        <label style={styles.calcLabel}>{t.includeCPA}</label>
        <div style={styles.cpaToggleRow}>
          <button
            onClick={() => setIncludeCPA(false)}
            style={{
              ...styles.cpaToggleBtn,
              ...(!includeCPA ? styles.cpaToggleBtnActive : {}),
              borderColor: !includeCPA ? '#10b981' : 'rgba(255,255,255,0.2)'
            }}
          >
            <span style={styles.cpaToggleIcon}>📄</span>
            <span style={styles.cpaToggleTitle}>{t.selfFile}</span>
            <span style={styles.cpaTogglePrice}>$0</span>
            <span style={styles.cpaToggleDesc}>{t.selfFileDesc}</span>
          </button>
          <button
            onClick={() => setIncludeCPA(true)}
            style={{
              ...styles.cpaToggleBtn,
              ...(includeCPA ? styles.cpaToggleBtnActive : {}),
              borderColor: includeCPA ? '#7c3aed' : 'rgba(255,255,255,0.2)'
            }}
          >
            <span style={styles.cpaToggleIcon}>👨‍💼</span>
            <span style={styles.cpaToggleTitle}>{t.withCPA}</span>
            <span style={{...styles.cpaTogglePrice, color: '#a78bfa'}}>${totalWithCPA.toFixed(2)}</span>
            <span style={styles.cpaToggleDesc}>{t.withCPADesc}</span>
          </button>
        </div>
      </div>
      
      {/* Price Breakdown - Shows original price and discount clearly */}
      <div style={styles.calcResult}>
        <div style={styles.priceBreakdown}>
          {/* Plan Price Row */}
          <div style={styles.priceRow}>
            <span>{plan.name} Plan</span>
            <span>
              {includeCPA ? (
                `$${plan.price.toFixed(2)}`
              ) : (
                <span style={{ textDecoration: 'line-through', color: '#64748b' }}>${plan.price.toFixed(2)}</span>
              )}
            </span>
          </div>
          
          {/* Discount Row - Only show when not CPA */}
          {!includeCPA && (
            <div style={{...styles.priceRow, color: '#10b981'}}>
              <span>🎉 This Year's Discount</span>
              <span>-${plan.price.toFixed(2)}</span>
            </div>
          )}
          
          {/* CPA Fees - Only show when CPA selected */}
          {includeCPA && (
            <>
              <div style={styles.priceRow}>
                <span>{t.cpaFee} ({t.federal})</span>
                <span>${CPA_FEE_PER_FORM.toFixed(2)}</span>
              </div>
              {includeState && (
                <div style={styles.priceRow}>
                  <span>{t.cpaFee} ({t.state})</span>
                  <span>${CPA_FEE_PER_FORM.toFixed(2)}</span>
                </div>
              )}
            </>
          )}
        </div>
        
        <div style={styles.totalRow}>
          <span>{t.total}</span>
          <span style={{
            ...styles.totalAmount,
            color: includeCPA ? '#a78bfa' : '#10b981'
          }}>
            {includeCPA ? `$${totalWithCPA.toFixed(2)}` : 'FREE'}
          </span>
        </div>
        
        {/* Savings Message */}
        {!includeCPA && plan.price > 0 && (
          <div style={{ textAlign: 'center', marginTop: '12px', padding: '8px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px' }}>
            <span style={{ color: '#10b981', fontSize: '13px', fontWeight: '500' }}>
              ✓ You save ${plan.price.toFixed(2)} with this year's promotion!
            </span>
          </div>
        )}
        
        <button 
          onClick={() => onSelectPlan(selectedPlan, includeCPA, includeState)}
          style={{
            ...styles.calcCta,
            background: includeCPA 
              ? 'linear-gradient(135deg, #7c3aed, #a855f7)' 
              : 'linear-gradient(135deg, #10b981, #34d399)'
          }}
        >
          {includeCPA ? `Checkout - $${totalWithCPA.toFixed(2)}` : 'Start Free →'}
        </button>
      </div>
    </div>
  );
};

// ============================================================
// FAQ ITEM
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
// MAIN PRICING PAGE
// ============================================================
export default function Pricing() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState("en");
  const [openFAQ, setOpenFAQ] = useState(null);
  const [includeCPA, setIncludeCPA] = useState(false);
  const [includeState, setIncludeState] = useState(true);

  useEffect(() => {
    const savedLang = localStorage.getItem("taxsky_language");
    if (savedLang) setLanguage(savedLang);
  }, []);

  const t = translations[language];

  const handleSelectPlan = (planId, withCPA = false, withState = true) => {
    // Store selections
    localStorage.setItem("taxsky_selected_plan", planId);
    localStorage.setItem("taxsky_include_cpa", withCPA ? 'true' : 'false');
    localStorage.setItem("taxsky_include_state", withState ? 'true' : 'false');
    
    // Check if user is logged in
    const token = localStorage.getItem('taxsky_token') || localStorage.getItem('token');
    const user = localStorage.getItem('taxsky_user') || localStorage.getItem('user');
    
    if (withCPA) {
      // CPA selected - need to pay
      if (token && user) {
        navigate(`/checkout/${planId}?cpa=true&state=${withState}`);
      } else {
        localStorage.setItem("taxsky_redirect_after_login", `/checkout/${planId}?cpa=true&state=${withState}`);
        navigate("/login");
      }
    } else {
      // Free self-file - go to dashboard
      if (token && user) {
        navigate("/dashboard");
      } else {
        localStorage.setItem("taxsky_redirect_after_login", "/dashboard");
        navigate("/login");
      }
    }
  };

  const mainPlans = [
    PRICING_PLANS.basic,
    PRICING_PLANS.standard,
    PRICING_PLANS.plus,
    PRICING_PLANS.selfEmployed,
  ];

  return (
    <div style={styles.page}>
      {/* Background */}
      <div style={styles.bgGradient} />

      <div style={styles.container}>
        {/* Header */}
        <header style={styles.header}>
          <a href="/" style={styles.logoLink}>
            <span style={styles.logoText}>Tax<span style={styles.logoHighlight}>Sky</span> AI</span>
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
          
          {/* FREE Badge */}
          <div style={styles.freeBadge}>
            <span style={styles.freeBadgeIcon}>🎉</span>
            <span>Self-file is <strong>100% FREE</strong> - Download PDF & mail to IRS</span>
          </div>
        </div>

        {/* CPA Toggle - Global */}
        <div style={styles.globalCpaToggle}>
          <span style={styles.globalCpaLabel}>View prices:</span>
          <button
            onClick={() => setIncludeCPA(false)}
            style={{
              ...styles.globalCpaBtn,
              ...(!includeCPA ? styles.globalCpaBtnActive : {}),
              background: !includeCPA ? 'linear-gradient(135deg, #10b981, #34d399)' : 'transparent'
            }}
          >
            🆓 Self-File (FREE)
          </button>
          <button
            onClick={() => setIncludeCPA(true)}
            style={{
              ...styles.globalCpaBtn,
              ...(includeCPA ? styles.globalCpaBtnActive : {}),
              background: includeCPA ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : 'transparent'
            }}
          >
            👨‍💼 With CPA (+$59/form)
          </button>
        </div>

        {/* Pricing Calculator */}
        <PricingCalculator language={language} onSelectPlan={handleSelectPlan} />

        {/* Plans Grid */}
        <div style={styles.plansSection}>
          <h2 style={styles.sectionTitle}>Choose Your Plan</h2>
          <div style={styles.plansGrid}>
            {mainPlans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                language={language}
                onSelect={handleSelectPlan}
                includeCPA={includeCPA}
                includeState={includeState}
              />
            ))}
          </div>
        </div>

        {/* Features */}
        <div style={styles.featuresSection}>
          <h2 style={styles.sectionTitle}>{t.features.title}</h2>
          <div style={styles.featuresGrid}>
            {t.features.items.map((feature, i) => (
              <div key={i} style={styles.featureItem}>{feature}</div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        {t.faq && (
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
        )}

        {/* CTA */}
        <div style={styles.ctaSection}>
          <h2 style={styles.ctaTitle}>{t.cta.title}</h2>
          <p style={styles.ctaSubtitle}>{t.cta.subtitle}</p>
          <button 
            onClick={() => handleSelectPlan('standard', false, true)}
            style={styles.ctaButton}
          >
            {t.cta.button}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = {
  page: {
    minHeight: '100vh',
    background: '#0f172a',
    color: '#fff',
    fontFamily: "'DM Sans', -apple-system, sans-serif",
    position: 'relative',
    overflow: 'hidden',
  },
  bgGradient: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: '60vh',
    background: 'radial-gradient(ellipse at top, rgba(99, 102, 241, 0.15), transparent 60%)',
    pointerEvents: 'none',
  },
  container: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '0 24px',
    position: 'relative',
    zIndex: 1,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 0',
  },
  logoLink: { textDecoration: 'none' },
  logoText: { fontSize: 24, fontWeight: 700, color: '#fff' },
  logoHighlight: { color: '#6366f1' },
  headerRight: { display: 'flex', alignItems: 'center', gap: 16 },
  langSelect: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 8, padding: '8px 12px',
    color: '#fff', fontSize: 14, cursor: 'pointer',
  },
  loginBtn: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    borderRadius: 10, color: '#fff',
    textDecoration: 'none', fontWeight: 600,
  },
  
  // Hero
  hero: { textAlign: 'center', padding: '40px 0 20px' },
  title: { fontSize: 48, fontWeight: 700, marginBottom: 16 },
  subtitle: { fontSize: 20, color: '#94a3b8', marginBottom: 24 },
  freeBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 10,
    background: 'rgba(16, 185, 129, 0.15)',
    border: '2px solid rgba(16, 185, 129, 0.3)',
    borderRadius: 50, padding: '12px 24px',
    fontSize: 16, color: '#10b981',
  },
  freeBadgeIcon: { fontSize: 24 },
  
  // Global CPA Toggle
  globalCpaToggle: {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    gap: 12, margin: '32px 0',
  },
  globalCpaLabel: { color: '#94a3b8', fontSize: 14 },
  globalCpaBtn: {
    padding: '12px 24px', border: '2px solid rgba(255,255,255,0.2)',
    borderRadius: 50, color: '#fff', fontSize: 14, fontWeight: 600,
    cursor: 'pointer', transition: 'all 0.2s',
  },
  globalCpaBtnActive: { borderColor: 'transparent' },
  
  // Calculator
  calculator: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 24, padding: 32, marginBottom: 48,
  },
  calculatorTitle: { fontSize: 24, fontWeight: 700, marginBottom: 24, textAlign: 'center' },
  calcSection: { marginBottom: 24 },
  calcLabel: { display: 'block', fontSize: 14, color: '#94a3b8', marginBottom: 12 },
  planButtonsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10,
  },
  planButton: {
    padding: '12px 16px', background: 'rgba(255,255,255,0.05)',
    border: '2px solid rgba(255,255,255,0.1)', borderRadius: 12,
    color: '#fff', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
  },
  planButtonName: { display: 'block', fontSize: 14, fontWeight: 600 },
  planButtonPrice: { display: 'block', fontSize: 12, color: '#64748b' },
  toggleRow: { display: 'flex', gap: 10 },
  toggleBtn: {
    flex: 1, padding: '12px 16px', background: 'rgba(255,255,255,0.05)',
    border: '2px solid rgba(255,255,255,0.1)', borderRadius: 10,
    color: '#94a3b8', fontSize: 14, cursor: 'pointer', transition: 'all 0.2s',
  },
  toggleBtnActive: {
    background: 'rgba(99, 102, 241, 0.2)', borderColor: '#6366f1', color: '#fff',
  },
  cpaToggleRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  cpaToggleBtn: {
    padding: 20, background: 'rgba(255,255,255,0.03)',
    border: '2px solid rgba(255,255,255,0.1)', borderRadius: 16,
    textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
  },
  cpaToggleBtnActive: { background: 'rgba(255,255,255,0.08)' },
  cpaToggleIcon: { display: 'block', fontSize: 32, marginBottom: 8 },
  cpaToggleTitle: { display: 'block', fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 },
  cpaTogglePrice: { display: 'block', fontSize: 24, fontWeight: 700, color: '#10b981', marginBottom: 4 },
  cpaToggleDesc: { display: 'block', fontSize: 12, color: '#64748b' },
  calcResult: {
    background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 24, marginTop: 24,
  },
  priceBreakdown: { marginBottom: 16 },
  priceRow: {
    display: 'flex', justifyContent: 'space-between', padding: '8px 0',
    fontSize: 14, color: '#cbd5e1', borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  totalRow: {
    display: 'flex', justifyContent: 'space-between', padding: '16px 0',
    fontSize: 20, fontWeight: 700, borderTop: '2px solid rgba(255,255,255,0.1)',
  },
  totalAmount: { fontSize: 28 },
  calcCta: {
    width: '100%', padding: '16px 24px', border: 'none', borderRadius: 12,
    color: '#fff', fontSize: 18, fontWeight: 700, cursor: 'pointer', marginTop: 16,
  },
  
  // Plans Section
  plansSection: { marginBottom: 48 },
  sectionTitle: { fontSize: 28, fontWeight: 700, textAlign: 'center', marginBottom: 32 },
  plansGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20,
  },
  planCard: {
    background: 'rgba(255,255,255,0.03)',
    border: '2px solid rgba(255,255,255,0.1)',
    borderRadius: 20, padding: 28, position: 'relative', transition: 'all 0.3s',
  },
  planCardPopular: {
    background: 'rgba(99, 102, 241, 0.08)',
    transform: 'scale(1.02)',
  },
  popularBadge: {
    position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
    padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, color: '#fff',
  },
  planHeader: { marginBottom: 16 },
  planName: { fontSize: 22, fontWeight: 700, marginBottom: 4 },
  planDesc: { fontSize: 14, color: '#94a3b8' },
  planPrice: { marginBottom: 20 },
  planPriceAmount: { fontSize: 36, fontWeight: 700 },
  priceBreakdownSmall: {
    display: 'flex', flexDirection: 'column', fontSize: 12, color: '#64748b', marginTop: 4,
  },
  originalPrice: { display: 'block', fontSize: 12, color: '#64748b', marginTop: 4 },
  planMeta: {
    background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 14, marginBottom: 20,
  },
  planMetaItem: { display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 },
  planMetaLabel: { color: '#64748b' },
  planMetaValue: { color: '#fff', fontWeight: 600 },
  planFeatures: { listStyle: 'none', marginBottom: 24, padding: 0 },
  planFeature: { display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: '#e2e8f0', marginBottom: 10 },
  planFeatureNot: { display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: '#64748b', marginBottom: 10 },
  featureCheck: { color: '#10b981', fontWeight: 700 },
  featureX: { color: '#64748b' },
  planCta: {
    width: '100%', padding: '14px 24px', border: 'none', borderRadius: 12,
    color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
  },
  
  // Features
  featuresSection: { marginBottom: 48 },
  featuresGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16,
  },
  featureItem: {
    background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.15)',
    borderRadius: 12, padding: '18px 22px', fontSize: 14, color: '#e2e8f0', fontWeight: 500,
  },
  
  // FAQ
  faqSection: { marginBottom: 48, maxWidth: 800, margin: '0 auto 48px' },
  faqList: { display: 'flex', flexDirection: 'column', gap: 12 },
  faqItem: {
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14, overflow: 'hidden',
  },
  faqQuestion: {
    width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '18px 22px', fontSize: 15, fontWeight: 600, color: '#fff',
    background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
  },
  faqIcon: { fontSize: 10, color: '#6366f1', transition: 'transform 0.3s ease' },
  faqAnswer: {
    fontSize: 14, color: '#94a3b8', lineHeight: 1.7,
    background: 'rgba(99, 102, 241, 0.05)', overflow: 'hidden', transition: 'all 0.3s ease',
  },
  
  // CTA
  ctaSection: {
    textAlign: 'center',
    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(99, 102, 241, 0.15))',
    border: '1px solid rgba(16, 185, 129, 0.25)',
    borderRadius: 28, padding: 56, marginBottom: 48,
  },
  ctaTitle: { fontSize: 36, fontWeight: 700, marginBottom: 14 },
  ctaSubtitle: { fontSize: 18, color: '#94a3b8', marginBottom: 28 },
  ctaButton: {
    padding: '18px 48px',
    background: 'linear-gradient(135deg, #10b981, #34d399)',
    border: 'none', borderRadius: 14, color: '#fff',
    fontSize: 18, fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 8px 30px rgba(16, 185, 129, 0.4)',
  },
};