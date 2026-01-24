/**
 * =============================================================================
 * Fichier      : lib/echo/reactions.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.1.1 (2026-01-24)
 * Objet        : Gestion des réactions empathiques (understand, support, reflect) — PHASE 2
 * -----------------------------------------------------------------------------
 * FIX v1.1.1
 * - [FIX] ESLint no-unused-vars: supprime EchoReactionRow (non utilisé)
 * - [FIX] ESLint no-unused-vars: supprime la variable error non utilisée (cast inutile)
 * - [KEEP] API inchangée: fetchReactionsMeta / toggleReaction
 * - [KEEP] Source de vérité: echo_reactions.reaction_type
 * =============================================================================
 */

import { supabase } from '@/lib/supabase/client';

export type ReactionType = 'understand' | 'support' | 'reflect';

export const REACTIONS: { type: ReactionType; label: string; icon: string }[] = [
  { type: 'understand', label: 'Je te comprends', icon: '🤝' },
  { type: 'support', label: 'Je te soutiens', icon: '🫶' },
  { type: 'reflect', label: 'Je réfléchis avec toi', icon: '🪞' },
];

type Ko = { ok: false; error?: string };
type Ok<T extends object> = { ok: true } & T;
type Res<T extends object> = Ok<T> | Ko;

// Helpers typés pour contourner Supabase "never"
type PgErr = { message?: string } | null;
type PgRes<T> = { data: T | null; error: PgErr };

type Chain = {
  select: (...args: unknown[]) => Chain;
  insert: (values: unknown) => Promise<PgRes<unknown>>;
  delete: () => Chain;
  eq: (...args: unknown[]) => Chain;
  in: (...args: unknown[]) => Chain;
};

function table(name: string): Chain {
  return (supabase.from(name) as unknown) as Chain;
}

function errMsg(e: unknown): string {
  if (typeof e === 'string') return e;
  if (e instanceof Error) return e.message;
  const obj = e as { message?: unknown };
  return typeof obj?.message === 'string' ? obj.message : 'Erreur inconnue';
}

function isReactionType(v: unknown): v is ReactionType {
  return v === 'understand' || v === 'support' || v === 'reflect';
}

function initCounts(): Record<ReactionType, number> {
  return { understand: 0, support: 0, reflect: 0 };
}

function initByMe(): Record<ReactionType, boolean> {
  return { understand: false, support: false, reflect: false };
}

/**
 * Récupère les métadonnées de réactions pour plusieurs échos (table officielle echo_reactions)
 */
export async function fetchReactionsMeta({
  echoIds,
  userId,
}: {
  echoIds: string[];
  userId: string | null;
}): Promise<
  Res<{
    countsByEcho: Record<string, Record<ReactionType, number>>;
    byMeByEcho: Record<string, Record<ReactionType, boolean>>;
  }>
> {
  if (!echoIds.length) return { ok: true, countsByEcho: {}, byMeByEcho: {} };

  try {
    const q = table('echo_reactions').select('echo_id,user_id,reaction_type').in('echo_id', echoIds);

    const awaited = (await (q as unknown as Promise<PgRes<unknown>>)) as PgRes<unknown>;
    if (awaited.error) return { ok: false, error: awaited.error.message };

    const rows = (awaited.data ?? []) as Array<{
      echo_id: string;
      user_id: string;
      reaction_type: unknown;
    }>;

    const countsByEcho: Record<string, Record<ReactionType, number>> = {};
    const byMeByEcho: Record<string, Record<ReactionType, boolean>> = {};

    for (const r of rows) {
      const echoId = String(r.echo_id ?? '');
      if (!echoId) continue;

      const rt = r.reaction_type;
      if (!isReactionType(rt)) continue;

      if (!countsByEcho[echoId]) countsByEcho[echoId] = initCounts();
      if (!byMeByEcho[echoId]) byMeByEcho[echoId] = initByMe();

      countsByEcho[echoId][rt] = (countsByEcho[echoId][rt] ?? 0) + 1;

      if (userId && String(r.user_id) === userId) {
        byMeByEcho[echoId][rt] = true;
      }
    }

    // Contrat stable: assurer entrée par echoId demandé
    for (const id of echoIds) {
      const k = String(id);
      if (!countsByEcho[k]) countsByEcho[k] = initCounts();
      if (!byMeByEcho[k]) byMeByEcho[k] = initByMe();
    }

    return { ok: true, countsByEcho, byMeByEcho };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

/**
 * Toggle une réaction sur un écho (table officielle echo_reactions)
 */
export async function toggleReaction({
  echoId,
  userId,
  type,
  nextOn,
}: {
  echoId: string;
  userId: string;
  type: ReactionType;
  nextOn: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    if (nextOn) {
      const { error } = await table('echo_reactions').insert({
        echo_id: echoId,
        user_id: userId,
        reaction_type: type,
      });

      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    const q = table('echo_reactions')
      .delete()
      .eq('echo_id', echoId)
      .eq('user_id', userId)
      .eq('reaction_type', type);

    const awaited = (await (q as unknown as Promise<PgRes<unknown>>)) as PgRes<unknown>;
    if (awaited.error) return { ok: false, error: awaited.error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}
