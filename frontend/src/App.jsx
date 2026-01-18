// ============================================================
// TAXSKY APP - DARK THEME EDITION
// ============================================================
// Flow: Home (PUBLIC) → Google Login → Chat
// ✅ UPDATED: Dark theme matching Onboarding & Dashboard
// ============================================================
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { createContext, useContext, useState, useEffect } from "react";
import Onboarding from "./pages/Onboarding";
import TaxChatPage from "./pages/TaxChatPage";
import UserDashboard from "./components/UserDashboard";

// CPA Imports
import { CPAAuthProvider, CPAProtectedRoute } from './contexts/CPAAuthContext';
import CPALogin from './pages/CPALogin';
import CPARegister from './pages/CPARegister';
import CPADashboard from './pages/CPADashboard';
import CPAAdmin from './pages/CPAAdmin';

// Payment Imports
import { 
  PricingPage, 
  CheckoutPage, 
  PaymentSuccess, 
  PaymentHistory 
} from './pages/payment';

// ============================================================
// CONFIGURATION
// ============================================================
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// ============================================================
// AUTH CONTEXT (For regular users)
// ============================================================
const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

// ============================================================
// AUTH PROVIDER
// ============================================================
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for preferences (dynamic function)
  const hasPreferences = () => {
    const lang = localStorage.getItem("taxsky_language");
    const st = localStorage.getItem("taxsky_state");
    return !!lang && !!st;
  };

  useEffect(() => {
    const savedToken = localStorage.getItem("taxsky_token");
    const savedUser = localStorage.getItem("taxsky_user");

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      verifyToken(savedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const verifyToken = async (authToken) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/verify`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) {
        logout();
      }
    } catch (error) {
      console.error("Token verification failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem("taxsky_token", authToken);
    localStorage.setItem("taxsky_user", JSON.stringify(userData));
    localStorage.setItem("taxsky_userId", userData.id);
    localStorage.setItem("token", authToken);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("taxsky_token");
    localStorage.removeItem("taxsky_user");
    localStorage.removeItem("taxsky_userId");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  const setPreferences = (language, state) => {
    localStorage.setItem("taxsky_language", language);
    localStorage.setItem("taxsky_state", state);
  };

  const clearPreferences = () => {
    localStorage.removeItem("taxsky_language");
    localStorage.removeItem("taxsky_state");
    localStorage.removeItem("taxsky_state_name");
    localStorage.removeItem("taxsky_has_state_tax");
  };

  return (
    <AuthContext.Provider value={{ 
      user, token, loading, 
      isAuthenticated: !!user, 
      hasPreferences,
      login, logout, setPreferences, clearPreferences
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================
// GOOGLE LOGIN PAGE - DARK THEME
// ============================================================
function LoginPage() {
  const { login, hasPreferences } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const savedState = localStorage.getItem("taxsky_state") || "CA";
  const savedStateName = localStorage.getItem("taxsky_state_name") || savedState;

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
          { theme: "outline", size: "large", text: "signin_with", shape: "pill", width: 280 }
        );
      }
    };

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handleGoogleResponse = async (response) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential }),
      });

      const data = await res.json();

      if (data.success) {
        login(data.user, data.token);
        navigate("/taxchat");
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
        {/* Header with Logo */}
        <div style={loginStyles.header}>
          <div style={loginStyles.logoIcon}>
            <svg width="64" height="64" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="url(#logoGradLogin)"/>
              <path d="M8 12h16M8 16h12M8 20h8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="24" cy="20" r="4" fill="#10b981"/>
              <path d="M22 20l1.5 1.5L26 19" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <defs>
                <linearGradient id="logoGradLogin" x1="0" y1="0" x2="32" y2="32">
                  <stop stopColor="#3b82f6"/>
                  <stop offset="1" stopColor="#8b5cf6"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 style={loginStyles.title}>TaxSky AI</h1>
          <p style={loginStyles.subtitle}>Smart Tax Filing Made Easy</p>
        </div>

        {/* Login Card */}
        <div style={loginStyles.card}>
          <h2 style={loginStyles.cardTitle}>Almost There!</h2>
          <p style={loginStyles.cardText}>Sign in with Google to start filing your taxes</p>

          {/* State Badge */}
          {hasPreferences() && (
            <div style={loginStyles.stateBadge}>
              <span style={loginStyles.stateIcon}>📍</span>
              <span style={loginStyles.stateText}>Filing for: <strong>{savedStateName}</strong></span>
              <button onClick={() => navigate("/")} style={loginStyles.changeBtn}>Change</button>
            </div>
          )}

          {/* Error Message */}
          {error && <div style={loginStyles.errorBox}>⚠️ {error}</div>}

          {/* Google Sign In Button */}
          <div style={loginStyles.buttonContainer}>
            {isLoading ? (
              <div style={loginStyles.loadingBox}>
                <div style={loginStyles.spinnerSmall}></div>
                <span>Signing in...</span>
              </div>
            ) : (
              <div id="google-signin-button" style={loginStyles.googleBtn}></div>
            )}
          </div>

          {!GOOGLE_CLIENT_ID && (
            <div style={loginStyles.warningBox}>⚠️ Google Client ID not configured.</div>
          )}

          {/* Benefits */}
          <div style={loginStyles.benefits}>
            <p style={loginStyles.benefitsTitle}>Why sign in?</p>
            <div style={loginStyles.benefitItem}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#10b981"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
              <span>Save your tax return progress</span>
            </div>
            <div style={loginStyles.benefitItem}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#10b981"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
              <span>Secure your personal data</span>
            </div>
            <div style={loginStyles.benefitItem}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#10b981"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
              <span>Access from any device</span>
            </div>
            <div style={loginStyles.benefitItem}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#10b981"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
              <span>File multiple returns</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p style={loginStyles.footer}>
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
        <a href="/cpa/login" style={loginStyles.cpaLink}>👨‍💼 CPA Portal</a>
      </div>

      {/* Global Styles for animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        #google-signin-button {
          display: flex;
          justify-content: center;
        }
      `}</style>
    </div>
  );
}

