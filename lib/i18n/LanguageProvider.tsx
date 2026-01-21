/**
 * =============================================================================
 * Fichier      : lib/i18n/LanguageProvider.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.1.0 (2026-01-21)
 * Objet        : Provider i18n (langue globale) + persistance + traduction t()
 * -----------------------------------------------------------------------------
 * Description  :
 * - Langue globale : localStorage > navigator > 'en'
 * - Persistance : localStorage
 * - Accessibilité : met à jour <html lang="...">
 * - Traduction : expose t(key) basé sur dictionnaires (messages.ts)
 *
 * Correctifs (sans régression) :
 * - [FIX] Pas de setState dans useEffect (évite cascading renders)
 * - [ADD] Fonction t(key) + fallback propre (en)
 * - [SAFE] API stable : lang + setLang conservés
 * =============================================================================
 */

'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
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
  if (typeof window === 'undefined') return 'en';
  return getStoredLang() || detectBrowserLang();
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<AppLang>(() => resolveInitialLang());

  // Side-effects only
  useEffect(() => {
    setStoredLang(lang);
    document.documentElement.lang = lang;

    // Direction RTL pour l'arabe (extensible)
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  const t = useMemo(() => {
    return (key: I18nKey) => {
      const dict = MESSAGES[lang] || MESSAGES.en;
      return dict[key] ?? MESSAGES.en[key] ?? key;
    };
  }, [lang]);

  const value = useMemo<LangContextValue>(() => ({
    lang,
    setLang: setLangState,
    t,
  }), [lang, t]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used within LanguageProvider');
  return ctx;
}
