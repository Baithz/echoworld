// =============================================================================
// Fichier      : lib/echo/actions.ts
// Auteur       : Régis KREMER (Baithz) — EchoWorld
// Version      : 1.5.0 (2026-01-24)
// Objet        : Actions Echo (like, share, media, resonances, mirrors) — SAFE
// -----------------------------------------------------------------------------
// FIX v1.5.0 (PHASE 1)
// - [PHASE1] Ajout pont "réactions officielles" (understand/support/reflect) vers legacy echo_resonances
// - [NEW] toggleEchoReaction + fetchReactionMeta (retourne clés REACTIONS + legacy, sans casser EchoFeed)
// - [KEEP] Contrat flat + 0 any / 0 {} vide / 0 never Supabase
// - [SAFE] Exports legacy conservés, logique métier inchangée
// =============================================================================

import { supabase } from '@/lib/supabase/client';

/* ============================================================================
 * RÉSULTATS (flat)
 * ============================================================================
 */
type Ko = { ok: false; error?: string };
type OkVoid = { ok: true };
type Ok<T extends object> = { ok: true } & T;

type ResVoid = OkVoid | Ko;
type ResData<T extends object> = Ok<T> | Ko;

function errMsg(e: unknown, fallback: string): string {
  if (!e) return fallback;
  if (typeof e === 'string') return e;
  if (e instanceof Error) return e.message || fallback;
  const anyE = e as { message?: unknown };
  if (typeof anyE?.message === 'string') return anyE.message;
  return fallback;
}

/* ============================================================================
 * HELPERS — neutralise le "never" Supabase sans any
 * ============================================================================
 */
type PgErr = { message?: string } | null;
type PgRes<T> = { data: T | null; error: PgErr };

type Chain = {
  select: (...args: unknown[]) => Chain;
  insert: (values: unknown) => Promise<PgRes<unknown>>;
  delete: () => Chain;

  eq: (...args: unknown[]) => Chain;
  in: (...args: unknown[]) => Chain;
  order: (...args: unknown[]) => Chain;

  maybeSingle?: () => Promise<PgRes<unknown>>;
  single?: () => Promise<PgRes<unknown>>;
};

function table(name: string): Chain {
  return (supabase.from(name) as unknown) as Chain;
}

/* ============================================================================
 * LIKE
 * ============================================================================
 */
export async function fetchLikeMeta({
  echoIds,
  userId,
}: {
  echoIds: string[];
  userId: string | null;
}): Promise<
  ResData<{
    countById: Record<string, number>;
    likedByMeById: Record<string, boolean>;
  }>
> {
  if (!echoIds.length) return { ok: true, countById: {}, likedByMeById: {} };

  try {
    const { data: counts, error: cErr } = (await (table('echo_likes')
      .select('echo_id')
      .in('echo_id', echoIds) as unknown as Promise<PgRes<unknown>>)) as PgRes<unknown>;

    if (cErr) return { ok: false, error: cErr.message };

    const countById: Record<string, number> = {};
    ((counts ?? []) as { echo_id: string }[]).forEach((r) => {
      countById[r.echo_id] = (countById[r.echo_id] ?? 0) + 1;
    });

    const likedByMeById: Record<string, boolean> = {};
    if (userId) {
      const { data: mine, error: mErr } = (await (table('echo_likes')
        .select('echo_id')
        .eq('user_id', userId)
        .in('echo_id', echoIds) as unknown as Promise<PgRes<unknown>>)) as PgRes<unknown>;

      if (!mErr && mine) {
        (mine as { echo_id: string }[]).forEach((r) => {
          likedByMeById[r.echo_id] = true;
        });
      }
    }

    return { ok: true, countById, likedByMeById };
  } catch (e) {
    return { ok: false, error: errMsg(e, 'Erreur meta likes.') };
  }
}

export async function toggleEchoLike({
  echoId,
  userId,
  nextLiked,
}: {
  echoId: string;
  userId: string;
  nextLiked: boolean;
}): Promise<ResVoid> {
  try {
    if (nextLiked) {
      const { error } = await table('echo_likes').insert({ echo_id: echoId, user_id: userId });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    const { error } = (await (table('echo_likes')
      .delete()
      .eq('echo_id', echoId)
      .eq('user_id', userId) as unknown as Promise<PgRes<unknown>>)) as PgRes<unknown>;

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e, 'Erreur like.') };
  }
}

