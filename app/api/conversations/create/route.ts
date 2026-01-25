/**
 * =============================================================================
 * Fichier      : app/api/conversations/create/route.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.1.0 (2026-01-25)
 * Objet        : API Route création conversations directes — SERVICE ROLE blindé (prod-safe)
 * -----------------------------------------------------------------------------
 * Description  :
 * - Authentifie l’appel via Bearer token (Authorization header) en utilisant l'ANON key
 * - Écrit en base avec SERVICE ROLE (bypass RLS) pour éliminer les soucis SSR/cookies/localStorage
 * - Sécurité garantie côté serveur :
 *    - refuse si pas de token / token invalide
 *    - impose created_by = me (issu du token)
 *    - empêche conversation avec soi-même
 * - Cherche une conversation directe existante avant de créer
 * - Ajoute les 2 membres dans conversation_members (idempotent via upsert)
 *
 * IMPORTANT
 * - Requiert SUPABASE_SERVICE_ROLE_KEY côté serveur (Vercel/ENV)
 * - Ne dépend plus des cookies SSR pour DM : stable en prod
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.1.0 (2026-01-25)
 * - [RECO] Mode "service-role blindé" : write DB via service role (bypass RLS)
 * - [SECURITY] Vérifie Bearer token (anon) puis force created_by = me
 * - [SAFE] Recherche existante conservée + ajout membres via upsert (idempotent)
 * - [FIX] Élimine définitivement les erreurs RLS (500/403) liées au contexte SSR
 * =============================================================================
 */

import { NextResponse } from 'next/server';

type RequestBody = {
  otherUserId: string;
  echoId?: string | null;
};

function debugLog(message: string, data?: unknown) {
  try {
    if (process.env.NEXT_PUBLIC_EW_DEBUG !== '1') return;
    console.log(`[API conversations/create] ${message}`, data ?? '');
  } catch {
    /* noop */
  }
}

function debugError(message: string, err?: unknown) {
  try {
    if (process.env.NEXT_PUBLIC_EW_DEBUG !== '1') return;
    console.error(`[API conversations/create] ERROR: ${message}`, err ?? '');
  } catch {
    /* noop */
  }
}

function getBearerToken(req: Request): string | null {
  const h = req.headers.get('Authorization') ?? req.headers.get('authorization');
  if (!h) return null;
  const v = h.trim();
  if (!v.toLowerCase().startsWith('bearer ')) return null;
  const token = v.slice(7).trim();
  return token || null;
}

export async function POST(req: Request) {
  try {
    // -------------------------------------------------------------------------
    // 0) Parse body
    // -------------------------------------------------------------------------
    const body = (await req.json().catch(() => ({}))) as RequestBody;
    const other = (body.otherUserId ?? '').trim();
    const echoId = (body.echoId ?? null) as string | null;

    if (!other) {
      return NextResponse.json({ ok: false, error: 'otherUserId requis' }, { status: 400 });
    }

    // -------------------------------------------------------------------------
    // 1) Auth: Bearer token obligatoire (source of truth)
    // -------------------------------------------------------------------------
    const token = getBearerToken(req);
    if (!token) {
      return NextResponse.json({ ok: false, error: 'Non authentifié (token manquant)' }, { status: 401 });
    }

    const { createClient } = await import('@supabase/supabase-js');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

    if (!supabaseUrl || !supabaseAnonKey) {
      debugError('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY', {});
      return NextResponse.json({ ok: false, error: 'Configuration serveur manquante' }, { status: 500 });
    }

    if (!serviceRoleKey) {
      debugError('Missing SUPABASE_SERVICE_ROLE_KEY', {});
      return NextResponse.json({ ok: false, error: 'Configuration serveur manquante (service role)' }, { status: 500 });
    }

    // Client "auth" (ANON) pour valider le token
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data: userData, error: tokenErr } = await supabaseAuth.auth.getUser();
    const me = (userData?.user?.id ?? '').trim();

    debugLog('auth.getUser()', { ok: !tokenErr, hasUser: Boolean(me), error: tokenErr?.message ?? null });

    if (tokenErr || !me) {
      return NextResponse.json({ ok: false, error: 'Token invalide ou expiré' }, { status: 401 });
    }

    if (me === other) {
      return NextResponse.json({ ok: false, error: 'Impossible de créer une conversation avec soi-même' }, { status: 400 });
    }

    // -------------------------------------------------------------------------
    // 2) Client "write" (SERVICE ROLE) — bypass RLS
    // -------------------------------------------------------------------------
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    // -------------------------------------------------------------------------
    // 3) Chercher conversation existante (direct entre me & other)
    //    - priorité : echo_id match
    //    - fallback : direct sans echo match
    // -------------------------------------------------------------------------
    // convIds où me est membre
    const { data: mine, error: mineErr } = await supabaseAdmin
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', me);

    if (mineErr) {
      debugError('Load my memberships failed', mineErr);
      return NextResponse.json({ ok: false, error: 'Erreur chargement conversations' }, { status: 500 });
    }

    const myConvIds = Array.isArray(mine) ? mine.map((m) => m.conversation_id).filter(Boolean) : [];

    if (myConvIds.length > 0) {
      const { data: common, error: commonErr } = await supabaseAdmin
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', other)
        .in('conversation_id', myConvIds);

      if (commonErr) {
        debugError('Load common memberships failed', commonErr);
        return NextResponse.json({ ok: false, error: 'Erreur chargement conversations' }, { status: 500 });
      }

      const commonConvIds = Array.isArray(common) ? common.map((m) => m.conversation_id).filter(Boolean) : [];

      if (commonConvIds.length > 0) {
        // exact match (echo_id)
        const exact = await supabaseAdmin
          .from('conversations')
          .select('id')
          .in('id', commonConvIds)
          .eq('type', 'direct')
          .eq('echo_id', echoId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!exact.error && exact.data?.id) {
          return NextResponse.json({ ok: true, conversationId: exact.data.id, created: false });
        }

        // fallback (no echo match)
        const fb = await supabaseAdmin
          .from('conversations')
          .select('id')
          .in('id', commonConvIds)
          .eq('type', 'direct')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!fb.error && fb.data?.id) {
          return NextResponse.json({ ok: true, conversationId: fb.data.id, created: false });
        }
      }
    }

    // -------------------------------------------------------------------------
    // 4) Créer conversation (service role) + membres (upsert idempotent)
    // -------------------------------------------------------------------------
    const { data: newConv, error: convError } = await supabaseAdmin
      .from('conversations')
      .insert({
        type: 'direct',
        title: null,
        created_by: me, // sécurité: imposé côté serveur
        echo_id: echoId,
      })
      .select('id')
      .single();

    if (convError || !newConv?.id) {
      debugError('Insert conversations failed', convError);
      return NextResponse.json(
        { ok: false, error: convError?.message || 'Erreur création conversation' },
        { status: 500 }
      );
    }

    const conversationId = newConv.id;

    // Upsert membres (évite doublons si double-clic / retry)
    const { error: membersError } = await supabaseAdmin
      .from('conversation_members')
      .upsert(
        [
          { conversation_id: conversationId, user_id: me, role: 'member' },
          { conversation_id: conversationId, user_id: other, role: 'member' },
        ],
        { onConflict: 'conversation_id,user_id' }
      );

    if (membersError) {
      debugError('Upsert conversation_members failed', membersError);
      return NextResponse.json({ ok: false, error: 'Erreur ajout membres' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, conversationId, created: true });
  } catch (error) {
    debugError('Exception', error);
    return NextResponse.json({ ok: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
