/**
 * =============================================================================
 * Fichier      : app/api/conversations/create/route.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.2 (2026-01-25)
 * Objet        : API Route pour créer des conversations directes (RLS garanti)
 * -----------------------------------------------------------------------------
 * Description  :
 * - Crée une conversation directe entre 2 users via client Supabase serveur
 * - Session serveur (cookies) OU token Authorization header
 * - RLS policy conversations_insert_auth respectée (created_by = auth.uid())
 * - Cherche conversation existante avant de créer
 * - Ajoute les 2 membres dans conversation_members
 * 
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.0.2 (2026-01-25)
 * - [FIX] RLS 500: Ajoute created_by = me dans TOUS les INSERT (session serveur ET Authorization header)
 * - [CRITICAL] Sans created_by explicite, policy conversations_insert_auth refuse (created_by = auth.uid())
 * - [KEEP] Logique création/recherche conversation inchangée
 * 1.0.1 (2026-01-25)
 * - [FIX] Accepte access_token dans Authorization header (fallback si pas de cookies)
 * - [SAFE] Priorité: cookies serveur > Authorization header
 * - [KEEP] Logique création/recherche conversation inchangée
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
    // 1. Client Supabase serveur
    const supabase = await createSupabaseServerClient();

    // 2. Essayer d'abord la session serveur (cookies)
    let userData;
    const { data: userDataTemp, error: authError } = await supabase.auth.getUser();
    userData = userDataTemp;
    
    // Si pas de session serveur, essayer le token dans Authorization header
    if (authError || !userData?.user) {
      const authHeader = req.headers.get('Authorization');
      
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        
        // Créer un client avec le token explicite
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        
        const supabaseWithToken = createClient(supabaseUrl, supabaseAnonKey, {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        });
        
        const { data: tokenUserData, error: tokenError } = await supabaseWithToken.auth.getUser();
        
        if (tokenError || !tokenUserData?.user) {
          return NextResponse.json(
            { ok: false, error: 'Token invalide ou expiré' },
            { status: 401 }
          );
        }
        
        // Utiliser ce client pour le reste de la requête
        userData = tokenUserData;
        
        // Refaire l'INSERT avec le client authentifié par token
        const me = userData.user.id;
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

        // Chercher conversation existante
        const { data: myMemberships } = await supabaseWithToken
          .from('conversation_members')
          .select('conversation_id')
          .eq('user_id', me);

        if (myMemberships && myMemberships.length > 0) {
          const myConvIds = myMemberships.map((m) => m.conversation_id);

          const { data: commonMemberships } = await supabaseWithToken
            .from('conversation_members')
            .select('conversation_id')
            .eq('user_id', other)
            .in('conversation_id', myConvIds);

          if (commonMemberships && commonMemberships.length > 0) {
            const commonConvIds = commonMemberships.map((m) => m.conversation_id);

            const { data: existingConv } = await supabaseWithToken
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

            const { data: fallbackConv } = await supabaseWithToken
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

        // Créer nouvelle conversation
        const { data: newConv, error: convError } = await supabaseWithToken
          .from('conversations')
          .insert({
            type: 'direct',
            title: null,
            created_by: me, // ✅ CRITICAL: requis pour RLS policy
            echo_id: echoId,
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

        const { error: membersError } = await supabaseWithToken
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
      }
      
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
    const { data: newConv, error: convError } = await supabase
      .from('conversations')
      .insert({
        type: 'direct',
        title: null,
        created_by: me, // ✅ CRITICAL: requis pour RLS policy
        echo_id: echoId,
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