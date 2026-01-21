/**
 * =============================================================================
 * Fichier      : components/home/LanguageSelect.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-21)
 * Objet        : Sélecteur langue (UI) - Home
 * -----------------------------------------------------------------------------
 * Description  :
 * - Affiche la langue active
 * - Permet de changer (persisté)
 * =============================================================================
 */

'use client';

import { useLang } from '@/lib/i18n/LanguageProvider';
import { SUPPORTED_LANGS, type AppLang } from '@/lib/i18n/i18n';

export default function LanguageSelect() {
  const { lang, setLang } = useLang();

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200">
      <span className="text-slate-300">Language</span>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as AppLang)}
        className="rounded-full border border-white/10 bg-slate-950/40 px-2 py-1 text-xs text-white outline-none focus:ring-2 focus:ring-white/20"
        aria-label="Select language"
      >
        {SUPPORTED_LANGS.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </div>
  );
}
