/**
 * =============================================================================
 * Fichier      : components/messages/MessageList.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 2.0.0 (2026-01-25)
 * Objet        : Liste messages avec reactions + parents — LOT 2
 * -----------------------------------------------------------------------------
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 2.0.0 (2026-01-25)
 * - [NEW] LOT 2 : Fetch reactions batch (fetchMessageReactionsBatch)
 * - [NEW] LOT 2 : Fetch parent messages batch (pour QuotedMessage)
 * - [NEW] LOT 2 : Enrichit UiMessage avec reactions + parentMessage
 * - [NEW] LOT 2 : Callbacks onReply + onReactionToggle + onQuoteClick
 * - [NEW] LOT 2 : Scroll to message + highlight 2s (onQuoteClick)
 * - [KEEP] LOT 1 : Batch sender profiles inchangé
 * =============================================================================
 */

'use client';

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { Loader2, Mail } from 'lucide-react';
import { fetchSenderProfiles, fetchMessages } from '@/lib/messages';
import { fetchMessageReactionsBatch } from '@/lib/messages/reactions';
import MessageBubble from './MessageBubble';
import type { UiMessage, SenderProfile } from './types';

type Props = {
  messages: UiMessage[];
  loading: boolean;
  userId: string | null;
  conversationId: string | null;
  onRetry?: (message: UiMessage) => void;
  onReply?: (message: UiMessage) => void;
  onReactionToggle?: (messageId: string, emoji: string) => void;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  variant?: 'dock' | 'page';
};

export default function MessageList({
  messages,
  loading,
  userId,
  conversationId,
  onRetry,
  onReply,
  onReactionToggle,
  scrollRef,
  variant = 'page',
}: Props) {
  const [senderProfiles, setSenderProfiles] = useState<Map<string, SenderProfile>>(new Map());
  const [enrichedMessages, setEnrichedMessages] = useState<UiMessage[]>([]);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  
  const messageRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());
  const isDock = variant === 'dock';

  const visibleMessages = useMemo(() => {
    return messages.filter((m) => !(m as { deleted_at?: string | null }).deleted_at);
  }, [messages]);

  // Batch fetch sender profiles + reactions + parents
  useEffect(() => {
    if (!userId || visibleMessages.length === 0) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        // 1) Sender profiles
        const senderIds = Array.from(
          new Set(visibleMessages.filter((m) => m.sender_id !== userId).map((m) => m.sender_id))
        );
        const profiles = senderIds.length > 0 ? await fetchSenderProfiles(senderIds) : new Map();

        // 2) Reactions
        const messageIds = visibleMessages.map((m) => m.id).filter(Boolean);
        const reactions = messageIds.length > 0 ? await fetchMessageReactionsBatch(messageIds) : new Map();

        // 3) Parent messages
        const parentIds = Array.from(
          new Set(visibleMessages.map((m) => m.parent_id).filter(Boolean) as string[])
        );
        const parentsData =
          parentIds.length > 0 && conversationId
            ? await fetchMessages(conversationId, 200)
            : [];
        const parentsMap = new Map(parentsData.map((p) => [p.id, p as UiMessage]));

        // 4) Parent sender profiles
        const parentSenderIds = Array.from(
          new Set(parentsData.filter((p) => p.sender_id !== userId).map((p) => p.sender_id))
        );
        const parentProfiles =
          parentSenderIds.length > 0 ? await fetchSenderProfiles(parentSenderIds) : new Map();

        if (cancelled) return;

        // Merge profiles
        const allProfiles = new Map([...profiles, ...parentProfiles]);
        setSenderProfiles(allProfiles);

        // Enrich messages
        const enriched = visibleMessages.map((m) => ({
          ...m,
          reactions: reactions.get(m.id) ?? [],
          parentMessage: m.parent_id ? parentsMap.get(m.parent_id) ?? null : null,
        }));

        setEnrichedMessages(enriched);
      } catch {
        if (!cancelled) setEnrichedMessages(visibleMessages);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [visibleMessages, userId, conversationId]);

  // Scroll to message + highlight
  const handleQuoteClick = useCallback((parentId: string) => {
    const el = messageRefsMap.current.get(parentId);
    if (!el) return;

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightId(parentId);
    setTimeout(() => setHighlightId(null), 2000);
  }, []);

  // Empty state
  if (!conversationId) {
    return (
      <div className={`flex h-full flex-col items-center justify-center text-center ${isDock ? 'p-3' : 'p-5'}`}>
        <div
          className={`mx-auto flex items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm ${
            isDock ? 'h-10 w-10' : 'h-14 w-14'
          }`}
        >
          <Mail className={`text-slate-900 ${isDock ? 'h-5 w-5' : 'h-7 w-7'}`} />
        </div>
        <h2 className={`mt-4 font-extrabold text-slate-900 ${isDock ? 'text-sm' : 'text-lg'}`}>
          {isDock ? 'Sélectionne une conv.' : 'Sélectionnez une conversation'}
        </h2>
        <p className={`mt-2 text-slate-600 ${isDock ? 'text-xs' : 'text-sm'}`}>
          Les messages s&apos;afficheront ici.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`flex items-center gap-2 text-slate-600 ${isDock ? 'p-3 text-xs' : 'p-5 text-sm'}`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement des messages…
      </div>
    );
  }

  if (enrichedMessages.length === 0) {
    return (
      <div
        className={`rounded-xl border border-dashed border-slate-200 bg-white/60 p-4 text-slate-600 ${
          isDock ? 'text-xs' : 'text-sm'
        }`}
      >
        Aucun message dans cette conversation.
      </div>
    );
  }

  return (
    <div className={isDock ? 'space-y-2' : 'space-y-3'}>
      {enrichedMessages.map((m) => {
        const mine = m.sender_id === userId;
        const senderProfile = mine ? null : senderProfiles.get(m.sender_id) ?? null;
        const parentSenderProfile =
          m.parentMessage && m.parentMessage.sender_id !== userId
            ? senderProfiles.get(m.parentMessage.sender_id) ?? null
            : null;

        return (
          <div
            key={m.id || m.client_id || `${m.sender_id}-${m.created_at}`}
            ref={(el) => {
              if (el && m.id) messageRefsMap.current.set(m.id, el);
            }}
            className={highlightId === m.id ? 'animate-pulse rounded-2xl bg-yellow-100' : ''}
          >
            <MessageBubble
              message={m}
              mine={mine}
              senderProfile={senderProfile}
              parentSenderProfile={parentSenderProfile}
              userId={userId}
              onRetry={onRetry}
              onReply={onReply}
              onReactionToggle={onReactionToggle}
              onQuoteClick={handleQuoteClick}
              variant={variant}
            />
          </div>
        );
      })}

      {scrollRef && <div ref={scrollRef} />}
    </div>
  );
}