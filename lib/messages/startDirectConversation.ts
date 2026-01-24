// =============================================================================
// Fichier      : lib/messages/startDirectConversation.ts
// Auteur       : Régis KREMER (Baithz) — EchoWorld
// Version      : 1.2.0 (2026-01-24)
// Objet        : Démarrer/ouvrir une conversation DIRECTE (2 membres) — aligné BDD réelle
// -----------------------------------------------------------------------------
// Description  :
// - Cherche une conversation directe existante entre 2 users (optionnel: echoId)
// - Sinon crée la conversation + ajoute les 2 membres
// - Retour backward-compat : res.data.conversationId + retour flat
// -----------------------------------------------------------------------------
// CHANGELOG
// 1.2.0 (2026-01-24)
// - [FIX] Insert conversations : récupère toujours l’id via .select('id').single()
// - [IMPROVED] Typage Chain : insert() renvoie Chain pour chaînage select/single
// - [SAFE] Fallback conv commune : uniquement si conv direct lisible, sinon création
// - [KEEP] Signature + shape de retour inchangées (compat callers)
// 1.1.1 (2026-01-24)
// - [FIX] Backward-compat : conserve res.data.conversationId (anciens callers)
// - [KEEP] Conserve aussi le retour flat { ok, conversationId, created } (nouveaux callers)
// =============================================================================

import { supabase } from '@/lib/supabase/client';

type Ko = { ok: false; error?: string };

type Ok = {
  ok: true;
  conversationId: string;
  created: boolean;
  data: { conversationId: string; created: boolean };
};

type Res = Ok | Ko;

function errMsg(e: unknown, fallback: string): string {
  if (!e) return fallback;
  if (typeof e === 'string') return e;
  if (e instanceof Error) return e.message || fallback;
  const anyE = e as { message?: unknown };
  if (typeof anyE?.message === 'string') return anyE.message;
  return fallback;
}

type PgErr = { message?: string } | null;
type PgRes<T> = { data: T | null; error: PgErr };

// Chaîne “souple” pour PostgREST (évite any mais permet les chaînages utiles)
type Chain = {
  select: (columns: string, opts?: unknown) => Chain;
  eq: (column: string, value: unknown) => Chain;
  in: (column: string, values: readonly unknown[]) => Chain;
  order: (column: string, opts?: unknown) => Chain;
  limit: (n: number) => Chain;

  // executions
  maybeSingle: () => Promise<PgRes<unknown>>;
  single: () => Promise<PgRes<unknown>>;

  // mutations (retournent une Chain pour pouvoir .select().single())
  insert: (values: unknown, opts?: unknown) => Chain;
};

function table(name: string): Chain {
  return (supabase.from(name) as unknown) as Chain;
}

type ConvRow = { id: string; type: string; echo_id: string | null; updated_at?: string | null };
type MemberRow = { conversation_id: string };

function uniq(arr: string[]): string[] {
  return Array.from(new Set(arr.filter(Boolean)));
}

export async function startDirectConversation({
  userId,
  otherUserId,
  echoId = null,
}: {
  userId: string;
  otherUserId: string;
  echoId?: string | null;
}): Promise<Res> {
  const me = (userId ?? '').trim();
  const other = (otherUserId ?? '').trim();
  const echo = (echoId ?? null) as string | null;

  if (!me || !other) return { ok: false, error: 'Conversation invalide.' };
  if (me === other) return { ok: false, error: 'Conversation invalide.' };

  try {
    // 1) Mes conversation_ids
    const mineRes = (await (table('conversation_members')
      .select('conversation_id')
      .eq('user_id', me) as unknown as Promise<PgRes<unknown>>)) as PgRes<unknown>;

    if (mineRes.error) return { ok: false, error: mineRes.error.message };

    const mineIds = Array.isArray(mineRes.data)
      ? uniq((mineRes.data as MemberRow[]).map((r) => String(r.conversation_id)))
      : [];

    if (mineIds.length > 0) {
      // 2) Intersection avec other
      const commonRes = (await (table('conversation_members')
        .select('conversation_id')
        .eq('user_id', other)
        .in('conversation_id', mineIds) as unknown as Promise<PgRes<unknown>>)) as PgRes<unknown>;

      if (!commonRes.error && Array.isArray(commonRes.data) && commonRes.data.length > 0) {
        const commonIds = uniq((commonRes.data as MemberRow[]).map((r) => String(r.conversation_id)));

        // 3) Chercher la conv DIRECT alignée (type=direct + echo_id)
        const q = table('conversations')
          .select('id,type,echo_id,updated_at')
          .in('id', commonIds)
          .eq('type', 'direct')
          .eq('echo_id', echo)
          .order('updated_at', { ascending: false })
          .limit(1);

        const qRes = await q.maybeSingle();
        if (!qRes.error && qRes.data) {
          const c = qRes.data as ConvRow;
          const conversationId = String(c.id);
          return {
            ok: true,
            conversationId,
            created: false,
            data: { conversationId, created: false },
          };
        }

        // 3bis) Fallback SAFE : si on peut lire une conv direct (sans echo match), on l’utilise.
        // (évite de renvoyer une conv non-direct par accident)
        const q2 = table('conversations')
          .select('id,type,echo_id,updated_at')
          .in('id', commonIds)
          .eq('type', 'direct')
          .order('updated_at', { ascending: false })
          .limit(1);

        const q2Res = await q2.maybeSingle();
        if (!q2Res.error && q2Res.data) {
          const c = q2Res.data as ConvRow;
          const conversationId = String(c.id);
          return {
            ok: true,
            conversationId,
            created: false,
            data: { conversationId, created: false },
          };
        }
      }
    }

    // 4) Créer conversation (récupérer l'id de façon fiable)
    const createdRes = await table('conversations')
      .insert({
        type: 'direct',
        title: null,
        created_by: me,
        echo_id: echo,
      })
      .select('id')
      .single();

    if (createdRes.error) {
      return { ok: false, error: createdRes.error.message ?? 'Création conversation impossible.' };
    }

    const createdRow = (createdRes.data as { id?: unknown } | null) ?? null;
    const conversationId = String(createdRow?.id ?? '').trim();
    if (!conversationId) return { ok: false, error: 'Conversation créée mais id introuvable.' };

    // 5) Membres
    const membersRes = await table('conversation_members')
      .insert([
        { conversation_id: conversationId, user_id: me, role: 'member' },
        { conversation_id: conversationId, user_id: other, role: 'member' },
      ])
      .select('conversation_id')
      .maybeSingle();

    if (membersRes.error) {
      return { ok: false, error: membersRes.error.message ?? 'Ajout des membres impossible.' };
    }

    return {
      ok: true,
      conversationId,
      created: true,
      data: { conversationId, created: true },
    };
  } catch (e) {
    return { ok: false, error: errMsg(e, 'Erreur conversation.') };
  }
}
