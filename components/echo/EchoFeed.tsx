/**
 * =============================================================================
 * Fichier      : components/echo/EchoFeed.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.8.0 (2026-01-24)
 * Objet        : Flux d'échos — branche EchoItem (media + reactions + mirror + DM + commentaires) — PHASE 5
 * -----------------------------------------------------------------------------
 * PHASE 5 — Mirror & DM (alignés sur la BDD réelle)
 * - [PHASE5] DM: startDirectConversation(userId, otherUserId, echoId) pour lier la conv à l’écho (echo_id)
 * - [PHASE5] DM: compat retour startDirectConversation (flat + data) => zéro régression
 * - [PHASE5] DM: respect echo.can_dm (bloque DM si false)
 * - [KEEP] Comments PHASE3/3bis inchangés (source centrale commentsCountById + incrément local only)
 * - [KEEP] Likes / Share / Mirror / Réactions + compat NEW→LEGACY inchangés
 * - [SAFE] Aucun `any` explicite, best-effort + toasts, pas de crash si colonnes absentes
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.8.0 (2026-01-24)
 * - [PHASE5] DM aligné conversations/echo_id + compat contract startDirectConversation
 * - [PHASE5] DM respecte can_dm (si false => toast)
 * - [KEEP] Zéro régression sur le reste
 * 1.7.1 (2026-01-24)
 * - [PHASE3bis] Passe currentUserId/canPost à EchoItem => commentaires postables quand connecté
 * - [KEEP] API publique EchoFeed inchangée
 * 1.7.0 (2026-01-24)
 * - [PHASE3bis] Ajout handler onCommentInserted + passage à EchoItem
 * - [PHASE3bis] Initialisation commentsCountById sans régression (max / pas d’écrasement)
 * - [KEEP] UI / API publiques EchoFeed inchangées
 * 1.6.0 (2026-01-24)
 * - [PHASE3] comments_count branché sur echo_responses (fallback agrégé si non fourni)
 * - [KEEP] Aucun changement d’API publique EchoFeed (props identiques)
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
  fetchReactionMeta,
  sendEchoMirror,
  shareEcho,
  toggleEchoLike,
  toggleEchoReaction,
} from '@/lib/echo/actions';
import { startDirectConversation } from '@/lib/messages/startDirectConversation';
import type { ReactionType } from '@/lib/echo/reactions';

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

  // PHASE 1: images (doit être disponible partout; si absent => normalisé en [])
  image_urls?: string[] | null;

  // PHASE 3: comments (optionnel selon query)
  comments_count?: number | null;

  // PHASE 1: viewer meta (optionnelle selon query)
  mirrored?: boolean | null;
  can_dm?: boolean | null;
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

/**
 * Compat EchoItem :
 * - EchoItem peut envoyer/consommer soit les clés officielles, soit legacy.
 * - Phase 2 : DB officielle = echo_reactions (understand/support/reflect).
 * - On expose donc les DEUX jeux de clés (mêmes valeurs) pour zéro régression.
 */
type LegacyResonanceType = 'i_feel_you' | 'i_support_you' | 'i_reflect_with_you';
type ReactionKey = ReactionType; // 'understand' | 'support' | 'reflect'
type AnyReactionKey = ReactionKey | LegacyResonanceType;

const LEGACY_TO_NEW: Record<LegacyResonanceType, ReactionKey> = {
  i_feel_you: 'understand',
  i_support_you: 'support',
  i_reflect_with_you: 'reflect',
};

function isReactionKey(v: AnyReactionKey): v is ReactionKey {
  return v === 'understand' || v === 'support' || v === 'reflect';
}

function toOfficialReactionType(t: AnyReactionKey): ReactionKey {
  if (isReactionKey(t)) return t;
  return LEGACY_TO_NEW[t];
}

function withCompatKeysCounts(
  base: Record<ReactionKey, number>
): Record<ReactionKey | LegacyResonanceType, number> {
  return {
    understand: base.understand ?? 0,
    support: base.support ?? 0,
    reflect: base.reflect ?? 0,
    i_feel_you: base.understand ?? 0,
    i_support_you: base.support ?? 0,
    i_reflect_with_you: base.reflect ?? 0,
  };
}