/* ============================================================================
 * SHARE (lien externe + clipboard)
 * ============================================================================
 */
export async function shareEcho({ echoId }: { echoId: string }): Promise<ResData<{ mode: 'native' | 'clipboard' }>> {
  const url = `${window.location.origin}/explore?focus=${encodeURIComponent(echoId)}`;

  try {
    const nav = navigator as unknown as { share?: (payload: unknown) => Promise<void> };

    if (typeof nav.share === 'function') {
      await nav.share({ title: 'EchoWorld', text: 'Je partage un écho sur EchoWorld.', url });
      return { ok: true, mode: 'native' };
    }

    await navigator.clipboard.writeText(url);
    return { ok: true, mode: 'clipboard' };
  } catch (e) {
    try {
      await navigator.clipboard.writeText(url);
      return { ok: true, mode: 'clipboard' };
    } catch {
      return { ok: false, error: errMsg(e, 'Partage impossible.') };
    }
  }
}

/* ============================================================================
 * MEDIA (echo_media)
 * ============================================================================
 */
export async function fetchEchoMediaMeta({
  echoIds,
}: {
  echoIds: string[];
}): Promise<ResData<{ mediaById: Record<string, string[]> }>> {
  if (!echoIds.length) return { ok: true, mediaById: {} };

  try {
    const { data, error } = (await (table('echo_media')
      .select('echo_id,url,position')
      .in('echo_id', echoIds)
      .order('position', { ascending: true }) as unknown as Promise<PgRes<unknown>>)) as PgRes<unknown>;

    if (error || !data) return { ok: false, error: error?.message ?? 'Media indisponibles.' };

    const rows = data as { echo_id: string; url: string | null; position: number | null }[];
    const mediaById: Record<string, string[]> = {};

    rows.forEach((r) => {
      const id = String(r.echo_id);
      const url = String(r.url ?? '').trim();
      if (!url) return;
      if (!mediaById[id]) mediaById[id] = [];
      mediaById[id].push(url);
    });

    return { ok: true, mediaById };
  } catch (e) {
    return { ok: false, error: errMsg(e, 'Erreur media.') };
  }
}

/* ============================================================================
 * RESONANCES (echo_resonances) — LEGACY (conservé)
 * ============================================================================
 */
export type ResonanceType = 'i_feel_you' | 'i_support_you' | 'i_reflect_with_you';

/**
 * PHASE 1 — Réactions officielles (UI) mappées vers legacy DB
 * NB: pas d'import vers '@/lib/echo/reactions' ici => pas de dépendance croisée.
 */
export type ReactionType = 'understand' | 'support' | 'reflect';
export type AnyReactionType = ResonanceType | ReactionType;

const NEW_TO_LEGACY: Record<ReactionType, ResonanceType> = {
  understand: 'i_feel_you',
  support: 'i_support_you',
  reflect: 'i_reflect_with_you',
};

function isReactionType(v: AnyReactionType): v is ReactionType {
  return v === 'understand' || v === 'support' || v === 'reflect';
}

function asLegacyType(t: AnyReactionType): ResonanceType {
  if (isReactionType(t)) return NEW_TO_LEGACY[t];
  return t;
}

function initLegacyCounts(): Record<ResonanceType, number> {
  return {
    i_feel_you: 0,
    i_support_you: 0,
    i_reflect_with_you: 0,
  };
}

function initLegacyByMe(): Record<ResonanceType, boolean> {
  return {
    i_feel_you: false,
    i_support_you: false,
    i_reflect_with_you: false,
  };
}

function withReactionKeys<T extends number | boolean>(
  obj: Record<ResonanceType, T>
): Record<ResonanceType | ReactionType, T> {
  return {
    ...obj,
    understand: obj.i_feel_you,
    support: obj.i_support_you,
    reflect: obj.i_reflect_with_you,
  };
}

export async function fetchResonanceMeta({
  echoIds,
  userId,
}: {
  echoIds: string[];
  userId: string | null;
}): Promise<
  ResData<{
    countsByEcho: Record<string, Record<ResonanceType, number>>;
    byMeByEcho: Record<string, Record<ResonanceType, boolean>>;
  }>
