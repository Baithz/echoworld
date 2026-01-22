/**
 * =============================================================================
 * Fichier      : components/messages/ChatDock.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-22)
 * Objet        : ChatDock (bulle) - Conversations + messages (Client + RLS)
 * -----------------------------------------------------------------------------
 * Description  :
 * - Panel flottant bas-droite, ouverture/fermeture via RealtimeProvider
 * - Liste conversations + recherche
 * - Affichage messages + envoi
 * - Mark read (RPC) quand on charge une conversation
 * - Safe : pas de dépendance types générés, pas de any
 * =============================================================================
 */

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { X, Mail, Search, Loader2, Send, Users, User as UserIcon } from 'lucide-react';
import { useRealtime } from '@/lib/realtime/RealtimeProvider';
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
  return d.toLocaleString(undefined, { timeStyle: 'short' });
}

function safeText(text: string): string {
  const clean = (text ?? '').trim().replace(/\s+/g, ' ');
  return clean || '…';
}

export default function ChatDock() {
  const {
    userId,
    isChatDockOpen,
    closeChatDock,
    activeConversationId,
    openConversation,
    refreshCounts,
  } = useRealtime();

  const [q, setQ] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [convs, setConvs] = useState<ConversationRow[]>([]);

  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [messages, setMessages] = useState<MessageRow[]>([]);

  const [composer, setComposer] = useState('');
  const [sending, setSending] = useState(false);

  // Evite setState après close rapide
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const filteredConvs = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return convs;
    return convs.filter((c) => {
      const t = (c.title ?? '').toLowerCase();
      return t.includes(term) || c.id.toLowerCase().includes(term);
    });
  }, [convs, q]);

  const selected = useMemo(
    () => convs.find((c) => c.id === activeConversationId) ?? null,
    [convs, activeConversationId]
  );

  // Load conversations when dock opens
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!isChatDockOpen || !userId) return;

      setLoadingConvs(true);
      try {
        const rows = await fetchConversationsForUser(userId);
        if (cancelled || !mountedRef.current) return;

        setConvs(rows);

        // Auto select first if none
        if (!activeConversationId && rows.length > 0) openConversation(rows[0].id);
      } catch {
        if (!cancelled && mountedRef.current) setConvs([]);
      } finally {
        if (!cancelled && mountedRef.current) setLoadingConvs(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isChatDockOpen, userId]);

  // Load messages for selected conversation
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!isChatDockOpen || !activeConversationId) return;

      setLoadingMsgs(true);
      try {
        const rows = await fetchMessages(activeConversationId, 60);
        if (cancelled || !mountedRef.current) return;

        setMessages(rows);

        // Mark read + resync badges
        await markConversationRead(activeConversationId);
        await refreshCounts();
      } catch {
        if (!cancelled && mountedRef.current) setMessages([]);
      } finally {
        if (!cancelled && mountedRef.current) setLoadingMsgs(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [isChatDockOpen, activeConversationId, refreshCounts]);

  const onSend = async () => {
    const clean = composer.trim();
    if (!userId || !activeConversationId || !clean || sending) return;

    setSending(true);
    try {
      const msg = await sendMessage(activeConversationId, clean);
      if (!mountedRef.current) return;

      setComposer('');
      setMessages((prev) => [...prev, msg]);

      await markConversationRead(activeConversationId);
      await refreshCounts();
    } finally {
      if (mountedRef.current) setSending(false);
    }
  };

  // Hidden when closed
  if (!isChatDockOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[60] w-[380px] max-w-[92vw]">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-2xl shadow-black/15 backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white">
              <Mail className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <div className="text-sm font-extrabold text-slate-900">Chat</div>
              <div className="text-xs text-slate-500">
                {selected ? (selected.title ?? (selected.type === 'group' ? 'Groupe' : 'Direct')) : 'Conversations'}
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
          <div className="grid grid-cols-[150px_1fr]">
            {/* Sidebar convs */}
            <div className="border-r border-slate-200">
              <div className="p-2">
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5">
                  <Search className="h-4 w-4 text-slate-500" />
                  <input
                    value={q}
                    onChange={(ev) => setQ(ev.target.value)}
                    className="w-full bg-transparent text-xs text-slate-900 outline-none placeholder:text-slate-400"
                    placeholder="Rechercher…"
                    aria-label="Search conversations"
                  />
                </div>
              </div>

              <div className="max-h-[360px] overflow-auto px-2 pb-2">
                {loadingConvs ? (
                  <div className="flex items-center gap-2 p-2 text-xs text-slate-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Chargement…
                  </div>
                ) : filteredConvs.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white p-2 text-xs text-slate-600">
                    Aucune conv.
                  </div>
                ) : (
                  filteredConvs.map((c) => {
                    const isActive = c.id === activeConversationId;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => openConversation(c.id)}
                        className={`mb-2 flex w-full items-center gap-2 rounded-xl border p-2 text-left transition ${
                          isActive ? 'border-slate-200 bg-white' : 'border-transparent hover:border-slate-200 hover:bg-white'
                        }`}
                        aria-label="Open conversation"
                      >
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white">
                          {c.type === 'group' ? (
                            <Users className="h-4 w-4 text-slate-700" />
                          ) : (
                            <UserIcon className="h-4 w-4 text-slate-700" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-bold text-slate-900">
                            {c.title ?? (c.type === 'group' ? 'Groupe' : 'Direct')}
                          </span>
                          <span className="block truncate text-[11px] text-slate-500">
                            {c.id.slice(0, 6)}…
                          </span>
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex flex-col">
              <div className="h-[320px] overflow-auto p-3">
                {!activeConversationId ? (
                  <div className="text-xs text-slate-600">Sélectionne une conversation.</div>
                ) : loadingMsgs ? (
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Chargement…
                  </div>
                ) : messages.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white p-2 text-xs text-slate-600">
                    Aucun message.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {messages.map((m) => {
                      const mine = m.sender_id === userId;
                      return (
                        <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[85%] rounded-2xl border px-3 py-2 text-xs shadow-sm ${
                              mine
                                ? 'border-slate-900 bg-slate-900 text-white'
                                : 'border-slate-200 bg-white text-slate-900'
                            }`}
                          >
                            <div className="whitespace-pre-wrap">{safeText(m.content)}</div>
                            <div className={`mt-1 text-[10px] ${mine ? 'text-white/70' : 'text-slate-500'}`}>
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
              <div className="border-t border-slate-200 p-3">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2 py-1.5">
                  <input
                    value={composer}
                    onChange={(ev) => setComposer(ev.target.value)}
                    onKeyDown={(ev) => {
                      if (ev.key === 'Enter' && !ev.shiftKey) {
                        ev.preventDefault();
                        void onSend();
                      }
                    }}
                    className="w-full bg-transparent text-xs text-slate-900 outline-none placeholder:text-slate-400"
                    placeholder={activeConversationId ? 'Écrire…' : 'Sélectionne une conv…'}
                    aria-label="Write a message"
                    disabled={!activeConversationId || sending}
                  />

                  <button
                    type="button"
                    onClick={() => void onSend()}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition-opacity disabled:opacity-50"
                    disabled={!activeConversationId || sending || !composer.trim()}
                    aria-label="Send message"
                  >
                    <Send className="h-4 w-4" />
                    Envoyer
                  </button>
                </div>
                <div className="mt-1 text-[11px] text-slate-500">Entrée = envoyer • Shift+Entrée = ligne</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
