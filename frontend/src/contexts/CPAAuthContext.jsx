// ============================================================
// CPA AUTH CONTEXT - Authentication State Management
// ============================================================
// Location: frontend/src/contexts/CPAAuthContext.jsx
// ============================================================

import React, { createContext, useContext, useState, useEffect } from 'react';
import { cpaAPI } from '../services/cpaAPI';

const CPAAuthContext = createContext(null);

export function CPAAuthProvider({ children }) {
  const [cpa, setCPA] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('cpa_token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check token on mount
  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setLoading(false);
        return;
      }
      
      try {
        const res = await cpaAPI.verifyToken();
        if (res.success && res.valid) {
          setCPA(res.cpa);
        } else {
          // Token invalid
          logout();
        }
      } catch (err) {
        console.error('Token verification failed:', err);
        logout();
      } finally {
        setLoading(false);
      }
    }
    
    verifyToken();
  }, [token]);

  // Login
  async function login(email, password) {
    try {
      setError(null);
      const res = await cpaAPI.login(email, password);
      
      if (res.success) {
        localStorage.setItem('cpa_token', res.token);
        setToken(res.token);
        setCPA(res.cpa);
        return { success: true };
      } else {
        setError(res.error);
        return { success: false, error: res.error };
      }
    } catch (err) {
      const errorMsg = err.message || 'Login failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  // Logout
  function logout() {
    localStorage.removeItem('cpa_token');
    setToken(null);
    setCPA(null);
  }

  // Update CPA data
  function updateCPA(updates) {
    setCPA(prev => ({ ...prev, ...updates }));
  }

  // Refresh CPA profile
  async function refreshProfile() {
    try {
      const res = await cpaAPI.getProfile();
      if (res.success) {
        setCPA(res.cpa);
      }
    } catch (err) {
      console.error('Failed to refresh profile:', err);
    }
  }

  const value = {
    cpa,
    token,
    loading,
    error,
    isAuthenticated: !!cpa,
    login,
    logout,
    updateCPA,
    refreshProfile
  };

  return (
    <CPAAuthContext.Provider value={value}>
      {children}
    </CPAAuthContext.Provider>
  );
}

export function useCPAAuth() {
  const context = useContext(CPAAuthContext);
  if (!context) {
    throw new Error('useCPAAuth must be used within a CPAAuthProvider');
  }
  return context;
}

// Protected Route Component
export function CPAProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useCPAAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    window.location.href = '/cpa/login';
    return null;
  }
  
  return children;
}

export default CPAAuthContext;
