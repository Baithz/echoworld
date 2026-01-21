/**
 * =============================================================================
 * Fichier      : lib/i18n/LanguageProvider.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.1 (2026-01-21)
 * Objet        : Provider React (langue globale) + persistance localStorage
 * -----------------------------------------------------------------------------
 * Description  :
 * - Initialise la langue: localStorage > navigator > 'en'
 * - Expose lang + setLang via context
 * - Met à jour <html lang="..."> côté client
 *
 * Correctifs (sans régression) :
 * - [FIX] Supprime setState dans un useEffect (React perf warning / cascading renders)
 * - [SAFE] Init via useState lazy initializer (composant client-only)
 * =============================================================================
 */

'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { AppLang } from './i18n';
import { detectBrowserLang, getStoredLang, setStoredLang } from './i18n';

type LangContextValue = {
  lang: AppLang;
  setLang: (lang: AppLang) => void;
};

const LangContext = createContext<LangContextValue | null>(null);

function resolveInitialLang(): AppLang {
  // Client-only component, mais on garde une garde SAFE.
  if (typeof window === 'undefined') return 'en';
  return getStoredLang() || detectBrowserLang();
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<AppLang>(() => resolveInitialLang());

  // Side-effect only: persistance + attribut HTML (pas de setState ici)
  useEffect(() => {
    setStoredLang(lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<LangContextValue>(() => ({
    lang,
    setLang: setLangState,
  }), [lang]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used within LanguageProvider');
  return ctx;
}
