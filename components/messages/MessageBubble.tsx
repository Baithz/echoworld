/**
 * =============================================================================
 * Fichier      : components/messages/MessageBubble.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 2.4.0 (2026-01-25)
 * Objet        : Bulle message avec avatars + réactions + répondre — LOT 2
 * -----------------------------------------------------------------------------
 * Description  :
 * - Affiche bulle message (mine vs received)
 * - Avatars avec initiales fallback
 * - Pseudo cliquable → /u/[handle]
 * - Support optimistic UI (status: sending/sent/failed)
 * - Bouton Retry si failed
 * - LOT 2 : QuotedMessage si parent_id
 * - Reply toujours visible côté extérieur (received=right, mine=left)
 * - Badge réactions superposé coin extérieur (received=bottom-right, mine=bottom-left)
 * - Bouton emoji (hover) placé à gauche du badge (jamais écrasé), et inversé pour mine
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 2.4.0 (2026-01-25)
 * - [UX] Inversion mine/received : reply + badge + emoji côté extérieur (mine=left, received=right)
 * - [FIX] Bouton emoji (hover) apparaît à gauche du badge pour éviter l'écrasement
 * - [KEEP] Lot 1/2 : avatars, retry, quoted, callbacks, styles globaux inchangés
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
  parentSenderProfile?: SenderProfile | null;
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
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
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
    if (onReactionToggle && message.id) onReactionToggle(message.id, emoji);
  };

  const handleReply = () => {
    if (onReply) onReply(message);
  };

  const canReply = !isSending && !isFailed && !!onReply;
  const canReact = !isSending && !isFailed && !!onReactionToggle;
  const showBadges = !isSending && !isFailed && reactionGroups.length > 0;

  // Positions "extérieur" : mine => LEFT, received => RIGHT
  const replyPosClass = mine ? '-left-9' : '-right-9';
  const badgePosClass = mine ? 'left-0' : 'right-0';

  // Emoji doit être à gauche du badge :
  // - received (badge right): emoji se place "avant" le badge => translateX(-100%) - margin
  // - mine (badge left): emoji encore plus à gauche => translateX(-100%) - margin
  // (les 2 cas utilisent -translate-x-full mais l'ancrage diffère via left/right)
  const emojiAnchorClass = mine ? 'left-0' : 'right-0';
  const emojiOffsetClass = mine ? '-ml-2' : '-mr-2';

  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`flex gap-2 ${mine ? 'flex-row-reverse' : 'flex-row'} ${
          isDock ? 'max-w-[85%]' : 'max-w-[80%]'
        }`}
      >
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

          {/* Hover group stable */}
          <div className="group relative inline-block max-w-full">
            {/* Bulle (ancrage overlays) */}
            <div className="relative overflow-visible">
              <div
                className={`relative rounded-2xl border px-3 py-2 shadow-sm ${isDock ? 'text-xs' : 'text-sm'} ${
                  mine ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-900'
                } ${isFailed ? 'border-red-300 bg-red-50' : ''}`}
              >
                <div className="whitespace-pre-wrap">{safeText(message.content)}</div>

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

              {/* Reply toujours visible, côté extérieur */}
              {canReply && (
                <button
                  type="button"
                  onClick={handleReply}
                  className={`absolute top-1/2 -translate-y-1/2 ${replyPosClass} flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 ${
                    isDock ? 'h-6 w-6' : 'h-7 w-7'
                  }`}
                  aria-label="Répondre"
                >
                  <Reply className={isDock ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
                </button>
              )}

              {/* Badge superposé coin extérieur */}
              {showBadges && (
                <div className={`absolute bottom-0 ${badgePosClass} translate-y-1/2 z-10`}>
                  <ReactionBadges groups={reactionGroups} onToggle={handleReactionToggle} variant={variant} />
                </div>
              )}

              {/* Emoji (hover) : à gauche du badge, inversé mine/received */}
              {canReact && (
                <div
                  className={`absolute bottom-0 ${emojiAnchorClass} translate-y-1/2 z-20 opacity-0 pointer-events-none transition group-hover:opacity-100 group-hover:pointer-events-auto`}
                >
                  <div className={`-translate-x-full ${emojiOffsetClass}`}>
                    <ReactionPicker onEmojiSelect={handleReactionToggle} variant={variant} />
                  </div>
                </div>
              )}
            </div>

            {/* Espace bas si badges (évite collision avec message suivant) */}
            {(showBadges || canReact) && <div className="h-4" />}
          </div>
        </div>
      </div>
    </div>
  );
}
