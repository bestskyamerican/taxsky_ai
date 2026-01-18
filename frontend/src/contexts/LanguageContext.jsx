// ============================================================
// LANGUAGE CONTEXT - Global Language Management
// ============================================================
// Location: frontend/src/contexts/LanguageContext.jsx
// Imports from: frontend/src/services/i18n.js
// ============================================================

import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, getText } from '../services/i18n';

// ============================================================
// CONSTANTS
// ============================================================
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'es', name: 'Español', flag: '🇪🇸' }
];

// ============================================================
// HELPER: Get language from localStorage
// ============================================================
function getStoredLanguage() {
  try {
    const saved = localStorage.getItem('taxsky_language');
    if (saved && translations[saved]) return saved;
    
    const user = JSON.parse(localStorage.getItem('taxsky_user') || '{}');
    if (user.language && translations[user.language]) return user.language;
  } catch (e) {}
  return 'en';
}

// ============================================================
// CONTEXT
// ============================================================
const LanguageContext = createContext(null);

// ============================================================
// PROVIDER - Wrap your App with this
// ============================================================
export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(getStoredLanguage);

  const t = translations[lang] || translations.en;

  const setLang = (newLang) => {
    if (translations[newLang]) {
      setLangState(newLang);
      try {
        localStorage.setItem('taxsky_language', newLang);
        const user = JSON.parse(localStorage.getItem('taxsky_user') || '{}');
        if (user.id) {
          user.language = newLang;
          localStorage.setItem('taxsky_user', JSON.stringify(user));
        }
      } catch (e) {}
    }
  };

  const getT = (path, vars = {}) => getText(lang, path, vars);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'taxsky_language' && e.newValue && translations[e.newValue]) {
        setLangState(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, getT, languages: SUPPORTED_LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

// ============================================================
// HOOK - Won't crash if not in provider!
// ============================================================
export function useLanguage() {
  const context = useContext(LanguageContext);
  
  if (!context) {
    const lang = getStoredLanguage();
    return {
      lang,
      setLang: (newLang) => {
        if (translations[newLang]) {
          localStorage.setItem('taxsky_language', newLang);
          window.location.reload();
        }
      },
      t: translations[lang] || translations.en,
      getT: (path, vars = {}) => getText(lang, path, vars),
      languages: SUPPORTED_LANGUAGES
    };
  }
  
  return context;
}

// ============================================================
// LANGUAGE SELECTOR COMPONENT
// ============================================================
export function LanguageSelector({ className = '', style = {} }) {
  const { lang, setLang, languages } = useLanguage();

  return (
    <select
      value={lang}
      onChange={(e) => setLang(e.target.value)}
      className={className}
      style={{
        padding: '8px 12px',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        backgroundColor: 'white',
        fontSize: '14px',
        cursor: 'pointer',
        ...style
      }}
    >
      {languages.map((l) => (
        <option key={l.code} value={l.code}>
          {l.flag} {l.name}
        </option>
      ))}
    </select>
  );
}

export default LanguageContext;