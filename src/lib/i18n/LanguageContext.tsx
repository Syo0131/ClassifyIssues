'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { dictionaries, Language, DictionaryKey } from './dictionaries';

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: DictionaryKey) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('es'); // Default

  useEffect(() => {
    // Load from localStorage on mount
    const saved = localStorage.getItem('app_language') as Language;
    if (saved && (saved === 'es' || saved === 'en')) {
      setLanguageState(saved);
    } else {
      // Auto-detect browser language if available
      const browserLang = navigator.language.startsWith('en') ? 'en' : 'es';
      setLanguageState(browserLang);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);
  };

  const t = (key: DictionaryKey): string => {
    const dict = dictionaries[language] || dictionaries['es'];
    if (!dict) return key;
    return dict[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
