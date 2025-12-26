// ============================================================
// TAXSKY APP WITH GOOGLE LOGIN + DASHBOARD
// ============================================================
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { createContext, useContext, useState, useEffect } from "react";
import Onboarding from "./pages/Onboarding";
import TaxChatPage from "./pages/TaxChatPage";
import UserDashboard from "./components/UserDashboard";

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
  const [hasPreferences, setHasPreferences] = useState(false);

  useEffect(() => {
    // Check for existing session
    const savedToken = localStorage.getItem("taxsky_token");
    const savedUser = localStorage.getItem("taxsky_user");

    // Check for preferences
    const lang = localStorage.getItem("taxsky_language");
    const st = localStorage.getItem("taxsky_state");
    setHasPreferences(!!lang && !!st);

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
      // Don't logout on network errors during development
    } finally {
      setLoading(false);
    }
  };

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem("taxsky_token", authToken);
    localStorage.setItem("taxsky_user", JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("taxsky_token");
    localStorage.removeItem("taxsky_user");
  };

  const setPreferences = (language, state) => {
    localStorage.setItem("taxsky_language", language);
    localStorage.setItem("taxsky_state", state);
    setHasPreferences(true);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      loading, 
      isAuthenticated: !!user, 
      hasPreferences,
      login, 
      logout,
      setPreferences 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================
// GOOGLE LOGIN PAGE
// ============================================================
function LoginPage() {
  const { login } = useAuth();
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Load Google Sign-In script
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
            shape: "rectangular",
            width: 300,
          }
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
    <div style={styles.loginPage}>
      <div style={styles.loginContainer}>
        <div style={styles.loginHeader}>
          <div style={styles.logo}>🌤️</div>
          <h1 style={styles.title}>TaxSky AI</h1>
          <p style={styles.subtitle}>Smart Tax Filing Made Easy</p>
        </div>

        <div style={styles.loginCard}>
          <h2 style={styles.cardTitle}>Welcome!</h2>
          <p style={styles.cardText}>Sign in with your Google account to file your taxes</p>

          {error && <div style={styles.errorBox}>{error}</div>}

          <div style={styles.buttonContainer}>
            {isLoading ? (
              <div style={styles.loading}>Signing in...</div>
            ) : (
              <div id="google-signin-button"></div>
            )}
          </div>

          {!GOOGLE_CLIENT_ID && (
            <div style={styles.warningBox}>
              ⚠️ Google Client ID not configured. Check your .env file.
            </div>
          )}

          <div style={styles.features}>
            <h3 style={styles.featuresTitle}>Why sign in?</h3>
            <ul style={styles.featuresList}>
              <li>✅ Save your tax return progress</li>
              <li>✅ Secure your personal data</li>
              <li>✅ Access from any device</li>
              <li>✅ File multiple returns</li>
            </ul>
          </div>
        </div>

        <p style={styles.footer}>
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}

// ============================================================
// USER MENU (Updated with Dashboard link)
// ============================================================
export function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  if (!user) return null;

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
          <button 
            style={styles.menuButton} 
            onClick={() => { navigate('/dashboard'); setShowMenu(false); }}
          >
            📊 Dashboard
          </button>
          <button 
            style={styles.menuButton} 
            onClick={() => { navigate('/taxchat'); setShowMenu(false); }}
          >
            💬 Tax Chat
          </button>
          <hr style={styles.divider} />
          <button style={styles.logoutButton} onClick={logout}>
            🚪 Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// PROTECTED ROUTE WRAPPER
// ============================================================
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.spinner}></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return children;
}

// ============================================================
// HOME ROUTE COMPONENT (handles preference check reactively)
// ============================================================
function HomeRoute() {
  const { hasPreferences } = useAuth();
  
  if (hasPreferences) {
    return <Navigate to="/taxchat" replace />;
  }
  
  return <Onboarding />;
}

// ============================================================
// TAX CHAT ROUTE COMPONENT (handles preference check reactively)
// ============================================================
function TaxChatRoute() {
  const { hasPreferences } = useAuth();
  
  if (!hasPreferences) {
    return <Navigate to="/" replace />;
  }
  
  return <TaxChatPage />;
}

