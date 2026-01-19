// ============================================================
// TAXSKY APP WITH GOOGLE LOGIN - DARK THEME EDITION
// ============================================================
// ✅ FIXED: Properly stores odtUserId from backend
// ✅ FIXED: Stores taxsky_userId for all components
// ✅ UPDATED: Dark theme matching Onboarding & Dashboard
// ============================================================

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { createContext, useContext, useState, useEffect } from "react";
import Onboarding from "./pages/Onboarding";
import TaxChatPage from "./pages/TaxChatPage";

// ============================================================
// CONFIGURATION
// ============================================================
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// ============================================================
// AUTH CONTEXT
// ============================================================
const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

// ============================================================
// AUTH PROVIDER
// ============================================================
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem("taxsky_token");
    const savedUser = localStorage.getItem("taxsky_user");

    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(parsedUser);
        
        // ✅ Ensure userId is stored
        if (parsedUser.id || parsedUser.odtUserId) {
          localStorage.setItem("taxsky_userId", parsedUser.id || parsedUser.odtUserId);
        }
        
        verifyToken(savedToken);
      } catch (err) {
        console.error("Error parsing saved user:", err);
        logout();
      }
    } else {
      setLoading(false);
    }
  }, []);

  const verifyToken = async (authToken) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/verify`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!res.ok) {
        logout();
      } else {
        const data = await res.json();
        // ✅ Update userId from verification response
        if (data.user?.odtUserId) {
          localStorage.setItem("taxsky_userId", data.user.odtUserId);
        }
      }
    } catch (err) {
      console.error("Token verification failed:", err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED: Store userId in multiple places for reliability
  const login = (userData, authToken) => {
    // Get the userId - prefer odtUserId, fallback to id
    const userId = userData.odtUserId || userData.id;
    
    if (!userId || userId === 'undefined') {
      console.error("[AUTH] ❌ No valid userId in login response:", userData);
      return;
    }
    
    // Ensure user object has id field
    const userWithId = {
      ...userData,
      id: userId,
      odtUserId: userId
    };
    
    setUser(userWithId);
    setToken(authToken);
    
    // Store in localStorage
    localStorage.setItem("taxsky_token", authToken);
    localStorage.setItem("taxsky_user", JSON.stringify(userWithId));
    localStorage.setItem("taxsky_userId", userId);  // ✅ Store separately for easy access
    
    console.log("[AUTH] ✅ Login successful, userId:", userId);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("taxsky_token");
    localStorage.removeItem("taxsky_user");
    localStorage.removeItem("taxsky_userId");
    localStorage.removeItem("taxsky_state");
    localStorage.removeItem("taxsky_language");
    console.log("[AUTH] 👋 Logged out");
  };

  // ✅ Helper to get userId consistently
  const getUserId = () => {
    if (user?.id) return user.id;
    if (user?.odtUserId) return user.odtUserId;
    return localStorage.getItem("taxsky_userId");
  };

  return (
    <AuthContext.Provider
      value={{ 
        user, 
        token, 
        loading, 
        isAuthenticated: !!user, 
        login, 
        logout,
        getUserId  // ✅ Export helper function
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================
// GOOGLE LOGIN PAGE - DARK THEME
// ============================================================
function LoginPage() {
  const { login } = useAuth();
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
        // ✅ Verify we have a valid userId
        const userId = data.user?.odtUserId || data.user?.id;
        if (!userId || userId === 'undefined') {
          throw new Error("Server did not return a valid user ID");
        }
        
        // ✅ Store language preference
        localStorage.setItem("taxsky_language", language);
        
        login(data.user, data.token);
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
    window.location.href = "/";
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
    <div style={loginStyles.page}>
      {/* Animated Background */}
      <div style={loginStyles.bgGradient} />
      <div style={loginStyles.bgOrbs}>
        <div style={{...loginStyles.orb, ...loginStyles.orb1}} />
        <div style={{...loginStyles.orb, ...loginStyles.orb2}} />
        <div style={{...loginStyles.orb, ...loginStyles.orb3}} />
      </div>

      <div style={{
        ...loginStyles.container, 
        opacity: mounted ? 1 : 0, 
        transform: mounted ? 'translateY(0)' : 'translateY(20px)'
      }}>
        {/* Header */}
        <div style={loginStyles.header}>
          <div style={loginStyles.logoIcon}>
            {/* TaxSky AI Logo - Tech Hexagon */}
            <svg width="96" height="96" viewBox="0 0 80 80" fill="none">
              <defs>
                <linearGradient id="hexGradLogin" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1"/>
                  <stop offset="100%" stopColor="#8b5cf6"/>
                </linearGradient>
                <linearGradient id="bgGradLogin" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0f0f1a"/>
                  <stop offset="100%" stopColor="#1a1a2e"/>
                </linearGradient>
              </defs>
              <rect width="80" height="80" rx="18" fill="url(#bgGradLogin)"/>
              <polygon points="34,16 48,8 62,16 62,36 48,44 34,36" fill="url(#hexGradLogin)" opacity="0.3"/>
              <polygon points="28,24 42,16 56,24 56,44 42,52 28,44" fill="url(#hexGradLogin)" opacity="0.55"/>
              <polygon points="32,32 45,25 58,32 58,48 45,55 32,48" fill="url(#hexGradLogin)"/>
              <path d="M45 36 L45 48 M40 40 Q45 36 50 40 Q45 44 40 48 Q45 52 50 48" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
            </svg>
          </div>
          <h1 style={loginStyles.title}>TaxSky AI</h1>
          <p style={loginStyles.subtitle}>Smart Tax Filing Made Easy</p>
        </div>

        {/* Login Card */}
        <div style={loginStyles.card}>
          <h2 style={loginStyles.cardTitle}>{t.almostThere}</h2>
          <p style={loginStyles.cardText}>{t.signInText}</p>

          {/* State Badge */}
          <div style={loginStyles.stateBadge}>
            <span style={loginStyles.stateIcon}>📍</span>
            <span style={loginStyles.stateText}>{t.filingFor} <strong>{stateName}</strong></span>
            <button onClick={handleChangeState} style={loginStyles.changeBtn}>{t.change}</button>
          </div>

          {/* Error Message */}
          {error && <div style={loginStyles.errorBox}>⚠️ {error}</div>}

          {/* Google Sign In Button */}
          <div style={loginStyles.buttonContainer}>
            {isLoading ? (
              <div style={loginStyles.loadingBox}>
                <div style={loginStyles.spinnerSmall}></div>
                <span>{t.signingIn}</span>
              </div>
            ) : (
              <div id="google-signin-button" style={loginStyles.googleBtn}></div>
            )}
          </div>

          {/* Benefits */}
          <div style={loginStyles.benefits}>
            <p style={loginStyles.benefitsTitle}>{t.whySignIn}</p>
            {t.benefits.map((benefit, i) => (
              <div key={i} style={loginStyles.benefitItem}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#10b981">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p style={loginStyles.footer}>{t.footer}</p>
        <a href="/cpa/login" style={loginStyles.cpaLink}>👨‍💼 {t.cpaPortal}</a>
      </div>

      {/* Global Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
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
// LOGIN PAGE STYLES - DARK THEME
// ============================================================
const loginStyles = {
  // Page & Background - DARK THEME
  page: {
    minHeight: '100vh',
    background: '#0f172a',  // Dark slate background
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
  
  // Container
  container: {
    position: 'relative',
    width: '100%',
    maxWidth: 420,
    textAlign: 'center',
    transition: 'all 0.6s ease-out',
  },
  
  // Header
  header: {
    marginBottom: 32,
  },
  
  logoIcon: {
    marginBottom: 16,
  },
  
  title: {
    fontSize: 36,
    fontWeight: 800,
    color: '#fff',
    margin: 0,
    letterSpacing: '-0.5px',
  },
  
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 8,
  },
  
  // Card - Glass morphism dark style
  card: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
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
  
  // State Badge
  stateBadge: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '12px 16px',
    background: 'rgba(59, 130, 246, 0.1)',
    border: '1px solid rgba(59, 130, 246, 0.2)',
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
    color: '#60a5fa',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'underline',
    marginLeft: 8,
  },
  
  // Error
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
  
  // Button
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
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  
  // Benefits
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
  
  // Footer
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

// ============================================================
// PROTECTED ROUTE
// ============================================================
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.loadingContent}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>Loading...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return children;
}

// ============================================================
// USER PREF CHECK
// ============================================================
function hasUserPreferences(user) {
  return !!user?.language && !!user?.state;
}

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const { user } = useAuth() || {};

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                {hasUserPreferences(user) ? (
                  <Navigate to="/taxchat" replace />
                ) : (
                  <Onboarding />
                )}
              </ProtectedRoute>
            }
          />

          <Route
            path="/taxchat"
            element={
              <ProtectedRoute>
                {hasUserPreferences(user) ? (
                  <TaxChatPage />
                ) : (
                  <Navigate to="/" replace />
                )}
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

// ============================================================
// STYLES - LOADING SCREEN (DARK THEME)
// ============================================================
const styles = {
  loadingScreen: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0f172a',
  },
  
  loadingContent: {
    textAlign: 'center',
  },
  
  spinner: {
    width: 40,
    height: 40,
    border: '3px solid rgba(255,255,255,0.1)',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    margin: '0 auto 16px',
  },
  
  loadingText: {
    color: '#94a3b8',
    fontSize: 15,
  },
};