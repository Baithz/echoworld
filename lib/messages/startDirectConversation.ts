// =============================================================================
// Fichier      : lib/messages/startDirectConversation.ts
// Auteur       : Régis KREMER (Baithz) — EchoWorld
// Version      : 1.1.1 (2026-01-24)
// Objet        : Démarrer/ouvrir une conversation DIRECTE (2 membres) — aligné BDD réelle
// -----------------------------------------------------------------------------
// FIX v1.1.1
// - [FIX] Backward-compat : conserve res.data.conversationId (anciens callers)
// - [KEEP] Conserve aussi le retour flat { ok, conversationId, created } (nouveaux callers)
// =============================================================================

import { supabase } from '@/lib/supabase/client';

type Ko = { ok: false; error?: string };

// ✅ OK: flat + data (compat)
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

type Chain = {
  select: (...args: unknown[]) => Chain;
  insert: (values: unknown) => Promise<PgRes<unknown>>;
  eq: (...args: unknown[]) => Chain;
  in: (...args: unknown[]) => Chain;
  order: (...args: unknown[]) => Chain;
  limit: (n: number) => Chain;
  maybeSingle: () => Promise<PgRes<unknown>>;
};

function table(name: string): Chain {
  return (supabase.from(name) as unknown) as Chain;
}

type ConvRow = { id: string; type: string; echo_id: string | null };
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

  if (!me || !other) return { ok: false, error: 'Conversation invalide.' };
  if (me === other) return { ok: false, error: 'Conversation invalide.' };

  try {
    // 1) mes conv ids
    const mineRes = (await (table('conversation_members')
      .select('conversation_id')
      .eq('user_id', me) as unknown as Promise<PgRes<unknown>>)) as PgRes<unknown>;

    if (mineRes.error) return { ok: false, error: mineRes.error.message };

    const mineIds = Array.isArray(mineRes.data)
      ? uniq((mineRes.data as MemberRow[]).map((r) => String(r.conversation_id)))
      : [];

    if (mineIds.length > 0) {
      // 2) intersection avec other
      const commonRes = (await (table('conversation_members')
        .select('conversation_id')
        .eq('user_id', other)
        .in('conversation_id', mineIds) as unknown as Promise<PgRes<unknown>>)) as PgRes<unknown>;

      if (!commonRes.error && Array.isArray(commonRes.data) && commonRes.data.length > 0) {
        const commonIds = uniq((commonRes.data as MemberRow[]).map((r) => String(r.conversation_id)));

        // 3) vérifier conv direct + echo_id aligné
        const q = table('conversations')
          .select('id,type,echo_id,updated_at')
          .in('id', commonIds)
          .eq('type', 'direct')
          .eq('echo_id', echoId)
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

        // fail-soft: renvoyer quand même une conv commune
        const fallbackId = commonIds[0];
        if (fallbackId) {
          return {
            ok: true,
            conversationId: fallbackId,
            created: false,
            data: { conversationId: fallbackId, created: false },
          };
        }
      }
    }

    // 4) créer conversation
    const createdRes = await table('conversations').insert({
      type: 'direct',
      title: null,
      created_by: me,
      echo_id: echoId,
    });

    if (createdRes.error) {
      return { ok: false, error: createdRes.error.message ?? 'Création conversation impossible.' };
    }

    const createdRow = (createdRes.data as { id?: unknown } | null) ?? null;
    const conversationId = String(createdRow?.id ?? '').trim();
    if (!conversationId) return { ok: false, error: 'Conversation créée mais id introuvable.' };

    // 5) membres
    const membersRes = await table('conversation_members').insert([
      { conversation_id: conversationId, user_id: me, role: 'member' },
      { conversation_id: conversationId, user_id: other, role: 'member' },
    ]);

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
