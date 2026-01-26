/**
 * =============================================================================
 * Fichier      : components/messages/ChatDock.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 3.1.2 (2026-01-26)
 * Objet        : ChatDock — Dernière conv active + auto-scroll bas + présence header + typing sticky (SAFE)
 * -----------------------------------------------------------------------------
 * Description  :
 * - Dock flottant redesigné : sidebar 200px + actions au-dessus textarea
 * - Wrapper ajusté : 850px (plus raisonnable que 1100px)
 * - Zone messages : hauteur augmentée (h-96) pour plus de lisibilité
 * - TypingIndicator repositionné : visible sans scroll (sticky au-dessus du composer)
 * - Header : affiche la présence du peer (DM) via PresenceBadge + libellé En ligne/Hors ligne
 * - Conserve intégralement : optimistic send/retry, reply, reactions, unread counts, live messages
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 3.1.2 (2026-01-26)
 * - [FIX] Auto-open : dépend directement de convs/lastMsgByConv (pas sortedConvs) pour éviter re-triggers intempestifs
 * - [FIX] Auto-open : calcul tri inline dans l'effet → sélectionne toujours la dernière conv active même après live updates
 * - [KEEP] 3.1.1 : scroll double + live dedupe + présence header peer + typing sticky inchangés
 * - [SAFE] Aucune régression : retry/reply/reactions/mark read conservés
 * -----------------------------------------------------------------------------
 * 3.1.1 (2026-01-26)
 * - [FIX] Auto-open : ouvre la dernière conversation active via tri lastMsgByConv (fallback updated_at)
 * - [FIX] Scroll : auto-scroll bas à l’ouverture conv + message reçu + message envoyé/confirmé (double scroll fail-soft)
 * - [IMPROVED] lastMsgByConv : hydrate en merge (ne réinitialise pas l’état live)
 * - [KEEP] 3.1.0 : présence header peer + wrapper 850 + h-96 + typing sticky + live/unread inchangés
 * - [SAFE] Aucune régression : retry/reply/reactions/mark read/fetch conservés
 * =============================================================================
 */

'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { X, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useRealtime } from '@/lib/realtime/RealtimeProvider';
import { usePresence, isUserOnline } from '@/lib/presence/usePresence';
import {
  fetchConversationsForUser,
  fetchMessages,
  markConversationRead,
  sendMessage,
  fetchSenderProfiles,
} from '@/lib/messages';
import { toggleReaction } from '@/lib/messages/reactions';
import { useTyping } from '@/lib/messages/useTyping';
import ConversationList from './ConversationList';
import MessageList from './MessageList';
import TypingIndicator from './TypingIndicator';
import RichComposer from './RichComposer';
import PresenceBadge from './PresenceBadge';
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

