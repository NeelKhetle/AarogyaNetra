/**
 * AarogyaNetra AI — Language Context
 * Provides t() translation function globally throughout the app.
 * Reads language from the Zustand store and re-renders on change.
 */

import React, { createContext, useContext } from 'react';
import { type LanguageCode, type Translations, getTranslations, TRANSLATIONS } from './translations';
import { useAppStore } from '../store/useAppStore';

// ─── Context Type ─────────────────────────────────────────────────────────────
interface LanguageContextValue {
  /** Current language code */
  language: LanguageCode;
  /** Translation function — returns the string for the given key in the current language */
  t: (key: keyof Translations) => string;
  /** All translations for the current language */
  translations: Translations;
}

// ─── Context ──────────────────────────────────────────────────────────────────
const LanguageContext = createContext<LanguageContextValue>({
  language: 'en',
  t: (key) => String(TRANSLATIONS.en[key] ?? key),
  translations: TRANSLATIONS.en,
});

// ─── Provider ─────────────────────────────────────────────────────────────────
export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Language code is stored in the global app store (persisted)
  const language = useAppStore((s) => s.language) as LanguageCode;

  const translations = getTranslations(language);

  const tFn = (key: keyof Translations): string => {
    const val = translations[key];
    if (val) return val as string;
    // fallback to English
    const fallback = TRANSLATIONS.en[key];
    return fallback ? (fallback as string) : String(key);
  };

  return (
    <LanguageContext.Provider value={{ language, t: tFn, translations }}>
      {children}
    </LanguageContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useLanguage = (): LanguageContextValue => useContext(LanguageContext);
