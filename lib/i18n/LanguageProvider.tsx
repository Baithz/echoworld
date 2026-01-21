/**
 * =============================================================================
 * Fichier      : lib/i18n/LanguageProvider.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.1.1 (2026-01-21)
 * Objet        : Provider i18n (langue globale) + persistance + traduction t()
 * -----------------------------------------------------------------------------
 * Description  :
 * - Langue globale : localStorage > navigator > 'en'
 * - Persistance : localStorage
 * - Accessibilité : met à jour <html lang="..."> + dir RTL
 * - Traduction : expose t(key) basé sur dictionnaires (messages.ts)
 *
 * Correctifs (sans régression) :
 * - [FIX] Pas de setState dans useEffect (évite cascading renders)
 * - [FIX] setLang stable (évite re-render inutile si même valeur)
 * - [SAFE] Init SSR-safe (default 'en' côté serveur)
 * - [SAFE] API stable : lang + setLang + t conservés
 * =============================================================================
 */

'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AppLang } from './i18n';
import { detectBrowserLang, getStoredLang, setStoredLang } from './i18n';
import { MESSAGES, type I18nKey } from './messages';

type LangContextValue = {
  lang: AppLang;
  setLang: (lang: AppLang) => void;
  t: (key: I18nKey) => string;
};

const LangContext = createContext<LangContextValue | null>(null);

function resolveInitialLang(): AppLang {
  // SSR: pas de window, on garde une base stable
  if (typeof window === 'undefined') return 'en';
  return getStoredLang() || detectBrowserLang() || 'en';
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<AppLang>(() => resolveInitialLang());

  // setLang "safe": n'émet pas si identique (évite rerender inutile)
  const setLang = useCallback((next: AppLang) => {
    setLangState((prev) => (prev === next ? prev : next));
  }, []);

  // Side-effects only
  useEffect(() => {
    setStoredLang(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  const t = useCallback(
    (key: I18nKey) => {
      const dict = MESSAGES[lang] || MESSAGES.en;
      return dict[key] ?? MESSAGES.en[key] ?? key;
    },
    [lang]
  );

  const value = useMemo<LangContextValue>(
    () => ({
      lang,
      setLang,
      t,
    }),
    [lang, setLang, t]
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used within LanguageProvider');
  return ctx;
}