// ============================================================
// DASHBOARD ROUTE COMPONENT
// ============================================================
function DashboardRoute() {
  const { hasPreferences } = useAuth();
  
  if (!hasPreferences) {
    return <Navigate to="/" replace />;
  }
  
  return <UserDashboard />;
}

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomeRoute />
              </ProtectedRoute>
            }
          />

          <Route
            path="/taxchat"
            element={
              <ProtectedRoute>
                <TaxChatRoute />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardRoute />
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
// STYLES
// ============================================================
const styles = {
  loginPage: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    padding: "20px",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  loginContainer: {
    width: "100%",
    maxWidth: "420px",
  },
  loginHeader: {
    textAlign: "center",
    color: "white",
    marginBottom: "30px",
  },
  logo: {
    fontSize: "4rem",
    marginBottom: "10px",
  },
  title: {
    fontSize: "2.5rem",
    margin: "0 0 10px 0",
    fontWeight: "700",
  },
  subtitle: {
    fontSize: "1.1rem",
    opacity: "0.9",
    margin: 0,
  },
  loginCard: {
    background: "white",
    borderRadius: "16px",
    padding: "40px",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
  },
  cardTitle: {
    margin: "0 0 10px 0",
    color: "#333",
    fontSize: "1.5rem",
  },
  cardText: {
    color: "#666",
    marginBottom: "25px",
  },
  buttonContainer: {
    display: "flex",
    justifyContent: "center",
    margin: "30px 0",
    minHeight: "50px",
  },
  loading: {
    padding: "15px 30px",
    background: "#f5f5f5",
    borderRadius: "8px",
    color: "#666",
  },
  errorBox: {
    background: "#fee",
    color: "#c00",
    padding: "12px 16px",
    borderRadius: "8px",
    marginBottom: "20px",
    fontSize: "0.9rem",
  },
  warningBox: {
    background: "#fff3cd",
    color: "#856404",
    padding: "12px 16px",
    borderRadius: "8px",
    marginTop: "20px",
    fontSize: "0.85rem",
  },
  features: {
    marginTop: "30px",
    paddingTop: "25px",
    borderTop: "1px solid #eee",
  },
  featuresTitle: {
    fontSize: "1rem",
    color: "#666",
    marginBottom: "12px",
  },
  featuresList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
  },
  footer: {
    textAlign: "center",
    marginTop: "25px",
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: "0.85rem",
  },
  userMenu: {
    position: "relative",
  },
  userButton: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "rgba(255,255,255,0.1)",
    border: "none",
    padding: "8px 15px",
    borderRadius: "25px",
    cursor: "pointer",
    color: "white",
    fontSize: "0.95rem",
  },
  userAvatar: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
  },
  userName: {
    maxWidth: "120px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  dropdownArrow: {
    fontSize: "0.7rem",
    opacity: 0.7,
  },
  dropdown: {
    position: "absolute",
    top: "100%",
    right: 0,
    marginTop: "10px",
    background: "white",
    borderRadius: "12px",
    boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
    minWidth: "260px",
    padding: "15px",
    zIndex: 1000,
  },
  dropdownHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    paddingBottom: "15px",
  },
  dropdownAvatar: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
  },
  dropdownEmail: {
    color: "#666",
    fontSize: "0.85rem",
    margin: "4px 0 0 0",
  },
  divider: {
    border: "none",
    borderTop: "1px solid #eee",
    margin: "10px 0",
  },
  menuButton: {
    width: "100%",
    padding: "12px",
    background: "transparent",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "0.95rem",
    color: "#333",
    textAlign: "left",
  },
  logoutButton: {
    width: "100%",
    padding: "12px",
    background: "#f5f5f5",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "0.95rem",
    color: "#333",
    textAlign: "left",
  },
  loadingScreen: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
  },
  spinner: {
    width: "50px",
    height: "50px",
    border: "4px solid rgba(255,255,255,0.3)",
    borderTopColor: "white",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
};

// Add spinner animation and hover effects
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  #google-signin-button {
    display: flex;
    justify-content: center;
  }
`;
document.head.appendChild(styleSheet);