// ============================================================
// LOGIN PAGE STYLES - DARK THEME
// ============================================================
const loginStyles = {
  page: {
    minHeight: '100vh',
    background: '#0f172a',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
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
  
  card: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 24,
    padding: 32,
    marginBottom: 24,
    textAlign: 'left',
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
    flex: 1,
  },
  
  changeBtn: {
    background: 'none',
    border: 'none',
    color: '#60a5fa',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 16px',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: 12,
    color: '#f87171',
    fontSize: 14,
    marginBottom: 20,
  },
  
  warningBox: {
    padding: '12px 16px',
    background: 'rgba(245, 158, 11, 0.1)',
    border: '1px solid rgba(245, 158, 11, 0.2)',
    borderRadius: 12,
    color: '#fbbf24',
    fontSize: 14,
    marginTop: 16,
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
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  
  benefits: {
    paddingTop: 20,
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
    textAlign: 'center',
  },
  
  cpaLink: {
    fontSize: 13,
    color: '#64748b',
    textDecoration: 'none',
  },
};

// ============================================================
// USER MENU
// ============================================================
export function UserMenu() {
  const { user, logout, clearPreferences } = useAuth();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  if (!user) return null;

  const handleChangeState = () => {
    clearPreferences();
    navigate("/");
    setShowMenu(false);
  };

  return (
    <div style={styles.userMenu}>
      <button style={styles.userButton} onClick={() => setShowMenu(!showMenu)}>
        <img src={user.picture} alt={user.name} style={styles.userAvatar} />
        <span style={styles.userName}>{user.firstName || user.name}</span>
        <span style={styles.dropdownArrow}>▼</span>
      </button>

      {showMenu && (
        <div style={styles.dropdown}>
          <div style={styles.dropdownHeader}>
            <img src={user.picture} alt={user.name} style={styles.dropdownAvatar} />
            <div>
              <strong>{user.name}</strong>
              <p style={styles.dropdownEmail}>{user.email}</p>
            </div>
          </div>
          <hr style={styles.divider} />
          <button style={styles.menuButton} onClick={() => { navigate('/dashboard'); setShowMenu(false); }}>📊 Dashboard</button>
          <button style={styles.menuButton} onClick={() => { navigate('/taxchat'); setShowMenu(false); }}>💬 Tax Chat</button>
          <button style={styles.menuButton} onClick={() => { navigate('/payment/pricing'); setShowMenu(false); }}>💳 Pricing</button>
          <button style={styles.menuButton} onClick={() => { navigate('/payment/history'); setShowMenu(false); }}>📄 Payment History</button>
          <button style={styles.menuButton} onClick={handleChangeState}>📍 Change State</button>
          <hr style={styles.divider} />
          <button style={styles.logoutButton} onClick={logout}>🚪 Sign Out</button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// PROTECTED ROUTE WRAPPER
// ============================================================
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, hasPreferences } = useAuth();

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.loadingContent}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasPreferences()) {
    return <Navigate to="/" replace />;
  }

  return children;
}

// ============================================================
// ROUTE COMPONENTS
// ============================================================

// Home: PUBLIC - No login required!
function HomeRoute() {
  const { isAuthenticated, hasPreferences, loading } = useAuth();

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.loadingContent}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>Loading...</p>
        </div>
      </div>
    );
  }

  // Already logged in with preferences → go to chat
  if (isAuthenticated && hasPreferences()) {
    return <Navigate to="/taxchat" replace />;
  }

  // Show public onboarding page
  return <Onboarding />;
}

