/**
 * =============================================================================
 * Fichier      : app/messages/page.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 2.4.0 (2026-01-25)
 * Objet        : Page Messages — Live messages + LOT 2 Réactions + Répondre + Header avatar/presence
 * -----------------------------------------------------------------------------
 * Description  :
 * - Page conversations (sidebar + thread) avec optimistic send / retry / reply / reactions
 * - Live : push des messages entrants via RealtimeProvider.onNewMessage (sans refresh)
 * - Badges : unreadCounts fail-soft + tri par dernier message
 * - SAFE : aucune régression UX (mark read, retry, reply, reactions conservés)
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 2.4.0 (2026-01-25)
 * - [NEW] Live: écoute onNewMessage() et injecte les messages entrants dans l’UI (sans refresh)
 * - [KEEP] LOT 2 : reply/reactions/optimistic/retry inchangés
 * - [KEEP] Sidebar : unreadCounts + tri last message conservés
 * - [SAFE] Dedupe anti-doublon (id) + update lastMsgByConv + clear badge si conv active
 * 2.3.0 (2026-01-25)
 * - [NEW] Header conversation : avatar (peer) + lien profil /u/[handle] (DM uniquement)
 * - [NEW] Header conversation : remplace "Direct" par "En ligne/Hors ligne" + point (fail-soft)
 * - [NEW] Sidebar : passe onlineUserIds à ConversationList (présence list)
 * - [KEEP] 2.2.0 : unreadCounts + tri last message + UX header (pas de #id) conservés
 * - [KEEP] LOT 2 : reply/reactions/optimistic/retry inchangés
 * - [SAFE] Sans dépendance DB obligatoire : onlineUserIds reste vide => tout "Hors ligne"
 * =============================================================================
 */

'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Mail, ArrowRight, Loader2, Check, Users as UsersIcon, User as UserIcon } from 'lucide-react';
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
import ConversationList from '@/components/messages/ConversationList';
import MessageList from '@/components/messages/MessageList';
import Composer from '@/components/messages/Composer';
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

  // Online presence (fail-soft). Pour l’instant: vide => tout "Hors ligne".
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => convs.find((c) => c.id === selectedId) ?? null, [convs, selectedId]);

  const pendingSendingCount = useMemo(() => {
    return messages.filter((m) => m.status === 'sending').length;
  }, [messages]);

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
      setOnlineUserIds([]);
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
      const rec = p.record;
      const convId = rec.conversation_id;

      // 1) Always refresh ordering key (sidebar tri)
      setLastMsgByConv((prev) => ({ ...prev, [convId]: rec.created_at }));

      // 2) If the user is currently viewing this conversation => append + clear badge
      if (selectedId && selectedId === convId) {
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

        // Fail-soft: on marque lu en DB (pas bloquant)
        void markConversationRead(convId).catch(() => {});
        return;
      }

      // 3) Otherwise => bump local unread badge (fail-soft)
      setUnreadCounts((prev) => ({ ...prev, [convId]: (prev[convId] ?? 0) + 1 }));
    });

    return unsubscribe;
  }, [userId, selectedId, onNewMessage]);

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

        if (!selectedId && rows.length > 0) setSelectedId(rows[0].id);
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
  }, [userId, selectedId]);

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

        setLastMsgByConv(map);
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

        if (!cancelled) setUnreadCounts(counts);
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

  // Load messages for selected conversation
  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (!selectedId) return;
      setLoadingMsgs(true);
      try {
        const rows = await fetchMessages(selectedId, 80);
        if (!mounted) return;

        const uiMsgs: UiMessage[] = rows.map((r) => ({
          ...r,
          status: 'sent' as const,
        }));

        setMessages(uiMsgs);

        await markConversationRead(selectedId);

        setUnreadCounts((prev) => {
          const next = { ...prev };
          next[selectedId] = 0;
          return next;
        });
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
  }, [selectedId]);

  const onSelectConv = (id: string) => {
    setSelectedId(id);
    setReplyTo(null);
    setReplyToSenderProfile(null);

    setUnreadCounts((prev) => {
      const next = { ...prev };
      next[id] = 0;
      return next;
    });
  };

  const onMarkRead = async () => {
    if (!selectedId) return;
    try {
      await markConversationRead(selectedId);
      setUnreadCounts((prev) => {
        const next = { ...prev };
        next[selectedId] = 0;
        return next;
      });
    } catch {
      // noop
    }
  };

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

      if (selectedId) {
        await markConversationRead(selectedId);
        setUnreadCounts((prev) => {
          const next = { ...prev };
          next[selectedId] = 0;
          return next;
        });
      }
    },
    [selectedId]
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

      try {
        const dbMsg = await sendMessage(selectedId, msg.content, { client_id: msg.client_id });
        handleConfirmSent(msg.client_id, dbMsg as UiMessage);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Erreur d'envoi";
        handleSendFailed(msg.client_id, errMsg);
      }
    },
    [selectedId, handleConfirmSent, handleSendFailed]
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
    return dn || (h ? (h.startsWith('@') ? h : `@${h}`) : (selected.title ?? 'Direct'));
  }, [selected]);

  // Header avatar/presence
  const headerIsGroup = !!selected && selected.type === 'group';
  const headerHandle = !headerIsGroup ? normalizeHandleForHref(selected?.peer_handle ?? null) : null;
  const headerProfileHref = headerHandle ? `/u/${headerHandle}` : null;
  const headerAvatarUrl = !headerIsGroup ? (selected?.peer_avatar_url ?? null) : null;
  const headerPeerUserId = !headerIsGroup ? (selected?.peer_user_id ?? null) : null;

  const headerOnline = useMemo(() => {
    const pid = String(headerPeerUserId ?? '').trim();
    if (!pid) return false;
    return onlineUserIds.includes(pid);
  }, [headerPeerUserId, onlineUserIds]);

  const HeaderAvatar = () => {
    const baseClass = 'flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white';

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

                    <div className="truncate text-xs text-slate-500">
                      {!selected ? (
                        'Sélectionnez une conversation'
                      ) : selected.type === 'group' ? (
                        'Groupe'
                      ) : (
                        <span className="inline-flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${headerOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                          {headerOnline ? 'En ligne' : 'Hors ligne'}
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
            </div>

            {/* Composer */}
            <Composer
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
            />
          </section>
        </div>
      )}
    </main>
  );
}
