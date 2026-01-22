/**
 * =============================================================================
 * Fichier      : components/echo/EchoFeed.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.1.1 (2026-01-22)
 * Objet        : Flux d'échos (profil) — UI premium + micro-interactions + toast
 * -----------------------------------------------------------------------------
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.1.1 (2026-01-22)
 * - [FIX] Imports stables (EchoItem/actions) + toast TS-proof (narrowing)
 * - [NO-REGRESSION] UI 1.1.0 conservée
 * =============================================================================
 */

'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Heart, Share2, Sparkles } from 'lucide-react';
import EchoItem from '@/components/echo/EchoItem';
import { fetchLikeMeta, shareEcho, toggleEchoLike } from '@/lib/echo/actions';

export type EchoRow = {
  id: string;
  title: string | null;
  content: string;
  emotion: string | null;
  language: string | null;
  country: string | null;
  city: string | null;
  is_anonymous: boolean | null;
  visibility: 'world' | 'local' | 'private' | 'semi_anonymous' | null;
  status: 'draft' | 'published' | 'archived' | 'deleted' | null;
  created_at: string;
};

function formatDateFR(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: '2-digit' });
  } catch {
    return iso;
  }
}

type ToastKind = 'ok' | 'error';
type ToastState = { kind: ToastKind; message: string } | null;

