// ============================================================
// TAXSKY AI - PRICING PAGE v5.0 (TWO SERVICE TYPES)
// ============================================================
// SERVICE MODEL:
// 
// 🆓 FILE BY MAIL (Self-File) = 100% DISCOUNT
//    - Federal Form 1040: Plan Price → $0 (100% OFF)
//    - State Form: $19.99 → $0 (100% OFF)
//    - User prints, signs, mails to IRS
//
// 💼 CPA REVIEW + E-FILE = PAID SERVICE
//    - Federal: Plan Price + $59 CPA Fee
//    - State: $19.99 + $59 CPA Fee
//    - CPA reviews, signs, e-files for you
//
// ============================================================

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// ============================================================
// PRICING CONFIG
// ============================================================
const CPA_FEE_PER_FORM = 59; // $59 CPA fee per form
const STATE_FILING_PRICE = 19.99; // State filing base price

// ============================================================
// PRICING PLANS - Base prices (discounted to $0 for self-file)
// ============================================================
const PRICING_PLANS = {
  free: {
    id: "free",
    name: "Free Estimate",
    price: 0,
    description: "See your refund before you pay",
    features: [
      "Unlimited tax estimates",
      "AI-powered calculations",
      "See potential refund",
    ],
    color: "#64748b",
    gradient: "linear-gradient(135deg, #475569, #64748b)",
  },
  basic: {
    id: "basic",
    name: "Basic",
    price: 29.99,
    description: "Simple W-2 income",
    features: [
      "1 W-2 form",
      "Federal Form 1040",
      "State Form included",
      "Max refund guarantee",
    ],
    color: "#06b6d4",
    gradient: "linear-gradient(135deg, #0891b2, #06b6d4)",
  },
  standard: {
    id: "standard",
    name: "Standard",
    price: 49.99,
    description: "W-2 + Investment income",
    popular: true,
    features: [
      "Multiple W-2s",
      "1099-INT, 1099-DIV",
      "Federal Form 1040",
      "State Form included",
      "Max refund guarantee",
    ],
    color: "#8b5cf6",
    gradient: "linear-gradient(135deg, #6366f1, #8b5cf6)",
  },
  plus: {
    id: "plus",
    name: "Plus",
    price: 79.99,
    description: "Multiple income sources",
    features: [
      "All W-2 and 1099 forms",
      "Retirement income",
      "Capital gains",
      "Federal Form 1040",
      "State Form included",
    ],
    color: "#6366f1",
    gradient: "linear-gradient(135deg, #4f46e5, #6366f1)",
  },
  selfEmployed: {
    id: "selfEmployed",
    name: "Self-Employed",
    price: 89.99,
    description: "Freelancers & contractors",
    features: [
      "1099-NEC, 1099-K",
      "Schedule C",
      "Business deductions",
      "Federal Form 1040",
      "State Form included",
    ],
    color: "#10b981",
    gradient: "linear-gradient(135deg, #059669, #10b981)",
  },
  premium: {
    id: "premium",
    name: "Premium",
    price: 129.99,
    description: "Complex returns",
    features: [
      "All income types",
      "Itemized deductions",
      "Rental income",
      "Federal Form 1040",
      "State Form included",
    ],
    color: "#f59e0b",
    gradient: "linear-gradient(135deg, #d97706, #f59e0b)",
  },
};

