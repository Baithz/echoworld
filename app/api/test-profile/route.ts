// =============================================================================
// Fichier      : app/api/test-profile/route.ts
// Auteur       : Régis KREMER (Baithz) – EchoWorld
// Version      : 1.0.0 (2026-01-23)
// Objet        : Endpoint de diagnostic pour tester l'accès aux profils publics
// -----------------------------------------------------------------------------
// Usage        : GET /api/test-profile
// Purpose      : Diagnostiquer pourquoi les profils publics retournent 404
// À SUPPRIMER  : Une fois le problème résolu (ne pas garder en production)
// =============================================================================

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const testId = searchParams.get('id') || 'bfc062ff-c92e-4805-870e-1d64c5212d67';
  const testHandle = searchParams.get('handle') || 'pouete';

  try {
    const supabase = await createSupabaseServerClient();
    
    // Test 1 : Configuration Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Test 2 : Lire les profils publics (top 5)
    const { data: publicProfiles, error: publicError } = await supabase
      .from('profiles')
      .select('id, handle, display_name, public_profile_enabled')
      .eq('public_profile_enabled', true)
      .limit(5);

    // Test 3 : Lire un profil spécifique par ID
    const { data: profileById, error: byIdError } = await supabase
      .from('profiles')
      .select('id, handle, display_name, public_profile_enabled, created_at')
      .eq('id', testId)
      .maybeSingle();

    // Test 4 : Lire un profil spécifique par handle (case-insensitive)
    const { data: profileByHandle, error: byHandleError } = await supabase
      .from('profiles')
      .select('id, handle, display_name, public_profile_enabled, created_at')
      .ilike('handle', testHandle)
      .maybeSingle();

    // Test 5 : Vérifier RLS policies (via requête admin)
    const { data: allProfiles, error: allError } = await supabase
      .from('profiles')
      .select('id, handle, public_profile_enabled')
      .limit(10);

    // Test 6 : Compter les profils publics
    const { count, error: countError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('public_profile_enabled', true);

    // Test 7 : Vérifier les échos publics du profil
    let publicEchoes = null;
    let echoesError = null;
    
    if (profileById?.id) {
      const echoesResult = await supabase
        .from('echoes')
        .select('id, title, status, visibility, user_id')
        .eq('user_id', profileById.id)
        .eq('status', 'published')
        .in('visibility', ['world', 'local'])
        .limit(5);
      
      publicEchoes = echoesResult.data;
      echoesError = echoesResult.error;
    }

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      config: {
        supabase_url: supabaseUrl,
        has_anon_key: hasAnonKey,
        node_env: process.env.NODE_ENV,
      },
      tests: {
        test1_public_profiles_list: {
          count: publicProfiles?.length ?? 0,
          data: publicProfiles,
          error: publicError?.message || null,
          success: !publicError && publicProfiles !== null,
        },
        test2_profile_by_id: {
          query: `id = ${testId}`,
          data: profileById,
          error: byIdError?.message || null,
          success: !byIdError && profileById !== null,
          is_public: profileById?.public_profile_enabled === true,
        },
        test3_profile_by_handle: {
          query: `handle ilike ${testHandle}`,
          data: profileByHandle,
          error: byHandleError?.message || null,
          success: !byHandleError && profileByHandle !== null,
          is_public: profileByHandle?.public_profile_enabled === true,
        },
        test4_all_profiles: {
          count: allProfiles?.length ?? 0,
          sample: allProfiles?.slice(0, 3),
          error: allError?.message || null,
          success: !allError && allProfiles !== null,
        },
        test5_public_profiles_count: {
          total: count ?? 0,
          error: countError?.message || null,
          success: !countError && typeof count === 'number',
        },
        test6_public_echoes: {
          count: publicEchoes?.length ?? 0,
          data: publicEchoes,
          error: echoesError?.message || null,
          success: !echoesError,
        },
      },
      diagnosis: {
        can_read_public_profiles: !publicError && (publicProfiles?.length ?? 0) > 0,
        can_read_specific_profile_by_id: !byIdError && profileById !== null,
        can_read_specific_profile_by_handle: !byHandleError && profileByHandle !== null,
        profile_is_public: profileById?.public_profile_enabled === true,
        rls_seems_ok: !publicError && !byIdError,
        recommended_action: (() => {
          if (publicError?.message?.includes('policy')) {
            return 'RLS policy missing or incorrect. Run migrations/fix-profile-rls-and-public-profiles.sql';
          }
          if (profileById && profileById.public_profile_enabled === false) {
            return `Profile exists but is private. Run: UPDATE profiles SET public_profile_enabled = true WHERE id = '${testId}';`;
          }
          if (profileById && profileById.public_profile_enabled === null) {
            return `Profile exists but public_profile_enabled is NULL. Run: UPDATE profiles SET public_profile_enabled = true WHERE id = '${testId}';`;
          }
          if (!profileById && !byIdError) {
            return `Profile with id='${testId}' does not exist in database.`;
          }
          if (!publicProfiles || publicProfiles.length === 0) {
            return 'No public profiles found. Either no profiles exist, or all have public_profile_enabled = false/NULL.';
          }
          return 'Everything looks OK! 404 might be due to routing or other issue.';
        })(),
      },
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    }, { status: 500 });
  }
}