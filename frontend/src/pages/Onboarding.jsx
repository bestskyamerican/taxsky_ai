// ============================================================
// TAXSKY ONBOARDING - PROFESSIONAL DARK EDITION
// ============================================================
// Modern, Premium Tax Filing Landing Page
// Design: Dark theme matching Dashboard
// Flow: Select Language + State → Navigate to /login
// ============================================================

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const PYTHON_API = import.meta.env.VITE_PYTHON_API || "http://localhost:5002";

// ============================================================
// TRANSLATIONS
// ============================================================
const translations = {
  en: {
    hero: {
      badge: "Tax Season 2025",
      title: "Smart Tax Filing",
      titleHighlight: "Made Simple",
      subtitle: "AI-powered tax preparation that finds every deduction. Maximum refund, guaranteed accuracy.",
    },
    form: {
      languageLabel: "Preferred Language",
      stateLabel: "Your State",
      stateHint: "We'll optimize for your state's tax rules",
      button: "Continue with Google",
      buttonLoading: "Verifying...",
      secureNote: "256-bit encrypted • IRS authorized",
    },
    stats: {
      users: "50K+",
      usersLabel: "Tax Returns Filed",
      refund: "$3,247",
      refundLabel: "Average Refund",
      rating: "4.9",
      ratingLabel: "User Rating",
      time: "15 min",
      timeLabel: "Average Time",
    },
    features: {
      title: "Why TaxSky?",
      items: [
        { icon: "🤖", title: "AI Tax Assistant", desc: "Chat naturally about your taxes. Our AI understands complex situations." },
        { icon: "📷", title: "Instant W-2 Scan", desc: "Snap a photo of your W-2 or 1099. We extract everything automatically." },
        { icon: "💰", title: "Maximum Refund", desc: "We find deductions others miss. Guaranteed maximum refund." },
        { icon: "🔒", title: "Bank-Grade Security", desc: "SOC 2 Type II certified. Your data is encrypted end-to-end." },
        { icon: "🌐", title: "Multi-Language", desc: "File taxes in English, Vietnamese, Spanish, and more." },
        { icon: "⚡", title: "Fast & Easy", desc: "Average filing time is just 15 minutes." },
      ]
    },
    trust: ["IRS Authorized E-File Provider", "SOC 2 Type II Certified", "256-bit SSL Encryption", "Money-Back Guarantee"],
    support: { full: "Full Support", noTax: "No State Tax", flatTax: "Flat Tax", comingSoon: "Coming 2026" },
    footer: {
      copyright: "© 2025 TaxSky Inc. All rights reserved.",
      links: ["Privacy Policy", "Terms of Service", "Contact Us"],
    }
  },
  vi: {
    hero: {
      badge: "Mùa Thuế 2025",
      title: "Khai Thuế Thông Minh",
      titleHighlight: "Đơn Giản Hơn",
      subtitle: "Trợ lý AI giúp bạn tìm mọi khoản khấu trừ. Hoàn thuế tối đa, chính xác tuyệt đối.",
    },
    form: {
      languageLabel: "Ngôn Ngữ",
      stateLabel: "Tiểu Bang",
      stateHint: "Tối ưu theo luật thuế tiểu bang của bạn",
      button: "Tiếp Tục với Google",
      buttonLoading: "Đang xác minh...",
      secureNote: "Mã hóa 256-bit • IRS ủy quyền",
    },
    stats: {
      users: "50K+",
      usersLabel: "Tờ Khai Thuế",
      refund: "$3,247",
      refundLabel: "Hoàn Thuế TB",
      rating: "4.9",
      ratingLabel: "Đánh Giá",
      time: "15 phút",
      timeLabel: "Thời Gian TB",
    },
    features: {
      title: "Tại Sao Chọn TaxSky?",
      items: [
        { icon: "🤖", title: "Trợ Lý AI Thuế", desc: "Chat tự nhiên về thuế. AI hiểu các tình huống phức tạp." },
        { icon: "📷", title: "Quét W-2 Tức Thì", desc: "Chụp ảnh W-2 hoặc 1099. Chúng tôi trích xuất mọi thứ tự động." },
        { icon: "💰", title: "Hoàn Thuế Tối Đa", desc: "Tìm khấu trừ mà người khác bỏ lỡ. Đảm bảo hoàn thuế tối đa." },
        { icon: "🔒", title: "Bảo Mật Cấp Ngân Hàng", desc: "Chứng nhận SOC 2 Type II. Dữ liệu được mã hóa đầu cuối." },
        { icon: "🌐", title: "Đa Ngôn Ngữ", desc: "Khai thuế bằng tiếng Anh, Việt, Tây Ban Nha." },
        { icon: "⚡", title: "Nhanh & Dễ Dàng", desc: "Thời gian khai thuế trung bình chỉ 15 phút." },
      ]
    },
    trust: ["IRS E-File Ủy Quyền", "Chứng Nhận SOC 2", "Mã Hóa SSL 256-bit", "Đảm Bảo Hoàn Tiền"],
    support: { full: "Hỗ Trợ Đầy Đủ", noTax: "Không Thuế Bang", flatTax: "Thuế Cố Định", comingSoon: "Sắp Ra Mắt" },
    footer: {
      copyright: "© 2025 TaxSky Inc. Bảo lưu mọi quyền.",
      links: ["Chính Sách", "Điều Khoản", "Liên Hệ"],
    }
  },
  es: {
    hero: {
      badge: "Temporada 2025",
      title: "Impuestos Inteligentes",
      titleHighlight: "Simplificados",
      subtitle: "IA que encuentra cada deducción. Máximo reembolso, precisión garantizada.",
    },
    form: {
      languageLabel: "Idioma",
      stateLabel: "Tu Estado",
      stateHint: "Optimizado para las reglas de tu estado",
      button: "Continuar con Google",
      buttonLoading: "Verificando...",
      secureNote: "Cifrado 256-bit • Autorizado IRS",
    },
    stats: {
      users: "50K+",
      usersLabel: "Declaraciones",
      refund: "$3,247",
      refundLabel: "Reembolso Prom.",
      rating: "4.9",
      ratingLabel: "Calificación",
      time: "15 min",
      timeLabel: "Tiempo Prom.",
    },
    features: {
      title: "¿Por Qué TaxSky?",
      items: [
        { icon: "🤖", title: "Asistente AI", desc: "Chatea naturalmente sobre tus impuestos." },
        { icon: "📷", title: "Escaneo Instantáneo", desc: "Toma una foto de tu W-2 o 1099." },
        { icon: "💰", title: "Máximo Reembolso", desc: "Encontramos deducciones que otros pierden." },
        { icon: "🔒", title: "Seguridad Bancaria", desc: "Certificado SOC 2 Tipo II." },
        { icon: "🌐", title: "Multi-Idioma", desc: "Declara en tu idioma preferido." },
        { icon: "⚡", title: "Rápido y Fácil", desc: "Tiempo promedio: solo 15 minutos." },
      ]
    },
    trust: ["E-File Autorizado IRS", "Certificado SOC 2", "Cifrado SSL 256-bit", "Garantía de Reembolso"],
    support: { full: "Soporte Completo", noTax: "Sin Impuesto Estatal", flatTax: "Tasa Fija", comingSoon: "Próximamente" },
    footer: {
      copyright: "© 2025 TaxSky Inc. Todos los derechos reservados.",
      links: ["Privacidad", "Términos", "Contacto"],
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
// MAIN COMPONENT
// ============================================================
export default function Onboarding() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState("en");
  const [state, setState] = useState("CA");
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(false);

  const t = translations[language];
  const selectedState = ALL_STATES.find(s => s.code === state);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("taxsky_state");
    if (saved) setState(saved);
    const savedLang = localStorage.getItem("taxsky_language");
    if (savedLang) setLanguage(savedLang);
  }, []);

  // ============================================================
  // ✅ CONTINUE - Validate and navigate to /login
  // ============================================================
  const handleContinue = async () => {
    setError(null);
    setIsValidating(true);

    try {
      // Step 1: Validate state with Python API
      const response = await fetch(`${PYTHON_API}/states/validate/${state}`);
      const result = await response.json();

      if (!result.valid) {
        setError(result.message || `${state} is not supported yet.`);
        setIsValidating(false);
        return;
      }

      // Step 2: Save preferences to localStorage
      localStorage.setItem("taxsky_language", language);
      localStorage.setItem("taxsky_state", state);
      localStorage.setItem("taxsky_state_name", result.state_name || state);
      localStorage.setItem("taxsky_has_state_tax", result.has_income_tax ? "true" : "false");

      console.log("✅ Preferences saved:", { language, state });

      // Step 3: Navigate to login page
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
    if (level === "full") return { text: "✓ Full Support", color: "#10b981", bg: "rgba(16, 185, 129, 0.15)" };
    if (level === "no_tax") return { text: "✓ No State Tax", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.15)" };
    if (level === "flat") return { text: "✓ Flat Tax Rate", color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.15)" };
    return { text: "Coming 2026", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)" };
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
          <div style={styles.logoWrap}>
            <div style={styles.logoIcon}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill="url(#logoGrad)"/>
                <path d="M8 12h16M8 16h12M8 20h8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="24" cy="20" r="4" fill="#10b981"/>
                <path d="M22 20l1.5 1.5L26 19" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <defs>
                  <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32">
                    <stop stopColor="#3b82f6"/>
                    <stop offset="1" stopColor="#8b5cf6"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span style={styles.logoText}>TaxSky</span>
          </div>
          <div style={styles.langSwitch}>
            {LANGUAGES.map(l => (
              <button
                key={l.code}
                onClick={() => setLanguage(l.code)}
                style={{
                  ...styles.langBtn,
                  ...(language === l.code ? styles.langBtnActive : {})
                }}
              >
                {l.flag}
              </button>
            ))}
          </div>
        </header>

        {/* Hero Section */}
        <section style={styles.hero}>
          <div style={styles.badge}>{t.hero.badge}</div>
          <h1 style={styles.heroTitle}>
            {t.hero.title}
            <span style={styles.heroHighlight}> {t.hero.titleHighlight}</span>
          </h1>
          <p style={styles.heroSubtitle}>{t.hero.subtitle}</p>
        </section>

        {/* Stats Bar */}
        <div style={styles.statsBar}>
          <div style={styles.stat}>
            <div style={styles.statValue}>{t.stats.users}</div>
            <div style={styles.statLabel}>{t.stats.usersLabel}</div>
          </div>
          <div style={styles.statDivider} />
          <div style={styles.stat}>
            <div style={styles.statValue}>{t.stats.refund}</div>
            <div style={styles.statLabel}>{t.stats.refundLabel}</div>
          </div>
          <div style={styles.statDivider} />
          <div style={styles.stat}>
            <div style={styles.statValue}>
              {t.stats.rating}
              <svg style={{marginLeft: 4, verticalAlign: 'middle'}} width="16" height="16" viewBox="0 0 24 24" fill="#fbbf24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            <div style={styles.statLabel}>{t.stats.ratingLabel}</div>
          </div>
          <div style={styles.statDivider} />
          <div style={styles.stat}>
            <div style={styles.statValue}>{t.stats.time}</div>
            <div style={styles.statLabel}>{t.stats.timeLabel}</div>
          </div>
        </div>

        {/* Main Card */}
        <div style={styles.card}>
          <div style={styles.cardInner}>
            
            {/* Form Fields */}
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  <span style={styles.labelIcon}>🌐</span>
                  {t.form.languageLabel}
                </label>
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
                  <div style={styles.selectArrow}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                      <path d="M2 4l4 4 4-4"/>
                    </svg>
                  </div>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  <span style={styles.labelIcon}>📍</span>
                  {t.form.stateLabel}
                </label>
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
                  <div style={styles.selectArrow}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                      <path d="M2 4l4 4 4-4"/>
                    </svg>
                  </div>
                </div>
                <div style={{...styles.stateBadgeInline, backgroundColor: stateBadge.bg, color: stateBadge.color, border: `1px solid ${stateBadge.color}30`}}>
                  {stateBadge.text}
                </div>
                <p style={styles.hint}>{t.form.stateHint}</p>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={styles.error}>
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* CTA Button */}
            <button 
              onClick={handleContinue} 
              disabled={isValidating}
              style={{...styles.ctaButton, opacity: isValidating ? 0.7 : 1, cursor: isValidating ? 'wait' : 'pointer'}}
            >
              <div style={styles.buttonContent}>
                {isValidating ? (
                  <>
                    <div style={styles.spinner}></div>
                    {t.form.buttonLoading}
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24">
                      <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    {t.form.button}
                  </>
                )}
              </div>
            </button>

            {/* Secure Note */}
            <div style={styles.secureNote}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
              </svg>
              <span>{t.form.secureNote}</span>
            </div>
          </div>

          {/* Trust Row */}
          <div style={styles.trustRow}>
            {t.trust.map((item, i) => (
              <div key={i} style={styles.trustBadge}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#10b981">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Features Section */}
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

        {/* Professional Footer */}
        <footer style={styles.footerSection}>
          <div style={styles.footerGrid}>
            {/* Contact Column */}
            <div style={styles.footerColumn}>
              <h4 style={styles.footerHeading}>Contact</h4>
              <div style={styles.footerItem}>
                <span style={styles.footerIcon}>📍</span>
                <span>123 Tax Street, Suite 100<br/>San Jose, CA 95110</span>
              </div>
              <div style={styles.footerItem}>
                <span style={styles.footerIcon}>📞</span>
                <span>+1 (888) 829-7597</span>
              </div>
              <div style={styles.footerItem}>
                <span style={styles.footerIcon}>✉️</span>
                <span>support@taxsky.com</span>
              </div>
              <div style={styles.socialLinks}>
                <a href="#" style={styles.socialIcon}>𝕏</a>
                <a href="#" style={styles.socialIcon}>in</a>
                <a href="#" style={styles.socialIcon}>▶</a>
                <a href="#" style={styles.socialIcon}>📷</a>
              </div>
            </div>

            {/* Services Column */}
            <div style={styles.footerColumn}>
              <h4 style={styles.footerHeading}>Services</h4>
              <a href="#" style={styles.footerLink}>Federal Tax Filing</a>
              <a href="#" style={styles.footerLink}>State Tax Filing</a>
              <a href="#" style={styles.footerLink}>Self-Employment Taxes</a>
              <a href="#" style={styles.footerLink}>W-2 Import</a>
              <a href="#" style={styles.footerLink}>1099 Processing</a>
              <a href="/cpa/login" style={styles.footerLink}>👨‍💼 CPA Portal</a>
            </div>

            {/* About Column */}
            <div style={styles.footerColumn}>
              <h4 style={styles.footerHeading}>About Us</h4>
              <p style={styles.footerAbout}>
                TaxSky AI is dedicated to providing smart, AI-powered tax preparation solutions. Our mission is to maximize your refund while minimizing your stress. We combine cutting-edge technology with tax expertise to deliver an unparalleled filing experience.
              </p>
              <div style={styles.footerBadges}>
                <span style={styles.trustBadgeSmall}>✓ IRS E-File</span>
                <span style={styles.trustBadgeSmall}>✓ SOC 2</span>
                <span style={styles.trustBadgeSmall}>✓ 256-bit SSL</span>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div style={styles.footerBottom}>
            <p style={styles.footerCopyright}>{t.footer.copyright}</p>
            <div style={styles.footerBottomLinks}>
              {t.footer.links.map((link, i) => (
                <span key={i}>
                  <a href="#" style={styles.footerBottomLink}>{link}</a>
                  {i < t.footer.links.length - 1 && <span style={styles.footerDivider}> • </span>}
                </span>
              ))}
            </div>
          </div>
        </footer>
      </div>

      {/* Global Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        ::selection {
          background: #3b82f6;
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
    background: '#0f172a',
    position: 'relative',
    overflow: 'hidden',
  },
  
  bgGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'radial-gradient(ellipse at 50% 0%, rgba(59, 130, 246, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 100% 50%, rgba(139, 92, 246, 0.1) 0%, transparent 50%), radial-gradient(ellipse at 0% 100%, rgba(16, 185, 129, 0.1) 0%, transparent 50%)',
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
    filter: 'blur(60px)',
    animation: 'pulse 8s ease-in-out infinite',
  },
  
  orb1: {
    width: 400,
    height: 400,
    background: 'rgba(59, 130, 246, 0.2)',
    top: '-10%',
    right: '-5%',
    animationDelay: '0s',
  },
  
  orb2: {
    width: 300,
    height: 300,
    background: 'rgba(139, 92, 246, 0.15)',
    bottom: '10%',
    left: '-5%',
    animationDelay: '2s',
  },
  
  orb3: {
    width: 200,
    height: 200,
    background: 'rgba(16, 185, 129, 0.15)',
    top: '50%',
    left: '50%',
    animationDelay: '4s',
  },
  
  container: {
    position: 'relative',
    maxWidth: 880,
    margin: '0 auto',
    padding: '40px 24px',
    transition: 'all 0.6s ease-out',
  },
  
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 48,
  },
  
  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  
  logoIcon: {
    display: 'flex',
  },
  
  logoText: {
    fontSize: 24,
    fontWeight: 800,
    color: '#fff',
    letterSpacing: '-0.5px',
  },
  
  langSwitch: {
    display: 'flex',
    gap: 8,
    background: 'rgba(255,255,255,0.05)',
    padding: 4,
    borderRadius: 12,
  },
  
  langBtn: {
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    background: 'transparent',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  
  langBtnActive: {
    background: 'rgba(255,255,255,0.1)',
  },
  
  hero: {
    textAlign: 'center',
    marginBottom: 40,
  },
  
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 16px',
    background: 'rgba(59, 130, 246, 0.15)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    borderRadius: 100,
    fontSize: 13,
    fontWeight: 600,
    color: '#60a5fa',
    marginBottom: 24,
  },
  
  heroTitle: {
    fontSize: 'clamp(32px, 6vw, 56px)',
    fontWeight: 800,
    color: '#fff',
    lineHeight: 1.1,
    letterSpacing: '-1px',
    marginBottom: 16,
  },
  
  heroHighlight: {
    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #10b981 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  
  heroSubtitle: {
    fontSize: 18,
    color: '#94a3b8',
    maxWidth: 500,
    margin: '0 auto',
    lineHeight: 1.6,
  },
  
  statsBar: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 32,
    padding: '24px 32px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 20,
    marginBottom: 32,
    flexWrap: 'wrap',
  },
  
  stat: {
    textAlign: 'center',
  },
  
  statValue: {
    fontSize: 24,
    fontWeight: 800,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  
  statDivider: {
    width: 1,
    height: 40,
    background: 'rgba(255,255,255,0.1)',
  },
  
  card: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 48,
  },
  
  cardInner: {
    padding: '40px 40px 32px',
  },
  
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 24,
    marginBottom: 16,
  },
  
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    fontWeight: 600,
    color: '#e2e8f0',
    marginBottom: 10,
  },
  
  labelIcon: {
    fontSize: 16,
  },
  
  selectWrap: {
    position: 'relative',
  },
  
  select: {
    width: '100%',
    padding: '14px 40px 14px 16px',
    fontSize: 15,
    fontWeight: 500,
    color: '#fff',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    cursor: 'pointer',
    appearance: 'none',
    transition: 'all 0.2s',
    outline: 'none',
  },
  
  selectArrow: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#64748b',
    pointerEvents: 'none',
  },
  
  stateBadgeInline: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 12px',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  
  hint: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 8,
  },
  
  error: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '14px 16px',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: 12,
    color: '#f87171',
    fontSize: 14,
    marginBottom: 20,
  },
  
  ctaButton: {
    width: '100%',
    padding: '18px 24px',
    fontSize: 16,
    fontWeight: 700,
    color: '#fff',
    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
    border: 'none',
    borderRadius: 14,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3)',
  },
  
  buttonContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  
  spinner: {
    width: 20,
    height: 20,
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  
  secureNote: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    fontSize: 13,
    color: '#64748b',
  },
  
  trustRow: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    padding: '20px 24px',
    background: 'rgba(255,255,255,0.02)',
    borderTop: '1px solid rgba(255,255,255,0.05)',
  },
  
  trustBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    color: '#94a3b8',
  },
  
  features: {
    marginBottom: 48,
  },
  
  featuresTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 32,
  },
  
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 16,
  },
  
  featureCard: {
    padding: 24,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 16,
    transition: 'all 0.3s ease',
  },
  
  featureIcon: {
    fontSize: 28,
    marginBottom: 12,
    display: 'inline-block',
  },
  
  featureTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: '#fff',
    marginBottom: 6,
  },
  
  featureDesc: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 1.5,
  },
  
  footer: {
    textAlign: 'center',
    paddingTop: 32,
    borderTop: '1px solid rgba(255,255,255,0.05)',
  },
  
  footerSection: {
    marginTop: 48,
    paddingTop: 48,
    borderTop: '1px solid rgba(255,255,255,0.08)',
  },
  
  footerGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 40,
    marginBottom: 40,
  },
  
  footerColumn: {
    textAlign: 'left',
  },
  
  footerHeading: {
    fontSize: 16,
    fontWeight: 700,
    color: '#fff',
    marginBottom: 20,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  
  footerItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 12,
    lineHeight: 1.5,
  },
  
  footerIcon: {
    fontSize: 14,
    marginTop: 2,
  },
  
  footerLink: {
    display: 'block',
    fontSize: 14,
    color: '#94a3b8',
    textDecoration: 'none',
    marginBottom: 10,
    transition: 'color 0.2s',
  },
  
  footerAbout: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 1.6,
    marginBottom: 16,
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
    padding: '4px 8px',
    borderRadius: 6,
  },
  
  socialLinks: {
    display: 'flex',
    gap: 12,
    marginTop: 16,
  },
  
  socialIcon: {
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: '#94a3b8',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 600,
    transition: 'all 0.2s',
  },
  
  footerBottom: {
    paddingTop: 24,
    borderTop: '1px solid rgba(255,255,255,0.06)',
    textAlign: 'center',
  },
  
  footerCopyright: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 12,
  },
  
  footerBottomLinks: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
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