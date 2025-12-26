// ============================================================
// LANGUAGE CONTEXT
// ============================================================
// Provides language state and translations throughout the app
// Usage: const { lang, setLang, t } = useLanguage();
// ============================================================

import React, { createContext, useContext, useState, useEffect } from 'react';
import translations, { getLanguages } from './translations';

// Create context
const LanguageContext = createContext();

// ============================================================
// LANGUAGE PROVIDER
// ============================================================
export function LanguageProvider({ children }) {
  // Get initial language from localStorage or default to English
  const [lang, setLangState] = useState(() => {
    const saved = localStorage.getItem('taxsky_language');
    return saved || 'en';
  });

  // Save language to localStorage when changed
  const setLang = (newLang) => {
    localStorage.setItem('taxsky_language', newLang);
    setLangState(newLang);
    
    // Also save to user settings if logged in
    const userId = localStorage.getItem('taxsky_userId');
    if (userId) {
      // Optionally sync to backend
      fetch('http://localhost:3000/api/ai/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('taxsky_token')}`
        },
        body: JSON.stringify({
          userId,
          updates: { preferred_language: newLang }
        })
      }).catch(err => console.log('Language sync skipped'));
    }
  };

  // Translation function
  const t = (key) => {
    const keys = key.split('.');
    let value = translations[lang];
    
    for (const k of keys) {
      if (value && value[k] !== undefined) {
        value = value[k];
      } else {
        // Fallback to English
        value = translations['en'];
        for (const fallbackKey of keys) {
          if (value && value[fallbackKey] !== undefined) {
            value = value[fallbackKey];
          } else {
            return key; // Return key if not found
          }
        }
        break;
      }
    }
    
    return value;
  };

  // Get all translations for current language
  const getT = () => translations[lang] || translations['en'];

  // Load language from user settings on mount
  useEffect(() => {
    const saved = localStorage.getItem('taxsky_language');
    if (saved && saved !== lang) {
      setLangState(saved);
    }
  }, []);

  return (
    <LanguageContext.Provider value={{ 
      lang, 
      setLang, 
      t, 
      getT,
      languages: getLanguages(),
      isVietnamese: lang === 'vi',
      isSpanish: lang === 'es',
      isEnglish: lang === 'en',
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

// ============================================================
// HOOK
// ============================================================
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// ============================================================
// LANGUAGE SELECTOR COMPONENT
// ============================================================
export function LanguageSelector({ className = '' }) {
  const { lang, setLang, languages } = useLanguage();

  return (
    <select
      value={lang}
      onChange={(e) => setLang(e.target.value)}
      className={`border rounded-lg px-3 py-2 ${className}`}
    >
      {languages.map((language) => (
        <option key={language.code} value={language.code}>
          {language.flag} {language.name}
        </option>
      ))}
    </select>
  );
}

export default LanguageContext;
