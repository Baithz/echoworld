/**
 * =============================================================================
 * Fichier      : app/echo/[id]/page.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.4.0 (2026-01-24)
 * Objet        : Lecture d’un écho + interactions (P0)
 * -----------------------------------------------------------------------------
 * PHASE 4 — Partage (UI + DB)
 * - [PHASE4] Passe viewerId à ShareModal pour permettre le log DB (echo_shares) côté modal
 * - [KEEP] UI ShareModal inchangée, ouverture identique
 * - [KEEP] PHASE 3/3bis (CommentsModal + badge incrément local) inchangés
 * - [KEEP] Réactions PHASE 2, Mirror/Photos/UI conservés
 * - [SAFE] Zéro régression runtime : prop ajoutée optionnelle côté modal
 *
 * Fix v1.3.1 (PHASE 3bis) :
 * - [FIX] Remplace prop obsolète onCountChange -> onCommentInserted (CommentsModal v1.2.0)
 * - [PHASE3bis] Compteur comments_count géré localement par la page (incrément local uniquement)
 * - [KEEP] Réactions PHASE 2 (echo_reactions.reaction_type), Mirror/Share/Photos/UI conservés
 * - [SAFE] Best-effort : badge=0 si meta KO, aucune régression runtime
 * =============================================================================
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';

import { REACTIONS, type ReactionType } from '@/lib/echo/reactions';
import ShareModal from '@/components/echo/ShareModal';
import CommentsModal from '@/components/echo/CommentsModal';
import { fetchCommentsCountMeta } from '@/lib/echo/comments';

type Visibility = 'world' | 'local' | 'private' | 'semi_anonymous';
type Status = 'draft' | 'published' | 'archived' | 'deleted';

type EchoRow = {
  id: string;
  user_id: string;
  title: string | null;
  content: string | null;
  emotion: string | null;
  language: string | null;
  country: string | null;
  city: string | null;
  is_anonymous: boolean | null;
  visibility: Visibility | null;
  status: Status | null;
  created_at: string;

  // photos (table echoes)
  image_urls?: string[] | null;
};

type ProfileRow = {
  id: string;
  handle: string | null;
  display_name: string | null;
  identity_mode: 'real' | 'symbolic' | 'anonymous';
  avatar_type: 'image' | 'symbol' | 'color' | 'constellation';
  avatar_url: string | null;
  avatar_seed: string | null;
  lang_primary: string;
};

type UserSettingsRow = {
  user_id: string;
  allow_responses: boolean;
  allow_mirrors: boolean;
};

// Ces tables peuvent ne pas exister dans tes types Supabase générés,
// d’où le `never` sur insert(). On passe via un client "loose" (sans `any` explicite).
type EchoMirrorInsert = { echo_id: string; user_id: string };
type EchoResponseInsert = { echo_id: string; user_id: string; content: string };

function formatDateTimeFR(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('fr-FR', {
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
  const clean = (input || '').trim().replace(/\s+/g, ' ');
  if (!clean) return 'EW';
  const parts = clean.split(' ');
  const a = parts[0]?.[0] ?? 'E';
  const b = parts.length > 1 ? (parts[1]?.[0] ?? '') : (parts[0]?.[1] ?? '');
  return (a + b).toUpperCase();
}

function obfuscateId(id: string): string {
  if (!id) return 'Echoer';
  return `Echoer-${id.slice(0, 4)}`;
}

function emptyResult<T>() {
  return Promise.resolve({ data: null as T | null, error: null as unknown });
}

function initReactCounts(): Record<ReactionType, number> {
  return { understand: 0, support: 0, reflect: 0 };
}

function initReactByMe(): Record<ReactionType, boolean> {
  return { understand: false, support: false, reflect: false };
}

function safeNonNegInt(input: unknown, fallback = 0): number {
  const n = typeof input === 'number' ? input : Number(input);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.floor(n));
}

export default function EchoDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const echoId = params?.id;

  const [authLoading, setAuthLoading] = useState(true);
  const [viewerId, setViewerId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [echo, setEcho] = useState<EchoRow | null>(null);
  const [author, setAuthor] = useState<ProfileRow | null>(null);
  const [settings, setSettings] = useState<UserSettingsRow | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // Interactions state
  const [mirrorLoading, setMirrorLoading] = useState(false);
  const [isMirrored, setIsMirrored] = useState(false);

  // PHASE 3: comment state (on conserve les states existants "reply" pour zéro régression UI)
  const [replyLoading, setReplyLoading] = useState(false);
  const [replyText, setReplyText] = useState('');

  // Share modal
  const [shareOpen, setShareOpen] = useState(false);

  // PHASE 3: Comments modal + badge count
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsCount, setCommentsCount] = useState<number>(0);

  // PHASE 2: Reactions UI state (OFFICIAL: echo_reactions.reaction_type)
  const [reactByMe, setReactByMe] = useState<Record<ReactionType, boolean>>(initReactByMe());
  const [reactCounts, setReactCounts] = useState<Record<ReactionType, number>>(initReactCounts());
  const [reactBusyKey, setReactBusyKey] = useState<string | null>(null);

  // Client "loose" pour éviter le `never` sur les tables non typées dans Database
  const supabaseLoose = useMemo(() => supabase as unknown as SupabaseClient, []);

  // Auth (soft: page peut être visible sans login selon visibilité)
  useEffect(() => {
    let mounted = true;

    const loadAuth = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!mounted) return;
        const u = data.user ?? null;
        setViewerId(u?.id ?? null);
      } finally {
        if (mounted) setAuthLoading(false);
      }
    };

    loadAuth();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      const u = session?.user ?? null;
      setViewerId(u?.id ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Load echo + author + viewer settings + mirrors + reactions meta + comments count
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!echoId) return;

      setLoading(true);
      setError(null);
      setOk(null);

      try {
        const echoRes = await supabase
          .from('echoes')
          .select(
            'id,user_id,title,content,emotion,language,country,city,is_anonymous,visibility,status,created_at,image_urls'
          )
          .eq('id', echoId)
          .maybeSingle();

        if (echoRes.error) throw echoRes.error;

        const e = (echoRes.data as EchoRow | null) ?? null;
        if (!mounted) return;

        setEcho(e);

        if (!e) {
          setLoading(false);
          setError('Écho introuvable.');
          return;
        }

        const [pRes, sRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', e.user_id).maybeSingle(),
          viewerId
            ? supabase
                .from('user_settings')
                .select('user_id,allow_responses,allow_mirrors')
                .eq('user_id', viewerId)
                .maybeSingle()
            : emptyResult<UserSettingsRow>(),
        ]);

        if (!mounted) return;

        setAuthor((pRes.data as ProfileRow | null) ?? null);
        setSettings((sRes.data as UserSettingsRow | null) ?? null);

        // Mirror state best-effort
        if (viewerId) {
          const mRes = await supabaseLoose
            .from('echo_mirrors')
            .select('id')
            .eq('echo_id', e.id)
            .eq('user_id', viewerId)
            .maybeSingle();

          if (!mounted) return;
          setIsMirrored(!!mRes.data && !mRes.error);
        } else {
          setIsMirrored(false);
        }

        /**
         * PHASE 2 — Reactions meta (OFFICIAL)
         * Table: public.echo_reactions
         * Colonnes: echo_id, user_id, reaction_type
         */
        try {
          const rxRes = await supabaseLoose.from('echo_reactions').select('user_id,reaction_type').eq('echo_id', e.id);

          if (!mounted) return;

          const counts = initReactCounts();
          const byMe = initReactByMe();

          if (!rxRes.error && Array.isArray(rxRes.data)) {
            for (const row of rxRes.data as Array<{ user_id?: string | null; reaction_type?: string | null }>) {
              const t = (row.reaction_type ?? '') as ReactionType;
              if (t === 'understand' || t === 'support' || t === 'reflect') {
                counts[t] += 1;
                if (viewerId && row.user_id === viewerId) byMe[t] = true;
              }
            }
          }

          setReactCounts(counts);
          setReactByMe(byMe);
        } catch {
          setReactCounts(initReactCounts());
          setReactByMe(initReactByMe());
        }

        /**
         * PHASE 3 — Comments count (badge)
         * Source: public.echo_responses
         * Best-effort : si KO, on reste à 0 sans casser.
         */
        try {
          const cRes = await fetchCommentsCountMeta({ echoIds: [e.id] });
          if (!mounted) return;
          if (cRes.ok) setCommentsCount(safeNonNegInt(cRes.countById[e.id] ?? 0, 0));
        } catch {
          if (!mounted) return;
          setCommentsCount(0);
        }
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Erreur de chargement.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [echoId, viewerId, supabaseLoose]);

  const isOwner = useMemo(() => !!viewerId && !!echo?.user_id && viewerId === echo.user_id, [viewerId, echo?.user_id]);

  const canView = useMemo(() => {
    if (!echo) return false;
    const st = echo.status ?? 'published';

    if (st === 'draft') return isOwner;
    if (st === 'deleted') return false;

    const v = echo.visibility ?? 'world';
    if (v === 'private') return isOwner;
    return true;
  }, [echo, isOwner]);

  const displayAuthor = useMemo(() => {
    if (!echo) return 'Echoer';
    if (echo.is_anonymous) return 'Anonymous';
    if (author?.identity_mode === 'anonymous') return 'Anonymous';
    if (author?.handle) return author.handle;
    if (author?.display_name) return author.display_name;
    return obfuscateId(echo.user_id);
  }, [echo, author]);

  const avatarLabel = useMemo(() => {
    if (!echo) return 'EW';
    if (echo.is_anonymous) return 'AN';
    if (author?.avatar_seed) return safeInitials(author.avatar_seed);
    if (author?.handle) return safeInitials(author.handle);
    if (author?.display_name) return safeInitials(author.display_name);
    return safeInitials(obfuscateId(echo.user_id));
  }, [echo, author]);

  const copyLink = async () => {
    setOk(null);
    setError(null);
    try {
      const url = typeof window !== 'undefined' ? window.location.href : '';
      await navigator.clipboard.writeText(url);
      setOk('Lien copié.');
    } catch {
      setError('Impossible de copier le lien.');
    }
  };

  const toggleMirror = async () => {
    if (!viewerId || !echo) {
      router.push('/login');
      return;
    }
    if (!settings?.allow_mirrors) return;

    setMirrorLoading(true);
    setOk(null);
    setError(null);

    try {
      if (isMirrored) {
        const del = await supabaseLoose.from('echo_mirrors').delete().eq('echo_id', echo.id).eq('user_id', viewerId);
        if (del.error) throw del.error;
        setIsMirrored(false);
        setOk('Écho retiré des miroirs.');
      } else {
        const payload: EchoMirrorInsert = { echo_id: echo.id, user_id: viewerId };
        const ins = await supabaseLoose.from('echo_mirrors').insert(payload);
        if (ins.error) throw ins.error;
        setIsMirrored(true);
        setOk('Écho ajouté aux miroirs.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur mirror.');
    } finally {
      setMirrorLoading(false);
    }
  };

  /**
   * PHASE 3 — Commenter (table officielle: echo_responses)
   * On garde la UI "Répondre" existante (replyText/replyLoading) pour zéro régression visuelle.
   */
  const submitReply = async () => {
    if (!viewerId || !echo) {
      router.push('/login');
      return;
    }
    if (!settings?.allow_responses) return;

    const msg = replyText.trim();
    if (!msg) return;

    setReplyLoading(true);
    setOk(null);
    setError(null);

    try {
      const payload: EchoResponseInsert = { echo_id: echo.id, user_id: viewerId, content: msg };
      const ins = await supabaseLoose.from('echo_responses').insert(payload);
      if (ins.error) throw ins.error;

      setReplyText('');
      setOk('Commentaire envoyé.');

      // badge best-effort (optimistic)
      setCommentsCount((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur commentaire.');
    } finally {
      setReplyLoading(false);
    }
  };

  /**
   * PHASE 2 — Toggle réaction (OFFICIAL): echo_reactions.reaction_type
   * - Insert: (echo_id, user_id, reaction_type)
   * - Delete: filter by same triplet
   */
  const toggleReaction = async (type: ReactionType) => {
    if (!viewerId || !echo) {
      router.push('/login');
      return;
    }

    const key = `${echo.id}:${type}`;
    setReactBusyKey(key);
    setOk(null);
    setError(null);

    const active = !!reactByMe[type];

    // optimistic
    setReactByMe((prev) => ({ ...prev, [type]: !active }));
    setReactCounts((prev) => ({
      ...prev,
      [type]: active ? Math.max(0, (prev[type] ?? 0) - 1) : (prev[type] ?? 0) + 1,
    }));

    try {
      if (active) {
        const del = await supabaseLoose
          .from('echo_reactions')
          .delete()
          .eq('echo_id', echo.id)
          .eq('user_id', viewerId)
          .eq('reaction_type', type);

        if (del.error) throw del.error;
      } else {
        const ins = await supabaseLoose.from('echo_reactions').insert({
          echo_id: echo.id,
          user_id: viewerId,
          reaction_type: type,
        });

        if (ins.error) throw ins.error;
      }
    } catch (err) {
      // rollback (strict, sans laisser l'UI en état faux)
      setReactByMe((prev) => ({ ...prev, [type]: active }));
      setReactCounts((prev) => ({
        ...prev,
        [type]: active ? (prev[type] ?? 0) + 1 : Math.max(0, (prev[type] ?? 0) - 1),
      }));
      setError(err instanceof Error ? err.message : 'Erreur réaction.');
    } finally {
      setReactBusyKey(null);
    }
  };

  const photos = Array.isArray(echo?.image_urls) ? echo.image_urls.filter(Boolean) : [];

  if (loading || authLoading) {
    return (
      <main className="mx-auto w-full max-w-4xl px-6 pb-16 pt-28">
        <div className="h-10 w-64 animate-pulse rounded-xl border border-slate-200 bg-white/70" />
        <div className="mt-6 h-64 animate-pulse rounded-3xl border border-slate-200 bg-white/70" />
      </main>
    );
  }

  if (!echo || !canView) {
    return (
      <main className="mx-auto w-full max-w-4xl px-6 pb-16 pt-28">
        <div className="rounded-3xl border border-slate-200 bg-white/70 p-6">
          <div className="text-lg font-bold text-slate-900">Accès indisponible</div>
          <div className="mt-2 text-sm text-slate-600">
            {echo?.status === 'draft' ? 'Cet écho est un brouillon.' : 'Écho introuvable ou non accessible.'}
          </div>
          <div className="mt-6 flex gap-3">
            <Link
              href="/explore"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            >
              Explorer
            </Link>
            <Link
              href="/account"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:opacity-95"
            >
              Mon espace
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="mx-auto w-full max-w-4xl px-6 pb-16 pt-28">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{echo.title?.trim() ? echo.title : 'Écho'}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-600">
              <span className="inline-flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-900">
                  {author?.avatar_type === 'image' && author.avatar_url && !echo.is_anonymous ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={author.avatar_url} alt="Avatar" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    avatarLabel
                  )}
                </span>
                <span className="font-semibold text-slate-900">{displayAuthor}</span>
              </span>
              <span>•</span>
              <span>{formatDateTimeFR(echo.created_at)}</span>
              {echo.emotion ? (
                <>
                  <span>•</span>
                  <span>{echo.emotion}</span>
                </>
              ) : null}
              {echo.visibility ? (
                <>
                  <span>•</span>
                  <span>{echo.visibility}</span>
                </>
              ) : null}
              {echo.language ? (
                <>
                  <span>•</span>
                  <span>{echo.language}</span>
                </>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="rounded-xl border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-white"
            >
              Partager
            </button>

            <button
              type="button"
              onClick={() => setCommentsOpen(true)}
              className="rounded-xl border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-white"
              title="Voir et ajouter des commentaires"
            >
              Commentaires
              {commentsCount > 0 ? (
                <span className="ml-2 rounded-full bg-slate-900 px-2 py-0.5 text-xs text-white">{commentsCount}</span>
              ) : null}
            </button>

            <button
              type="button"
              onClick={copyLink}
              className="rounded-xl border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-white"
            >
              Copier le lien
            </button>

            {isOwner ? (
              <Link
                href="/share"
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:opacity-95"
              >
                Nouveau
              </Link>
            ) : null}
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        ) : null}
        {ok ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {ok}
          </div>
        ) : null}

        {/* Photos */}
        {photos.length > 0 ? (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white/70 p-4 backdrop-blur-md">
            <div
              className={`grid gap-2 ${
                photos.length === 1 ? 'grid-cols-1' : photos.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'
              }`}
            >
              {photos.slice(0, 9).map((url, idx) => (
                <div key={`${echo.id}-ph-${idx}`} className="relative aspect-square overflow-hidden rounded-2xl bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Photo ${idx + 1}`} className="h-full w-full object-cover" loading="lazy" />
                  {idx === 8 && photos.length > 9 ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/55">
                      <span className="text-lg font-bold text-white">+{photos.length - 9}</span>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Réactions empathiques (PHASE 2 — OFFICIAL) */}
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white/70 p-4 backdrop-blur-md">
          <div className="text-sm font-semibold text-slate-900">Réagir</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {REACTIONS.map((r) => {
              const active = !!reactByMe[r.type];
              const count = reactCounts[r.type] ?? 0;
              const busy = reactBusyKey === `${echo.id}:${r.type}`;

              return (
                <button
                  key={r.type}
                  type="button"
                  onClick={() => void toggleReaction(r.type)}
                  disabled={busy || !viewerId}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                    active
                      ? 'border-slate-900 bg-slate-900 text-white shadow-lg'
                      : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-50'
                  } ${(busy || !viewerId) ? 'cursor-not-allowed opacity-60' : ''}`}
                  title={!viewerId ? 'Connecte-toi pour réagir' : r.label}
                >
                  <span className="text-sm">{r.icon}</span>
                  <span className="hidden sm:inline">{r.label}</span>
                  <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] text-slate-700 sm:bg-white/20 sm:text-inherit">
                    {count}
                  </span>
                </button>
              );
            })}

            {!viewerId ? (
              <Link
                href="/login"
                className="ml-auto rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50"
              >
                Se connecter
              </Link>
            ) : null}
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white/70 p-6 backdrop-blur-md">
          <div className="text-sm font-semibold text-slate-900">Texte</div>
          <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-slate-800">{echo.content ?? ''}</p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs text-slate-700">
              {echo.city || echo.country ? (
                <span>
                  {echo.city ? echo.city : ''}
                  {echo.city && echo.country ? ' — ' : ''}
                  {echo.country ? echo.country : ''}
                </span>
              ) : (
                <span>Localisation masquée</span>
              )}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={toggleMirror}
                disabled={!settings?.allow_mirrors || mirrorLoading}
                className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                  settings?.allow_mirrors
                    ? isMirrored
                      ? 'border border-slate-200 bg-white text-slate-900 hover:bg-slate-50'
                      : 'bg-slate-900 text-white shadow-lg hover:opacity-95'
                    : 'cursor-not-allowed bg-slate-200 text-slate-500'
                }`}
              >
                {mirrorLoading ? '…' : isMirrored ? 'Retirer miroir' : 'Mirrorer'}
              </button>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white/70 p-6 backdrop-blur-md">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="text-sm font-semibold text-slate-900">Répondre</div>
              <div className="mt-1 text-xs text-slate-500">
                {settings?.allow_responses ? 'Réponse douce et courte.' : 'Réponses désactivées par tes paramètres.'}
              </div>
            </div>
            {!viewerId ? (
              <Link
                href="/login"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
              >
                Se connecter
              </Link>
            ) : null}
          </div>

          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            disabled={!viewerId || !settings?.allow_responses || replyLoading}
            rows={3}
            placeholder="Une phrase, une résonance…"
            className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-300 disabled:cursor-not-allowed disabled:bg-slate-50"
            maxLength={500}
          />

          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-slate-500">{replyText.length}/500</div>
            <button
              type="button"
              onClick={submitReply}
              disabled={!viewerId || !settings?.allow_responses || replyLoading || !replyText.trim()}
              className={`rounded-xl px-4 py-2 text-sm font-semibold shadow-lg transition-transform ${
                viewerId && settings?.allow_responses && replyText.trim() && !replyLoading
                  ? 'bg-slate-900 text-white hover:scale-[1.01]'
                  : 'bg-slate-200 text-slate-500 cursor-not-allowed'
              }`}
            >
              {replyLoading ? 'Envoi…' : 'Envoyer'}
            </button>
          </div>
        </section>
      </main>

      {/* PHASE 4: on passe viewerId (optionnel) au modal de partage pour log DB */}
      {shareOpen ? <ShareModal echoId={echo.id} userId={viewerId} onClose={() => setShareOpen(false)} /> : null}

      {commentsOpen ? (
        <CommentsModal
          open={commentsOpen}
          echoId={echo.id}
          userId={viewerId}
          canPost={!!settings?.allow_responses}
          initialCount={commentsCount}
          // PHASE 3bis: incrément local uniquement (pas de recalcul global)
          onCommentInserted={() => setCommentsCount((n) => n + 1)}
          onClose={() => setCommentsOpen(false)}
        />
      ) : null}
    </>
  );
}
