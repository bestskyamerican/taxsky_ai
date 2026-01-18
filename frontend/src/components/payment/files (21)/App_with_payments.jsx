// ============================================================
// APP.JSX - With Payment Routes
// ============================================================
// Location: frontend/src/App.jsx
// ============================================================

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// ============================================================
// USER PAGES
// ============================================================
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import TaxChat from './pages/TaxChat';
import Dashboard from './pages/Dashboard';

// ============================================================
// PAYMENT PAGES
// ============================================================
import PricingPage from './pages/PricingPage';
import CheckoutPage from './pages/CheckoutPage';

// ============================================================
// CPA PAGES
// ============================================================
import CPALogin from './pages/CPALogin';
import CPARegister from './pages/CPARegister';
import CPADashboard from './pages/CPADashboard';
import CPAAdmin from './pages/CPAAdmin';

// ============================================================
// CONTEXTS
// ============================================================
import { CPAAuthProvider } from './contexts/CPAAuthContext';

// ============================================================
// AUTH HELPERS
// ============================================================
function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
}

function CPAPrivateRoute({ children }) {
  const token = localStorage.getItem('cpa_token');
  return token ? children : <Navigate to="/cpa/login" />;
}

// ============================================================
// APP COMPONENT
// ============================================================
function App() {
  return (
    <CPAAuthProvider>
      <Router>
        <Routes>
          {/* ========================================
              PUBLIC ROUTES
          ======================================== */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          
          {/* ========================================
              PAYMENT ROUTES
          ======================================== */}
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/checkout/:planId" element={
            <PrivateRoute>
              <CheckoutPage />
            </PrivateRoute>
          } />
          
          {/* ========================================
              USER ROUTES (Protected)
          ======================================== */}
          <Route path="/taxchat" element={
            <PrivateRoute>
              <TaxChat />
            </PrivateRoute>
          } />
          <Route path="/dashboard" element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } />
          
          {/* ========================================
              CPA ROUTES
          ======================================== */}
          <Route path="/cpa/login" element={<CPALogin />} />
          <Route path="/cpa/register" element={<CPARegister />} />
          <Route path="/cpa/dashboard" element={
            <CPAPrivateRoute>
              <CPADashboard />
            </CPAPrivateRoute>
          } />
          <Route path="/cpa/admin" element={
            <CPAPrivateRoute>
              <CPAAdmin />
            </CPAPrivateRoute>
          } />
          
          {/* ========================================
              FALLBACK
          ======================================== */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </CPAAuthProvider>
  );
}

export default App;
