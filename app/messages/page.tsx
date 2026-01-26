/**
 * =============================================================================
 * Fichier      : app/messages/page.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 2.6.1 (2026-01-26)
 * Objet        : Page Messages — Live messages + LOT 2 + Header avatar/presence + Typing + RichComposer
 * -----------------------------------------------------------------------------
 * Description  :
 * - Page conversations (sidebar + thread) avec optimistic send / retry / reply / reactions
 * - Live : push des messages entrants via RealtimeProvider.onNewMessage (sans refresh)
 * - Badges : unreadCounts fail-soft + tri par dernier message (lastMsgByConv)
 * - LOT 2.6 : Typing indicator (start/stop typing + affichage) + RichComposer callbacks
 * - PHASE 3 : Présence header peer (DM) via usePresence + PresenceBadge (fail-soft)
 * - SAFE : mark read, retry, reply, reactions, fetch conservés
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 2.6.1 (2026-01-26)
 * - [FIX] Auto-select : sélectionne la dernière conversation active via sortedConvs (lastMsgByConv fallback updated_at)
 * - [FIX] Scroll : auto-scroll bas à l’ouverture conv + message reçu + message envoyé/confirmé (double scroll fail-soft)
 * - [KEEP] Live dedupe + unreadCounts/lastMsgByConv + typing + retry/reply/reactions conservés
 * - [SAFE] Aucune régression : fetch, retry, reply, reactions, mark read conservés
 * =============================================================================
 */

'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Mail, ArrowRight, Loader2, Check, Users as UsersIcon, User as UserIcon } from 'lucide-react';
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
import ConversationList from '@/components/messages/ConversationList';
import MessageList from '@/components/messages/MessageList';
import TypingIndicator from '@/components/messages/TypingIndicator';
import RichComposer from '@/components/messages/RichComposer';
import PresenceBadge from '@/components/messages/PresenceBadge';
import type { ConversationRowPlus, UiMessage } from '@/components/messages/types';

type MsgLite = { id: string; conversation_id: string; created_at: string };

function safeTime(iso: string | null | undefined): number {
  const t = iso ? new Date(iso).getTime() : 0;
  return Number.isFinite(t) ? t : 0;
}

function normalizeHandleForHref(handle: string | null | undefined): string | null {
  const raw = (handle ?? '').trim().replace(/^@/, '');
  if (!raw) return null;
  return raw;
}

function toUiMessageFromRealtime(rec: {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  payload: unknown | null;
}): UiMessage {
  return {
    id: rec.id,
    conversation_id: rec.conversation_id,
    sender_id: rec.sender_id,
    content: rec.content ?? '',
    created_at: rec.created_at,
    edited_at: rec.edited_at ?? null,
    deleted_at: rec.deleted_at ?? null,
    payload: rec.payload ?? null,
    status: 'sent' as const,
  } as UiMessage;
}

