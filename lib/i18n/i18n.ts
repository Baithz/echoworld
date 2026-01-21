/**
 * =============================================================================
 * Fichier      : lib/i18n/i18n.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-21)
 * Objet        : Gestion langue (détection navigateur + persistance) - MVP
 * -----------------------------------------------------------------------------
 * Description  :
 * - Détermine une langue par défaut depuis navigator.languages
 * - Persiste la langue dans localStorage
 * - Fournit une liste de langues supportées
 * =============================================================================
 */

export type AppLang = 'en' | 'fr' | 'es' | 'de' | 'it' | 'pt' | 'ar' | 'ja';

export const SUPPORTED_LANGS: { code: AppLang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'pt', label: 'Português' },
  { code: 'ar', label: 'العربية' },
  { code: 'ja', label: '日本語' },
];

export const LANG_STORAGE_KEY = 'echoworld.lang';

export function normalizeLang(input: string): AppLang | null {
  const base = (input || '').toLowerCase().split('-')[0];
  const found = SUPPORTED_LANGS.find((l) => l.code === base);
  return (found?.code as AppLang) || null;
}

export function detectBrowserLang(): AppLang {
  if (typeof window === 'undefined') return 'en';

  const candidates = [
    ...(navigator.languages || []),
    navigator.language || '',
  ].filter(Boolean);

  for (const c of candidates) {
    const lang = normalizeLang(c);
    if (lang) return lang;
  }
  return 'en';
}

export function getStoredLang(): AppLang | null {
  if (typeof window === 'undefined') return null;
  const v = window.localStorage.getItem(LANG_STORAGE_KEY);
  return v ? normalizeLang(v) : null;
}

export function setStoredLang(lang: AppLang): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LANG_STORAGE_KEY, lang);
}
