/**
 * =============================================================================
 * Fichier      : app/api/conversations/create/route.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-25)
 * Objet        : API Route pour créer des conversations directes (RLS garanti)
 * -----------------------------------------------------------------------------
 * Description  :
 * - Crée une conversation directe entre 2 users via client Supabase serveur
 * - Session serveur (cookies) → JWT valide garanti
 * - RLS policy conversations_insert_auth respectée (created_by = auth.uid())
 * - Cherche conversation existante avant de créer
 * - Ajoute les 2 membres dans conversation_members
 * 
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.0.0 (2026-01-25)
 * - [NEW] Route API serveur pour contourner problème JWT client expiré
 * - [SAFE] Session serveur (cookies) → auth.uid() valide dans DEFAULT DB
 * - [KEEP] Logique identique à startDirectConversation (cherche existante puis crée)
 * =============================================================================
 */

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type RequestBody = {
  otherUserId: string;
  echoId?: string | null;
};

export async function POST(req: Request) {
  try {
    // 1. Client Supabase serveur (session via cookies)
    const supabase = await createSupabaseServerClient();

    // 2. Vérifier l'auth
    const { data: userData, error: authError } = await supabase.auth.getUser();
    
    if (authError || !userData?.user) {
      return NextResponse.json(
        { ok: false, error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const me = userData.user.id;

    // 3. Parse body
    const body = (await req.json().catch(() => ({}))) as RequestBody;
    const other = body.otherUserId?.trim();
    const echoId = body.echoId || null;

    if (!other) {
      return NextResponse.json(
        { ok: false, error: 'otherUserId requis' },
        { status: 400 }
      );
    }

    if (me === other) {
      return NextResponse.json(
        { ok: false, error: 'Impossible de créer une conversation avec soi-même' },
        { status: 400 }
      );
    }

    // 4. Chercher conversation existante
    const { data: myMemberships } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', me);

    if (myMemberships && myMemberships.length > 0) {
      const myConvIds = myMemberships.map((m) => m.conversation_id);

      const { data: commonMemberships } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', other)
        .in('conversation_id', myConvIds);

      if (commonMemberships && commonMemberships.length > 0) {
        const commonConvIds = commonMemberships.map((m) => m.conversation_id);

        // Chercher conv direct avec echo_id match
        const { data: existingConv } = await supabase
          .from('conversations')
          .select('id')
          .in('id', commonConvIds)
          .eq('type', 'direct')
          .eq('echo_id', echoId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingConv) {
          return NextResponse.json({
            ok: true,
            conversationId: existingConv.id,
            created: false,
          });
        }

        // Fallback: chercher conv direct sans echo match
        const { data: fallbackConv } = await supabase
          .from('conversations')
          .select('id')
          .in('id', commonConvIds)
          .eq('type', 'direct')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (fallbackConv) {
          return NextResponse.json({
            ok: true,
            conversationId: fallbackConv.id,
            created: false,
          });
        }
      }
    }

    // 5. Créer nouvelle conversation
    // CRITICAL: Ne PAS envoyer created_by → le DEFAULT auth.uid() de la DB s'appliquera
    // avec le JWT serveur valide
    const { data: newConv, error: convError } = await supabase
      .from('conversations')
      .insert({
        type: 'direct',
        title: null,
        echo_id: echoId,
        // created_by: me, ← NE PAS METTRE, laisser le DEFAULT DB
      })
      .select('id')
      .single();

    if (convError || !newConv) {
      console.error('[API conversations/create] Insert error:', convError);
      return NextResponse.json(
        { ok: false, error: convError?.message || 'Erreur création conversation' },
        { status: 500 }
      );
    }

    const conversationId = newConv.id;

    // 6. Ajouter les membres
    const { error: membersError } = await supabase
      .from('conversation_members')
      .insert([
        { conversation_id: conversationId, user_id: me, role: 'member' },
        { conversation_id: conversationId, user_id: other, role: 'member' },
      ]);

    if (membersError) {
      console.error('[API conversations/create] Members error:', membersError);
      return NextResponse.json(
        { ok: false, error: 'Erreur ajout membres' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      conversationId,
      created: true,
    });
  } catch (error) {
    console.error('[API conversations/create] Exception:', error);
    return NextResponse.json(
      { ok: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}