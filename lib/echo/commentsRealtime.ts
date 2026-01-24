/**
 * =============================================================================
 * Fichier      : lib/echo/commentsRealtime.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.1.1 (2026-01-24)
 * Objet        : Realtime commentaires — abonnement INSERT echo_responses (SAFE)
 * -----------------------------------------------------------------------------
 * Description  :
 * - Abonnement Supabase Realtime sur public.echo_responses (event INSERT)
 * - Signal léger: callback onInsert(payloadMinimal) (PHASE 3bis compatible)
 * - Payload minimal typé (id/echo_id/user_id/created_at) pour anti double-compte
 * - Nettoyage robustifié: unsubscribe + removeChannel best-effort
 * - Zéro régression: compatible ancienne signature onInsert() via wrapper
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.1.1 (2026-01-24)
 * - [FIX] Payload minimal: utilise user_id (et fallback author_id) au lieu de author_id seul
 * - [SAFE] Zéro régression: signature onInsert(p?) inchangée, payload optionnel
 * -----------------------------------------------------------------------------
 * 1.1.0 (2026-01-24)
 * - [PHASE3bis] Expose un payload minimal (optionnel) pour permettre "skip self" côté UI
 * - [SAFE] Ignore tout le reste du payload, aucun cast métier
 * - [KEEP] Abonnement table/filtre inchangés
 * =============================================================================
 */

import type { RealtimeChannel, RealtimePostgresInsertPayload } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';

export type CommentInsertPayload = {
  id: string;
  echo_id: string;
  user_id: string; // auteur du commentaire (colonne réelle côté table)
  created_at: string;
};

function pickMinimal(
  payload: RealtimePostgresInsertPayload<Record<string, unknown>>
): CommentInsertPayload | null {
  const n = payload.new ?? null;
  if (!n) return null;

  const row = n as Record<string, unknown>;

  const id = String(row.id ?? '').trim();
  const echo_id = String(row.echo_id ?? '').trim();

  // Table attendue: user_id. Fallback SAFE si un schéma legacy expose author_id.
  const user_id = String(row.user_id ?? row.author_id ?? '').trim();

  const created_at = String(row.created_at ?? '').trim();

  if (!id || !echo_id || !created_at) return null;

  return { id, echo_id, user_id, created_at };
}

/**
 * API: onInsert(payloadMinimal?)
 * - PHASE 3bis: tu peux passer () => void, le param est optionnel.
 */
export function subscribeEchoComments(echoId: string, onInsert: (p?: CommentInsertPayload) => void) {
  if (!echoId) return () => {};

  const channel: RealtimeChannel = supabase
    .channel(`echo-comments-${echoId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'echo_responses',
        filter: `echo_id=eq.${echoId}`,
      },
      (payload) => {
        // SAFE: on ne “consomme” pas le payload brut, on réduit au strict minimum.
        const minimal = pickMinimal(payload as RealtimePostgresInsertPayload<Record<string, unknown>>);
        onInsert(minimal ?? undefined);
      }
    )
    .subscribe();

  return () => {
    try {
      void channel.unsubscribe();
      const anySb = supabase as unknown as { removeChannel?: (c: RealtimeChannel) => Promise<unknown> };
      void anySb.removeChannel?.(channel);
    } catch {
      /* noop */
    }
  };
}
