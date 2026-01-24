// =============================================================================
// Fichier      : lib/echo/actions.ts
// Auteur       : Régis KREMER (Baithz) — EchoWorld
// Version      : 1.7.0 (2026-01-24)
// Objet        : Actions Echo (like, share, media, resonances, mirrors) — SAFE
// -----------------------------------------------------------------------------
// PHASE 4 — Partage (DB echo_shares)
// - [PHASE4] Ajoute recordEchoShare() => insert dans echo_shares (best-effort)
// - [PHASE4] shareEcho() log automatiquement (method: 'native'|'clipboard') sans bloquer l’UX
// - [SAFE] URL SSR-safe (guard window) pour éviter crash/prerender
// - [KEEP] Zéro régression: API existantes conservées, logique PHASE 2 inchangée
//
// FIX v1.6.1 (PHASE 2)
// - [FIX] ESLint no-unused-vars: supprime helpers non utilisés (asLegacyType + isReactionType)
// - [KEEP] Aucune régression: logique PHASE 2 inchangée, exports legacy conservés
//
// FIX v1.6.0 (PHASE 2)
// - [PHASE2] Branche les réactions officielles sur la BDD réelle: echo_reactions(reaction_type)
// - [PHASE2] fetchReactionMeta lit echo_reactions en priorité + fallback echo_resonances (legacy)
// - [PHASE2] toggleEchoReaction écrit echo_reactions + miroir legacy optionnel (echo_resonances)
// - [KEEP] Exports legacy conservés (fetchResonanceMeta / toggleEchoResonance) => zéro régression
// - [KEEP] Contrat flat + 0 any / 0 {} vide / neutralise le "never" Supabase
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
 * SHARE (lien externe + clipboard) + PHASE 4 DB echo_shares
 * ============================================================================
 */
export type EchoShareMethod = 'native' | 'clipboard' | 'copy' | 'twitter' | 'facebook' | 'whatsapp' | 'feed';

export async function recordEchoShare({
  echoId,
  method,
  url,
  userId,
}: {
  echoId: string;
  method: EchoShareMethod;
  url?: string;
  userId?: string | null;
}): Promise<ResVoid> {
  if (!echoId || !method) return { ok: false, error: 'Paramètres invalides.' };

  try {
    // best-effort: user_id optionnel (selon schéma DB)
    const payload: Record<string, unknown> = {
      echo_id: echoId,
      method,
    };
    const cleanUrl = String(url ?? '').trim();
    if (cleanUrl) payload.url = cleanUrl;
    if (typeof userId === 'string' && userId.trim()) payload.user_id = userId.trim();

    const { error } = await table('echo_shares').insert(payload);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e, 'Erreur enregistrement partage.') };
  }
}

