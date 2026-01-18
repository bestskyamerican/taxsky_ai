// ============================================================
// TAXSKY NAVBAR - PROFESSIONAL DARK THEME
// ============================================================
// Reusable navigation component for all pages
// ============================================================

import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const getLanguage = () => localStorage.getItem("taxsky_language") || "en";

const TRANSLATIONS = {
  en: {
    chat: "Tax Chat",
    dashboard: "Dashboard",
    summary: "Summary",
    logout: "Logout",
  },
  vi: {
    chat: "Chat Thuế",
    dashboard: "Bảng Điều Khiển",
    summary: "Tóm Tắt",
    logout: "Đăng Xuất",
  },
  es: {
    chat: "Chat Fiscal",
    dashboard: "Panel",
    summary: "Resumen",
    logout: "Salir",
  }
};

export default function Navbar({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [language] = useState(getLanguage());
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  const navItems = [
    { path: "/chat", label: t.chat, icon: "💬" },
    { path: "/dashboard", label: t.dashboard, icon: "📊" },
    { path: "/summary", label: t.summary, icon: "📋" },
  ];

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    localStorage.removeItem("taxsky_token");
    localStorage.removeItem("taxsky_userId");
    localStorage.removeItem("taxsky_user");
    if (onLogout) onLogout();
    navigate("/");
  };

  return (
    <nav style={styles.nav}>
      <div style={styles.container}>
        {/* Logo */}
        <div style={styles.logoWrap} onClick={() => navigate("/")}>
          <div style={styles.logoIcon}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="url(#navLogoGrad)"/>
              <path d="M8 12h16M8 16h12M8 20h8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="24" cy="20" r="4" fill="#10b981"/>
              <path d="M22 20l1.5 1.5L26 19" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <defs>
                <linearGradient id="navLogoGrad" x1="0" y1="0" x2="32" y2="32">
                  <stop stopColor="#3b82f6"/>
                  <stop offset="1" stopColor="#8b5cf6"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span style={styles.logoText}>TaxSky</span>
        </div>

        {/* Nav Items */}
        <div style={styles.navItems}>
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                ...styles.navItem,
                ...(isActive(item.path) ? styles.navItemActive : {})
              }}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              <span style={styles.navLabel}>{item.label}</span>
            </button>
          ))}
        </div>

        {/* User & Logout */}
        <div style={styles.rightSection}>
          {user && (
            <div style={styles.userInfo}>
              {user.picture ? (
                <img src={user.picture} alt="" style={styles.avatar} />
              ) : (
                <div style={styles.avatarPlaceholder}>
                  {user.name?.charAt(0) || "U"}
                </div>
              )}
              <span style={styles.userName}>{user.firstName || user.name?.split(" ")[0] || "User"}</span>
            </div>
          )}
          <button onClick={handleLogout} style={styles.logoutBtn}>
            🚪
          </button>
        </div>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    background: 'rgba(15, 23, 42, 0.95)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  container: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '12px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    cursor: 'pointer',
  },
  logoIcon: {
    display: 'flex',
  },
  logoText: {
    fontSize: 20,
    fontWeight: 800,
    color: '#fff',
  },
  navItems: {
    display: 'flex',
    gap: 8,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 16px',
    background: 'transparent',
    border: '1px solid transparent',
    borderRadius: 10,
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  navItemActive: {
    background: 'rgba(59, 130, 246, 0.15)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
    color: '#60a5fa',
  },
  navIcon: {
    fontSize: 16,
  },
  navLabel: {
    display: 'inline',
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.1)',
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: 14,
    fontWeight: 700,
  },
  userName: {
    fontSize: 14,
    color: '#e2e8f0',
    fontWeight: 500,
  },
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};