/**
 * =============================================================================
 * Fichier      : lib/echo/reactions.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-23)
 * Objet        : Gestion des réactions empathiques (understand, support, reflect)
 * -----------------------------------------------------------------------------
 * Description  :
 * - Types ReactionType : 'understand' | 'support' | 'reflect'
 * - fetchReactionsMeta : compte + byMe pour plusieurs échos
 * - toggleReaction : ajouter/retirer une réaction
 * - Helpers typés (pas de any, contournement Supabase)
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.0.0 (2026-01-23)
 * - [NEW] Système de réactions empathiques
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
  return supabase.from(name) as unknown as Chain;
}

function errMsg(e: unknown): string {
  if (typeof e === 'string') return e;
  if (e instanceof Error) return e.message;
  const obj = e as { message?: unknown };
  return typeof obj?.message === 'string' ? obj.message : 'Erreur inconnue';
}

/**
 * Récupère les métadonnées de réactions pour plusieurs échos
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

  const initCounts = (): Record<ReactionType, number> => ({
    understand: 0,
    support: 0,
    reflect: 0,
  });

  const initByMe = (): Record<ReactionType, boolean> => ({
    understand: false,
    support: false,
    reflect: false,
  });

  try {
    const result = await table('echo_reactions')
      .select('echo_id,user_id,reaction')
      .in('echo_id', echoIds);
    
    const { data, error } = result as unknown as PgRes<unknown>;

    if (error) return { ok: false, error: error.message };

    const rows = (data ?? []) as Array<{
      echo_id: string;
      user_id: string;
      reaction: string;
    }>;

    const countsByEcho: Record<string, Record<ReactionType, number>> = {};
    const byMeByEcho: Record<string, Record<ReactionType, boolean>> = {};

    for (const r of rows) {
      const echoId = r.echo_id;
      const type = r.reaction as ReactionType;

      if (!countsByEcho[echoId]) countsByEcho[echoId] = initCounts();
      if (!byMeByEcho[echoId]) byMeByEcho[echoId] = initByMe();

      if (type === 'understand' || type === 'support' || type === 'reflect') {
        countsByEcho[echoId][type]++;
        if (userId && r.user_id === userId) {
          byMeByEcho[echoId][type] = true;
        }
      }
    }

    return { ok: true, countsByEcho, byMeByEcho };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

/**
 * Toggle une réaction sur un écho
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
      // Ajouter
      const { error } = await table('echo_reactions').insert({
        echo_id: echoId,
        user_id: userId,
        reaction: type,
      });

      if (error) return { ok: false, error: error.message };
      return { ok: true };
    } else {
      // Retirer
      const result = await table('echo_reactions')
        .delete()
        .eq('echo_id', echoId)
        .eq('user_id', userId)
        .eq('reaction', type);
      
      const { error } = result as unknown as PgRes<unknown>;

      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}