function withCompatKeysByMe(
  base: Record<ReactionKey, boolean>
): Record<ReactionKey | LegacyResonanceType, boolean> {
  return {
    understand: base.understand ?? false,
    support: base.support ?? false,
    reflect: base.reflect ?? false,
    i_feel_you: base.understand ?? false,
    i_support_you: base.support ?? false,
    i_reflect_with_you: base.reflect ?? false,
  };
}

function normalizeImageUrls(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.map((x) => String(x ?? '').trim()).filter(Boolean);
}

function initReactionCounts(): Record<ReactionKey, number> {
  return { understand: 0, support: 0, reflect: 0 };
}

function initReactionByMe(): Record<ReactionKey, boolean> {
  return { understand: false, support: false, reflect: false };
}

function safeNumber(input: unknown, fallback = 0): number {
  const n = typeof input === 'number' ? input : Number(input);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * PHASE 3 — Fallback agrégé comments_count (source: echo_responses)
 * Table: public.echo_responses (remplace echo_replies)
 * Colonnes attendues: echo_id (uuid), ...
 * Objectif: compter par echo_id pour afficher badge partout même si la query n’inclut pas comments_count.
 */
async function fetchCommentsCountByEchoId({
  echoIds,
}: {
  echoIds: string[];
}): Promise<{ ok: true; countById: Record<string, number> } | { ok: false; error?: string }> {
  try {
    if (!echoIds.length) return { ok: true, countById: {} };

    // Best-effort: on lit uniquement echo_id et on agrège côté client.
    // (évite N requêtes count exact par echoId)
    const { supabase } = await import('@/lib/supabase/client');

    const { data, error } = await supabase.from('echo_responses').select('echo_id').in('echo_id', echoIds);
    if (error) return { ok: false, error: error.message };

    const countById: Record<string, number> = {};
    for (const id of echoIds) countById[String(id)] = 0;

    if (Array.isArray(data)) {
      for (const row of data as Array<{ echo_id?: unknown }>) {
        const id = String(row.echo_id ?? '');
        if (!id) continue;
        countById[id] = (countById[id] ?? 0) + 1;
      }
    }

    return { ok: true, countById };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue';
    return { ok: false, error: msg };
  }
}

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

  // Media meta (fallback si image_urls non présent)
  const [mediaById, setMediaById] = useState<Record<string, string[]>>({});

  // Reactions meta (OFFICIAL)
  const [rxCountsByEcho, setRxCountsByEcho] = useState<Record<string, Record<ReactionKey, number>>>({});
  const [rxByMeByEcho, setRxByMeByEcho] = useState<Record<string, Record<ReactionKey, boolean>>>({});

  // PHASE 3 / 3bis — Comments count (source centrale + seed best-effort)
  const [commentsCountById, setCommentsCountById] = useState<Record<string, number>>({});

  // UI states
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [busyLikeId, setBusyLikeId] = useState<string | null>(null);
  const [busyReactionKey, setBusyReactionKey] = useState<string | null>(null);
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

  // PHASE 3bis — handler imposé: incrément local uniquement
  const onCommentInserted = (echoId: string) => {
    if (!echoId) return;
    setCommentsCountById((s) => ({
      ...s,
      [echoId]: (s[echoId] ?? 0) + 1,
    }));
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

    void loadMeta();

    return () => {
      mounted = false;
    };
  }, [echoes, hasEchoes, userId]);

  // Load media meta (fallback)
  useEffect(() => {
    let mounted = true;

    const loadMedia = async () => {
      if (!hasEchoes) return;

      // Si tous les échos ont déjà image_urls, on peut éviter le fetch.
      // SAFE: on garde le fallback si au moins un écho n’a pas d’images dans la query.
      const needsFallback = echoes.some((e) => normalizeImageUrls(e.image_urls).length === 0);

      if (!needsFallback) {
        if (!mounted) return;
        setMediaById({});
        return;
      }

      const ids = echoes.map((e) => e.id);
      const res = await fetchEchoMediaMeta({ echoIds: ids });
      if (!mounted) return;
      if (!res.ok) return;

      setMediaById(res.mediaById);
    };

    void loadMedia();

    return () => {
      mounted = false;
    };
  }, [echoes, hasEchoes]);

  // Load reactions meta (PHASE 2 — official table echo_reactions)
  useEffect(() => {
    let mounted = true;

    const loadReactions = async () => {
      if (!hasEchoes) return;
      const ids = echoes.map((e) => e.id);

      const res = await fetchReactionMeta({ echoIds: ids, userId });
      if (!mounted) return;
      if (!res.ok) return;

      const nextCounts: Record<string, Record<ReactionKey, number>> = {};
      const nextByMe: Record<string, Record<ReactionKey, boolean>> = {};

      for (const echoId of ids) {
        const c = (res.countsByEcho[echoId] ?? {}) as Record<string, number>;
        const m = (res.byMeByEcho[echoId] ?? {}) as Record<string, boolean>;

        // read official first, fallback legacy (si un ancien meta est renvoyé)
        const understandCount = Number(c.understand ?? c.i_feel_you ?? 0) || 0;
        const supportCount = Number(c.support ?? c.i_support_you ?? 0) || 0;
        const reflectCount = Number(c.reflect ?? c.i_reflect_with_you ?? 0) || 0;

        const understandMe = Boolean(m.understand ?? m.i_feel_you ?? false);
        const supportMe = Boolean(m.support ?? m.i_support_you ?? false);
        const reflectMe = Boolean(m.reflect ?? m.i_reflect_with_you ?? false);

        nextCounts[echoId] = { understand: understandCount, support: supportCount, reflect: reflectCount };
        nextByMe[echoId] = { understand: understandMe, support: supportMe, reflect: reflectMe };
      }

      setRxCountsByEcho(nextCounts);
      setRxByMeByEcho(nextByMe);
    };

    void loadReactions();

    return () => {
      mounted = false;
    };
  }, [echoes, hasEchoes, userId]);

  // PHASE 3 — Seed comments_count (query si dispo, sinon fallback agrégé)
  // PHASE 3bis — Ne JAMAIS écraser un compteur déjà incrémenté localement (max / no-decrement)
  useEffect(() => {
    let mounted = true;

    const seedFromQuery = () => {
      const ids = echoes.map((e) => e.id);
      const nextFromQuery: Record<string, number> = {};

      let any = false;
      for (const e of echoes) {
        if (typeof e.comments_count === 'number' && Number.isFinite(e.comments_count)) {
          any = true;
          nextFromQuery[e.id] = Math.max(0, safeNumber(e.comments_count, 0));
        }
      }

      if (!any) return { ok: false as const, ids };

      setCommentsCountById((prev) => {
        const next = { ...prev };
        for (const id of ids) {
          const incoming = nextFromQuery[id];
          if (typeof incoming !== 'number') continue;
          const cur = next[id];
          next[id] = typeof cur === 'number' ? Math.max(cur, incoming) : incoming;
        }
        return next;
      });

      return { ok: true as const, ids };
    };

    const loadCommentsCount = async () => {
      if (!hasEchoes) return;

      const seeded = seedFromQuery();
      const ids = seeded.ids;

      // Si on a un comments_count pour tous les échos, on s’arrête là.
      const allHave = echoes.every(
        (e) => typeof e.comments_count === 'number' && Number.isFinite(e.comments_count as number)
      );
      if (allHave) return;

      // Sinon fallback agrégé best-effort
      const res = await fetchCommentsCountByEchoId({ echoIds: ids });
      if (!mounted) return;
      if (!res.ok) return;

      setCommentsCountById((prev) => {
        const next = { ...prev };
        for (const id of ids) {
          const incoming = Math.max(0, safeNumber(res.countById[id] ?? 0, 0));
          const cur = next[id];
          next[id] = typeof cur === 'number' ? Math.max(cur, incoming) : incoming;
        }
        return next;
      });
    };

    void loadCommentsCount();

    return () => {
      mounted = false;
    };
  }, [echoes, hasEchoes]);

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

  /**
   * PHASE 2 — Réactions : persistence officielle echo_reactions
   * Compat : EchoItem peut envoyer 'understand'|'support'|'reflect' OU legacy.
   */
  const onResonance = async (echoId: string, type: AnyReactionKey) => {
    if (!userId) {
      showToast('error', 'Connecte-toi pour réagir.');
      return;
    }

    const official = toOfficialReactionType(type);
    const key = `${echoId}:${official}`;
    if (busyReactionKey) return;

    const was = !!rxByMeByEcho[echoId]?.[official];
    const next = !was;

    // optimistic
    setBusyReactionKey(key);

    setRxByMeByEcho((s) => ({
      ...s,
      [echoId]: {
        ...(s[echoId] ?? initReactionByMe()),
        [official]: next,
      },
    }));

    setRxCountsByEcho((s) => ({
      ...s,
      [echoId]: {
        ...(s[echoId] ?? initReactionCounts()),
        [official]: Math.max(0, (s[echoId]?.[official] ?? 0) + (next ? 1 : -1)),
      },
    }));

    const res = await toggleEchoReaction({ echoId, userId, type: official, nextOn: next });

    if (!res.ok) {
      setRxByMeByEcho((s) => ({
        ...s,
        [echoId]: {
          ...(s[echoId] ?? initReactionByMe()),
          [official]: was,
        },
      }));

      setRxCountsByEcho((s) => ({
        ...s,
        [echoId]: {
          ...(s[echoId] ?? initReactionCounts()),
          [official]: Math.max(0, (s[echoId]?.[official] ?? 0) + (was ? 1 : -1)),
        },
      }));

      showToast('error', res.error ?? 'Erreur réaction.');
      setBusyReactionKey(null);
      return;
    }

    showToast('ok', next ? 'Réaction ajoutée.' : 'Réaction retirée.');
    setBusyReactionKey(null);
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

  /**
   * PHASE 5 — DM aligné BDD réelle
   * - lie la conv à l’écho via echoId (echo_id côté conversations)
   * - compat: startDirectConversation peut renvoyer flat OU data (suivant version)
   * - respecte echo.can_dm si fourni
   */
  const onMessage = async (toUserId: string, echoId?: string, canDm?: boolean | null) => {
    if (!userId) {
      showToast('error', 'Connecte-toi pour envoyer un message.');
      return;
    }
    if (!toUserId) {
      showToast('error', 'Auteur indisponible.');
      return;
    }
    if (canDm === false) {
      showToast('error', 'Messages désactivés pour cet écho.');
      return;
    }

    const res = await startDirectConversation({
      userId,
      otherUserId: toUserId,
      echoId: echoId ?? null,
    });

    if (!res.ok) {
      showToast('error', res.error ?? 'Impossible de démarrer la conversation.');
      return;
    }

    // compat: flat ou data
    const conversationId =
      typeof (res as unknown as { conversationId?: unknown }).conversationId === 'string'
        ? String((res as unknown as { conversationId: string }).conversationId)
        : String((res as unknown as { data?: { conversationId?: unknown } }).data?.conversationId ?? '');

    if (!conversationId) {
      showToast('error', 'Conversation créée mais id introuvable.');
      return;
    }

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
            {echoes.map((e) => {
              const counts = rxCountsByEcho[e.id] ?? initReactionCounts();
              const byMe = rxByMeByEcho[e.id] ?? initReactionByMe();

              const imgs = normalizeImageUrls(e.image_urls);
              const media = imgs.length > 0 ? imgs : mediaById[e.id] ?? [];

              // PHASE 3bis — Source centrale: state (seeded + incréments)
              const count = Math.max(0, safeNumber(commentsCountById[e.id] ?? 0, 0));

              const authorId = (e.user_id ?? '').trim();

              return (
                <EchoItem
                  key={e.id}
                  echo={{
                    ...e,
                    comments_count: count,
                  }}
                  dateLabel={formatDateFR(e.created_at)}
                  expanded={expandedId === e.id}
                  onToggleExpand={onToggleExpand}
                  liked={!!likedByMe[e.id]}
                  likeCount={likeCountById[e.id] ?? 0}
                  onLike={onLike}
                  media={media}
                  // compat EchoItem : clés officielles + legacy
                  resCounts={withCompatKeysCounts(counts)}
                  resByMe={withCompatKeysByMe(byMe)}
                  onResonance={onResonance}
                  onMirror={onMirror}
                  // ✅ PHASE 5: on lie DM à l’écho (echo_id) + respecte can_dm
                  onMessage={() => void onMessage(authorId, e.id, e.can_dm)}
                  onOpenEcho={onOpenEcho}
                  onShare={onShare}
                  copied={copiedId === e.id}
                  busyLike={busyLikeId === e.id}
                  busyResKey={busyReactionKey}
                  // PHASE 3bis — signal unique
                  onCommentInserted={() => onCommentInserted(e.id)}
                  // PHASE 3bis — permet de poster dans CommentsModal
                  currentUserId={userId}
                  canPost={!!userId}
                />
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}
