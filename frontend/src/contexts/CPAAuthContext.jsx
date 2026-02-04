// ============================================================
// CPA AUTH CONTEXT
// ============================================================
// Location: frontend/src/contexts/CPAAuthContext.jsx
// Used by: App.jsx, CPALogin, CPARegister, CPAAdmin
// ============================================================

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ── Context ──
const CPAAuthContext = createContext(null);

export function useCPAAuth() {
  const context = useContext(CPAAuthContext);
  if (!context) {
    throw new Error('useCPAAuth must be used within CPAAuthProvider');
  }
  return context;
}

// ══════════════════════════════════════════════════════════
// CPA AUTH PROVIDER
// ══════════════════════════════════════════════════════════
export function CPAAuthProvider({ children }) {
  const [cpa, setCpa] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Restore session on mount ──
  useEffect(() => {
    const savedToken = localStorage.getItem('cpa_token');
    const savedCpa = localStorage.getItem('cpa_user');

    if (savedToken && savedCpa) {
      try {
        const parsed = JSON.parse(savedCpa);
        setToken(savedToken);
        setCpa(parsed);
        verifyCPAToken(savedToken);
      } catch {
        logout();
      }
    } else {
      setLoading(false);
    }
  }, []);

  // ── Verify token with backend ──
  async function verifyCPAToken(authToken) {
    try {
      const res = await fetch(`${API_URL}/api/cpa/auth/verify`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.cpa) {
          setCpa(data.cpa);
          localStorage.setItem('cpa_user', JSON.stringify(data.cpa));
        }
      } else {
        // Token invalid — don't force logout, just mark as unverified
        console.warn('[CPA_AUTH] Token verification failed, using cached data');
      }
    } catch (err) {
      console.warn('[CPA_AUTH] Verify error:', err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Login ──
  async function login(email, password) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/cpa/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data.success) {
        const cpaData = data.cpa || data.user || {};
        const authToken = data.token;

        // Normalize CPA data
        const normalized = {
          id: cpaData._id || cpaData.id,
          email: cpaData.email,
          firstName: cpaData.firstName || cpaData.first_name || '',
          lastName: cpaData.lastName || cpaData.last_name || '',
          fullName: cpaData.fullName || `${cpaData.firstName || ''} ${cpaData.lastName || ''}`.trim(),
          firmName: cpaData.firmName || cpaData.firm_name || '',
          licenseNumber: cpaData.licenseNumber || cpaData.license_number || '',
          role: cpaData.role || 'cpa',
          status: cpaData.status || 'active',
          permissions: cpaData.permissions || {},
          assignedZipcodes: cpaData.assignedZipcodes || [],
        };

        setCpa(normalized);
        setToken(authToken);
        localStorage.setItem('cpa_token', authToken);
        localStorage.setItem('cpa_user', JSON.stringify(normalized));

        return { success: true, cpa: normalized };
      } else {
        const errMsg = data.message || data.error || 'Login failed';
        setError(errMsg);
        return { success: false, error: errMsg };
      }
    } catch (err) {
      const errMsg = err.message || 'Network error. Please try again.';
      setError(errMsg);
      return { success: false, error: errMsg };
    } finally {
      setLoading(false);
    }
  }

  // ── Logout ──
  function logout() {
    setCpa(null);
    setToken(null);
    setError(null);
    localStorage.removeItem('cpa_token');
    localStorage.removeItem('cpa_user');
  }

  // ── Clear error ──
  function clearError() {
    setError(null);
  }

  return (
    <CPAAuthContext.Provider
      value={{
        cpa,
        token,
        loading,
        error,
        isAuthenticated: !!cpa && !!token,
        login,
        logout,
        clearError,
      }}
    >
      {children}
    </CPAAuthContext.Provider>
  );
}

// ══════════════════════════════════════════════════════════
// CPA PROTECTED ROUTE
// ══════════════════════════════════════════════════════════
export function CPAProtectedRoute({ children, requiredRole }) {
  const { cpa, token, loading } = useCPAAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#0f172a',
        color: '#94a3b8',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #334155',
            borderTopColor: '#3b82f6',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p>Loading CPA Portal...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (!cpa || !token) {
    return <Navigate to="/cpa/login" replace />;
  }

  // Optional role check
  if (requiredRole && cpa.role !== requiredRole && cpa.role !== 'admin') {
    return <Navigate to="/cpa/dashboard" replace />;
  }

  return children;
}

export default CPAAuthContext;