export async function shareEcho({ echoId }: { echoId: string }): Promise<ResData<{ mode: 'native' | 'clipboard' }>> {
  // SSR-safe
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const url = origin
    ? `${origin}/explore?focus=${encodeURIComponent(echoId)}`
    : `/explore?focus=${encodeURIComponent(echoId)}`;

  try {
    const nav = navigator as unknown as { share?: (payload: unknown) => Promise<void> };

    if (typeof nav.share === 'function') {
      await nav.share({ title: 'EchoWorld', text: 'Je partage un écho sur EchoWorld.', url });

      // PHASE 4: best-effort log (non bloquant)
      void recordEchoShare({ echoId, method: 'native', url });

      return { ok: true, mode: 'native' };
    }

    await navigator.clipboard.writeText(url);

    // PHASE 4: best-effort log (non bloquant)
    void recordEchoShare({ echoId, method: 'clipboard', url });

    return { ok: true, mode: 'clipboard' };
  } catch (e) {
    try {
      await navigator.clipboard.writeText(url);

      // PHASE 4: best-effort log (non bloquant)
      void recordEchoShare({ echoId, method: 'clipboard', url });

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
 * PHASE 2 — Réactions officielles (DB echo_reactions)
 * (on conserve aussi les clés legacy via mapping et miroir optionnel)
 */
export type ReactionType = 'understand' | 'support' | 'reflect';
export type AnyReactionType = ResonanceType | ReactionType;

type EchoReactionRow = { echo_id: string; user_id: string; reaction_type: ReactionType };
type EchoResonanceRow = { echo_id: string; user_id: string; resonance_type: ResonanceType };

const NEW_TO_LEGACY: Record<ReactionType, ResonanceType> = {
  understand: 'i_feel_you',
  support: 'i_support_you',
  reflect: 'i_reflect_with_you',
};

function isResonanceType(v: AnyReactionType): v is ResonanceType {
  return v === 'i_feel_you' || v === 'i_support_you' || v === 'i_reflect_with_you';
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

function initFullCounts(): Record<ResonanceType | ReactionType, number> {
  return {
    i_feel_you: 0,
    i_support_you: 0,
    i_reflect_with_you: 0,
    understand: 0,
    support: 0,
    reflect: 0,
  };
}

function initFullByMe(): Record<ResonanceType | ReactionType, boolean> {
  return {
    i_feel_you: false,
    i_support_you: false,
    i_reflect_with_you: false,
    understand: false,
    support: false,
    reflect: false,
  };
}

/**
 * PHASE 1 — Legacy meta (inchangé) : echo_resonances(resonance_type)
 */
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

    const rows = data as EchoResonanceRow[];

    const countsByEcho: Record<string, Record<ResonanceType, number>> = {};
    const byMeByEcho: Record<string, Record<ResonanceType, boolean>> = {};

    rows.forEach((r) => {
      const echoId = String(r.echo_id);
      const t = r.resonance_type as ResonanceType;

      if (!countsByEcho[echoId]) countsByEcho[echoId] = initLegacyCounts();
      if (!byMeByEcho[echoId]) byMeByEcho[echoId] = initLegacyByMe();

      if (t === 'i_feel_you' || t === 'i_support_you' || t === 'i_reflect_with_you') {
        countsByEcho[echoId][t] = (countsByEcho[echoId][t] ?? 0) + 1;
        if (userId && String(r.user_id) === userId) byMeByEcho[echoId][t] = true;
      }
    });

    return { ok: true, countsByEcho, byMeByEcho };
  } catch (e) {
    return { ok: false, error: errMsg(e, 'Erreur resonances.') };
  }
}

/**
 * PHASE 2 — Meta “réactions” officielle : echo_reactions(reaction_type)
 * Retourne systématiquement les clés officielles + les clés legacy (compat UI).
 * Fallback safe : si table/req KO => echo_resonances (legacy).
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
  if (!echoIds.length) return { ok: true, countsByEcho: {}, byMeByEcho: {} };

  // 1) Priorité : echo_reactions
  try {
    const { data, error } = (await (table('echo_reactions')
      .select('echo_id,user_id,reaction_type')
      .in('echo_id', echoIds) as unknown as Promise<PgRes<unknown>>)) as PgRes<unknown>;

    if (!error && data) {
      const rows = data as EchoReactionRow[];

      const countsByEcho: Record<string, Record<ResonanceType | ReactionType, number>> = {};
      const byMeByEcho: Record<string, Record<ResonanceType | ReactionType, boolean>> = {};

      rows.forEach((r) => {
        const echoId = String(r.echo_id);
        const rt = r.reaction_type;

        if (!countsByEcho[echoId]) countsByEcho[echoId] = initFullCounts();
        if (!byMeByEcho[echoId]) byMeByEcho[echoId] = initFullByMe();

        // compteur officiel
        countsByEcho[echoId][rt] = (countsByEcho[echoId][rt] ?? 0) + 1;

        // compat legacy (mêmes valeurs)
        const legacy = NEW_TO_LEGACY[rt];
        countsByEcho[echoId][legacy] = (countsByEcho[echoId][legacy] ?? 0) + 1;

        if (userId && String(r.user_id) === userId) {
          byMeByEcho[echoId][rt] = true;
          byMeByEcho[echoId][legacy] = true;
        }
      });

      // Contrat stable : objets présents même si 0
      echoIds.forEach((id) => {
        const k = String(id);
        if (!countsByEcho[k]) countsByEcho[k] = initFullCounts();
        if (!byMeByEcho[k]) byMeByEcho[k] = initFullByMe();
      });

      return { ok: true, countsByEcho, byMeByEcho };
    }
  } catch {
    // ignore -> fallback legacy
  }

  // 2) Fallback : echo_resonances
  const base = await fetchResonanceMeta({ echoIds, userId });
  if (!base.ok) return base;

  const countsByEcho: Record<string, Record<ResonanceType | ReactionType, number>> = {};
  const byMeByEcho: Record<string, Record<ResonanceType | ReactionType, boolean>> = {};

  echoIds.forEach((id) => {
    const echoId = String(id);
    const c = base.countsByEcho[echoId] ?? initLegacyCounts();
    const m = base.byMeByEcho[echoId] ?? initLegacyByMe();

    countsByEcho[echoId] = {
      ...c,
      understand: c.i_feel_you ?? 0,
      support: c.i_support_you ?? 0,
      reflect: c.i_reflect_with_you ?? 0,
    };

    byMeByEcho[echoId] = {
      ...m,
      understand: m.i_feel_you ?? false,
      support: m.i_support_you ?? false,
      reflect: m.i_reflect_with_you ?? false,
    };
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
 * PHASE 2 — Toggle “réaction” officielle : écrit echo_reactions + miroir legacy optionnel
 * - Accepte aussi du legacy (AnyReactionType) => route vers toggleEchoResonance
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
  // Legacy direct -> inchangé
  if (isResonanceType(type)) {
    return toggleEchoResonance({ echoId, userId, type, nextOn });
  }

  // Officiel -> echo_reactions + miroir legacy
  const rt = type as ReactionType;

  try {
    if (nextOn) {
      const { error } = await table('echo_reactions').insert({
        echo_id: echoId,
        user_id: userId,
        reaction_type: rt,
      });
      if (error) return { ok: false, error: error.message };
    } else {
      const { error } = (await (table('echo_reactions')
        .delete()
        .eq('echo_id', echoId)
        .eq('user_id', userId)
        .eq('reaction_type', rt) as unknown as Promise<PgRes<unknown>>)) as PgRes<unknown>;
      if (error) return { ok: false, error: error.message };
    }

    // Miroir legacy (optionnel mais recommandé tant que du code legacy existe)
    const legacy = NEW_TO_LEGACY[rt];
    const mirror = await toggleEchoResonance({ echoId, userId, type: legacy, nextOn });
    if (!mirror.ok) return mirror;

    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e, 'Erreur réaction.') };
  }
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
