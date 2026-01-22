/**
 * =============================================================================
 * Fichier      : app/messages/page.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.1.0 (2026-01-22)
 * Objet        : Page Messages - Liste conversations + messages (Client + RLS)
 * -----------------------------------------------------------------------------
 * Description  :
 * - Client component: auth browser + fetch conversations/messages via lib/messages
 * - UI premium + loading + empty states
 * - Sélection conversation -> affiche messages + envoi (sendMessage)
 * - Mark read (markConversationRead)
 * - Prépare ChatDock (bulle) : l’état (selectedConversationId) sera réutilisable
 * =============================================================================
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Mail,
  Search,
  ArrowRight,
  Users,
  User as UserIcon,
  Loader2,
  Check,
  Send,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import {
  fetchConversationsForUser,
  fetchMessages,
  markConversationRead,
  sendMessage,
  type ConversationRow,
  type MessageRow,
} from '@/lib/messages';

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function safePreview(text: string): string {
  const clean = (text ?? '').trim().replace(/\s+/g, ' ');
  return clean || '…';
}

export default function MessagesPage() {
  const [authLoading, setAuthLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [q, setQ] = useState('');

  const [loadingConvs, setLoadingConvs] = useState(false);
  const [convs, setConvs] = useState<ConversationRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [messages, setMessages] = useState<MessageRow[]>([]);

  const [composer, setComposer] = useState('');
  const [sending, setSending] = useState(false);

  const filteredConvs = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return convs;
    return convs.filter((c) => {
      const t = (c.title ?? '').toLowerCase();
      return t.includes(term) || c.id.toLowerCase().includes(term);
    });
  }, [convs, q]);

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

    load();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      setConvs([]);
      setSelectedId(null);
      setMessages([]);
      setComposer('');
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
        const rows = await fetchConversationsForUser(userId);
        if (!mounted) return;
        setConvs(rows);

        // Auto-select first if none selected
        if (!selectedId && rows.length > 0) setSelectedId(rows[0].id);
      } catch {
        // Silent fail: keep UI stable
        if (mounted) setConvs([]);
      } finally {
        if (mounted) setLoadingConvs(false);
      }
    };

    run();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Load messages for selected conversation
  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (!selectedId) return;
      setLoadingMsgs(true);
      try {
        const rows = await fetchMessages(selectedId, 80);
        if (!mounted) return;
        setMessages(rows);
        // Mark read after load
        await markConversationRead(selectedId);
      } catch {
        if (mounted) setMessages([]);
      } finally {
        if (mounted) setLoadingMsgs(false);
      }
    };

    run();

    return () => {
      mounted = false;
    };
  }, [selectedId]);

  const selected = useMemo(
    () => convs.find((c) => c.id === selectedId) ?? null,
    [convs, selectedId]
  );

  const onSelectConv = async (id: string) => {
    setSelectedId(id);
  };

  const onMarkRead = async () => {
    if (!selectedId) return;
    try {
      await markConversationRead(selectedId);
    } catch {
      // noop
    }
  };

  const onSend = async () => {
    const clean = composer.trim();
    if (!selectedId || !clean || sending) return;

    setSending(true);
    try {
      const msg = await sendMessage(selectedId, clean);
      setComposer('');
      setMessages((prev) => [...prev, msg]);
      await markConversationRead(selectedId);
    } finally {
      setSending(false);
    }
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
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
            Vos conversations
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Discussions privées en temps réel. RLS protège l’accès aux conversations.
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
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white/75 shadow-sm backdrop-blur">
            <div className="border-b border-slate-200 p-4">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                <Search className="h-4 w-4 text-slate-500" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  placeholder="Rechercher…"
                  aria-label="Search conversations"
                />
              </div>
            </div>

            <div className="max-h-[65vh] overflow-auto p-2">
              {loadingConvs ? (
                <div className="flex items-center gap-2 p-3 text-sm text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Chargement des conversations…
                </div>
              ) : filteredConvs.length === 0 ? (
                <div className="m-2 rounded-xl border border-dashed border-slate-200 bg-white/60 p-4 text-sm text-slate-600">
                  Aucune conversation pour le moment.
                </div>
              ) : (
                filteredConvs.map((c) => {
                  const isActive = c.id === selectedId;
                  const title = c.title ?? (c.type === 'group' ? 'Groupe' : 'Direct');

                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onSelectConv(c.id)}
                      className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${
                        isActive
                          ? 'border border-slate-200 bg-white'
                          : 'border border-transparent hover:border-slate-200 hover:bg-white'
                      }`}
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white">
                        {c.type === 'group' ? (
                          <Users className="h-5 w-5 text-slate-700" />
                        ) : (
                          <UserIcon className="h-5 w-5 text-slate-700" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold text-slate-900">{title}</div>
                        <div className="truncate text-xs text-slate-600">#{c.id.slice(0, 8)}</div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>

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
              {!selectedId ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <Mail className="h-7 w-7 text-slate-900" />
                  </div>
                  <h2 className="mt-4 text-lg font-extrabold text-slate-900">
                    Sélectionnez une conversation
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">Les messages s’afficheront ici.</p>
                </div>
              ) : loadingMsgs ? (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Chargement des messages…
                </div>
              ) : messages.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white/60 p-4 text-sm text-slate-600">
                  Aucun message dans cette conversation.
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((m) => {
                    const mine = m.sender_id === userId;
                    return (
                      <div
                        key={m.id}
                        className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl border px-4 py-3 text-sm shadow-sm ${
                            mine
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-200 bg-white text-slate-900'
                          }`}
                        >
                          <div className="whitespace-pre-wrap">{safePreview(m.content)}</div>
                          <div
                            className={`mt-2 text-[11px] ${
                              mine ? 'text-white/70' : 'text-slate-500'
                            }`}
                          >
                            {formatTime(m.created_at)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Composer */}
            <div className="border-t border-slate-200 p-4">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
                <input
                  value={composer}
                  onChange={(e) => setComposer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void onSend();
                    }
                  }}
                  className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  placeholder={selectedId ? 'Écrire un message…' : 'Sélectionnez une conversation…'}
                  aria-label="Write a message"
                  disabled={!selectedId || sending}
                />
                <button
                  type="button"
                  onClick={() => void onSend()}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
                  disabled={!selectedId || sending || !composer.trim()}
                >
                  <Send className="h-4 w-4" />
                  Envoyer
                </button>
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Entrée = envoyer • Shift+Entrée = nouvelle ligne
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
