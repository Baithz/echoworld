/**
 * =============================================================================
 * Fichier      : components/messages/MessageBubble.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 2.1.0 (2026-01-25)
 * Objet        : Bulle message avec avatars + réactions + répondre — LOT 2
 * -----------------------------------------------------------------------------
 * Description  :
 * - Affiche bulle message (mine vs received)
 * - Avatars avec initiales fallback
 * - Pseudo cliquable → /u/[handle]
 * - Support optimistic UI (status: sending/sent/failed)
 * - Bouton Retry si failed
 * - LOT 2 : QuotedMessage si parent_id
 * - LOT 2 : Actions "Répondre" + "Emoji" sous le message
 * - LOT 2 : Actions visibles uniquement au hover (bulle + zone actions)
 * - LOT 2 : ReactionBadges groupées
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 2.1.0 (2026-01-25)
 * - [FIX] Actions ne disparaissent plus lors du déplacement souris vers le picker
 * - [UX] Actions placées sous la bulle + visibles uniquement au hover
 * - [UX] Zone hover = bulle + actions (stable)
 * - [KEEP] Lot 1/2 : avatars, retry, quoted, badges, callbacks inchangés
 * =============================================================================
 */

'use client';

import Link from 'next/link';
import { Loader2, AlertCircle, RotateCw, Reply } from 'lucide-react';
import QuotedMessage from './QuotedMessage';
import ReactionPicker from './ReactionPicker';
import ReactionBadges from './ReactionBadges';
import { groupReactions } from '@/lib/messages/reactions';
import type { UiMessage, SenderProfile } from './types';

type Props = {
  message: UiMessage;
  mine: boolean;
  senderProfile?: SenderProfile | null;
  parentSenderProfile?: SenderProfile | null; // Pour le QuotedMessage
  userId: string | null;
  onRetry?: (message: UiMessage) => void;
  onReply?: (message: UiMessage) => void;
  onReactionToggle?: (messageId: string, emoji: string) => void;
  onQuoteClick?: (parentId: string) => void;
  variant?: 'dock' | 'page';
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, { timeStyle: 'short' });
}

function safeText(text: string): string {
  const clean = (text ?? '').trim().replace(/\s+/g, ' ');
  return clean || '…';
}

function getInitials(profile: SenderProfile | null | undefined): string {
  if (!profile) return '?';

  const dn = (profile.display_name ?? '').trim();
  if (dn) {
    const parts = dn.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return dn.slice(0, 2).toUpperCase();
  }

  const h = (profile.handle ?? '').trim().replace(/^@/, '');
  if (h) return h.slice(0, 2).toUpperCase();

  return '?';
}

function getDisplayName(profile: SenderProfile | null | undefined): string {
  if (!profile) return 'Utilisateur';
  return (profile.display_name ?? profile.handle ?? 'Utilisateur').trim();
}

