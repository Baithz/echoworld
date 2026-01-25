/**
 * =============================================================================
 * Fichier      : components/messages/ReactionBadges.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-25)
 * Objet        : Badges réactions groupées par emoji — LOT 2 Réactions
 * -----------------------------------------------------------------------------
 * Description  :
 * - Affiche badges réactions (emoji + count)
 * - Highlight si currentUser a réagi
 * - Clic badge → toggle réaction
 * - Variant dock/page
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.0.0 (2026-01-25)
 * - [NEW] Composant ReactionBadges réutilisable
 * - [NEW] Group reactions par emoji
 * - [NEW] Highlight si currentUser présent
 * - [NEW] Callback onToggle(emoji)
 * - [NEW] Support variant dock/page
 * =============================================================================
 */

'use client';

import type { ReactionGroup } from './types';

type Props = {
  groups: ReactionGroup[];
  onToggle: (emoji: string) => void;
  variant?: 'dock' | 'page';
};

export default function ReactionBadges({ groups, onToggle, variant = 'page' }: Props) {
  const isDock = variant === 'dock';

  if (groups.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1 ${isDock ? 'mt-1' : 'mt-1.5'}`}>
      {groups.map((group) => (
        <button
          key={group.emoji}
          type="button"
          onClick={() => onToggle(group.emoji)}
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 transition ${
            group.hasCurrentUser
              ? 'border-blue-300 bg-blue-50 text-blue-700 hover:border-blue-400'
              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
          } ${isDock ? 'text-[10px]' : 'text-xs'}`}
          aria-label={`${group.emoji} ${group.count} réaction${group.count > 1 ? 's' : ''}`}
        >
          <span className={isDock ? 'text-xs' : 'text-sm'}>{group.emoji}</span>
          <span className="font-semibold">{group.count}</span>
        </button>
      ))}
    </div>
  );
}