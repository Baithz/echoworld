/**
 * =============================================================================
 * Fichier      : lib/echo/actions.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.1.1 (2026-01-22)
 * Objet        : Actions Echo (likes meta, toggle like, share) — typées, SAFE.
 * -----------------------------------------------------------------------------
 * Notes :
 * - Compatible même si la table likes n'existe pas encore (retour ok:false sans crash).
 * - Ne dépend pas de server actions: utilisable côté client.
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.1.1 (2026-01-22)
 * - [FIX] delete() : suppression de maybeSingle() + builder awaitable (TS ok)
 * - [NO-ANY] Wrappers supabase stricts, sans `any`
 * =============================================================================
 */

'use client';

import { supabase } from '@/lib/supabase/client';

type SupabaseErrorLike = { message?: string };

type SupabaseQueryResult<T> = { data: T | null; error: SupabaseErrorLike | null };

/**
 * Builder "awaitable" (thenable) pour permettre :
 *   const res = await sb.from(...).delete().eq(...);
 * sans forcer maybeSingle() (qui n'existe pas sur delete).
 */
type ThenableResult<T> = {
  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2>;
};

type SupabaseSelectFilterBuilder = {
  select: (columns: string) => SupabaseSelectFilterBuilder;
  eq: (column: string, value: string) => SupabaseSelectFilterBuilder;
  in: (column: string, values: string[]) => SupabaseSelectFilterBuilder;
  maybeSingle: () => Promise<SupabaseQueryResult<unknown>>;
};

type SupabaseInsertBuilder = {
  insert: (values: Record<string, unknown> | Array<Record<string, unknown>>) => SupabaseInsertBuilder;
  select: (columns: string) => SupabaseInsertBuilder;
  maybeSingle: () => Promise<SupabaseQueryResult<unknown>>;
};

type SupabaseDeleteFilterBuilder = {
  eq: (column: string, value: string) => SupabaseDeleteFilterBuilder;
} & ThenableResult<SupabaseQueryResult<unknown>>;

type SupabaseDeleteBuilder = {
  delete: () => SupabaseDeleteFilterBuilder;
};

type SupabaseClientLoose = {
  from: (table: string) => SupabaseSelectFilterBuilder & SupabaseInsertBuilder & SupabaseDeleteBuilder;
};

const sb = supabase as unknown as SupabaseClientLoose;

function getErrorMessage(e: unknown): string {
  if (!e) return 'Erreur inconnue.';
  if (typeof e === 'string') return e;
  if (e instanceof Error) return e.message || 'Erreur.';
  if (typeof e === 'object' && e !== null && 'message' in e && typeof (e as { message?: unknown }).message === 'string') {
    return (e as { message: string }).message;
  }
  return 'Erreur.';
}

function errorToMessage(err: SupabaseErrorLike | null): string {
  if (!err) return 'Erreur.';
  if (typeof err.message === 'string' && err.message.trim()) return err.message;
  return 'Erreur.';
}

type EchoLikeRow = { echo_id: string };

export type LikeMetaResult =
  | { ok: true; countById: Record<string, number>; likedByMeById: Record<string, boolean> }
  | { ok: false; error: string };

export async function fetchLikeMeta({
  echoIds,
  userId,
}: {
  echoIds: string[];
  userId: string | null;
}): Promise<LikeMetaResult> {
  if (!echoIds.length) return { ok: true, countById: {}, likedByMeById: {} };

  try {
    // Table: echo_likes (echo_id, user_id, created_at)

    // 1) counts (on récupère toutes les lignes echo_id, puis on compte côté client)
    const resCounts = await sb.from('echo_likes').select('echo_id').in('echo_id', echoIds).maybeSingle();
    if (resCounts.error) return { ok: false, error: errorToMessage(resCounts.error) };

    const rowsAny = resCounts.data;
    const rows = Array.isArray(rowsAny) ? (rowsAny as EchoLikeRow[]) : rowsAny ? ([rowsAny] as EchoLikeRow[]) : [];

    const countById: Record<string, number> = {};
    for (const r of rows) {
      if (r?.echo_id) countById[r.echo_id] = (countById[r.echo_id] ?? 0) + 1;
    }

    // 2) likedByMe
    const likedByMeById: Record<string, boolean> = {};
    if (userId) {
      const resMine = await sb
        .from('echo_likes')
        .select('echo_id')
        .eq('user_id', userId)
        .in('echo_id', echoIds)
        .maybeSingle();

      if (resMine.error) return { ok: false, error: errorToMessage(resMine.error) };

      const mineAny = resMine.data;
      const mine = Array.isArray(mineAny) ? (mineAny as EchoLikeRow[]) : mineAny ? ([mineAny] as EchoLikeRow[]) : [];
      for (const r of mine) {
        if (r?.echo_id) likedByMeById[r.echo_id] = true;
      }
    }

    return { ok: true, countById, likedByMeById };
  } catch (e) {
    return { ok: false, error: getErrorMessage(e) };
  }
}

export type ToggleLikeResult = { ok: true } | { ok: false; error: string };

export async function toggleEchoLike({
  echoId,
  userId,
  nextLiked,
}: {
  echoId: string;
  userId: string;
  nextLiked: boolean;
}): Promise<ToggleLikeResult> {
  if (!echoId || !userId) return { ok: false, error: 'Paramètres invalides.' };

  try {
    if (nextLiked) {
      const res = await sb
        .from('echo_likes')
        .insert({ echo_id: echoId, user_id: userId })
        .select('echo_id')
        .maybeSingle();

      if (res.error) return { ok: false, error: errorToMessage(res.error) };
      return { ok: true };
    }

    // ✅ delete() : PAS de maybeSingle(). On await directement (builder thenable).
    const res = await sb.from('echo_likes').delete().eq('echo_id', echoId).eq('user_id', userId);
    if (res.error) return { ok: false, error: errorToMessage(res.error) };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: getErrorMessage(e) };
  }
}

export type ShareResult = { ok: true; mode: 'native' | 'clipboard' } | { ok: false; error: string };

type NavigatorShareCapable = Navigator & { share?: (data: { url: string }) => Promise<void> };

export async function shareEcho({ echoId }: { echoId: string }): Promise<ShareResult> {
  try {
    const url = `${window.location.origin}/echo/${echoId}`;
    const nav = typeof navigator !== 'undefined' ? (navigator as NavigatorShareCapable) : null;

    if (nav?.share) {
      try {
        await nav.share({ url });
        return { ok: true, mode: 'native' };
      } catch {
        // fallback clipboard si l'user annule
      }
    }

    if (nav?.clipboard?.writeText) {
      await nav.clipboard.writeText(url);
      return { ok: true, mode: 'clipboard' };
    }

    window.prompt('Copiez ce lien :', url);
    return { ok: true, mode: 'clipboard' };
  } catch (e) {
    return { ok: false, error: getErrorMessage(e) };
  }
}