export default function MessageBubble({
  message,
  mine,
  senderProfile,
  parentSenderProfile,
  userId,
  onRetry,
  onReply,
  onReactionToggle,
  onQuoteClick,
  variant = 'page',
}: Props) {
  const isDock = variant === 'dock';
  const status = message.status ?? 'sent';
  const isSending = status === 'sending';
  const isFailed = status === 'failed';

  const handle = senderProfile?.handle ?? null;
  const profileUrl = handle ? `/u/${handle.replace(/^@/, '')}` : null;

  const reactionGroups = groupReactions(message.reactions ?? [], userId);

  const handleReactionToggle = (emoji: string) => {
    if (onReactionToggle && message.id) {
      onReactionToggle(message.id, emoji);
    }
  };

  const handleReply = () => {
    if (onReply) onReply(message);
  };

  // Actions affichées uniquement si message stable (pas sending/failed)
  const canShowActions = !isSending && !isFailed && (onReply || onReactionToggle);

  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex gap-2 ${mine ? 'flex-row-reverse' : 'flex-row'} ${isDock ? 'max-w-[85%]' : 'max-w-[80%]'}`}>
        {/* Avatar (received only) */}
        {!mine && (
          <div className="shrink-0">
            {profileUrl ? (
              <Link
                href={profileUrl}
                className={`flex items-center justify-center rounded-full border border-slate-200 bg-white font-bold text-slate-700 transition hover:border-slate-300 ${
                  isDock ? 'h-7 w-7 text-[10px]' : 'h-9 w-9 text-xs'
                }`}
                aria-label={`Profile ${getDisplayName(senderProfile)}`}
              >
                {getInitials(senderProfile)}
              </Link>
            ) : (
              <div
                className={`flex items-center justify-center rounded-full border border-slate-200 bg-white font-bold text-slate-700 ${
                  isDock ? 'h-7 w-7 text-[10px]' : 'h-9 w-9 text-xs'
                }`}
              >
                {getInitials(senderProfile)}
              </div>
            )}
          </div>
        )}

        {/* Message block */}
        <div className="min-w-0 flex-1">
          {/* Sender name (received only) */}
          {!mine && (
            <div className={`mb-1 ${isDock ? 'text-[11px]' : 'text-xs'} font-semibold text-slate-700`}>
              {profileUrl ? (
                <Link href={profileUrl} className="hover:underline">
                  {getDisplayName(senderProfile)}
                </Link>
              ) : (
                <span>{getDisplayName(senderProfile)}</span>
              )}
            </div>
          )}

          {/* LOT 2 : QuotedMessage si parent_id */}
          {message.parentMessage && (
            <QuotedMessage
              parentMessage={message.parentMessage}
              senderProfile={parentSenderProfile}
              onQuoteClick={onQuoteClick}
              variant={variant}
            />
          )}

          {/* Bubble + Actions are a "group" to keep hover stable */}
          <div className="group">
            {/* Content bubble */}
            <div
              className={`rounded-2xl border px-3 py-2 shadow-sm ${isDock ? 'text-xs' : 'text-sm'} ${
                mine ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-900'
              } ${isFailed ? 'border-red-300 bg-red-50' : ''}`}
            >
              <div className="whitespace-pre-wrap">{safeText(message.content)}</div>

              {/* Meta (time + status) */}
              <div
                className={`mt-1 flex items-center gap-2 ${isDock ? 'text-[10px]' : 'text-[11px]'} ${
                  mine && !isFailed ? 'text-white/70' : 'text-slate-500'
                }`}
              >
                <span>{formatTime(message.created_at)}</span>

                {isSending && (
                  <>
                    <span>•</span>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Envoi…</span>
                  </>
                )}

                {isFailed && (
                  <>
                    <span>•</span>
                    <AlertCircle className="h-3 w-3 text-red-600" />
                    <span className="text-red-600">Échec</span>
                  </>
                )}
              </div>

              {/* Retry button (failed only) */}
              {isFailed && onRetry && (
                <button
                  type="button"
                  onClick={() => onRetry(message)}
                  className={`mt-2 inline-flex items-center gap-1 rounded-lg border border-red-300 bg-white px-2 py-1 font-semibold text-red-700 transition hover:border-red-400 ${
                    isDock ? 'text-[10px]' : 'text-xs'
                  }`}
                >
                  <RotateCw className="h-3 w-3" />
                  Réessayer
                </button>
              )}
            </div>

            {/* LOT 2 : Actions (sous la bulle, visibles au hover) */}
            {canShowActions && (
              <div
                className={`mt-1 flex items-center gap-1 ${
                  mine ? 'justify-start' : 'justify-end'
                } opacity-0 pointer-events-none transition group-hover:opacity-100 group-hover:pointer-events-auto`}
              >
                {onReply && (
                  <button
                    type="button"
                    onClick={handleReply}
                    className={`flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 ${
                      isDock ? 'h-6 w-6' : 'h-7 w-7'
                    }`}
                    aria-label="Répondre"
                  >
                    <Reply className={isDock ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
                  </button>
                )}

                {onReactionToggle && <ReactionPicker onEmojiSelect={handleReactionToggle} variant={variant} />}
              </div>
            )}
          </div>

          {/* LOT 2 : ReactionBadges */}
          {reactionGroups.length > 0 && (
            <ReactionBadges groups={reactionGroups} onToggle={handleReactionToggle} variant={variant} />
          )}
        </div>
      </div>
    </div>
  );
}
