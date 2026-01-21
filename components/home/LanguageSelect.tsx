/**
 * =============================================================================
 * Fichier      : components/home/LanguageSelect.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 2.0.0 (2026-01-21)
 * Objet        : Sélecteur langue (UI redesign) - Discret et premium
 * -----------------------------------------------------------------------------
 * Description  :
 * - Bouton élégant avec globe icon
 * - Select natif stylisé
 * - Cohérent avec la nouvelle topbar Hero
 * =============================================================================
 */

'use client';

import { Globe } from 'lucide-react';
import { useLang } from '@/lib/i18n/LanguageProvider';
import { SUPPORTED_LANGS, type AppLang } from '@/lib/i18n/i18n';

export default function LanguageSelect() {
  const { lang, setLang } = useLang();

  return (
    <div className="inline-flex items-center gap-2.5 rounded-full border border-white/8 bg-white/3 px-4 py-2 backdrop-blur-sm">
      <Globe className="h-4 w-4 text-slate-400" />

      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as AppLang)}
        className="cursor-pointer rounded-lg border-none bg-transparent text-sm font-medium text-white outline-none focus:ring-0"
        aria-label="Select language"
      >
        {SUPPORTED_LANGS.map((l) => (
          <option key={l.code} value={l.code} className="bg-slate-900">
            {l.label}
          </option>
        ))}
      </select>
    </div>
  );
}