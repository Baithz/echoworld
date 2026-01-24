/**
 * =============================================================================
 * Fichier      : components/echo/CommentsModal.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.2.3 (2026-01-24)
 * Objet        : Modale Commentaires (PHASE 3) — lecture + ajout + realtime SAFE
 * -----------------------------------------------------------------------------
 * Description  :
 * - Lecture + ajout commentaires
 * - Realtime = signal léger (PAS d’injection de payload brut)
 * - Typage strict EchoComment (aucun cast métier)
 * - PHASE 3bis: compteur géré par le parent (incrément local uniquement)
 *
 * FIX v1.2.3 (PHASE 3bis) :
 * - [FIX] Realtime "skip self" aligne sur echo_responses.user_id (pas author_id)
 * - [FIX] Évite double incrément : realtime => refresh liste ONLY (pas de onCommentInserted)
 * - [KEEP] submit => optimistic onCommentInserted + refresh liste (UX)
 * =============================================================================
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { fetchComments, insertComment, type EchoComment } from '@/lib/echo/comments';
import { subscribeEchoComments, type CommentInsertPayload } from '@/lib/echo/commentsRealtime';

function formatDateTimeFR(iso: string): string {
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function safeInitials(input: string): string {
  const s = (input || '').trim();
  if (!s) return 'EW';
  return s
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

function obfuscateId(id: string): string {
  return id ? `Echoer-${id.slice(0, 4)}` : 'Echoer';
}

export default function CommentsModal({
  open,
  echoId,
  userId,
  canPost,
  initialCount = 0,
  onClose,
  onCommentInserted,
}: {
  open: boolean;
  echoId: string;
  userId: string | null;
  canPost: boolean;
  initialCount?: number;
  onClose: () => void;
  onCommentInserted?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<EchoComment[]>([]);
  const [text, setText] = useState('');
  const [busySend, setBusySend] = useState(false);

  const refreshLock = useRef(false);

  // PHASE 3bis: évite les closures périmées dans le callback realtime
  const userIdRef = useRef<string | null>(userId);
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  // affichage passif uniquement (le parent détient le compteur)
  const count = useMemo(() => initialCount, [initialCount]);

  const loadComments = useCallback(async () => {
    if (refreshLock.current) return;
    refreshLock.current = true;

    try {
      const res = await fetchComments({ echoId, limit: 80, offset: 0 });
      if (!res.ok) return;
      setItems(res.comments);
    } finally {
      refreshLock.current = false;
    }
  }, [echoId]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    loadComments().finally(() => setLoading(false));
  }, [open, loadComments]);

  /**
   * PHASE 3bis — Realtime
   * - refresh liste uniquement (UX)
   * - IMPORTANT: pas d’incrément ici (évite double incrément quand c’est nous qui postons)
   * - "skip self" : si payload.user_id === userId => on ignore (submit fait déjà refresh + optimistic)
   */
  useEffect(() => {
    if (!open || !echoId) return;

    const unsubscribe = subscribeEchoComments(echoId, (p?: CommentInsertPayload) => {
      const me = userIdRef.current;
      if (me && p?.user_id && p.user_id === me) return; // skip self (echo_responses.user_id)
      void loadComments();
    });

    return unsubscribe;
  }, [open, echoId, loadComments]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submit = async () => {
    if (!userId || !canPost || !text.trim()) return;

    setBusySend(true);
    try {
      const res = await insertComment({ echoId, userId, content: text.trim() });
      if (!res.ok) return;

      setText('');

      // PHASE 3bis: signal unique côté parent (optimistic)
      onCommentInserted?.();

      // UX: refresh liste (et realtime sera "skip self")
      await loadComments();
    } finally {
      setBusySend(false);
    }
  };

  return (
    <div className="fixed inset-0 z-80">
      <div className="absolute inset-0 bg-black/55" onClick={onClose} />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
          <div className="flex justify-between border-b px-6 py-4">
            <div>
              <div className="text-sm font-semibold">Commentaires</div>
              <div className="text-xs text-slate-500">{count} au total</div>
            </div>
            <button onClick={onClose} className="text-xs font-semibold">
              Fermer
            </button>
          </div>

          <div className="max-h-[60vh] space-y-3 overflow-auto px-6 py-4">
            {loading ? (
              <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
            ) : items.length === 0 ? (
              <div className="text-sm text-slate-600">Aucun commentaire.</div>
            ) : (
              items.map((c) => {
                const author = c.author;
                const anonymous = author?.identity_mode === 'anonymous';
                const name = anonymous ? 'Anonymous' : author?.handle || author?.display_name || obfuscateId(c.user_id);

                return (
                  <div key={c.id} className="rounded-xl border p-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-xs font-bold">
                        {author?.avatar_url && !anonymous ? (
                          <Image
                            src={author.avatar_url}
                            alt={`Avatar de ${name}`}
                            width={32}
                            height={32}
                            className="rounded-full object-cover"
                          />
                        ) : (
                          safeInitials(name)
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{name}</div>
                        <div className="text-xs text-slate-500">{formatDateTimeFR(c.created_at)}</div>
                      </div>
                    </div>
                    <div className="mt-3 whitespace-pre-wrap text-sm">{c.content}</div>
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t px-6 py-4">
            {!userId ? (
              <Link href="/login" className="text-sm font-semibold text-slate-900">
                Se connecter pour commenter
              </Link>
            ) : (
              <>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={3}
                  maxLength={500}
                  disabled={!canPost || busySend}
                  className="w-full rounded-xl border p-3 text-sm"
                />
                <div className="mt-2 flex justify-between">
                  <span className="text-xs text-slate-500">{text.length}/500</span>
                  <button
                    onClick={submit}
                    disabled={!text.trim() || busySend}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white"
                  >
                    {busySend ? 'Envoi…' : 'Envoyer'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