export default function EchoFeed({
  loading,
  echoes,
  userId,
  onOpenEcho,
}: {
  loading: boolean;
  echoes: EchoRow[];
  userId: string | null;
  onOpenEcho: (id: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Like meta
  const [likeCountById, setLikeCountById] = useState<Record<string, number>>({});
  const [likedByMe, setLikedByMe] = useState<Record<string, boolean>>({});

  // UI states
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [busyLikeId, setBusyLikeId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const toastTimer = useRef<number | null>(null);
  const copiedTimer = useRef<number | null>(null);

  const hasEchoes = (echoes?.length ?? 0) > 0;

  const hero = useMemo(() => {
    if (!hasEchoes) return null;
    const first = echoes[0];
    return {
      title: first.title?.trim() ? first.title : 'Un écho récent',
      date: formatDateFR(first.created_at),
      excerpt: first.content,
      id: first.id,
    };
  }, [echoes, hasEchoes]);

  const showToast = (kind: ToastKind, message: string) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast({ kind, message });
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  };

  const setCopied = (id: string) => {
    if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
    setCopiedId(id);
    copiedTimer.current = window.setTimeout(() => setCopiedId(null), 1400);
  };

  const onToggleExpand = (id: string) => {
    setExpandedId((cur) => (cur === id ? null : id));
  };

  // ✅ Load like meta (counts + likedByMe) — SAFE si table pas encore créée
  useEffect(() => {
    let mounted = true;

    const loadMeta = async () => {
      if (!hasEchoes) return;
      const ids = echoes.map((e) => e.id);

      const res = await fetchLikeMeta({ echoIds: ids, userId });
      if (!mounted) return;

      if (!res.ok) return; // non bloquant

      setLikeCountById(res.countById);
      setLikedByMe(res.likedByMeById);
    };

    loadMeta();

    return () => {
      mounted = false;
    };
  }, [echoes, hasEchoes, userId]);

  const onLike = async (echoId: string) => {
    if (!userId) {
      showToast('error', 'Connecte-toi pour aimer un écho.');
      return;
    }
    if (busyLikeId) return;

    const was = !!likedByMe[echoId];
    const next = !was;

    // optimistic
    setBusyLikeId(echoId);
    setLikedByMe((s) => ({ ...s, [echoId]: next }));
    setLikeCountById((s) => ({ ...s, [echoId]: Math.max(0, (s[echoId] ?? 0) + (next ? 1 : -1)) }));

    const res = await toggleEchoLike({ echoId, userId, nextLiked: next });

    if (!res.ok) {
      // revert
      setLikedByMe((s) => ({ ...s, [echoId]: was }));
      setLikeCountById((s) => ({ ...s, [echoId]: Math.max(0, (s[echoId] ?? 0) + (was ? 1 : -1)) }));
      showToast('error', res.error ?? 'Erreur lors du like.');
      setBusyLikeId(null);
      return;
    }

    showToast('ok', next ? 'Aimé.' : 'Retiré.');
    setBusyLikeId(null);
  };

  const onShare = async (echoId: string) => {
    const res = await shareEcho({ echoId });
    if (!res.ok) {
      showToast('error', res.error ?? 'Impossible de partager.');
      return;
    }

    if (res.mode === 'clipboard') {
      setCopied(echoId);
      showToast('ok', 'Lien copié.');
      return;
    }

    showToast('ok', 'Partage prêt.');
  };

  // ✅ Toast TS-proof (narrow explicite)
  const toastKind = toast?.kind ?? null;
  const toastMessage = toast?.message ?? '';

  return (
    <div className="relative">
      {/* Toast local */}
      {toastKind ? (
        <div className="fixed right-6 top-24 z-50">
          <div
            className={`rounded-2xl border px-4 py-3 text-sm font-semibold shadow-xl backdrop-blur-md transition-all ${
              toastKind === 'ok'
                ? 'border-emerald-200 bg-emerald-50/90 text-emerald-900'
                : 'border-rose-200 bg-rose-50/90 text-rose-900'
            }`}
          >
            {toastMessage}
          </div>
        </div>
      ) : null}

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Derniers échos</h2>
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              interactif
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">Un flux vivant : lire ici, aimer, partager — sans quitter la page.</p>
        </div>

        <Link
          href="/share"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.01]"
        >
          Partager un écho
        </Link>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="h-44 animate-pulse rounded-3xl border border-slate-200 bg-white/70" />
          <div className="h-44 animate-pulse rounded-3xl border border-slate-200 bg-white/70" />
        </div>
      ) : echoes.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white/70 p-8 text-center backdrop-blur-md">
          <div className="text-lg font-semibold text-slate-700">Aucun écho pour l’instant.</div>
          <p className="mt-2 text-sm text-slate-600">Ton flux apparaîtra ici dès ton premier partage.</p>
          <Link
            href="/share"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.01]"
          >
            Créer mon premier écho
          </Link>
        </div>
      ) : (
        <>
          {/* Hero */}
          {hero ? (
            <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white/65 backdrop-blur-md shadow-lg shadow-black/5">
              <div className="relative p-6 sm:p-7">
                <div className="absolute inset-0 bg-linear-to-br from-violet-500/10 via-sky-500/10 to-emerald-500/10" />
                <div className="relative">
                  <div className="text-xs font-semibold text-slate-600">{hero.date}</div>
                  <div className="mt-2 text-lg font-bold text-slate-900">{hero.title}</div>
                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-700">{hero.excerpt}</p>

                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onToggleExpand(hero.id)}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.01] hover:bg-slate-800 active:scale-[0.99]"
                    >
                      {expandedId === hero.id ? 'Réduire' : 'Lire ici'}
                    </button>

                    <button
                      type="button"
                      onClick={() => onLike(hero.id)}
                      disabled={busyLikeId === hero.id}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-transform hover:scale-[1.01] hover:bg-slate-50 active:scale-[0.99] disabled:opacity-60"
                      title="J’aime"
                    >
                      <Heart className={`h-4 w-4 ${likedByMe[hero.id] ? 'fill-rose-500 text-rose-500' : ''}`} />
                      {likeCountById[hero.id] ? `${likeCountById[hero.id]} ` : ''}
                      J’aime
                    </button>

                    <button
                      type="button"
                      onClick={() => onShare(hero.id)}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-transform hover:scale-[1.01] hover:bg-slate-50 active:scale-[0.99]"
                      title="Partager"
                    >
                      <Share2 className="h-4 w-4" />
                      {copiedId === hero.id ? 'Copié' : 'Partager'}
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenEcho(hero.id)}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-transform hover:scale-[1.01] hover:bg-slate-50 active:scale-[0.99]"
                      title="Ouvrir la page"
                    >
                      Ouvrir
                    </button>
                  </div>

                  {/* Expand animé (grid trick) */}
                  <div
                    className={`mt-5 grid transition-all duration-300 ease-out ${
                      expandedId === hero.id ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/70 p-5 text-sm leading-relaxed text-slate-800">
                      {echoes.find((x) => x.id === hero.id)?.content}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* Feed */}
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {echoes.map((e) => (
              <EchoItem
                key={e.id}
                echo={e}
                expanded={expandedId === e.id}
                liked={!!likedByMe[e.id]}
                likeCount={likeCountById[e.id] ?? 0}
                copied={copiedId === e.id}
                likeBusy={busyLikeId === e.id}
                onToggleExpand={() => onToggleExpand(e.id)}
                onLike={() => onLike(e.id)}
                onShare={() => onShare(e.id)}
                onOpen={() => onOpenEcho(e.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
