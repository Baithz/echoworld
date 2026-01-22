// =============================================================================
// Fichier      : lib/messages/startDirectConversation.ts
// Auteur       : Régis KREMER (Baithz) — EchoWorld
// Version      : 1.0.1 (2026-01-22)
// Objet        : Démarrer/ouvrir une conversation DIRECTE (2 membres) — client
// -----------------------------------------------------------------------------
// FIX v1.0.1
// - [FIX] TS "never" sur insert/select (tables non présentes dans Database types)
// - [SAFE] Logique métier inchangée (recherche conv existante + création + membres)
// =============================================================================

import { supabase } from '@/lib/supabase/client';

type Res<T> = { ok: true; data: T } | { ok: false; error?: string };

function errMsg(e: unknown, fallback: string): string {
  if (!e) return fallback;
  if (typeof e === 'string') return e;
  if (e instanceof Error) return e.message || fallback;
  const anyE = e as { message?: unknown };
  if (typeof anyE?.message === 'string') return anyE.message;
  return fallback;
}

/* ============================================================================
 * HELPERS — neutralise le "never" des generics Supabase
 * (quand Database n'inclut pas les tables)
 * ============================================================================
 */
type PostgrestErrorLike = { message?: string } | null;
type PostgrestResultLike<T> = { data: T | null; error: PostgrestErrorLike };

// Builder minimal : chain + await (thenable)
type AnyQuery = PromiseLike<PostgrestResultLike<unknown>> & {
  select: (columns: string) => AnyQuery;
  eq: (column: string, value: unknown) => AnyQuery;
  in: (column: string, values: readonly unknown[]) => AnyQuery;
  order: (column: string, opts?: { ascending?: boolean }) => AnyQuery;
  insert: (values: unknown) => AnyQuery;
  delete: () => AnyQuery;
  update: (values: unknown) => AnyQuery;
  single: () => Promise<PostgrestResultLike<unknown>>;
  maybeSingle: () => Promise<PostgrestResultLike<unknown>>;
};

function table(name: string): AnyQuery {
  return supabase.from(name) as unknown as AnyQuery;
}

export async function startDirectConversation({
  userId,
  otherUserId,
}: {
  userId: string;
  otherUserId: string;
}): Promise<Res<{ conversationId: string }>> {
  if (userId === otherUserId) return { ok: false, error: 'Conversation invalide.' };

  try {
    // 1) conv ids du user
    const qMine = table('conversation_members')
      .select('conversation_id')
      .eq('user_id', userId);

    const { data: mine, error: e1 } = await qMine;
    if (e1) return { ok: false, error: e1.message };

    const mineIds = ((mine ?? []) as unknown as { conversation_id: string }[]).map(
      (r) => r.conversation_id
    );

    if (mineIds.length) {
      // 2) intersection avec otherUserId
      const qCommon = table('conversation_members')
        .select('conversation_id')
        .eq('user_id', otherUserId)
        .in('conversation_id', mineIds);

      const { data: common, error: e2 } = await qCommon;

      if (!e2 && common && (common as unknown[]).length) {
        const convId = String((common as unknown as { conversation_id: string }[])[0].conversation_id);

        // 3) vérifier "direct" si possible (fail-soft)
        const { data: conv, error: e3 } = await table('conversations')
          .select('id,type')
          .eq('id', convId)
          .maybeSingle();

        if (!e3 && conv) {
          const t = (conv as unknown as { type?: unknown }).type;
          if (t === 'direct') {
            return { ok: true, data: { conversationId: convId } };
          }
        }

        // Si colonne absente / non vérifiable : on renvoie quand même la conv trouvée
        return { ok: true, data: { conversationId: convId } };
      }
    }

    // 4) créer conversation
    const { data: created, error: e4 } = await table('conversations')
      .insert({
        type: 'direct',
        title: null,
        created_by: userId,
      })
      .select('id')
      .single();

    if (e4 || !created) {
      return { ok: false, error: e4?.message ?? 'Création conversation impossible.' };
    }

    const conversationId = String((created as unknown as { id: string }).id);

    // 5) créer membres
    const { error: e5 } = await table('conversation_members').insert([
      { conversation_id: conversationId, user_id: userId, role: 'member' },
      { conversation_id: conversationId, user_id: otherUserId, role: 'member' },
    ]);

    if (e5) return { ok: false, error: e5.message };

    return { ok: true, data: { conversationId } };
  } catch (e) {
    return { ok: false, error: errMsg(e, 'Erreur conversation.') };
  }
}
