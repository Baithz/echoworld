/**
 * =============================================================================
 * Fichier      : app/messages/page.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 2.1.0 (2026-01-25)
 * Objet        : Page Messages — LOT 2 Réactions + Répondre
 * -----------------------------------------------------------------------------
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 2.1.0 (2026-01-25)
 * - [NEW] LOT 2 : State replyTo (UiMessage | null)
 * - [NEW] LOT 2 : Handler handleReply (set replyTo)
 * - [NEW] LOT 2 : Handler handleReactionToggle (optimistic + DB via toggleReaction)
 * - [NEW] LOT 2 : Fetch replyToSenderProfile (pour ReplyPreview)
 * - [KEEP] LOT 1 : Optimistic send + confirm + retry inchangés
 * 2.0.1 (2026-01-25)
 * - [FIX] ESLint react/no-unescaped-entities : apostrophe échappée (ligne 229)
 * - [FIX] TypeScript scrollRef : type RefObject<HTMLDivElement> (suppression | null)
 * =============================================================================
 */

'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Mail, ArrowRight, Loader2, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
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

export default function MessagesPage() {
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

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => convs.find((c) => c.id === selectedId) ?? null, [convs, selectedId]);

  const pendingSendingCount = useMemo(() => {
    return messages.filter((m) => m.status === 'sending').length;
  }, [messages]);

  // Auth bootstrap
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
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Load conversations
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
  };

  const onMarkRead = async () => {
    if (!selectedId) return;
    try {
      await markConversationRead(selectedId);
    } catch {
      // noop
    }
  };

  // Optimistic send
  const handleOptimisticSend = useCallback((msg: UiMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  // Confirm sent (replace optimistic by DB msg)
  const handleConfirmSent = useCallback(
    async (clientId: string, dbMsg: UiMessage) => {
      setMessages((prev) => prev.map((m) => (m.client_id === clientId ? { ...dbMsg, status: 'sent' as const } : m)));

      if (selectedId) {
        await markConversationRead(selectedId);
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

  // LOT 2 : Reactions (optimistic)
  const handleReactionToggle = useCallback(
    async (messageId: string, emoji: string) => {
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
              user_id: userId ?? '',
              emoji,
              created_at: new Date().toISOString(),
            };
            return { ...m, reactions: [...reactions, newReaction] };
          }
        })
      );

      // 2) DB call
      try {
        const result = await toggleReaction(messageId, emoji);

        // 3) Replace optimistic by real
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
            conversations={convs}
            loading={loadingConvs}
            selectedId={selectedId}
            onSelect={onSelectConv}
            query={q}
            onQueryChange={setQ}
            variant="page"
          />

          {/* Conversation */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white/75 shadow-sm backdrop-blur">
            <div className="border-b border-slate-200 p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900">
                    {selected ? selected.title ?? (selected.type === 'group' ? 'Groupe' : 'Direct') : '—'}
                  </div>
                  <div className="truncate text-xs text-slate-500">
                    {selected ? `Conversation ${selected.id.slice(0, 8)}…` : 'Sélectionnez une conversation'}
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