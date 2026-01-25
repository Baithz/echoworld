/**
 * =============================================================================
 * Fichier      : components/messages/ChatDock.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 2.3.0 (2026-01-25)
 * Objet        : ChatDock (bulle) — LOT 2 complet + LIVE messages + Sidebar tri last msg + unread badges
 * -----------------------------------------------------------------------------
 * Description  :
 * - Dock flottant : sidebar conversations + thread + composer
 * - LOT 2 : reply / reactions / optimistic / retry conservés
 * - LIVE : reçoit les messages entrants via RealtimeProvider.onNewMessage (sans refresh)
 * - Fail-soft : si realtime indispo, le dock reste utilisable (fetch classiques)
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 2.3.0 (2026-01-25)
 * - [NEW] Live: écoute onNewMessage() et injecte les messages entrants dans l’UI
 * - [NEW] Live: bump unreadCounts si conversation non active, sinon append + mark read
 * - [KEEP] 2.2.0 : unread badges + tri last message + clear instant + mark read conservés
 * - [KEEP] LOT 2 : reply/reactions/optimistic/retry/realtime reactions inchangés
 * - [SAFE] Dedupe anti-doublon (id) + update lastMsgByConv
 * =============================================================================
 */

'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { X, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
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

type MsgLite = { id: string; conversation_id: string; created_at: string };