> {
  if (!echoIds.length) return { ok: true, countsByEcho: {}, byMeByEcho: {} };

  try {
    const { data, error } = (await (table('echo_resonances')
      .select('echo_id,user_id,resonance_type')
      .in('echo_id', echoIds) as unknown as Promise<PgRes<unknown>>)) as PgRes<unknown>;

    if (error || !data) return { ok: false, error: error?.message ?? 'Resonances indisponibles.' };

    const rows = data as { echo_id: string; user_id: string; resonance_type: string }[];

    const countsByEcho: Record<string, Record<ResonanceType, number>> = {};
    const byMeByEcho: Record<string, Record<ResonanceType, boolean>> = {};

    rows.forEach((r) => {
      const echoId = String(r.echo_id);
      const t = r.resonance_type as ResonanceType;

      if (!countsByEcho[echoId]) countsByEcho[echoId] = initLegacyCounts();
      if (!byMeByEcho[echoId]) byMeByEcho[echoId] = initLegacyByMe();

      if (t === 'i_feel_you' || t === 'i_support_you' || t === 'i_reflect_with_you') {
        countsByEcho[echoId][t] = (countsByEcho[echoId][t] ?? 0) + 1;
        if (userId && r.user_id === userId) byMeByEcho[echoId][t] = true;
      }
    });

    return { ok: true, countsByEcho, byMeByEcho };
  } catch (e) {
    return { ok: false, error: errMsg(e, 'Erreur resonances.') };
  }
}

/**
 * PHASE 1 — Meta “réactions” (officielles) : renvoie les clés legacy + les clés REACTIONS
 * Pour brancher une UI unique (EchoItem / ProfileEchoList / EchoFeed) sans casser l’existant.
 */
export async function fetchReactionMeta({
  echoIds,
  userId,
}: {
  echoIds: string[];
  userId: string | null;
}): Promise<
  ResData<{
    countsByEcho: Record<string, Record<ResonanceType | ReactionType, number>>;
    byMeByEcho: Record<string, Record<ResonanceType | ReactionType, boolean>>;
  }>
> {
  const base = await fetchResonanceMeta({ echoIds, userId });
  if (!base.ok) return base;

  const countsByEcho: Record<string, Record<ResonanceType | ReactionType, number>> = {};
  const byMeByEcho: Record<string, Record<ResonanceType | ReactionType, boolean>> = {};

  Object.keys(base.countsByEcho).forEach((echoId) => {
    const c = base.countsByEcho[echoId];
    const m = base.byMeByEcho[echoId];

    countsByEcho[echoId] = withReactionKeys<number>(c);
    byMeByEcho[echoId] = withReactionKeys<boolean>(m);
  });

  return { ok: true, countsByEcho, byMeByEcho };
}

export async function toggleEchoResonance({
  echoId,
  userId,
  type,
  nextOn,
}: {
  echoId: string;
  userId: string;
  type: ResonanceType;
  nextOn: boolean;
}): Promise<ResVoid> {
  try {
    if (nextOn) {
      const { error } = await table('echo_resonances').insert({
        echo_id: echoId,
        user_id: userId,
        resonance_type: type,
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    const { error } = (await (table('echo_resonances')
      .delete()
      .eq('echo_id', echoId)
      .eq('user_id', userId)
      .eq('resonance_type', type) as unknown as Promise<PgRes<unknown>>)) as PgRes<unknown>;

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e, 'Erreur resonance.') };
  }
}

/**
 * PHASE 1 — Toggle “réaction” (officielle) : map vers legacy DB
 * (permet à l’UI d’appeler avec understand/support/reflect sans casser echo_resonances)
 */
export async function toggleEchoReaction({
  echoId,
  userId,
  type,
  nextOn,
}: {
  echoId: string;
  userId: string;
  type: AnyReactionType;
  nextOn: boolean;
}): Promise<ResVoid> {
  const legacy = asLegacyType(type);
  return toggleEchoResonance({ echoId, userId, type: legacy, nextOn });
}

/* ============================================================================
 * MIRROR (echo_mirrors)
 * ============================================================================
 */
export async function sendEchoMirror({
  fromUserId,
  toUserId,
  echoId,
  content,
}: {
  fromUserId: string;
  toUserId: string;
  echoId: string;
  content: string;
}): Promise<ResVoid> {
  const msg = (content ?? '').trim();
  if (!msg) return { ok: false, error: 'Message vide.' };

  try {
    const { error } = await table('echo_mirrors').insert({
      from_user_id: fromUserId,
      to_user_id: toUserId,
      echo_id: echoId,
      content: msg,
      status: 'sent',
    });

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e, 'Erreur mirror.') };
  }
}