export default function MessagesPage() {
  const { onNewMessage } = useRealtime();

  const [authLoading, setAuthLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [q, setQ] = useState('');

  const [loadingConvs, setLoadingConvs] = useState(false);
  const [convs, setConvs] = useState<ConversationRowPlus[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([]);

  const [replyTo, setReplyTo] = useState<UiMessage | null>(null);
  const [replyToSenderProfile, setReplyToSenderProfile] = useState<{
    id: string;
    handle: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null>(null);

  // unread per conversation (badge sidebar)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // last message timestamp per conversation (tri sidebar)
  const [lastMsgByConv, setLastMsgByConv] = useState<Record<string, string>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => convs.find((c) => c.id === selectedId) ?? null, [convs, selectedId]);

  // PHASE 3: Présence (fail-soft)
  const presenceMap = usePresence(userId, 'global-presence');

  // Derive online user ids for ConversationList (fail-soft, compatible avec diverses implémentations)
  const onlineUserIds = useMemo((): string[] => {
    try {
      const pm: unknown = presenceMap as unknown;

      // Map<userId, boolean>
      if (pm && typeof pm === 'object' && pm instanceof Map) {
        const ids: string[] = [];
        for (const [k, v] of pm.entries()) {
          if (v) ids.push(String(k));
        }
        return ids;
      }

      // Record<string, boolean>
      if (pm && typeof pm === 'object' && !Array.isArray(pm)) {
        const rec = pm as Record<string, unknown>;
        const out: string[] = [];
        for (const [k, v] of Object.entries(rec)) {
          if (v === true) out.push(String(k));
        }
        return out;
      }
    } catch {
      // noop
    }
    return [];
  }, [presenceMap]);

  const pendingSendingCount = useMemo(() => {
    return messages.filter((m) => m.status === 'sending').length;
  }, [messages]);

  // LOT 2.6: Typing indicator
  const { typingUsers, startTyping, stopTyping } = useTyping(selectedId, userId, null, null);

  // Refs anti stale-closure
  const selectedIdRef = useRef<string | null>(null);
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const userIdRef = useRef<string | null>(null);
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  // Dedupe global minimal (évite double append si multi events)
  const seenMsgIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    // reset quand user change
    seenMsgIdsRef.current = new Set();
  }, [userId]);

  // --------------------------------------------------------------------------
  // Scroll helpers (fail-soft)
  // --------------------------------------------------------------------------
  const scrollToBottom = useCallback((delay = 0) => {
    const el = messagesEndRef.current;
    if (!el) return;

    const run = () => {
      // smooth ok ici (55vh), on veut "dernier message" en priorité
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    };

    if (delay <= 0) {
      run();
      return;
    }

    setTimeout(run, delay);
  }, []);

  const scrollToBottomDouble = useCallback(() => {
    // Double scroll (immédiat + 150ms) pour fiabiliser après render / images
    scrollToBottom(0);
    scrollToBottom(150);
  }, [scrollToBottom]);

  // --------------------------------------------------------------------------
  // Auth bootstrap
  // --------------------------------------------------------------------------
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const uid = data.user?.id ?? null;
        if (!mounted) return;
        setUserId(uid);
      } finally {
        if (mounted) setAuthLoading(false);
      }
    };

    void load();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      setConvs([]);
      setSelectedId(null);
      setMessages([]);
      setUnreadCounts({});
      setLastMsgByConv({});
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // --------------------------------------------------------------------------
  // Live messages (RealtimeProvider -> UI push)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = onNewMessage((p) => {
      const uid = userIdRef.current;
      if (!uid) return;

      const rec = p.record;
      const convId = String(rec.conversation_id ?? '').trim();
      const msgId = String(rec.id ?? '').trim();
      if (!convId || !msgId) return;

      // Dedupe global (évite re-append si event doublonné)
      const seen = seenMsgIdsRef.current;
      if (seen.has(msgId)) {
        setLastMsgByConv((prev) => ({ ...prev, [convId]: rec.created_at }));
        return;
      }
      seen.add(msgId);

      // 1) Always refresh ordering key (sidebar tri)
      setLastMsgByConv((prev) => ({ ...prev, [convId]: rec.created_at }));

      const currentSelected = selectedIdRef.current;

      // 2) If the user is currently viewing this conversation => append + clear badge
      if (currentSelected && currentSelected === convId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msgId)) return prev;
          return [...prev, toUiMessageFromRealtime(rec)];
        });

        setUnreadCounts((prev) => ({ ...prev, [convId]: 0 }));

        // Fail-soft: mark read
        void markConversationRead(convId).catch(() => {});

        // ✅ Auto-scroll : dernier message reçu (conv ouverte)
        scrollToBottom(100);
        return;
      }

      // 3) Otherwise => bump local unread badge (fail-soft)
      setUnreadCounts((prev) => ({ ...prev, [convId]: (prev[convId] ?? 0) + 1 }));
    });

    return unsubscribe;
  }, [userId, onNewMessage, scrollToBottom]);

  // --------------------------------------------------------------------------
  // Load conversations
  // --------------------------------------------------------------------------
  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (!userId) return;
      setLoadingConvs(true);
      try {
        const rows = (await fetchConversationsForUser(userId)) as unknown as ConversationRowPlus[];
        if (!mounted) return;
        setConvs(rows);
      } catch {
        if (mounted) setConvs([]);
      } finally {
        if (mounted) setLoadingConvs(false);
      }
    };

    void run();

    return () => {
      mounted = false;
    };
  }, [userId]);

  /**
   * Hydrate last message per conversation (fail-soft)
   */
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!userId) return;
      const ids = convs.map((c) => c.id).filter(Boolean);
      if (ids.length === 0) return;

      try {
        const { data, error } = await supabase
          .from('messages')
          .select('id,conversation_id,created_at')
          .in('conversation_id', ids)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(Math.min(800, ids.length * 40));

        if (cancelled) return;
        if (error || !Array.isArray(data)) return;

        const map: Record<string, string> = {};
        for (const r of data as unknown as MsgLite[]) {
          const cid = String((r as MsgLite).conversation_id ?? '').trim();
          const ca = String((r as MsgLite).created_at ?? '').trim();
          if (!cid || !ca) continue;
          if (!map[cid]) map[cid] = ca;
        }

        setLastMsgByConv((prev) => ({ ...prev, ...map }));
      } catch {
        // noop
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [userId, convs]);

  /**
   * unreadCounts par conversation (fail-soft)
   */
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!userId) return;
      const ids = convs.map((c) => c.id).filter(Boolean);
      if (ids.length === 0) return;

      try {
        const { data: mem, error: memErr } = await supabase
          .from('conversation_members')
          .select('conversation_id,last_read_at')
          .eq('user_id', userId);

        if (cancelled) return;
        if (memErr || !Array.isArray(mem)) return;

        const counts: Record<string, number> = {};
        const slice = mem.slice(0, 50);

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

        if (!cancelled) setUnreadCounts((prev) => ({ ...prev, ...counts }));
      } catch {
        // noop
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [userId, convs]);

  // Conversations triées par dernier message (fallback updated_at)
  const sortedConvs = useMemo(() => {
    const arr = [...convs];
    arr.sort((a, b) => {
      const ta = safeTime(lastMsgByConv[a.id] ?? a.updated_at);
      const tb = safeTime(lastMsgByConv[b.id] ?? b.updated_at);
      return tb - ta;
    });
    return arr;
  }, [convs, lastMsgByConv]);

  // ✅ Auto-select : dernière conversation active (fail-soft)
  useEffect(() => {
    if (selectedId) return;
    if (!sortedConvs.length) return;
    setSelectedId(sortedConvs[0].id);
  }, [sortedConvs, selectedId]);

  // Load messages for selected conversation
  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (!selectedId) return;
      setLoadingMsgs(true);
      try {
        const rows = await fetchMessages(selectedId, 80);
        if (!mounted) return;

        // reset dedupe set with loaded messages (évite re-append live immédiat)
        const nextSeen = new Set(seenMsgIdsRef.current);
        for (const r of rows) {
          if (r?.id) nextSeen.add(String(r.id));
        }
        seenMsgIdsRef.current = nextSeen;

        const uiMsgs: UiMessage[] = rows.map((r) => ({
          ...r,
          status: 'sent' as const,
        }));

        setMessages(uiMsgs);

        await markConversationRead(selectedId);
        setUnreadCounts((prev) => ({ ...prev, [selectedId]: 0 }));

        // ✅ Auto-scroll : ouverture conv -> bas (double scroll)
        if (mounted) scrollToBottomDouble();
      } catch {
        if (mounted) setMessages([]);
      } finally {
        if (mounted) setLoadingMsgs(false);
      }
    };

    void run();

    return () => {
      mounted = false;
    };
  }, [selectedId, scrollToBottomDouble]);

  const onSelectConv = (id: string) => {
    setSelectedId(id);
    setReplyTo(null);
    setReplyToSenderProfile(null);
    setUnreadCounts((prev) => ({ ...prev, [id]: 0 }));
    // Le scroll se fera après le fetchMessages (effect selectedId)
  };

  const onMarkRead = async () => {
    if (!selectedId) return;
    try {
      await markConversationRead(selectedId);
      setUnreadCounts((prev) => ({ ...prev, [selectedId]: 0 }));
    } catch {
      // noop
    }
  };

  // Optimistic send
  const handleOptimisticSend = useCallback(
    (msg: UiMessage) => {
      setMessages((prev) => [...prev, msg]);
      setLastMsgByConv((prev) => ({ ...prev, [msg.conversation_id]: msg.created_at }));

      // ✅ Auto-scroll : dernier message envoyé (optimistic)
      scrollToBottom(50);
    },
    [scrollToBottom]
  );

  // Confirm sent
  const handleConfirmSent = useCallback(
    async (clientId: string, dbMsg: UiMessage) => {
      if (dbMsg?.id) seenMsgIdsRef.current.add(String(dbMsg.id));

      setMessages((prev) => prev.map((m) => (m.client_id === clientId ? { ...dbMsg, status: 'sent' as const } : m)));
      setLastMsgByConv((prev) => ({ ...prev, [dbMsg.conversation_id]: dbMsg.created_at }));

      if (selectedId) {
        await markConversationRead(selectedId);
        setUnreadCounts((prev) => ({ ...prev, [selectedId]: 0 }));
      }

      // ✅ Auto-scroll : confirm DB (images/attachments peuvent rendre plus tard)
      scrollToBottomDouble();
    },
    [selectedId, scrollToBottomDouble]
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
      if (!selectedId || !msg.client_id) return;

      setMessages((prev) =>
        prev.map((m) => (m.client_id === msg.client_id ? { ...m, status: 'sending' as const, error: undefined } : m))
      );

      // ✅ Auto-scroll : on renvoie (state sending)
      scrollToBottom(50);

      try {
        const dbMsg = await sendMessage(selectedId, msg.content, { client_id: msg.client_id });
        handleConfirmSent(msg.client_id, dbMsg as UiMessage);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Erreur d'envoi";
        handleSendFailed(msg.client_id, errMsg);
      }
    },
    [selectedId, handleConfirmSent, handleSendFailed, scrollToBottom]
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
              user_id: userId ?? '',
              emoji,
              created_at: new Date().toISOString(),
            };
            return { ...m, reactions: [...reactions, newReaction] };
          }
        })
      );

      try {
        const result = await toggleReaction(messageId, emoji);

        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== messageId) return m;

            const reactions = m.reactions ?? [];

            if (result.added && result.reaction) {
              return {
                ...m,
                reactions: reactions.filter((r) => !r.id.startsWith('optimistic-')).concat([result.reaction]),
              };
            } else {
              return { ...m, reactions: reactions.filter((r) => r.emoji !== emoji || r.user_id !== userId) };
            }
          })
        );
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

  // Header title for selected conversation
  const headerTitle = useMemo(() => {
    if (!selected) return '—';
    if (selected.type === 'group') return selected.title ?? 'Groupe';

    const dn = (selected.peer_display_name ?? '').trim();
    const h = (selected.peer_handle ?? '').trim();
    return dn || (h ? (h.startsWith('@') ? h : `@${h}`) : selected.title ?? 'Direct');
  }, [selected]);

  // Header avatar/presence
  const headerIsGroup = !!selected && selected.type === 'group';
  const headerHandle = !headerIsGroup ? normalizeHandleForHref(selected?.peer_handle ?? null) : null;
  const headerProfileHref = headerHandle ? `/u/${headerHandle}` : null;
  const headerAvatarUrl = !headerIsGroup ? (selected?.peer_avatar_url ?? null) : null;
  const headerPeerUserId = !headerIsGroup ? (selected?.peer_user_id ?? null) : null;

  const peerOnline = useMemo(() => {
    const pid = String(headerPeerUserId ?? '').trim();
    if (!pid) return false;
    try {
      return isUserOnline(presenceMap, pid);
    } catch {
      return false;
    }
  }, [presenceMap, headerPeerUserId]);

  const HeaderAvatar = () => {
    const baseClass =
      'flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white';

    const fallback = headerIsGroup ? (
      <UsersIcon className="h-5 w-5 text-slate-700" />
    ) : (
      <UserIcon className="h-5 w-5 text-slate-700" />
    );

    const content = headerAvatarUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={headerAvatarUrl} alt={headerTitle} className="h-full w-full object-cover" />
    ) : (
      fallback
    );

    if (headerProfileHref && !headerIsGroup) {
      return (
        <Link href={headerProfileHref} className={baseClass} aria-label={`Voir le profil de ${headerTitle}`}>
          {content}
        </Link>
      );
    }

    return <span className={baseClass}>{content}</span>;
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-6 pb-16 pt-28">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700 backdrop-blur">
            <Mail className="h-4 w-4 opacity-70" />
            Messages privés
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">Vos conversations</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Discussions privées en temps réel. RLS protège l&apos;accès aux conversations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/share"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-900 backdrop-blur transition-all hover:border-slate-300 hover:bg-white"
          >
            Partager un écho
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Auth gate */}
      {authLoading ? (
        <div className="mt-10 flex items-center gap-2 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement…
        </div>
      ) : !userId ? (
        <div className="mt-10 rounded-2xl border border-slate-200 bg-white/75 p-6 text-sm text-slate-700 shadow-sm backdrop-blur">
          Vous devez être connecté pour accéder à vos messages.
          <div className="mt-4">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Se connecter
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-10 grid gap-6 lg:grid-cols-[380px_1fr]">
          {/* Sidebar */}
          <ConversationList
            conversations={sortedConvs}
            loading={loadingConvs}
            selectedId={selectedId}
            onSelect={onSelectConv}
            query={q}
            onQueryChange={setQ}
            variant="page"
            unreadCounts={unreadCounts}
            onlineUserIds={onlineUserIds}
          />

          {/* Conversation */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white/75 shadow-sm backdrop-blur">
            <div className="border-b border-slate-200 p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  {selected ? <HeaderAvatar /> : null}

                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">{selected ? headerTitle : '—'}</div>

                    <div className="truncate text-xs">
                      {!selected ? (
                        <span className="text-slate-500">Sélectionnez une conversation</span>
                      ) : selected.type === 'group' ? (
                        <span className="text-slate-500">Groupe</span>
                      ) : (
                        <span className="inline-flex items-center gap-2 text-slate-500">
                          <PresenceBadge online={peerOnline} size="small" showTooltip={false} />
                          <span className={peerOnline ? 'font-medium text-emerald-600' : 'text-slate-400'}>
                            {peerOnline ? 'En ligne' : 'Hors ligne'}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onMarkRead}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 hover:border-slate-300"
                    disabled={!selectedId}
                  >
                    <Check className="h-4 w-4" />
                    Marquer comme lu
                  </button>
                </div>
              </div>
            </div>

            <div className="h-[55vh] overflow-auto p-5">
              <MessageList
                messages={messages}
                loading={loadingMsgs}
                userId={userId}
                conversationId={selectedId}
                onRetry={handleRetry}
                onReply={handleReply}
                onReactionToggle={handleReactionToggle}
                scrollRef={messagesEndRef}
                variant="page"
              />

              {/* LOT 2.6: Typing indicator */}
              <TypingIndicator typingUsers={typingUsers} currentUserId={userId} variant="page" />
            </div>

            {/* Composer */}
            <RichComposer
              conversationId={selectedId}
              userId={userId}
              replyTo={replyTo}
              replyToSenderProfile={replyToSenderProfile}
              onReplyCancel={handleReplyCancel}
              onOptimisticSend={handleOptimisticSend}
              onConfirmSent={handleConfirmSent}
              onSendFailed={handleSendFailed}
              pendingSendingCount={pendingSendingCount}
              variant="page"
              onTypingStart={startTyping}
              onTypingStop={stopTyping}
            />
          </section>
        </div>
      )}
    </main>
  );
}