function toUiMessageFromLiveRecord(
  rec: {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    created_at: string;
    edited_at: string | null;
    deleted_at: string | null;
    payload: unknown | null;
  },
  existing?: UiMessage
): UiMessage {
  if (existing) {
    return {
      ...existing,
      content: rec.content ?? existing.content,
      edited_at: rec.edited_at ?? existing.edited_at ?? null,
      deleted_at: rec.deleted_at ?? existing.deleted_at ?? null,
      payload: rec.payload ?? existing.payload ?? null,
      status: 'sent',
    };
  }

  return {
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

  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
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

  // --------------------------------------------------------------------------
  // Scroll helpers (fail-soft)
  // --------------------------------------------------------------------------
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback((delay = 0) => {
    const el = messagesEndRef.current;
    if (!el) return;

    const run = () => {
      messagesEndRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
    };

    if (delay <= 0) {
      run();
      return;
    }

    setTimeout(run, delay);
  }, []);

  const scrollToBottomDouble = useCallback(() => {
    scrollToBottom(0);
    scrollToBottom(150);
  }, [scrollToBottom]);

  const selected = useMemo(
    () => convs.find((c) => c.id === activeConversationId) ?? null,
    [convs, activeConversationId]
  );

  // PHASE 3: Présence (fail-soft)
  const presenceMap = usePresence(userId, 'global-presence');

  // Peer presence (DM uniquement) — robuste selon schéma ConversationRowPlus
  const peerUserId = useMemo(() => {
    if (!selected) return null;

    const pid1 = String((selected as ConversationRowPlus).peer_user_id ?? '').trim();
    if (selected.type === 'direct' && pid1) return pid1;

    const anySel = selected as unknown as { peer_id?: string | null; peerId?: string | null };
    const pid2 = String(anySel.peer_id ?? anySel.peerId ?? '').trim();
    if (selected.type === 'direct' && pid2) return pid2;

    return null;
  }, [selected]);

  const peerOnline = useMemo(() => {
    if (!peerUserId) return false;
    try {
      return isUserOnline(presenceMap, peerUserId);
    } catch {
      return false;
    }
  }, [presenceMap, peerUserId]);

  const pendingSendingCount = useMemo(() => {
    return messages.filter((m) => m.status === 'sending').length;
  }, [messages]);

  // Fetch current user profile pour typing
  const [currentUserProfile, setCurrentUserProfile] = useState<{
    displayName: string | null;
    handle: string | null;
  }>({ displayName: null, handle: null });

  useEffect(() => {
    if (!userId) return;

    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('display_name, handle')
          .eq('id', userId)
          .single<{ display_name: string | null; handle: string | null }>();

        if (error || !data) return;

        setCurrentUserProfile({
          displayName: data.display_name ?? null,
          handle: data.handle ?? null,
        });
      } catch {
        // Fail-soft
      }
    };

    void fetchProfile();
  }, [userId]);

  // Typing indicator avec vrais noms
  const { typingUsers, startTyping, stopTyping } = useTyping(
    activeConversationId,
    userId,
    currentUserProfile.displayName,
    currentUserProfile.handle
  );

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

  // LIVE messages
  useEffect(() => {
    if (!isChatDockOpen || !userId) return;

    const unsubscribe = onNewMessage((p) => {
      const rec = p.record;
      const convId = String(rec.conversation_id ?? '').trim();
      if (!convId) return;

      if (rec.created_at) {
        setLastMsgByConv((prev) => ({ ...prev, [convId]: rec.created_at }));
      }

      const activeId = activeConvRef.current;

      if (activeId && activeId === convId) {
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.id === rec.id);
          if (idx >= 0) {
            const updated = toUiMessageFromLiveRecord(rec, prev[idx]);
            const nextArr = [...prev];
            nextArr[idx] = updated;
            return nextArr;
          }
          return [...prev, toUiMessageFromLiveRecord(rec)];
        });

        setUnreadCounts((prev) => ({ ...prev, [convId]: 0 }));

        // ✅ Auto-scroll : dernier message reçu (conv ouverte)
        scrollToBottom(100);

        void markConversationRead(convId).catch(() => {});
        void refreshCounts().catch(() => {});
        return;
      }

      setUnreadCounts((prev) => ({ ...prev, [convId]: (prev[convId] ?? 0) + 1 }));
      void refreshCounts().catch(() => {});
    });

    return unsubscribe;
  }, [isChatDockOpen, userId, onNewMessage, refreshCounts, scrollToBottom]);

  // Load conversations
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!isChatDockOpen || !userId) return;

      setLoadingConvs(true);
      try {
        const rows = (await fetchConversationsForUser(userId)) as unknown as ConversationRowPlus[];
        if (cancelled || !mountedRef.current) return;
        setConvs(rows);
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
  }, [isChatDockOpen, userId]);

  // Hydrate last message
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

        // ✅ merge (ne réinitialise pas l’état live)
        setLastMsgByConv((prev) => ({ ...prev, ...map }));
      } catch {
        // noop
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [isChatDockOpen, userId, convs]);

  // unreadCounts
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

          const q2 = (supabase.from('messages').select('id', { count: 'exact', head: true }) as unknown) as CountQuery;
          const base = q2.eq('conversation_id', convId).is('deleted_at', null).neq('sender_id', userId);

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

  const sortedConvs = useMemo(() => {
    const arr = [...convs];
    arr.sort((a, b) => {
      const ta = safeTime(lastMsgByConv[a.id] ?? a.updated_at);
      const tb = safeTime(lastMsgByConv[b.id] ?? b.updated_at);
      return tb - ta;
    });
    return arr;
  }, [convs, lastMsgByConv]);

  // ✅ Auto-open : dernière conversation active via tri inline (stable)
  useEffect(() => {
    if (!isChatDockOpen) return;
    if (activeConversationId) return;
    if (convs.length === 0) return;
    
    // Calculer le tri inline (évite dépendance sur sortedConvs qui change trop souvent)
    const sorted = [...convs].sort((a, b) => {
      const ta = safeTime(lastMsgByConv[a.id] ?? a.updated_at);
      const tb = safeTime(lastMsgByConv[b.id] ?? b.updated_at);
      return tb - ta;
    });
    
    if (sorted.length > 0) {
      openConversation(sorted[0].id);
    }
  }, [isChatDockOpen, activeConversationId, convs, lastMsgByConv, openConversation]);

  // Load messages
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

        // ✅ Auto-scroll : ouverture conv -> bas (double scroll)
        if (!cancelled && mountedRef.current) scrollToBottomDouble();
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
  }, [isChatDockOpen, activeConversationId, refreshCounts, scrollToBottomDouble]);

  // Realtime reactions
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

  const handleOptimisticSend = useCallback(
    (msg: UiMessage) => {
      setMessages((prev) => [...prev, msg]);
      setLastMsgByConv((prev) => ({ ...prev, [msg.conversation_id]: msg.created_at }));

      // ✅ Auto-scroll : message envoyé (optimistic)
      scrollToBottom(50);
    },
    [scrollToBottom]
  );

  const handleConfirmSent = useCallback(
    async (clientId: string, dbMsg: UiMessage) => {
      setMessages((prev) => prev.map((m) => (m.client_id === clientId ? { ...dbMsg, status: 'sent' as const } : m)));
      setLastMsgByConv((prev) => ({ ...prev, [dbMsg.conversation_id]: dbMsg.created_at }));

      if (activeConversationId) {
        await markConversationRead(activeConversationId);
        await refreshCounts();
        setUnreadCounts((prev) => ({ ...prev, [activeConversationId]: 0 }));
      }

      // ✅ Auto-scroll : confirm DB (images/attachments peuvent rendre plus tard)
      scrollToBottomDouble();
    },
    [activeConversationId, refreshCounts, scrollToBottomDouble]
  );

  const handleSendFailed = useCallback((clientId: string, error: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.client_id === clientId ? { ...m, status: 'failed' as const, error, retryCount: (m.retryCount ?? 0) + 1 } : m
      )
    );
  }, []);

  const handleRetry = useCallback(
    async (msg: UiMessage) => {
      if (!activeConversationId || !msg.client_id) return;

      setMessages((prev) =>
        prev.map((m) => (m.client_id === msg.client_id ? { ...m, status: 'sending' as const, error: undefined } : m))
      );

      // ✅ Auto-scroll : état sending visible
      scrollToBottom(50);

      try {
        const dbMsg = await sendMessage(activeConversationId, msg.content, { client_id: msg.client_id });
        handleConfirmSent(msg.client_id, dbMsg as UiMessage);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Erreur d'envoi";
        handleSendFailed(msg.client_id, errMsg);
      }
    },
    [activeConversationId, handleConfirmSent, handleSendFailed, scrollToBottom]
  );

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
      // scroll se fera après fetchMessages (effect activeConversationId)
    },
    [openConversation]
  );

  if (!isChatDockOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-190 max-w-[92vw]">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-2xl shadow-black/15 backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white">
              <Mail className="h-5 w-5" />
            </span>

            <div className="leading-tight">
              <div className="text-sm font-extrabold text-slate-900">Chat</div>

              {/* ✅ PHASE 3: Nom + présence */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500">{selected ? convTitle(selected) : 'Conversations'}</span>

                {peerUserId && (
                  <>
                    <PresenceBadge online={peerOnline} size="small" showTooltip={false} />
                    <span className={peerOnline ? 'font-medium text-emerald-600' : 'text-slate-400'}>
                      {peerOnline ? 'En ligne' : 'Hors ligne'}
                    </span>
                  </>
                )}
              </div>
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
          <div className="grid grid-cols-[200px_1fr]">
            {/* Sidebar 200px */}
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

            {/* Messages + Typing (sticky) + Composer */}
            <div className="flex flex-col">
              <div className="h-96 overflow-auto p-3">
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

              {/* TypingIndicator visible sans scroll (sticky au-dessus du composer) */}
              <div className="sticky bottom-0 z-10 border-t border-slate-200 bg-white/90 px-3 py-2 backdrop-blur-xl">
                <TypingIndicator typingUsers={typingUsers} currentUserId={userId} variant="dock" />
              </div>

              <RichComposer
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
                onTypingStart={startTyping}
                onTypingStop={stopTyping}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}