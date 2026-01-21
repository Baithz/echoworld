/**
 * =============================================================================
 * Fichier      : components/home/LanguageSelect.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 2.1.0 (2026-01-21)
 * Objet        : Sélecteur langue (UI redesign) - Discret et premium
 * -----------------------------------------------------------------------------
 * Description  :
 * - Bouton élégant avec globe icon
 * - Select natif stylisé
 * - Cohérent avec la navigation Header
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 2.1.0 (2026-01-21)
 * - [FIX] Lisibilité en thème clair (évite blanc sur blanc au scroll)
 * - [IMPROVED] Largeur/padding harmonisés (dropdown moins étroit)
 * - [IMPROVED] Options claires et lisibles (fond/texte cohérents)
 * - [CHORE] Aucun changement fonctionnel (lang/setLang inchangés)
 * =============================================================================
 */

'use client';

import { Globe } from 'lucide-react';
import { useLang } from '@/lib/i18n/LanguageProvider';
import { SUPPORTED_LANGS, type AppLang } from '@/lib/i18n/i18n';

export default function LanguageSelect() {
  const { lang, setLang } = useLang();

  return (
    <div className="inline-flex items-center gap-2.5 rounded-full border border-slate-200 bg-white/70 px-4 py-2 backdrop-blur-md">
      <Globe className="h-4 w-4 text-slate-500" />

      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as AppLang)}
        className="min-w-35 cursor-pointer appearance-none rounded-lg border-none bg-transparent pr-6 text-sm font-semibold text-slate-900 outline-none focus:ring-0"
        aria-label="Select language"
      >
        {SUPPORTED_LANGS.map((l) => (
          <option key={l.code} value={l.code} className="bg-white text-slate-900">
            {l.label}
          </option>
        ))}
      </select>

      {/* chevron discret (CSS-only via pseudo ne marche pas sur select natif, donc icône légère) */}
      <svg
        aria-hidden="true"
        className="-ml-5 h-4 w-4 text-slate-500 pointer-events-none"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  );
}
