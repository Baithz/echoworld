/**
 * =============================================================================
 * Fichier      : components/messages/MessageBubble.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 2.6.3 (2026-01-26)
 * Objet        : Bulle message avec avatars + réactions + répondre — LOT 2 + Attachments
 * -----------------------------------------------------------------------------
 * Description  :
 * - Affiche bulle message (mine vs received)
 * - Avatars avec image si avatar_url, fallback initiales
 * - Pseudo cliquable → /u/[handle]
 * - Support optimistic UI (status: sending/sent/failed)
 * - Bouton Retry si failed
 * - LOT 2 : QuotedMessage si parent_id
 * - Reply toujours visible côté extérieur (received=right, mine=left)
 * - Badge réactions superposé coin extérieur (received=bottom-right, mine=bottom-left)
 * - Emoji hover toujours à gauche du badge (ancré sur le badge, jamais écrasé)
 * - Attachments (images) avec lightbox intégrée (self-contained dans MessageAttachments)
 * - SAFE: fail-soft sur payload inconnue (narrowing + guards)
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 2.6.3 (2026-01-26)
 * - [FIX] Compat MessageAttachments v1.1.0 : supprime prop onImageClick (lightbox self-contained)
 * - [FIX] Supprime state lightbox local (géré par MessageAttachments)
 * - [FIX] Supprime import ImageLightbox (plus utilisé)
 * - [KEEP] 2.6.2 : avatars/reactions/reply/quoted/optimistic/retry inchangés
 * - [SAFE] Aucune régression : UI/UX identique, attachments + lightbox fonctionnels
 * -----------------------------------------------------------------------------
 * 2.6.2 (2026-01-26)
 * - [FIX] Import type Attachment: utilise l'export nommé depuis MessageAttachments.tsx
 * - [KEEP] Aucune régression UI/UX : avatars/reactions/reply/quoted/optimistic/retry inchangés
 * =============================================================================
 */

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Loader2, Reply, RotateCw } from 'lucide-react';
import QuotedMessage from './QuotedMessage';
import ReactionPicker from './ReactionPicker';
import ReactionBadges from './ReactionBadges';
import MessageAttachments, { type Attachment as MessageAttachment } from './MessageAttachments';
import { groupReactions } from '@/lib/messages/reactions';
import type { SenderProfile, UiMessage } from './types';

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

type AttachmentLike = {
  url?: unknown;
  name?: unknown;
  size?: unknown;
  type?: unknown;
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

function getAvatarUrl(profile: SenderProfile | null | undefined): string | null {
  const url = (profile?.avatar_url ?? '').trim();
  return url ? url : null;
}

function isBracketFilesPlaceholder(content: string): boolean {
  const s = (content ?? '').trim();
  // Exemple: "[1 fichier(s)]", "[2 fichier(s)]"
  return /^\[\s*\d+\s+fichier\(s\)\s*\]$/i.test(s);
}

/**
 * Normalise payload.attachments[] -> Attachment[] (type aligné MessageAttachments).
 * Fail-soft: ignore toute entrée invalide.
 */
function extractAttachments(payload: unknown): MessageAttachment[] {
  if (!payload || typeof payload !== 'object') return [];
  const o = payload as Record<string, unknown>;
  const raw = o.attachments;
  if (!Array.isArray(raw)) return [];

  const out: MessageAttachment[] = [];

  for (const item of raw as AttachmentLike[]) {
    if (!item || typeof item !== 'object') continue;

    const url = typeof item.url === 'string' ? item.url.trim() : '';
    if (!url) continue;

    const name = typeof item.name === 'string' && item.name.trim() ? item.name : undefined;
    const type = typeof item.type === 'string' && item.type.trim() ? item.type : undefined;

    const size =
      typeof item.size === 'number' && Number.isFinite(item.size) && item.size >= 0 ? item.size : undefined;

    out.push({ url, name, type, size });
  }

  return out;
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

  // "Extérieur" : mine => LEFT, received => RIGHT
  const replyPosClass = mine ? '-left-9' : '-right-9';
  const cornerPosClass = mine ? 'left-0' : 'right-0';

  // Avatar (image) + fallback
  const avatarUrl = useMemo(() => getAvatarUrl(senderProfile), [senderProfile]);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const showAvatarImg = !!avatarUrl && !avatarFailed;

  const avatarBaseClass = `flex items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white font-bold text-slate-700 transition ${
    isDock ? 'h-7 w-7 text-[10px]' : 'h-9 w-9 text-xs'
  }`;

  const AvatarContent = (
    <>
      {showAvatarImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl!}
          alt={getDisplayName(senderProfile)}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setAvatarFailed(true)}
        />
      ) : (
        getInitials(senderProfile)
      )}
    </>
  );

  // ✅ Attachments (fail-soft)
  const attachments = useMemo(() => extractAttachments(message.payload), [message.payload]);
  const hasAttachments = attachments.length > 0;

  // Texte: si placeholder "[N fichier(s)]" et attachments présents, on masque le texte
  const rawContent = safeText(message.content);
  const showContent = !(hasAttachments && isBracketFilesPlaceholder(rawContent));

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
              <Link href={profileUrl} className={avatarBaseClass} aria-label={`Profil ${getDisplayName(senderProfile)}`}>
                {AvatarContent}
              </Link>
            ) : (
              <div className={avatarBaseClass}>{AvatarContent}</div>
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
            <div className="relative overflow-visible">
              {/* Bubble */}
              <div
                className={`relative rounded-2xl border px-3 py-2 shadow-sm ${isDock ? 'text-xs' : 'text-sm'} ${
                  mine ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-900'
                } ${isFailed ? 'border-red-300 bg-red-50' : ''}`}
              >
                {/* Content */}
                {showContent && <div className="whitespace-pre-wrap">{rawContent}</div>}

                {/* ✅ Attachments avec lightbox intégrée (self-contained) */}
                {hasAttachments && (
                  <div className={showContent ? 'mt-2' : ''}>
                    <MessageAttachments attachments={attachments} />
                  </div>
                )}

                {/* Meta */}
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

                {/* Retry */}
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

              {/* Reply toujours visible côté extérieur */}
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

              {/* ✅ Coin réactions */}
              {(showBadges || canReact) && (
                <div className={`absolute bottom-0 ${cornerPosClass} translate-y-1/2 z-20`}>
                  <div className="relative inline-flex items-center">
                    {canReact && showBadges && (
                      <div
                        className={`absolute top-1/2 -translate-y-1/2 opacity-0 pointer-events-none transition
                          group-hover:opacity-100 group-hover:pointer-events-auto
                          ${mine ? 'left-full ml-2' : '-left-2 -translate-x-full'}`}
                      >
                        <ReactionPicker onEmojiSelect={handleReactionToggle} variant={variant} />
                      </div>
                    )}

                    {canReact && !showBadges && (
                      <div className="opacity-0 pointer-events-none transition group-hover:opacity-100 group-hover:pointer-events-auto">
                        <ReactionPicker onEmojiSelect={handleReactionToggle} variant={variant} />
                      </div>
                    )}

                    {showBadges && (
                      <ReactionBadges groups={reactionGroups} onToggle={handleReactionToggle} variant={variant} />
                    )}
                  </div>
                </div>
              )}
            </div>

            {(showBadges || canReact) && <div className="h-4" />}
          </div>
        </div>
      </div>
    </div>
  );
}