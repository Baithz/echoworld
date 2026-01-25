/**
 * =============================================================================
 * Fichier      : components/messages/ReplyPreview.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-25)
 * Objet        : Preview message cité dans Composer — LOT 2 Répondre
 * -----------------------------------------------------------------------------
 * Description  :
 * - Affiche preview du message auquel on répond
 * - Bouton "X" pour annuler
 * - Compact (1 ligne)
 * - Variant dock/page
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.0.0 (2026-01-25)
 * - [NEW] Composant ReplyPreview réutilisable
 * - [NEW] Callback onCancel pour annuler
 * - [NEW] Truncate content (max 60 chars)
 * - [NEW] Support variant dock/page
 * =============================================================================
 */

'use client';

import { X, Reply } from 'lucide-react';
import type { UiMessage, SenderProfile } from './types';

type Props = {
  replyTo: UiMessage;
  senderProfile?: SenderProfile | null;
  onCancel: () => void;
  variant?: 'dock' | 'page';
};

function truncate(text: string, max = 60): string {
  const clean = (text ?? '').trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max) + '…';
}

function getSenderName(profile: SenderProfile | null | undefined): string {
  if (!profile) return 'Utilisateur';
  return (profile.display_name ?? profile.handle ?? 'Utilisateur').trim();
}

export default function ReplyPreview({ replyTo, senderProfile, onCancel, variant = 'page' }: Props) {
  const isDock = variant === 'dock';
  const senderName = getSenderName(senderProfile);
  const content = truncate(replyTo.content, isDock ? 40 : 60);

  return (
    <div className={`flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 ${isDock ? 'text-[10px]' : 'text-xs'}`}>
      <Reply className={`shrink-0 text-slate-500 ${isDock ? 'h-3 w-3' : 'h-3.5 w-3.5'}`} />
      <div className="min-w-0 flex-1">
        <span className="font-semibold text-slate-700">Réponse à {senderName} :</span>{' '}
        <span className="text-slate-600">{content}</span>
      </div>
      <button
        type="button"
        onClick={onCancel}
        className={`shrink-0 rounded p-0.5 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 ${isDock ? 'h-4 w-4' : 'h-5 w-5'}`}
        aria-label="Annuler réponse"
      >
        <X className="h-full w-full" />
      </button>
    </div>
  );
}