/**
 * =============================================================================
 * Fichier      : components/messages/ChatDock.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 2.1.0 (2026-01-25)
 * Objet        : ChatDock (bulle) — LOT 2 Réactions + Répondre complet
 * -----------------------------------------------------------------------------
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 2.1.0 (2026-01-25)
 * - [NEW] LOT 2 : State replyTo + replyToSenderProfile
 * - [NEW] LOT 2 : Handler handleReply + handleReplyCancel
 * - [NEW] LOT 2 : Handler handleReactionToggle (optimistic + DB + Realtime)
 * - [NEW] LOT 2 : Realtime reactions sync (onReactionChange)
 * - [KEEP] LOT 1 : Optimistic send + confirm + retry inchangés
 * =============================================================================
 */

'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { X, Mail } from 'lucide-react';
import { useRealtime } from '@/lib/realtime/RealtimeProvider';
import {
  fetchConversationsForUser,
  fetchMessages,
  markConversationRead,
  sendMessage,
  fetchSenderProfiles,
} from '@/lib/messages';
import { toggleReaction } from '@/lib/messages/reactions';
import ConversationList from './ConversationList';
import MessageList from './MessageList';
import Composer from './Composer';
import type { ConversationRowPlus, UiMessage, SenderProfile } from './types';

function convTitle(c: ConversationRowPlus): string {
  const t = (c.title ?? '').trim();
  if (t) return t;

  if (c.type === 'group') return 'Groupe';

  const h = (c.peer_handle ?? '').trim();
  if (h) return h.startsWith('@') ? h : `@${h}`;

  const dn = (c.peer_display_name ?? '').trim();
  if (dn) return dn;

  return 'Direct';
}

