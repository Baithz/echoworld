/**
 * =============================================================================
 * Fichier      : components/messages/MessageList.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 2.3.1 (2026-01-26)
 * Objet        : Liste messages — auto-scroll bottom (always) + enrich batch SAFE
 * -----------------------------------------------------------------------------
 * Description  :
 * - Conserve : LOT 2 (reactions + parents batch), avatars self, quote scroll/highlight
 * - UX : auto-scroll au dernier message reçu/envoyé quand l’utilisateur est déjà en bas
 * - SAFE : ne “force” pas le scroll si l’utilisateur a scrollé vers le haut (lecture historique)
 * - Fail-soft : si fetch enrich échoue => messages visibles, reactions vides, parents null
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 2.3.1 (2026-01-26)
 * - [FIX] Auto-scroll : supprime guard shouldStickToBottomRef (trop fragile) → scroll to bottom systématique
 * - [IMPROVED] Auto-scroll : double scroll (rAF + setTimeout 300ms) pour fiabilité images/previews
 * - [REFACTOR] Supprime helpers getScrollParent/isNearBottom (plus utilisés)
 * - [KEEP] 2.3.0 : batch reactions/parents + avatars self + quote highlight conservés
 * - [SAFE] Aucune régression : props/comportements inchangés
 * -----------------------------------------------------------------------------
 * 2.3.0 (2026-01-26)
 * - [NEW] Auto-scroll "smart" : scroll to bottom si near-bottom avant update (send/receive)
 * - [KEEP] 2.2.0 : ESLint set-state-in-effect OK + avatars self + batch reactions/parents + quote highlight
 * - [SAFE] Aucun changement cassant : mêmes props / mêmes comportements existants conservés
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

type ReactionRow = {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
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
  const [reactionsByMsg, setReactionsByMsg] = useState<Map<string, ReactionRow[]>>(new Map());
  const [parentsById, setParentsById] = useState<Map<string, UiMessage>>(new Map());
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const messageRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());
  const isDock = variant === 'dock';

  const visibleMessages = useMemo(() => {
    return messages.filter((m) => !(m as { deleted_at?: string | null }).deleted_at);
  }, [messages]);

  /**
   * Batch fetch sender profiles + reactions + parents (async only)
   * - Aucun setState synchrone dans le body de l'effet (ESLint OK)
   */
  useEffect(() => {
    if (!userId || visibleMessages.length === 0) return;

    let cancelled = false;

    const load = async () => {
      try {
        // 1) Sender profiles (inclut aussi l'utilisateur courant => avatar pour "mine")
        const senderIds = Array.from(new Set(visibleMessages.map((m) => m.sender_id).filter(Boolean)));
        const profiles = senderIds.length > 0 ? await fetchSenderProfiles(senderIds) : new Map();

        // 2) Reactions batch
        const msgIds = visibleMessages.map((m) => m.id).filter(Boolean);
        const reactions = msgIds.length > 0 ? await fetchMessageReactionsBatch(msgIds) : new Map();

        // 3) Parents: on fetch la conv (fail-soft) puis on mappe uniquement les IDs utiles
        const parentIds = Array.from(new Set(visibleMessages.map((m) => m.parent_id).filter(Boolean) as string[]));
        const parentsData = parentIds.length > 0 && conversationId ? await fetchMessages(conversationId, 200) : [];
        const parentsMap = new Map<string, UiMessage>();
        for (const p of parentsData as UiMessage[]) {
          const pid = String(p?.id ?? '').trim();
          if (pid && parentIds.includes(pid)) parentsMap.set(pid, p);
        }

        // 4) Parent sender profiles (merge)
        const parentSenderIds = Array.from(new Set(parentsData.map((p) => p.sender_id).filter(Boolean)));
        const parentProfiles = parentSenderIds.length > 0 ? await fetchSenderProfiles(parentSenderIds) : new Map();

        if (cancelled) return;

        setSenderProfiles(new Map<string, SenderProfile>([...profiles, ...parentProfiles]));
        setReactionsByMsg(reactions as unknown as Map<string, ReactionRow[]>);
        setParentsById(parentsMap);
      } catch {
        // fail-soft: on garde ce qu'on a (messages non enrichis, maps éventuellement vides)
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [userId, conversationId, visibleMessages]);

  /**
   * Enrichissement en render (pas de state "enrichedMessages")
   * - Si maps pas prêtes => reactions=[], parentMessage=null
   */
  const enrichedMessages = useMemo<UiMessage[]>(() => {
    return visibleMessages.map((m) => ({
      ...m,
      reactions: reactionsByMsg.get(m.id) ?? (m.reactions ?? []),
      parentMessage: m.parent_id ? parentsById.get(m.parent_id) ?? null : null,
    }));
  }, [visibleMessages, reactionsByMsg, parentsById]);

  // --------------------------------------------------------------------------
  // Auto-scroll au dernier message (send/receive)
  // - Simplifié : toujours scroll to bottom sur conversationId change OU nouveau message
  // - Délai augmenté (300ms) pour laisser images/previews charger
  // --------------------------------------------------------------------------
  const lastMsgKey = useMemo(() => {
    const last = enrichedMessages[enrichedMessages.length - 1];
    return last ? String(last.id || last.client_id || last.created_at) : '';
  }, [enrichedMessages]);

  useEffect(() => {
    const anchor = scrollRef?.current ?? null;
    if (!anchor) return;

    // Double scroll : immédiat + différé (fiabilité images/previews)
    const scrollToBottom = () => {
      anchor.scrollIntoView({ behavior: 'smooth', block: 'end' });
    };

    // Scroll immédiat (rAF pour attendre render DOM)
    requestAnimationFrame(scrollToBottom);

    // Scroll différé (attend chargement images/previews)
    const timer = setTimeout(scrollToBottom, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [conversationId, lastMsgKey, scrollRef]);

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

        // ✅ on passe le profil même pour "mine" (avatar image au lieu "PO")
        const senderProfile = senderProfiles.get(m.sender_id) ?? null;

        const parentSenderProfile =
          m.parentMessage && m.parentMessage.sender_id
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