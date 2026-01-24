/**
 * =============================================================================
 * Fichier      : lib/echo/comments.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-24)
 * Objet        : Commentaires (PHASE 3) — lecture + ajout + compteur
 * -----------------------------------------------------------------------------
 * Description  :
 * - Source de vérité: public.echo_responses (remplace echo_replies)
 * - fetchComments: liste paginée + auteur (profiles)
 * - insertComment: ajout d’un commentaire
 * - fetchCommentsCountMeta: compteur par echoId (pour badges partout)
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.0.0 (2026-01-24)
 * - [NEW] API SAFE sans any, compatible Supabase “never”
 * =============================================================================
 */

import { supabase } from '@/lib/supabase/client';

/* ============================================================================
 * RÉSULTATS (flat)
 * ============================================================================
 */
type Ko = { ok: false; error?: string };
type Ok<T extends object> = { ok: true } & T;
type Res<T extends object> = Ok<T> | Ko;

type PgErr = { message?: string } | null;
type PgRes<T> = { data: T | null; error: PgErr };

type Chain = {
  select: (...args: unknown[]) => Chain;
  insert: (values: unknown) => Promise<PgRes<unknown>>;
  delete: () => Chain;

  eq: (...args: unknown[]) => Chain;
  in: (...args: unknown[]) => Chain;
  order: (...args: unknown[]) => Chain;
  range?: (from: number, to: number) => Chain;
};

function table(name: string): Chain {
  return (supabase.from(name) as unknown) as Chain;
}

function errMsg(e: unknown, fallback: string): string {
  if (!e) return fallback;
  if (typeof e === 'string') return e;
  if (e instanceof Error) return e.message || fallback;
  const anyE = e as { message?: unknown };
  return typeof anyE?.message === 'string' ? anyE.message : fallback;
}

/* ============================================================================
 * TYPES
 * ============================================================================
 */
export type EchoComment = {
  id: string;
  echo_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author?: {
    id: string;
    handle: string | null;
    display_name: string | null;
    avatar_url: string | null;
    avatar_seed: string | null;
    identity_mode?: 'real' | 'symbolic' | 'anonymous';
    avatar_type?: 'image' | 'symbol' | 'color' | 'constellation';
  } | null;
};

/* ============================================================================
 * COMPTEUR (badges)
 * ============================================================================
 * SAFE: on compte les lignes via select echo_id puis agrégation locale.
 * (Si tu as une vue/func SQL de count, on pourra optimiser plus tard sans changer l’API.)
 */
export async function fetchCommentsCountMeta({
  echoIds,
}: {
  echoIds: string[];
}): Promise<Res<{ countById: Record<string, number> }>> {
  if (!echoIds.length) return { ok: true, countById: {} };

  try {
    const q = table('echo_responses').select('echo_id').in('echo_id', echoIds);
    const awaited = (await (q as unknown as Promise<PgRes<unknown>>)) as PgRes<unknown>;
    if (awaited.error) return { ok: false, error: awaited.error.message };

    const rows = (awaited.data ?? []) as Array<{ echo_id?: string | null }>;
    const countById: Record<string, number> = {};

    for (const r of rows) {
      const id = String(r.echo_id ?? '');
      if (!id) continue;
      countById[id] = (countById[id] ?? 0) + 1;
    }

    // contrat stable
    for (const id of echoIds) {
      const k = String(id);
      if (typeof countById[k] !== 'number') countById[k] = 0;
    }

    return { ok: true, countById };
  } catch (e) {
    return { ok: false, error: errMsg(e, 'Erreur compteur commentaires.') };
  }
}

/* ============================================================================
 * LISTE + AUTEUR
 * ============================================================================
 */
export async function fetchComments({
  echoId,
  limit = 50,
  offset = 0,
}: {
  echoId: string;
  limit?: number;
  offset?: number;
}): Promise<Res<{ comments: EchoComment[] }>> {
  try {
    const from = Math.max(0, offset);
    const to = Math.max(from, from + Math.max(1, limit) - 1);

    // Select avec join profiles (PostgREST) si relation existe.
    // SAFE: si le join échoue, on retombe sur une lecture sans author (best-effort via try/catch).
    try {
      const q = table('echo_responses')
        .select('id,echo_id,user_id,content,created_at,profiles:profiles(id,handle,display_name,avatar_url,avatar_seed,identity_mode,avatar_type)')
        .eq('echo_id', echoId)
        .order('created_at', { ascending: false });

      const q2 = q.range ? q.range(from, to) : q;
      const awaited = (await (q2 as unknown as Promise<PgRes<unknown>>)) as PgRes<unknown>;
      if (awaited.error) return { ok: false, error: awaited.error.message };

      const rows = (awaited.data ?? []) as Array<{
        id?: string;
        echo_id?: string;
        user_id?: string;
        content?: string | null;
        created_at?: string;
        profiles?: unknown;
      }>;

      const comments: EchoComment[] = rows
        .map((r) => ({
          id: String(r.id ?? ''),
          echo_id: String(r.echo_id ?? ''),
          user_id: String(r.user_id ?? ''),
          content: String(r.content ?? ''),
          created_at: String(r.created_at ?? ''),
          author: (r.profiles as EchoComment['author']) ?? null,
        }))
        .filter((c) => !!c.id && !!c.echo_id);

      return { ok: true, comments };
    } catch {
      const q = table('echo_responses')
        .select('id,echo_id,user_id,content,created_at')
        .eq('echo_id', echoId)
        .order('created_at', { ascending: false });

      const q2 = q.range ? q.range(from, to) : q;
      const awaited = (await (q2 as unknown as Promise<PgRes<unknown>>)) as PgRes<unknown>;
      if (awaited.error) return { ok: false, error: awaited.error.message };

      const rows = (awaited.data ?? []) as Array<{
        id?: string;
        echo_id?: string;
        user_id?: string;
        content?: string | null;
        created_at?: string;
      }>;

      const comments: EchoComment[] = rows
        .map((r) => ({
          id: String(r.id ?? ''),
          echo_id: String(r.echo_id ?? ''),
          user_id: String(r.user_id ?? ''),
          content: String(r.content ?? ''),
          created_at: String(r.created_at ?? ''),
          author: null,
        }))
        .filter((c) => !!c.id && !!c.echo_id);

      return { ok: true, comments };
    }
  } catch (e) {
    return { ok: false, error: errMsg(e, 'Erreur chargement commentaires.') };
  }
}

/* ============================================================================
 * INSERT
 * ============================================================================
 */
export async function insertComment({
  echoId,
  userId,
  content,
}: {
  echoId: string;
  userId: string;
  content: string;
}): Promise<Res<{ id?: string }>> {
  const msg = (content ?? '').trim();
  if (!msg) return { ok: false, error: 'Message vide.' };

  try {
    const ins = await table('echo_responses').insert({
      echo_id: echoId,
      user_id: userId,
      content: msg,
    });

    if (ins.error) return { ok: false, error: ins.error.message };

    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e, 'Erreur ajout commentaire.') };
  }
}
