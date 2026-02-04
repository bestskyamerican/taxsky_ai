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
import Login from "./pages/Login";  // ✅ Import Login page

// CPA Imports
import { CPAAuthProvider, CPAProtectedRoute } from './contexts/CPAAuthContext';
import CPALogin from './pages/cpa/CPALogin';
import CPARegister from './pages/cpa/CPARegister';
import CPADashboard from './pages/cpa/CPADashboard';
import CPAAdmin from './pages/admin/CPAAdmin';
import SuperAdmin from './pages/admin/SuperAdmin';
import FAQPage from './pages/news/FAQPage';
import InvestorPage from './pages/news/InvestorPage';
import CareerPage from './pages/news/CareerPage';
import NewsPage from './pages/news/NewsPage';


// ✅ ADD THESE
import PrivacyPolicy from './pages/news/PrivacyPolicy';
import TermsOfService from './pages/news/TermsOfService';

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

      {/* Main Content */}
      <div style={loginStyles.container}>
        {/* Logo */}
        <div style={loginStyles.logoSection}>
          <div style={loginStyles.logoIcon}>🌤️</div>
          <h1 style={loginStyles.logoText}>TaxSky</h1>
        </div>

        {/* Login Card */}
        <div style={loginStyles.card}>
          <h2 style={loginStyles.title}>Welcome Back</h2>
          <p style={loginStyles.subtitle}>
            Sign in to continue filing your {savedStateName} taxes
          </p>

          {/* State Badge */}
          <div style={loginStyles.stateBadge}>
            <span style={loginStyles.stateIcon}>📍</span>
            <span>{savedStateName}</span>
          </div>

          {/* Google Button Container */}
          <div style={loginStyles.googleButtonContainer}>
            {isLoading ? (
              <div style={loginStyles.loadingSpinner}>
                <div style={loginStyles.spinner}></div>
                <span>Signing in...</span>
              </div>
            ) : (
              <div id="google-signin-button" style={loginStyles.googleButton}></div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div style={loginStyles.errorBox}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Divider */}
          <div style={loginStyles.divider}>
            <span style={loginStyles.dividerLine}></span>
            <span style={loginStyles.dividerText}>Secure Login</span>
            <span style={loginStyles.dividerLine}></span>
          </div>

          {/* Benefits */}
          <div style={loginStyles.benefits}>
            <div style={loginStyles.benefit}>
              <span style={loginStyles.benefitIcon}>🔒</span>
              <span>Bank-level encryption</span>
            </div>
            <div style={loginStyles.benefit}>
              <span style={loginStyles.benefitIcon}>✅</span>
              <span>IRS e-file authorized</span>
            </div>
            <div style={loginStyles.benefit}>
              <span style={loginStyles.benefitIcon}>💬</span>
              <span>AI-powered assistance</span>
            </div>
          </div>
        </div>

        {/* Footer Links */}
        <div style={loginStyles.footer}>
          <a href="/" style={loginStyles.footerLink}>← Change State</a>
          <span style={loginStyles.footerDot}>•</span>
          <a href="/cpa/login" style={loginStyles.footerLink}>CPA Portal</a>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// LOGIN PAGE STYLES
// ============================================================
const loginStyles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  bgGradient: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(ellipse at top, rgba(99,102,241,0.15) 0%, transparent 50%)',
  },
  bgOrbs: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    borderRadius: '50%',
    filter: 'blur(80px)',
    opacity: 0.4,
  },
  orb1: {
    width: '400px',
    height: '400px',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    top: '-100px',
    right: '-100px',
  },
  orb2: {
    width: '300px',
    height: '300px',
    background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
    bottom: '-50px',
    left: '-50px',
  },
  orb3: {
    width: '200px',
    height: '200px',
    background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    opacity: 0.2,
  },
  container: {
    position: 'relative',
    zIndex: 10,
    padding: '20px',
    width: '100%',
    maxWidth: '420px',
  },
  logoSection: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  logoIcon: {
    fontSize: '48px',
    marginBottom: '8px',
  },
  logoText: {
    fontSize: '32px',
    fontWeight: '800',
    color: '#fff',
    margin: 0,
    letterSpacing: '-1px',
  },
  card: {
    background: 'rgba(30, 41, 59, 0.8)',
    backdropFilter: 'blur(20px)',
    borderRadius: '24px',
    padding: '40px 32px',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#fff',
    margin: '0 0 8px',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: '15px',
    color: '#94a3b8',
    margin: '0 0 24px',
    textAlign: 'center',
  },
  // AFTER (fixed)
