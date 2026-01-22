/**
 * =============================================================================
 * Fichier      : components/echo/EchoFeed.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.2.1 (2026-01-22)
 * Objet        : Flux d'échos — branche EchoItem (media + resonances + mirror + DM)
 * -----------------------------------------------------------------------------
 * FIX v1.2.1
 * - [FIX] JSX cassé (balises fermantes manquantes)
 * - [FIX] e.titl -> e.title
 * - [FIX] Adaptation actions.ts v1.4.0 (res.data.*)
 * - [SAFE] UI/UX existante conservée
 * =============================================================================
 */

'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Heart, Share2, Sparkles } from 'lucide-react';
import EchoItem from '@/components/echo/EchoItem';
import {
  fetchEchoMediaMeta,
  fetchLikeMeta,
  fetchResonanceMeta,
  sendEchoMirror,
  shareEcho,
  toggleEchoLike,
  toggleEchoResonance,
  type ResonanceType,
} from '@/lib/echo/actions';
import { startDirectConversation } from '@/lib/messages/startDirectConversation';

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

  // SAFE: si dispo côté query (sinon undefined)
  user_id?: string | null;
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
  onOpenConversation,
}: {
  loading: boolean;
  echoes: EchoRow[];
  userId: string | null;
  onOpenEcho: (id: string) => void;
  onOpenConversation?: (conversationId: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Like meta
  const [likeCountById, setLikeCountById] = useState<Record<string, number>>({});
  const [likedByMe, setLikedByMe] = useState<Record<string, boolean>>({});

  // Media meta
  const [mediaById, setMediaById] = useState<Record<string, string[]>>({});

  // Resonance meta
  const [resCountsByEcho, setResCountsByEcho] = useState<Record<string, Record<ResonanceType, number>>>({});
  const [resByMeByEcho, setResByMeByEcho] = useState<Record<string, Record<ResonanceType, boolean>>>({});

  // UI states
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [busyLikeId, setBusyLikeId] = useState<string | null>(null);
  const [busyResKey, setBusyResKey] = useState<string | null>(null);
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

  // Load like meta
  useEffect(() => {
    let mounted = true;

    const loadMeta = async () => {
      if (!hasEchoes) return;
      const ids = echoes.map((e) => e.id);

      const res = await fetchLikeMeta({ echoIds: ids, userId });
      if (!mounted) return;
      if (!res.ok) return;

      setLikeCountById(res.countById);
      setLikedByMe(res.likedByMeById);
    };

    loadMeta();

    return () => {
      mounted = false;
    };
  }, [echoes, hasEchoes, userId]);

  // Load media meta
  useEffect(() => {
    let mounted = true;

    const loadMedia = async () => {
      if (!hasEchoes) return;
      const ids = echoes.map((e) => e.id);

      const res = await fetchEchoMediaMeta({ echoIds: ids });
      if (!mounted) return;
      if (!res.ok) return;

      setMediaById(res.mediaById);
    };

    loadMedia();

    return () => {
      mounted = false;
    };
  }, [echoes, hasEchoes]);

  // Load resonance meta
  useEffect(() => {
    let mounted = true;

    const loadRes = async () => {
      if (!hasEchoes) return;
      const ids = echoes.map((e) => e.id);

      const res = await fetchResonanceMeta({ echoIds: ids, userId });
      if (!mounted) return;
      if (!res.ok) return;

      setResCountsByEcho(res.countsByEcho);
      setResByMeByEcho(res.byMeByEcho);
    };

    loadRes();

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

  const onResonance = async (echoId: string, type: ResonanceType) => {
    if (!userId) {
      showToast('error', 'Connecte-toi pour réagir.');
      return;
    }

    const key = `${echoId}:${type}`;
    if (busyResKey) return;

    const was = !!resByMeByEcho[echoId]?.[type];
    const next = !was;

    // optimistic
    setBusyResKey(key);

    setResByMeByEcho((s) => ({
      ...s,
      [echoId]: {
        i_feel_you: s[echoId]?.i_feel_you ?? false,
        i_support_you: s[echoId]?.i_support_you ?? false,
        i_reflect_with_you: s[echoId]?.i_reflect_with_you ?? false,
        [type]: next,
      },
    }));

    setResCountsByEcho((s) => ({
      ...s,
      [echoId]: {
        i_feel_you: s[echoId]?.i_feel_you ?? 0,
        i_support_you: s[echoId]?.i_support_you ?? 0,
        i_reflect_with_you: s[echoId]?.i_reflect_with_you ?? 0,
        [type]: Math.max(0, (s[echoId]?.[type] ?? 0) + (next ? 1 : -1)),
      },
    }));

    const res = await toggleEchoResonance({ echoId, userId, type, nextOn: next });

    if (!res.ok) {
      setResByMeByEcho((s) => ({
        ...s,
        [echoId]: {
          i_feel_you: s[echoId]?.i_feel_you ?? false,
          i_support_you: s[echoId]?.i_support_you ?? false,
          i_reflect_with_you: s[echoId]?.i_reflect_with_you ?? false,
          [type]: was,
        },
      }));

      setResCountsByEcho((s) => ({
        ...s,
        [echoId]: {
          i_feel_you: s[echoId]?.i_feel_you ?? 0,
          i_support_you: s[echoId]?.i_support_you ?? 0,
          i_reflect_with_you: s[echoId]?.i_reflect_with_you ?? 0,
          [type]: Math.max(0, (s[echoId]?.[type] ?? 0) + (was ? 1 : -1)),
        },
      }));

      showToast('error', res.error ?? 'Erreur réaction.');
      setBusyResKey(null);
      return;
    }

    showToast('ok', next ? 'Réaction ajoutée.' : 'Réaction retirée.');
    setBusyResKey(null);
  };

  const onMirror = async (echoId: string, toUserId: string, message: string) => {
    if (!userId) {
      showToast('error', 'Connecte-toi pour envoyer un mirror.');
      return;
    }
    if (!toUserId) {
      showToast('error', 'Auteur indisponible.');
      return;
    }

    const res = await sendEchoMirror({ fromUserId: userId, toUserId, echoId, content: message });
    if (!res.ok) {
      showToast('error', res.error ?? 'Erreur mirror.');
      return;
    }
    showToast('ok', 'Mirror envoyé.');
  };

  const onMessage = async (toUserId: string) => {
    if (!userId) {
      showToast('error', 'Connecte-toi pour envoyer un message.');
      return;
    }

    const res = await startDirectConversation({ userId, otherUserId: toUserId });
    if (!res.ok) {
      showToast('error', res.error ?? 'Impossible de démarrer la conversation.');
      return;
    }

    const conversationId = res.data.conversationId;

    if (onOpenConversation) {
      onOpenConversation(conversationId);
      showToast('ok', 'Conversation ouverte.');
      return;
    }

    showToast('ok', 'Conversation prête (dock non branché ici).');
  };

  const toastKind = toast?.kind ?? null;
  const toastMessage = toast?.message ?? '';

  return (
    <div className="relative">
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Derniers échos</h2>
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              interactif
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">Lire, réagir, mirror, message — sans quitter la page.</p>
        </div>

        <Link
          href="/share"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.01]"
        >
          Partager un écho
        </Link>
      </div>

      {loading ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="h-44 animate-pulse rounded-3xl border border-slate-200 bg-white/70" />
          <div className="h-44 animate-pulse rounded-3xl border border-slate-200 bg-white/70" />
        </div>
      ) : null}

      {!loading && !hasEchoes ? (
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white/70 p-6 text-sm text-slate-700">
          Aucun écho pour le moment.
        </div>
      ) : null}

      {!loading && hasEchoes ? (
        <>
          {hero ? (
            <div className="mt-6 rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-lg shadow-black/5 backdrop-blur-md">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-500">{hero.date}</div>
                  <div className="mt-1 text-lg font-bold text-slate-900">{hero.title}</div>
                  <div className="mt-2 line-clamp-3 text-sm text-slate-700">{hero.excerpt}</div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onLike(hero.id)}
                    disabled={!!busyLikeId}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Heart className={`h-4 w-4 ${likedByMe[hero.id] ? 'fill-rose-500 text-rose-500' : ''}`} />
                    {likeCountById[hero.id] ? `${likeCountById[hero.id]} ` : ''}
                    Aimer
                  </button>

                  <button
                    type="button"
                    onClick={() => onShare(hero.id)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                  >
                    <Share2 className="h-4 w-4" />
                    {copiedId === hero.id ? 'Copié' : 'Partager'}
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenEcho(hero.id)}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg"
                  >
                    Ouvrir
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {echoes.map((e) => (
              <EchoItem
                key={e.id}
                echo={e}
                dateLabel={formatDateFR(e.created_at)}
                expanded={expandedId === e.id}
                onToggleExpand={onToggleExpand}
                liked={!!likedByMe[e.id]}
                likeCount={likeCountById[e.id] ?? 0}
                onLike={onLike}
                media={mediaById[e.id] ?? []}
                resCounts={resCountsByEcho[e.id] ?? { i_feel_you: 0, i_support_you: 0, i_reflect_with_you: 0 }}
                resByMe={resByMeByEcho[e.id] ?? { i_feel_you: false, i_support_you: false, i_reflect_with_you: false }}
                onResonance={onResonance}
                onMirror={onMirror}
                onMessage={onMessage}
                onOpenEcho={onOpenEcho}
                onShare={onShare}
                copied={copiedId === e.id}
                busyLike={busyLikeId === e.id}
                busyResKey={busyResKey}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
