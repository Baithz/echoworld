// =============================================================================
// Fichier      : lib/messages/startDirectConversation.ts
// Auteur       : Régis KREMER (Baithz) — EchoWorld
// Version      : 1.3.0 (2026-01-24)
// Objet        : Démarrer/ouvrir une conversation DIRECTE (2 membres) — aligné BDD réelle
// -----------------------------------------------------------------------------
// Description  :
// - Cherche une conversation directe existante entre 2 users (optionnel: echoId)
// - Sinon crée la conversation + ajoute les 2 membres
// - Retour backward-compat : res.data.conversationId + retour flat
// - FIX RLS : created_by envoyé UNIQUEMENT si valide (sinon DEFAULT DB)
// -----------------------------------------------------------------------------
// CHANGELOG
// 1.3.0 (2026-01-24)
// - [FIX] RLS 403: created_by envoyé UNIQUEMENT si me est truthy (sinon DEFAULT auth.uid() DB)
// - [DEBUG] Logs ciblés pour tracer auth.getUser() et INSERT payload (env NEXT_PUBLIC_EW_DEBUG=1)
// - [SAFE] Guard strict: si authData.user?.id est null/undefined, retour immédiat "Non authentifié"
// - [KEEP] Signature + shape de retour inchangés (compat callers)
// 1.2.1 (2026-01-24)
// - [FIX] RLS conversations : ajoute created_by = auth.uid() à l'insert (policy conversations_insert_auth)
// - [FIX] ESLint : conserve userId en destructuring (compat callers) sans unused-vars (préfixe _userId)
// - [KEEP] Signature + shape de retour inchangées (compat callers)
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

// Chaîne "souple" pour PostgREST (évite any mais permet les chaînages utiles)
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

// Debug helper (activer via NEXT_PUBLIC_EW_DEBUG=1)
function debugLog(message: string, data?: unknown) {
  try {
    if (process.env.NEXT_PUBLIC_EW_DEBUG !== '1') return;
    console.log(`[startDirectConversation] ${message}`, data ?? '');
  } catch {
    /* noop */
  }
}

function debugError(message: string, err?: unknown) {
  try {
    if (process.env.NEXT_PUBLIC_EW_DEBUG !== '1') return;
    console.error(`[startDirectConversation] ERROR: ${message}`, err ?? '');
  } catch {
    /* noop */
  }
}

export async function startDirectConversation({
  otherUserId,
  echoId = null,
}: {
  userId: string; // compat callers (documenté mais non destructuré)
  otherUserId: string;
  echoId?: string | null;
}): Promise<Res> {
  debugLog('START', { otherUserId, echoId });

  // IMPORTANT: ne jamais faire confiance au userId passé en param (peut être stale)
  const { data: authData, error: authErr } = await supabase.auth.getUser();

  debugLog('supabase.auth.getUser() result', {
    hasUser: Boolean(authData?.user),
    userId: authData?.user?.id ?? null,
    error: authErr?.message ?? null,
  });

  if (authErr) {
    debugError('auth.getUser() failed', authErr);
    return { ok: false, error: authErr.message ?? 'Not authenticated.' };
  }

  const me = (authData.user?.id ?? '').trim();
  const other = (otherUserId ?? '').trim();
  const echo = (echoId ?? null) as string | null;

  // Guard strict: si me est vide, c'est un problème d'auth
  if (!me) {
    debugError('authData.user?.id is empty/null', { authData });
    return { ok: false, error: 'Non authentifié.' };
  }

  if (!other) return { ok: false, error: 'Conversation invalide.' };
  if (me === other) return { ok: false, error: 'Conversation invalide.' };

  debugLog('Valid users', { me, other });

  try {
    // 1) Mes conversation_ids
    const mineRes = (await (table('conversation_members')
      .select('conversation_id')
      .eq('user_id', me) as unknown as Promise<PgRes<unknown>>)) as PgRes<unknown>;

    if (mineRes.error) return { ok: false, error: mineRes.error.message };

    const mineIds = Array.isArray(mineRes.data)
      ? uniq((mineRes.data as MemberRow[]).map((r) => String(r.conversation_id)))
      : [];

    debugLog('My conversation_ids', { count: mineIds.length });

    if (mineIds.length > 0) {
      // 2) Intersection avec other
      const commonRes = (await (table('conversation_members')
        .select('conversation_id')
        .eq('user_id', other)
        .in('conversation_id', mineIds) as unknown as Promise<PgRes<unknown>>)) as PgRes<unknown>;

      if (!commonRes.error && Array.isArray(commonRes.data) && commonRes.data.length > 0) {
        const commonIds = uniq((commonRes.data as MemberRow[]).map((r) => String(r.conversation_id)));

        debugLog('Common conversation_ids', { count: commonIds.length });

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
          debugLog('Found existing conversation (exact match)', { conversationId });
          return {
            ok: true,
            conversationId,
            created: false,
            data: { conversationId, created: false },
          };
        }

        // 3bis) Fallback SAFE : si on peut lire une conv direct (sans echo match), on l'utilise.
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
          debugLog('Found existing conversation (fallback)', { conversationId });
          return {
            ok: true,
            conversationId,
            created: false,
            data: { conversationId, created: false },
          };
        }
      }
    }

    // 4) Créer conversation
    // CRITICAL FIX: N'envoyer created_by QUE si me est truthy
    // Sinon laisser le DEFAULT auth.uid() de la DB s'appliquer
    const insertPayload: Record<string, unknown> = {
      type: 'direct',
      title: null,
      echo_id: echo,
    };

    // Envoyer created_by UNIQUEMENT si me est valide (sinon DEFAULT DB = auth.uid())
    if (me) {
      insertPayload.created_by = me;
    }

    debugLog('INSERT conversations payload', insertPayload);

    const createdRes = await table('conversations')
      .insert(insertPayload)
      .select('id')
      .single();

    if (createdRes.error) {
      const msg = createdRes.error.message ?? 'Création conversation impossible.';
      debugError('INSERT conversations failed', { msg, error: createdRes.error });
      return { ok: false, error: msg.includes('row-level security') ? `RLS: ${msg}` : msg };
    }

    const createdRow = (createdRes.data as { id?: unknown } | null) ?? null;
    const conversationId = String(createdRow?.id ?? '').trim();

    debugLog('INSERT conversations success', { conversationId });

    if (!conversationId) {
      debugError('Conversation created but id not found', { createdRow });
      return { ok: false, error: 'Conversation créée mais id introuvable.' };
    }

    // 5) Membres
    debugLog('INSERT conversation_members', { conversationId, me, other });

    const membersRes = await table('conversation_members')
      .insert([
        { conversation_id: conversationId, user_id: me, role: 'member' },
        { conversation_id: conversationId, user_id: other, role: 'member' },
      ])
      .select('conversation_id')
      .maybeSingle();

    if (membersRes.error) {
      debugError('INSERT conversation_members failed', membersRes.error);
      return { ok: false, error: membersRes.error.message ?? 'Ajout des membres impossible.' };
    }

    debugLog('Conversation created successfully', { conversationId, created: true });

    return {
      ok: true,
      conversationId,
      created: true,
      data: { conversationId, created: true },
    };
  } catch (e) {
    debugError('Unexpected error', e);
    return { ok: false, error: errMsg(e, 'Erreur conversation.') };
  }
}