// ============================================================
// TRANSLATIONS
// ============================================================
const translations = {
  en: {
    title: "Choose Your Filing Method",
    subtitle: "File by mail FREE or let a CPA e-file for you",
    
    // Service Types
    selfFileTitle: "📄 File by Mail",
    selfFileSubtitle: "Download, print & mail yourself",
    selfFilePrice: "FREE",
    selfFileFeatures: [
      "Download Form 1040 PDF",
      "Download State Form PDF",
      "Print and sign yourself",
      "Mail to IRS",
    ],
    
    cpaTitle: "👨‍💼 CPA E-File",
    cpaSubtitle: "CPA reviews & files for you",
    cpaFeatures: [
      "CPA reviews for accuracy",
      "CPA signs your return",
      "E-filed directly to IRS",
      "Faster refund",
    ],
    
    // Labels
    federal: "Federal",
    state: "State", 
    cpaFee: "CPA Fee",
    total: "Total",
    planPrice: "Plan Price",
    discount: "Discount",
    youSave: "You Save",
    
    // CTA
    startFree: "Start FREE →",
    getCPA: "Get CPA E-File",
  },
  vi: {
    title: "Chọn Phương Thức Nộp",
    subtitle: "Nộp qua bưu điện MIỄN PHÍ hoặc để CPA nộp cho bạn",
    selfFileTitle: "📄 Nộp Qua Bưu Điện",
    selfFileSubtitle: "Tải, in và gửi tự mình",
    selfFilePrice: "MIỄN PHÍ",
    cpaTitle: "👨‍💼 CPA Nộp Điện Tử",
    cpaSubtitle: "CPA xem xét và nộp cho bạn",
    federal: "Liên Bang",
    state: "Tiểu Bang",
    cpaFee: "Phí CPA",
    total: "Tổng",
    startFree: "Bắt Đầu MIỄN PHÍ →",
    getCPA: "Chọn CPA E-File",
  },
};

// ============================================================
// SERVICE COMPARISON COMPONENT
// ============================================================
const ServiceComparison = ({ plan, includeState, language, onSelectSelfFile, onSelectCPA }) => {
  const t = translations[language] || translations.en;
  
  // Calculate Self-File pricing (100% discount)
  const selfFileFederal = plan.price;
  const selfFileState = includeState ? STATE_FILING_PRICE : 0;
  const selfFileTotal = selfFileFederal + selfFileState;
  const selfFileFinalPrice = 0; // 100% OFF
  
  // Calculate CPA pricing
  const cpaFederal = plan.price + CPA_FEE_PER_FORM;
  const cpaState = includeState ? (STATE_FILING_PRICE + CPA_FEE_PER_FORM) : 0;
  const cpaTotal = cpaFederal + cpaState;
  
  return (
    <div style={styles.serviceComparison}>
      {/* Self-File Option - FREE */}
      <div style={{
        ...styles.serviceCard,
        borderColor: '#10b981',
        background: 'rgba(16, 185, 129, 0.05)',
      }}>
        <div style={styles.serviceBadge}>🎉 100% OFF</div>
        
        <div style={styles.serviceHeader}>
          <span style={styles.serviceIcon}>📄</span>
          <div>
            <h3 style={styles.serviceTitle}>{t.selfFileTitle}</h3>
            <p style={styles.serviceSubtitle}>{t.selfFileSubtitle}</p>
          </div>
        </div>
        
        {/* Price Breakdown */}
        <div style={styles.priceBreakdown}>
          <div style={styles.priceRow}>
            <span>{t.federal} ({plan.name})</span>
            <span style={styles.priceStrike}>${selfFileFederal.toFixed(2)}</span>
          </div>
          {includeState && (
            <div style={styles.priceRow}>
              <span>{t.state}</span>
              <span style={styles.priceStrike}>${selfFileState.toFixed(2)}</span>
            </div>
          )}
          <div style={{...styles.priceRow, color: '#10b981', fontWeight: 600}}>
            <span>🎉 {t.discount} (100%)</span>
            <span>-${selfFileTotal.toFixed(2)}</span>
          </div>
          <div style={styles.totalRow}>
            <span>{t.total}</span>
            <span style={{...styles.totalPrice, color: '#10b981'}}>$0 FREE</span>
          </div>
        </div>
        
        {/* Savings */}
        <div style={styles.savingsBox}>
          <span>💰 {t.youSave}: <strong>${selfFileTotal.toFixed(2)}</strong></span>
        </div>
        
        {/* Features */}
        <ul style={styles.featureList}>
          {t.selfFileFeatures.map((f, i) => (
            <li key={i} style={styles.featureItem}>
              <span style={{color: '#10b981'}}>✓</span> {f}
            </li>
          ))}
        </ul>
        
        <button onClick={onSelectSelfFile} style={{
          ...styles.serviceBtn,
          background: 'linear-gradient(135deg, #10b981, #34d399)',
        }}>
          {t.startFree}
        </button>
      </div>
      
      {/* CPA E-File Option - PAID */}
      <div style={{
        ...styles.serviceCard,
        borderColor: '#7c3aed',
        background: 'rgba(124, 58, 237, 0.05)',
      }}>
        <div style={{...styles.serviceBadge, background: '#7c3aed'}}>👨‍💼 CPA Service</div>
        
        <div style={styles.serviceHeader}>
          <span style={styles.serviceIcon}>👨‍💼</span>
          <div>
            <h3 style={styles.serviceTitle}>{t.cpaTitle}</h3>
            <p style={styles.serviceSubtitle}>{t.cpaSubtitle}</p>
          </div>
        </div>
        
        {/* Price Breakdown */}
        <div style={styles.priceBreakdown}>
          <div style={styles.priceRow}>
            <span>{t.federal} ({plan.name})</span>
            <span>${plan.price.toFixed(2)}</span>
          </div>
          <div style={styles.priceRow}>
            <span>{t.cpaFee} ({t.federal})</span>
            <span>${CPA_FEE_PER_FORM.toFixed(2)}</span>
          </div>
          {includeState && (
            <>
              <div style={styles.priceRow}>
                <span>{t.state}</span>
                <span>${STATE_FILING_PRICE.toFixed(2)}</span>
              </div>
              <div style={styles.priceRow}>
                <span>{t.cpaFee} ({t.state})</span>
                <span>${CPA_FEE_PER_FORM.toFixed(2)}</span>
              </div>
            </>
          )}
          <div style={styles.totalRow}>
            <span>{t.total}</span>
            <span style={{...styles.totalPrice, color: '#a78bfa'}}>${cpaTotal.toFixed(2)}</span>
          </div>
        </div>
        
        {/* Features */}
        <ul style={styles.featureList}>
          {t.cpaFeatures.map((f, i) => (
            <li key={i} style={styles.featureItem}>
              <span style={{color: '#a78bfa'}}>✓</span> {f}
            </li>
          ))}
        </ul>
        
        <button onClick={onSelectCPA} style={{
          ...styles.serviceBtn,
          background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
        }}>
          {t.getCPA} - ${cpaTotal.toFixed(2)}
        </button>
      </div>
    </div>
  );
};