// Login: Show Google login
function LoginRoute() {
  const { isAuthenticated, hasPreferences, loading } = useAuth();

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.loadingContent}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated && hasPreferences()) {
    return <Navigate to="/taxchat" replace />;
  }

  if (isAuthenticated && !hasPreferences()) {
    return <Navigate to="/" replace />;
  }

  if (!hasPreferences()) {
    return <Navigate to="/" replace />;
  }

  return <LoginPage />;
}

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC: Home - Onboarding */}
        <Route path="/" element={<AuthProvider><HomeRoute /></AuthProvider>} />

        {/* PUBLIC: Login */}
        <Route path="/login" element={<AuthProvider><LoginRoute /></AuthProvider>} />

        {/* PROTECTED: Tax Chat */}
        <Route path="/taxchat" element={<AuthProvider><ProtectedRoute><TaxChatPage /></ProtectedRoute></AuthProvider>} />

        {/* PROTECTED: Dashboard */}
        <Route path="/dashboard" element={<AuthProvider><ProtectedRoute><UserDashboard /></ProtectedRoute></AuthProvider>} />

        {/* PAYMENT */}
        <Route path="/payment/pricing" element={<AuthProvider><PricingPage /></AuthProvider>} />
        <Route path="/payment/checkout/:planId" element={<AuthProvider><ProtectedRoute><CheckoutPage /></ProtectedRoute></AuthProvider>} />
        <Route path="/payment/success" element={<AuthProvider><ProtectedRoute><PaymentSuccess /></ProtectedRoute></AuthProvider>} />
        <Route path="/payment/history" element={<AuthProvider><ProtectedRoute><PaymentHistory /></ProtectedRoute></AuthProvider>} />
        <Route path="/pricing" element={<Navigate to="/payment/pricing" replace />} />

        {/* CPA */}
        <Route path="/cpa/login" element={<CPAAuthProvider><CPALogin /></CPAAuthProvider>} />
        <Route path="/cpa/register" element={<CPAAuthProvider><CPARegister /></CPAAuthProvider>} />
        <Route path="/cpa/dashboard" element={<CPAAuthProvider><CPAProtectedRoute><CPADashboard /></CPAProtectedRoute></CPAAuthProvider>} />
        <Route path="/cpa/admin" element={<CPAAuthProvider><CPAProtectedRoute><CPAAdmin /></CPAProtectedRoute></CPAAuthProvider>} />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

// ============================================================
// GENERAL STYLES - DARK THEME
// ============================================================
const styles = {
  userMenu: { position: "relative" },
  userButton: { display: "flex", alignItems: "center", gap: "10px", background: "rgba(255,255,255,0.1)", border: "none", padding: "8px 15px", borderRadius: "25px", cursor: "pointer", color: "white", fontSize: "0.95rem" },
  userAvatar: { width: "32px", height: "32px", borderRadius: "50%" },
  userName: { maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  dropdownArrow: { fontSize: "0.7rem", opacity: 0.7 },
  dropdown: { position: "absolute", top: "100%", right: 0, marginTop: "10px", background: "#1e293b", borderRadius: "12px", boxShadow: "0 10px 40px rgba(0,0,0,0.4)", minWidth: "260px", padding: "15px", zIndex: 1000, border: "1px solid rgba(255,255,255,0.1)" },
  dropdownHeader: { display: "flex", alignItems: "center", gap: "12px", paddingBottom: "15px", color: "#fff" },
  dropdownAvatar: { width: "48px", height: "48px", borderRadius: "50%" },
  dropdownEmail: { color: "#94a3b8", fontSize: "0.85rem", margin: "4px 0 0 0" },
  divider: { border: "none", borderTop: "1px solid rgba(255,255,255,0.1)", margin: "10px 0" },
  menuButton: { width: "100%", padding: "12px", background: "transparent", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "0.95rem", color: "#e2e8f0", textAlign: "left" },
  logoutButton: { width: "100%", padding: "12px", background: "rgba(239,68,68,0.1)", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "0.95rem", color: "#f87171", textAlign: "left" },
  loadingScreen: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#0f172a" },
  loadingContent: { textAlign: "center" },
  spinner: { width: "40px", height: "40px", border: "3px solid rgba(255,255,255,0.1)", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" },
  loadingText: { color: "#94a3b8", fontSize: "15px" },
};

// Add keyframes animation
const styleSheet = document.createElement("style");
styleSheet.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(styleSheet);