function safeTime(iso: string | null | undefined): number {
  const t = iso ? new Date(iso).getTime() : 0;
  return Number.isFinite(t) ? t : 0;
}

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
  const {
    userId,
    isChatDockOpen,
    closeChatDock,
    activeConversationId,
    openConversation,
    refreshCounts,
    onReactionChange,
    onNewMessage,
  } = useRealtime();

  const [q, setQ] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [convs, setConvs] = useState<ConversationRowPlus[]>([]);

  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([]);

  const [replyTo, setReplyTo] = useState<UiMessage | null>(null);
  const [replyToSenderProfile, setReplyToSenderProfile] = useState<SenderProfile | null>(null);

  // unread per conversation (badge sidebar)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // last message per conversation (tri sidebar)
  const [lastMsgByConv, setLastMsgByConv] = useState<Record<string, string>>({});

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const activeConvRef = useRef<string | null>(null);
  useEffect(() => {
    activeConvRef.current = activeConversationId;
  }, [activeConversationId]);

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
      setUnreadCounts({});
      setLastMsgByConv({});
      return;
    }

    setMessages([]);
    setReplyTo(null);
    setReplyToSenderProfile(null);
  }, [isChatDockOpen, userId]);

  // --------------------------------------------------------------------------
  // LIVE messages (RealtimeProvider -> Dock push)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!isChatDockOpen || !userId) return;

    const unsubscribe = onNewMessage((p) => {
      const rec = p.record;
      const convId = rec.conversation_id;

      // 1) Always bump last msg time for ordering
      setLastMsgByConv((prev) => ({ ...prev, [convId]: rec.created_at }));

      const activeId = activeConvRef.current;

      // 2) If active conversation => append (dedupe) + clear badge + mark read
      if (activeId && activeId === convId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === rec.id)) return prev;

          const next: UiMessage = {
            id: rec.id,
            conversation_id: rec.conversation_id,
            sender_id: rec.sender_id,
            content: rec.content ?? '',
            created_at: rec.created_at,
            edited_at: rec.edited_at ?? null,
            deleted_at: rec.deleted_at ?? null,
            payload: rec.payload ?? null,
            status: 'sent',
          } as UiMessage;

          return [...prev, next];
        });

        setUnreadCounts((prev) => ({ ...prev, [convId]: 0 }));
        void markConversationRead(convId).catch(() => {});
        void refreshCounts().catch(() => {});
        return;
      }

      // 3) Otherwise bump local unread badge
      setUnreadCounts((prev) => ({ ...prev, [convId]: (prev[convId] ?? 0) + 1 }));
      void refreshCounts().catch(() => {});
    });

    return unsubscribe;
  }, [isChatDockOpen, userId, onNewMessage, refreshCounts]);

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

  /**
   * Hydrate last message per conversation (fail-soft)
   */
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!isChatDockOpen || !userId) return;
      const ids = convs.map((c) => c.id).filter(Boolean);
      if (ids.length === 0) return;

      try {
        const { data, error } = await supabase
          .from('messages')
          .select('id,conversation_id,created_at')
          .in('conversation_id', ids)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(Math.min(500, ids.length * 35));

        if (cancelled || !mountedRef.current) return;
        if (error || !Array.isArray(data)) return;

        const map: Record<string, string> = {};
        for (const r of data as unknown as MsgLite[]) {
          const cid = String((r as MsgLite).conversation_id ?? '').trim();
          const ca = String((r as MsgLite).created_at ?? '').trim();
          if (!cid || !ca) continue;
          if (!map[cid]) map[cid] = ca;
        }

        setLastMsgByConv(map);
      } catch {
        // noop
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [isChatDockOpen, userId, convs]);

  /**
   * unreadCounts par conversation (fail-soft)
   */
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!isChatDockOpen || !userId) return;
      if (convs.length === 0) return;

      try {
        const { data: mem, error: memErr } = await supabase
          .from('conversation_members')
          .select('conversation_id,last_read_at')
          .eq('user_id', userId);

        if (cancelled || !mountedRef.current) return;
        if (memErr || !Array.isArray(mem)) return;

        const counts: Record<string, number> = {};
        const slice = mem.slice(0, 40);

        for (const row of slice as Array<{ conversation_id?: string; last_read_at?: string | null }>) {
          const convId = String(row.conversation_id ?? '').trim();
          if (!convId) continue;

          const lastRead = (row.last_read_at ?? '') ? String(row.last_read_at) : null;

          type CountRes = { count: number | null; error: { message?: string } | null };
          type CountQuery = {
            eq: (c: string, v: unknown) => CountQuery;
            is: (c: string, v: unknown) => CountQuery;
            neq: (c: string, v: unknown) => CountQuery;
            gt: (c: string, v: unknown) => Promise<CountRes>;
          };

          const q = (supabase.from('messages').select('id', { count: 'exact', head: true }) as unknown) as CountQuery;
          const base = q.eq('conversation_id', convId).is('deleted_at', null).neq('sender_id', userId);

          const res = lastRead
            ? await base.gt('created_at', lastRead)
            : await base.gt('created_at', '1970-01-01T00:00:00.000Z');

          if (res.error) continue;

          const n = typeof res.count === 'number' && Number.isFinite(res.count) ? res.count : 0;
          counts[convId] = Math.max(0, n);
        }

        if (!cancelled && mountedRef.current) setUnreadCounts(counts);
      } catch {
        // noop
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [isChatDockOpen, userId, convs]);

  // Convs triées par dernier message (fallback updated_at)
  const sortedConvs = useMemo(() => {
    const arr = [...convs];
    arr.sort((a, b) => {
      const ta = safeTime(lastMsgByConv[a.id] ?? a.updated_at);
      const tb = safeTime(lastMsgByConv[b.id] ?? b.updated_at);
      return tb - ta;
    });
    return arr;
  }, [convs, lastMsgByConv]);

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

        setUnreadCounts((prev) => ({ ...prev, [activeConversationId]: 0 }));

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
            const exists = reactions.find((r) => r.id === record.id);
            if (exists) return m;
            return { ...m, reactions: [...reactions, record] };
          } else {
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
    setLastMsgByConv((prev) => ({ ...prev, [msg.conversation_id]: msg.created_at }));
  }, []);

  // Confirm sent
  const handleConfirmSent = useCallback(
    async (clientId: string, dbMsg: UiMessage) => {
      setMessages((prev) => prev.map((m) => (m.client_id === clientId ? { ...dbMsg, status: 'sent' as const } : m)));
      setLastMsgByConv((prev) => ({ ...prev, [dbMsg.conversation_id]: dbMsg.created_at }));

      if (activeConversationId) {
        await markConversationRead(activeConversationId);
        await refreshCounts();
        setUnreadCounts((prev) => ({ ...prev, [activeConversationId]: 0 }));
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

  // Reply
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
      } else {
        setReplyToSenderProfile(null);
      }
    },
    [userId]
  );

  const handleReplyCancel = useCallback(() => {
    setReplyTo(null);
    setReplyToSenderProfile(null);
  }, []);

  // Reactions (optimistic)
  const handleReactionToggle = useCallback(
    async (messageId: string, emoji: string) => {
      if (!userId) return;

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

      try {
        const result = await toggleReaction(messageId, emoji);

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
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== messageId) return m;
              return { ...m, reactions: (m.reactions ?? []).filter((r) => !r.id.startsWith('optimistic-')) };
            })
          );
        }
      } catch {
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

  const onSelectConversation = useCallback(
    (id: string) => {
      setUnreadCounts((prev) => ({ ...prev, [id]: 0 }));
      openConversation(id);
      setReplyTo(null);
      setReplyToSenderProfile(null);
    },
    [openConversation]
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
                conversations={sortedConvs}
                loading={loadingConvs}
                selectedId={activeConversationId}
                onSelect={onSelectConversation}
                query={q}
                onQueryChange={setQ}
                variant="dock"
                unreadCounts={unreadCounts}
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