// ============================================================
// PLAN SELECTOR
// ============================================================
const PlanSelector = ({ selectedPlan, onSelectPlan, language }) => {
  return (
    <div style={styles.planSelector}>
      <label style={styles.planSelectorLabel}>Select your plan:</label>
      <div style={styles.planButtons}>
        {Object.values(PRICING_PLANS).filter(p => p.id !== 'free').map(plan => (
          <button
            key={plan.id}
            onClick={() => onSelectPlan(plan.id)}
            style={{
              ...styles.planBtn,
              ...(selectedPlan === plan.id ? {
                background: plan.gradient,
                borderColor: 'transparent',
                color: '#fff',
              } : {})
            }}
          >
            <span style={styles.planBtnName}>{plan.name}</span>
            <span style={styles.planBtnPrice}>
              <span style={{textDecoration: 'line-through', opacity: 0.6, marginRight: 4}}>${plan.price}</span>
              <span style={{color: selectedPlan === plan.id ? '#fff' : '#10b981', fontWeight: 700}}>$0</span>
            </span>
            {plan.popular && <span style={styles.popularTag}>Popular</span>}
          </button>
        ))}
      </div>
    </div>
  );
};

// ============================================================
// MAIN PRICING PAGE
// ============================================================
export default function PricingPage() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState("en");
  const [selectedPlan, setSelectedPlan] = useState("standard");
  const [includeState, setIncludeState] = useState(true);
  
  useEffect(() => {
    const savedLang = localStorage.getItem("taxsky_language");
    if (savedLang) setLanguage(savedLang);
  }, []);
  
  const t = translations[language] || translations.en;
  const plan = PRICING_PLANS[selectedPlan];
  
  const handleSelectSelfFile = () => {
    localStorage.setItem("taxsky_selected_plan", selectedPlan);
    localStorage.setItem("taxsky_include_cpa", "false");
    localStorage.setItem("taxsky_include_state", includeState ? "true" : "false");
    
    const token = localStorage.getItem('taxsky_token') || localStorage.getItem('token');
    if (token) {
      navigate("/dashboard");
    } else {
      localStorage.setItem("taxsky_redirect_after_login", "/dashboard");
      navigate("/login");
    }
  };
  
  const handleSelectCPA = () => {
    localStorage.setItem("taxsky_selected_plan", selectedPlan);
    localStorage.setItem("taxsky_include_cpa", "true");
    localStorage.setItem("taxsky_include_state", includeState ? "true" : "false");
    
    const token = localStorage.getItem('taxsky_token') || localStorage.getItem('token');
    if (token) {
      navigate(`/checkout/${selectedPlan}?cpa=true&state=${includeState}`);
    } else {
      localStorage.setItem("taxsky_redirect_after_login", `/checkout/${selectedPlan}?cpa=true&state=${includeState}`);
      navigate("/login");
    }
  };
  
  return (
    <div style={styles.page}>
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
              onChange={e => setLanguage(e.target.value)}
              style={styles.langSelect}
            >
              <option value="en">🇺🇸 English</option>
              <option value="vi">🇻🇳 Tiếng Việt</option>
            </select>
          </div>
        </header>
        
        {/* Hero */}
        <div style={styles.hero}>
          <h1 style={styles.title}>{t.title}</h1>
          <p style={styles.subtitle}>{t.subtitle}</p>
          
          {/* Free Badge */}
          <div style={styles.freeBadge}>
            <span style={styles.freeBadgeIcon}>🎉</span>
            <span>File by Mail = <strong>100% FREE</strong> for 2025 Tax Season!</span>
          </div>
        </div>
        
        {/* Plan Selector */}
        <PlanSelector 
          selectedPlan={selectedPlan}
          onSelectPlan={setSelectedPlan}
          language={language}
        />
        
        {/* State Toggle */}
        <div style={styles.stateToggle}>
          <span style={styles.stateLabel}>Include State Return?</span>
          <div style={styles.toggleBtns}>
            <button
              onClick={() => setIncludeState(false)}
              style={{
                ...styles.toggleBtn,
                ...(!includeState ? styles.toggleBtnActive : {})
              }}
            >Federal Only</button>
            <button
              onClick={() => setIncludeState(true)}
              style={{
                ...styles.toggleBtn,
                ...(includeState ? styles.toggleBtnActive : {})
              }}
            >Federal + State</button>
          </div>
        </div>
        
        {/* Service Comparison */}
        <ServiceComparison
          plan={plan}
          includeState={includeState}
          language={language}
          onSelectSelfFile={handleSelectSelfFile}
          onSelectCPA={handleSelectCPA}
        />
        
        {/* Features Section */}
        <div style={styles.featuresSection}>
          <h2 style={styles.sectionTitle}>All Plans Include</h2>
          <div style={styles.featuresGrid}>
            {[
              "🔐 Bank-level 256-bit encryption",
              "✅ IRS-accurate calculations",
              "💰 Maximum refund guarantee",
              "🤖 AI-powered accuracy check",
              "📱 File from any device",
              "💬 Chat support",
            ].map((feature, i) => (
              <div key={i} style={styles.featureBox}>{feature}</div>
            ))}
          </div>
        </div>
        
        {/* CTA Section */}
        <div style={styles.ctaSection}>
          <h2 style={styles.ctaTitle}>Ready to File?</h2>
          <p style={styles.ctaSubtitle}>Start your free tax return now. No credit card required.</p>
          <button onClick={handleSelectSelfFile} style={styles.ctaButton}>
            🎉 Start FREE - Save ${(plan.price + (includeState ? STATE_FILING_PRICE : 0)).toFixed(2)}
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
    maxWidth: 1000,
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
  
  // Hero
  hero: { textAlign: 'center', padding: '40px 0 30px' },
  title: { fontSize: 42, fontWeight: 700, marginBottom: 16 },
  subtitle: { fontSize: 18, color: '#94a3b8', marginBottom: 24 },
  freeBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 10,
    background: 'rgba(16, 185, 129, 0.15)',
    border: '2px solid rgba(16, 185, 129, 0.3)',
    borderRadius: 50, padding: '12px 24px',
    fontSize: 15, color: '#10b981',
  },
  freeBadgeIcon: { fontSize: 20 },
  
  // Plan Selector
  planSelector: {
    marginBottom: 24,
  },
  planSelectorLabel: {
    display: 'block',
    textAlign: 'center',
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 12,
  },
  planButtons: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 10,
  },
  planBtn: {
    padding: '14px 12px',
    background: 'rgba(255,255,255,0.05)',
    border: '2px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    cursor: 'pointer',
    textAlign: 'center',
    position: 'relative',
    color: '#fff',
  },
  planBtnName: {
    display: 'block',
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 4,
  },
  planBtnPrice: {
    display: 'block',
    fontSize: 12,
  },
  popularTag: {
    position: 'absolute',
    top: -8,
    right: -8,
    background: '#8b5cf6',
    color: '#fff',
    fontSize: 9,
    padding: '2px 6px',
    borderRadius: 4,
    fontWeight: 600,
  },
  
  // State Toggle
  stateToggle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 32,
  },
  stateLabel: {
    fontSize: 14,
    color: '#94a3b8',
  },
  toggleBtns: {
    display: 'flex',
    gap: 8,
  },
  toggleBtn: {
    padding: '10px 20px',
    background: 'rgba(255,255,255,0.05)',
    border: '2px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    color: '#94a3b8',
    fontSize: 13,
    cursor: 'pointer',
  },
  toggleBtnActive: {
    background: 'rgba(99, 102, 241, 0.2)',
    borderColor: '#6366f1',
    color: '#fff',
  },
  
  // Service Comparison
  serviceComparison: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: 24,
    marginBottom: 48,
  },
  serviceCard: {
    border: '2px solid',
    borderRadius: 20,
    padding: 24,
    position: 'relative',
  },
  serviceBadge: {
    position: 'absolute',
    top: -12,
    left: 20,
    background: '#10b981',
    color: '#fff',
    padding: '4px 12px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
  },
  serviceHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    marginTop: 8,
  },
  serviceIcon: {
    fontSize: 36,
  },
  serviceTitle: {
    fontSize: 20,
    fontWeight: 700,
    margin: 0,
    color: '#fff',
  },
  serviceSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    margin: '4px 0 0',
  },
  priceBreakdown: {
    background: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  priceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 13,
    color: '#cbd5e1',
    padding: '6px 0',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  priceStrike: {
    textDecoration: 'line-through',
    color: '#64748b',
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 16,
    fontWeight: 600,
    paddingTop: 12,
    marginTop: 8,
    borderTop: '2px solid rgba(255,255,255,0.1)',
  },
  totalPrice: {
    fontSize: 22,
    fontWeight: 700,
  },
  savingsBox: {
    background: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: 8,
    padding: '10px 14px',
    textAlign: 'center',
    marginBottom: 16,
    color: '#10b981',
    fontSize: 14,
  },
  featureList: {
    listStyle: 'none',
    padding: 0,
    margin: '0 0 20px',
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    color: '#e2e8f0',
    marginBottom: 8,
  },
  serviceBtn: {
    width: '100%',
    padding: '14px 24px',
    border: 'none',
    borderRadius: 12,
    color: '#fff',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
  },
  
  // Features Section
  featuresSection: {
    marginBottom: 48,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 700,
    textAlign: 'center',
    marginBottom: 24,
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 12,
  },
  featureBox: {
    background: 'rgba(99, 102, 241, 0.08)',
    border: '1px solid rgba(99, 102, 241, 0.15)',
    borderRadius: 10,
    padding: '14px 18px',
    fontSize: 13,
    color: '#e2e8f0',
  },
  
  // CTA Section
  ctaSection: {
    textAlign: 'center',
    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(99, 102, 241, 0.15))',
    border: '1px solid rgba(16, 185, 129, 0.25)',
    borderRadius: 24,
    padding: 48,
    marginBottom: 48,
  },
  ctaTitle: {
    fontSize: 32,
    fontWeight: 700,
    marginBottom: 12,
  },
  ctaSubtitle: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 24,
  },
  ctaButton: {
    padding: '16px 40px',
    background: 'linear-gradient(135deg, #10b981, #34d399)',
    border: 'none',
    borderRadius: 12,
    color: '#fff',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 8px 30px rgba(16, 185, 129, 0.4)',
  },
};