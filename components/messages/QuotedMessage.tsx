/**
 * =============================================================================
 * Fichier      : components/messages/QuotedMessage.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-25)
 * Objet        : Affichage message cité (quote) — LOT 2 Répondre
 * -----------------------------------------------------------------------------
 * Description  :
 * - Affiche message parent en compact (1-2 lignes max)
 * - Clic → scroll vers message parent + highlight 2s
 * - Support sender profile (nom cliquable)
 * - Variant dock/page
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.0.0 (2026-01-25)
 * - [NEW] Composant QuotedMessage réutilisable
 * - [NEW] Clic → callback onQuoteClick(parentId)
 * - [NEW] Truncate content (max 80 chars)
 * - [NEW] Support variant dock/page
 * =============================================================================
 */

'use client';

import { Reply } from 'lucide-react';
import type { UiMessage, SenderProfile } from './types';

type Props = {
  parentMessage: UiMessage | null;
  senderProfile?: SenderProfile | null;
  onQuoteClick?: (parentId: string) => void;
  variant?: 'dock' | 'page';
};

function truncate(text: string, max = 80): string {
  const clean = (text ?? '').trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max) + '…';
}

function getSenderName(profile: SenderProfile | null | undefined): string {
  if (!profile) return 'Utilisateur';
  return (profile.display_name ?? profile.handle ?? 'Utilisateur').trim();
}

export default function QuotedMessage({
  parentMessage,
  senderProfile,
  onQuoteClick,
  variant = 'page',
}: Props) {
  if (!parentMessage) return null;

  const isDock = variant === 'dock';
  const senderName = getSenderName(senderProfile);
  const content = truncate(parentMessage.content, isDock ? 60 : 80);

  const handleClick = () => {
    if (onQuoteClick && parentMessage.id) {
      onQuoteClick(parentMessage.id);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`mb-1.5 flex w-full items-start gap-2 rounded-lg border-l-2 border-slate-400 bg-slate-50 px-2 py-1.5 text-left transition hover:bg-slate-100 ${
        isDock ? 'text-[10px]' : 'text-xs'
      }`}
      aria-label={`Réponse à ${senderName}`}
    >
      <Reply className={`shrink-0 text-slate-500 ${isDock ? 'h-3 w-3 mt-0.5' : 'h-3.5 w-3.5 mt-0.5'}`} />
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-slate-700">{senderName}</div>
        <div className="text-slate-600">{content}</div>
      </div>
    </button>
  );
}