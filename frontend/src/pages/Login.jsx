// ============================================================
// TAXSKY LOGIN PAGE - DARK THEME (FIXED FOR PAYMENT REDIRECT)
// ============================================================
// Standalone login page for /login route
// Matches Onboarding & Dashboard dark theme
// Updated: New TaxSky AI Hexagon Logo
// FIXED: Redirect to checkout after login if coming from pricing
// ============================================================

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../App";  // ✅ Import useAuth from App

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();  // ✅ Get login function from context
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState(() => localStorage.getItem("taxsky_language") || "en");
  const [mounted, setMounted] = useState(false);
  
  // Get saved state from Onboarding
  const state = localStorage.getItem("taxsky_state") || "CA";
  const stateName = localStorage.getItem("taxsky_state_name") || state;

  useEffect(() => {
    setMounted(true);
    
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (window.google && GOOGLE_CLIENT_ID) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
        });

        window.google.accounts.id.renderButton(
          document.getElementById("google-signin-button"),
          {
            theme: "outline",
            size: "large",
            text: "signin_with",
            shape: "pill",
            width: 280,
          }
        );
      }
    };

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [language]);

  const handleGoogleResponse = async (response) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential: response.credential,
          language,
        }),
      });

      const data = await res.json();

      if (data.success) {
        const userId = data.user?.odtUserId || data.user?.id;
        if (!userId || userId === 'undefined') {
          throw new Error("Server did not return a valid user ID");
        }
        
        // ✅ Use login() from useAuth context to properly update state
        login(data.user, data.token);
        
        // Also store language
        localStorage.setItem("taxsky_language", language);
        
        // ============================================================
        // ✅ FIXED: Check for redirect URL (from pricing page)
        // ============================================================
        const redirectUrl = localStorage.getItem("taxsky_redirect_after_login");
        
        if (redirectUrl) {
          // Clear the stored redirect
          localStorage.removeItem("taxsky_redirect_after_login");
          // Navigate to the stored URL (e.g., /checkout/standard)
          navigate(redirectUrl);
        } else {
          // Default: go to tax chat
          navigate("/taxchat");
        }
        // ============================================================
        
      } else {
        throw new Error(data.error || "Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeState = () => {
    navigate("/");
  };

  // Translations
  const translations = {
    en: {
      almostThere: "Almost There!",
      signInText: "Sign in with Google to start filing your taxes",
      filingFor: "Filing for:",
      change: "Change",
      whySignIn: "Why sign in?",
      benefits: [
        "Save your tax return progress",
        "Secure your personal data",
        "Access from any device",
        "File multiple returns"
      ],
      footer: "By signing in, you agree to our Terms of Service and Privacy Policy",
      signingIn: "Signing in...",
      cpaPortal: "CPA Portal",
    },
    vi: {
      almostThere: "Sắp Xong!",
      signInText: "Đăng nhập với Google để bắt đầu khai thuế",
      filingFor: "Khai thuế cho:",
      change: "Đổi",
      whySignIn: "Tại sao đăng nhập?",
      benefits: [
        "Lưu tiến trình khai thuế",
        "Bảo mật dữ liệu cá nhân",
        "Truy cập từ mọi thiết bị",
        "Khai nhiều tờ thuế"
      ],
      footer: "Bằng việc đăng nhập, bạn đồng ý với Điều khoản và Chính sách của chúng tôi",
      signingIn: "Đang đăng nhập...",
      cpaPortal: "CPA Portal",
    },
    es: {
      almostThere: "¡Casi Listo!",
      signInText: "Inicia sesión con Google para declarar tus impuestos",
      filingFor: "Declarando para:",
      change: "Cambiar",
      whySignIn: "¿Por qué iniciar sesión?",
      benefits: [
        "Guarda tu progreso",
        "Protege tus datos personales",
        "Accede desde cualquier dispositivo",
        "Presenta múltiples declaraciones"
      ],
      footer: "Al iniciar sesión, aceptas nuestros Términos y Política de Privacidad",
      signingIn: "Iniciando sesión...",
      cpaPortal: "Portal CPA",
    }
  };

  const t = translations[language] || translations.en;

  return (
    <div style={styles.page}>
      {/* Animated Background */}
      <div style={styles.bgGradient} />
      <div style={styles.bgOrbs}>
        <div style={{...styles.orb, ...styles.orb1}} />
        <div style={{...styles.orb, ...styles.orb2}} />
        <div style={{...styles.orb, ...styles.orb3}} />
      </div>

      <div style={{
        ...styles.container, 
        opacity: mounted ? 1 : 0, 
        transform: mounted ? 'translateY(0)' : 'translateY(20px)'
      }}>
        {/* Header with NEW TaxSky AI Logo */}
        <div style={styles.header}>
          <div style={styles.logoIcon}>
            {/* TaxSky AI Logo - Tech Hexagon */}
            <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
              <defs>
                <linearGradient id="hexGradLogin" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1"/>
                  <stop offset="100%" stopColor="#8b5cf6"/>
                </linearGradient>
                <filter id="glowLogin">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              {/* Hexagon layers */}
              <polygon points="48,8 72,20 72,52 48,64 24,52 24,20" fill="url(#hexGradLogin)" opacity="0.2"/>
              <polygon points="48,16 68,26 68,50 48,60 28,50 28,26" fill="url(#hexGradLogin)" opacity="0.4"/>
              <polygon points="48,24 64,32 64,48 48,56 32,48 32,32" fill="url(#hexGradLogin)" filter="url(#glowLogin)"/>
              {/* Dollar sign */}
              <path d="M48 34 L48 50 M42 38 Q48 34 54 38 Q48 42 42 46 Q48 50 54 46" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none"/>
            </svg>
          </div>
          <h1 style={styles.title}>TaxSky AI</h1>
          <p style={styles.subtitle}>Smart Tax Filing Made Easy</p>
        </div>

        {/* Login Card */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>{t.almostThere}</h2>
          <p style={styles.cardText}>{t.signInText}</p>

          {/* State Badge */}
          <div style={styles.stateBadge}>
            <span style={styles.stateIcon}>📍</span>
            <span style={styles.stateText}>{t.filingFor} <strong>{stateName}</strong></span>
            <button onClick={handleChangeState} style={styles.changeBtn}>{t.change}</button>
          </div>

          {/* Error Message */}
          {error && <div style={styles.errorBox}>⚠️ {error}</div>}

          {/* Google Sign In Button */}
          <div style={styles.buttonContainer}>
            {isLoading ? (
              <div style={styles.loadingBox}>
                <div style={styles.spinnerSmall}></div>
                <span>{t.signingIn}</span>
              </div>
            ) : (
              <div id="google-signin-button" style={styles.googleBtn}></div>
            )}
          </div>

          {/* Benefits */}
          <div style={styles.benefits}>
            <p style={styles.benefitsTitle}>{t.whySignIn}</p>
            {t.benefits.map((benefit, i) => (
              <div key={i} style={styles.benefitItem}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#10b981">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p style={styles.footer}>{t.footer}</p>
        <a href="/cpa/login" style={styles.cpaLink}>👨‍💼 {t.cpaPortal}</a>
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
      `}</style>
    </div>
  );
}

// ============================================================
// STYLES - DARK THEME
// ============================================================
const styles = {
  page: {
    minHeight: '100vh',
    background: '#0a0a0f',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
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
    filter: 'blur(60px)',
    animation: 'pulse 8s ease-in-out infinite',
  },
  
  orb1: {
    width: 400,
    height: 400,
    background: 'rgba(99, 102, 241, 0.15)',
    top: '-10%',
    right: '-5%',
  },
  
  orb2: {
    width: 300,
    height: 300,
    background: 'rgba(139, 92, 246, 0.12)',
    bottom: '10%',
    left: '-5%',
    animationDelay: '2s',
  },
  
  orb3: {
    width: 200,
    height: 200,
    background: 'rgba(6, 182, 212, 0.1)',
    top: '50%',
    left: '50%',
    animationDelay: '4s',
  },
  
  container: {
    position: 'relative',
    width: '100%',
    maxWidth: 420,
    textAlign: 'center',
    transition: 'all 0.6s ease-out',
  },
  
  header: {
    marginBottom: 32,
  },
  
  logoIcon: {
    marginBottom: 16,
    display: 'flex',
    justifyContent: 'center',
  },
  
  title: {
    fontSize: 36,
    fontWeight: 700,
    color: '#fff',
    margin: 0,
    letterSpacing: '-0.5px',
    fontFamily: "'Space Grotesk', sans-serif",
  },
  
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 8,
  },
  
  card: {
    background: 'linear-gradient(145deg, rgba(30, 30, 45, 0.8), rgba(20, 20, 30, 0.9))',
    border: '1px solid rgba(99, 102, 241, 0.15)',
    borderRadius: 24,
    padding: 32,
    marginBottom: 24,
  },
  
  cardTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: '#fff',
    margin: '0 0 8px',
  },
  
  cardText: {
    fontSize: 15,
    color: '#94a3b8',
    marginBottom: 24,
  },
  
  stateBadge: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '12px 16px',
    background: 'rgba(99, 102, 241, 0.1)',
    border: '1px solid rgba(99, 102, 241, 0.2)',
    borderRadius: 12,
    marginBottom: 24,
  },
  
  stateIcon: {
    fontSize: 16,
  },
  
  stateText: {
    fontSize: 14,
    color: '#e2e8f0',
  },
  
  changeBtn: {
    background: 'none',
    border: 'none',
    color: '#818cf8',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'underline',
    marginLeft: 8,
  },
  
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '12px 16px',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: 12,
    color: '#f87171',
    fontSize: 14,
    marginBottom: 20,
  },
  
  buttonContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: 24,
  },
  
  googleBtn: {
    display: 'flex',
    justifyContent: 'center',
  },
  
  loadingBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 24px',
    color: '#94a3b8',
    fontSize: 15,
  },
  
  spinnerSmall: {
    width: 20,
    height: 20,
    border: '2px solid rgba(255,255,255,0.1)',
    borderTopColor: '#6366f1',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  
  benefits: {
    textAlign: 'left',
    padding: '20px 0 0',
    borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  
  benefitsTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#94a3b8',
    marginBottom: 12,
  },
  
  benefitItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: 14,
    color: '#e2e8f0',
    marginBottom: 8,
  },
  
  footer: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 12,
  },
  
  cpaLink: {
    fontSize: 13,
    color: '#64748b',
    textDecoration: 'none',
  },
};