export default function ChatDock() {
  const { userId, isChatDockOpen, closeChatDock, activeConversationId, openConversation, refreshCounts, onReactionChange } =
    useRealtime();

  const [q, setQ] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [convs, setConvs] = useState<ConversationRowPlus[]>([]);

  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([]);

  const [replyTo, setReplyTo] = useState<UiMessage | null>(null);
  const [replyToSenderProfile, setReplyToSenderProfile] = useState<SenderProfile | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollToBottom = () => {
    const el = messagesEndRef.current;
    if (!el) return;
    el.scrollIntoView({ block: 'end', behavior: 'smooth' });
  };

  const selected = useMemo(
    () => convs.find((c) => c.id === activeConversationId) ?? null,
    [convs, activeConversationId]
  );

  const pendingSendingCount = useMemo(() => {
    return messages.filter((m) => m.status === 'sending').length;
  }, [messages]);

  // Reset local state when dock closes or user changes
  useEffect(() => {
    if (!isChatDockOpen) {
      setQ('');
      setLoadingConvs(false);
      setLoadingMsgs(false);
      setConvs([]);
      setMessages([]);
      setReplyTo(null);
      setReplyToSenderProfile(null);
      return;
    }

    setMessages([]);
    setReplyTo(null);
    setReplyToSenderProfile(null);
  }, [isChatDockOpen, userId]);

  // Load conversations when dock opens
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!isChatDockOpen || !userId) return;

      setLoadingConvs(true);
      try {
        const rows = (await fetchConversationsForUser(userId)) as unknown as ConversationRowPlus[];
        if (cancelled || !mountedRef.current) return;

        setConvs(rows);

        if (!activeConversationId && rows.length > 0) {
          openConversation(rows[0].id);
        }
      } catch {
        if (!cancelled && mountedRef.current) setConvs([]);
      } finally {
        if (!cancelled && mountedRef.current) setLoadingConvs(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [isChatDockOpen, userId, activeConversationId, openConversation]);

  // Load messages for selected conversation
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!isChatDockOpen || !activeConversationId) return;

      setLoadingMsgs(true);
      try {
        const rows = await fetchMessages(activeConversationId, 60);
        if (cancelled || !mountedRef.current) return;

        const uiMsgs: UiMessage[] = rows.map((r) => ({
          ...r,
          status: 'sent' as const,
        }));

        setMessages(uiMsgs);

        await markConversationRead(activeConversationId);
        await refreshCounts();

        setTimeout(() => {
          if (!cancelled && mountedRef.current) scrollToBottom();
        }, 0);
      } catch {
        if (!cancelled && mountedRef.current) setMessages([]);
      } finally {
        if (!cancelled && mountedRef.current) setLoadingMsgs(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [isChatDockOpen, activeConversationId, refreshCounts]);

  // Scroll on new messages
  useEffect(() => {
    if (!isChatDockOpen || messages.length === 0) return;
    scrollToBottom();
  }, [messages.length, isChatDockOpen]);

  // LOT 2 : Realtime reactions sync
  useEffect(() => {
    if (!isChatDockOpen) return;

    const unsubscribe = onReactionChange((payload) => {
      const { eventType, record } = payload;

      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== record.message_id) return m;

          const reactions = m.reactions ?? [];

          if (eventType === 'INSERT') {
            // Check si pas déjà présent (avoid duplicate)
            const exists = reactions.find((r) => r.id === record.id);
            if (exists) return m;
            return { ...m, reactions: [...reactions, record] };
          } else {
            // DELETE
            return { ...m, reactions: reactions.filter((r) => r.id !== record.id) };
          }
        })
      );
    });

    return unsubscribe;
  }, [isChatDockOpen, onReactionChange]);

  // Optimistic send
  const handleOptimisticSend = useCallback((msg: UiMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  // Confirm sent (replace optimistic by DB msg)
  const handleConfirmSent = useCallback(
    async (clientId: string, dbMsg: UiMessage) => {
      setMessages((prev) => prev.map((m) => (m.client_id === clientId ? { ...dbMsg, status: 'sent' as const } : m)));

      if (activeConversationId) {
        await markConversationRead(activeConversationId);
        await refreshCounts();
      }
    },
    [activeConversationId, refreshCounts]
  );

  // Send failed
  const handleSendFailed = useCallback((clientId: string, error: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.client_id === clientId ? { ...m, status: 'failed' as const, error, retryCount: (m.retryCount ?? 0) + 1 } : m
      )
    );
  }, []);

  // Retry
  const handleRetry = useCallback(
    async (msg: UiMessage) => {
      if (!activeConversationId || !msg.client_id) return;

      setMessages((prev) =>
        prev.map((m) => (m.client_id === msg.client_id ? { ...m, status: 'sending' as const, error: undefined } : m))
      );

      try {
        const dbMsg = await sendMessage(activeConversationId, msg.content, { client_id: msg.client_id });
        handleConfirmSent(msg.client_id, dbMsg as UiMessage);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Erreur d'envoi";
        handleSendFailed(msg.client_id, errMsg);
      }
    },
    [activeConversationId, handleConfirmSent, handleSendFailed]
  );

  // LOT 2 : Reply
  const handleReply = useCallback(
    async (msg: UiMessage) => {
      setReplyTo(msg);

      if (userId && msg.sender_id !== userId) {
        try {
          const profiles = await fetchSenderProfiles([msg.sender_id]);
          const profile = profiles.get(msg.sender_id);
          if (profile) setReplyToSenderProfile(profile);
        } catch {
          setReplyToSenderProfile(null);
        }
      }
    },
    [userId]
  );

  const handleReplyCancel = useCallback(() => {
    setReplyTo(null);
    setReplyToSenderProfile(null);
  }, []);

  // LOT 2 : Reactions (optimistic + DB, Realtime handle la sync)
  const handleReactionToggle = useCallback(
    async (messageId: string, emoji: string) => {
      if (!userId) return;

      // 1) Optimistic update
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;

          const reactions = m.reactions ?? [];
          const existing = reactions.find((r) => r.emoji === emoji && r.user_id === userId);

          if (existing) {
            return { ...m, reactions: reactions.filter((r) => r.id !== existing.id) };
          } else {
            const newReaction = {
              id: `optimistic-${Date.now()}`,
              message_id: messageId,
              user_id: userId,
              emoji,
              created_at: new Date().toISOString(),
            };
            return { ...m, reactions: [...reactions, newReaction] };
          }
        })
      );

      // 2) DB call (Realtime sync se fait automatiquement via onReactionChange)
      try {
        const result = await toggleReaction(messageId, emoji);

        // 3) Replace optimistic by real (si ajout)
        if (result.added && result.reaction) {
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== messageId) return m;
              const reactions = m.reactions ?? [];
              return {
                ...m,
                reactions: reactions.filter((r) => !r.id.startsWith('optimistic-')).concat([result.reaction!]),
              };
            })
          );
        } else {
          // Cleanup optimistic
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== messageId) return m;
              return { ...m, reactions: (m.reactions ?? []).filter((r) => !r.id.startsWith('optimistic-')) };
            })
          );
        }
      } catch {
        // Rollback optimistic on error
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== messageId) return m;
            return { ...m, reactions: (m.reactions ?? []).filter((r) => !r.id.startsWith('optimistic-')) };
          })
        );
      }
    },
    [userId]
  );

  if (!isChatDockOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-60 w-95 max-w-[92vw]">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-2xl shadow-black/15 backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white">
              <Mail className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <div className="text-sm font-extrabold text-slate-900">Chat</div>
              <div className="text-xs text-slate-500">{selected ? convTitle(selected) : 'Conversations'}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/messages"
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 hover:border-slate-300"
              onClick={() => closeChatDock()}
              aria-label="Open full messages page"
            >
              Ouvrir
            </Link>

            <button
              type="button"
              onClick={() => closeChatDock()}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-900 hover:border-slate-300"
              aria-label="Close chat dock"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {!userId ? (
          <div className="p-4 text-sm text-slate-700">
            Connecte-toi pour accéder aux messages.
            <div className="mt-3">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                onClick={() => closeChatDock()}
              >
                Se connecter
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-[150px_1fr]">
            {/* Sidebar convs */}
            <div className="border-r border-slate-200">
              <ConversationList
                conversations={convs}
                loading={loadingConvs}
                selectedId={activeConversationId}
                onSelect={openConversation}
                query={q}
                onQueryChange={setQ}
                variant="dock"
              />
            </div>

            {/* Messages */}
            <div className="flex flex-col">
              <div className="h-80 overflow-auto p-3">
                <MessageList
                  messages={messages}
                  loading={loadingMsgs}
                  userId={userId}
                  conversationId={activeConversationId}
                  onRetry={handleRetry}
                  onReply={handleReply}
                  onReactionToggle={handleReactionToggle}
                  scrollRef={messagesEndRef}
                  variant="dock"
                />
              </div>

              {/* Composer */}
              <Composer
                conversationId={activeConversationId}
                userId={userId}
                replyTo={replyTo}
                replyToSenderProfile={replyToSenderProfile}
                onReplyCancel={handleReplyCancel}
                onOptimisticSend={handleOptimisticSend}
                onConfirmSent={handleConfirmSent}
                onSendFailed={handleSendFailed}
                pendingSendingCount={pendingSendingCount}
                variant="dock"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}