stateBadge: {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  background: 'rgba(99,102,241,0.15)',
  border: '1px solid rgba(99,102,241,0.3)',
  borderRadius: '20px',
  padding: '8px 16px',
  fontSize: '14px',
  color: '#a5b4fc',
  margin: '0 auto 24px',
  width: 'fit-content',
  justifyContent: 'center',
},
  stateIcon: {
    fontSize: '14px',
  },
  googleButtonContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '24px',
    minHeight: '44px',
  },
  googleButton: {
    display: 'flex',
    justifyContent: 'center',
  },
  loadingSpinner: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    color: '#94a3b8',
    fontSize: '14px',
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '2px solid rgba(255,255,255,0.1)',
    borderTopColor: '#6366f1',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '12px',
    padding: '12px 16px',
    color: '#fca5a5',
    fontSize: '14px',
    marginBottom: '16px',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: '24px 0',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: 'rgba(255,255,255,0.1)',
  },
  dividerText: {
    fontSize: '12px',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  benefits: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  benefit: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '14px',
    color: '#94a3b8',
  },
  benefitIcon: {
    fontSize: '16px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    marginTop: '24px',
  },
  footerLink: {
    fontSize: '14px',
    color: '#64748b',
    textDecoration: 'none',
  },
  footerDot: {
    color: '#475569',
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

  return <Login />;  // ✅ Use imported Login component
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

        {/* ========================================
            PAYMENT ROUTES
        ======================================== */}
        <Route path="/payment/pricing" element={<AuthProvider><PricingPage /></AuthProvider>} />
        <Route path="/payment/checkout/:planId" element={<AuthProvider><ProtectedRoute><CheckoutPage /></ProtectedRoute></AuthProvider>} />
        <Route path="/payment/success" element={<AuthProvider><ProtectedRoute><PaymentSuccess /></ProtectedRoute></AuthProvider>} />
        <Route path="/payment/history" element={<AuthProvider><ProtectedRoute><PaymentHistory /></ProtectedRoute></AuthProvider>} />
        <Route path="/pricing" element={<Navigate to="/payment/pricing" replace />} />

        {/* ========================================
            CPA ROUTES
        ======================================== */}
        <Route path="/cpa/login" element={<CPAAuthProvider><CPALogin /></CPAAuthProvider>} />
        <Route path="/cpa/register" element={<CPAAuthProvider><CPARegister /></CPAAuthProvider>} />
        <Route path="/cpa/dashboard" element={<CPAAuthProvider><CPAProtectedRoute><CPADashboard /></CPAProtectedRoute></CPAAuthProvider>} />
        <Route path="/cpa/admin" element={<CPAAuthProvider><CPAProtectedRoute><CPAAdmin /></CPAProtectedRoute></CPAAuthProvider>} />



        {/* ========================================
            PUBLIC INFO PAGES
        ======================================== */}
        <Route path="/faq" element={<FAQPage />} />
        <Route path="/investor" element={<InvestorPage />} />
        <Route path="/career" element={<CareerPage />} />
        <Route path="/news" element={<NewsPage />} />
    {/* ADD THESE NEW ROUTES */}
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
    {/* ========================================
            SUPER ADMIN
        ======================================== */}
        <Route path="/admin" element={<SuperAdmin />} />
        
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