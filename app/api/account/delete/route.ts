/**
 * =============================================================================
 * Fichier      : app/api/account/delete/route.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-27)
 * Objet        : Suppression compte utilisateur (RGPD Article 17 - Droit à l'effacement)
 * -----------------------------------------------------------------------------
 * Description  :
 * - Soft delete : profiles.deleted_at = now() (conservation 30j pour rollback)
 * - Vérification mot de passe (sécurité anti-CSRF)
 * - Cleanup Storage (avatars, banners)
 * - Sign out automatique après suppression
 * - FAIL-SOFT : continue même si Storage cleanup échoue
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.0.0 (2026-01-27)
 * - [NEW] Soft delete compte (profiles.deleted_at)
 * - [NEW] Vérification mot de passe obligatoire
 * - [NEW] Cleanup Storage (avatars, banners)
 * - [SAFE] FAIL-SOFT si fichiers Storage manquants
 * - [SAFE] Sign out automatique après suppression
 * =============================================================================
 */

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;

    if (!user) {
      return NextResponse.json({ ok: false, error: 'UNAUTHENTICATED' }, { status: 401 });
    }

    // Parse body
    const body = (await req.json().catch(() => ({}))) as { password?: string };
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { ok: false, error: 'PASSWORD_REQUIRED' }, 
        { status: 400 }
      );
    }

    // Vérifier password (sécurité anti-CSRF)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password,
    });

    if (signInError) {
      return NextResponse.json(
        { ok: false, error: 'INVALID_PASSWORD' }, 
        { status: 401 }
      );
    }

    // Soft delete : profiles.deleted_at = now()
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', user.id);

    if (updateError) {
      console.error('[Delete] Erreur update profiles.deleted_at', updateError);
      return NextResponse.json(
        { ok: false, error: 'UPDATE_FAILED' }, 
        { status: 500 }
      );
    }

    // Cleanup Storage (avatars, banners) — FAIL-SOFT
    try {
      const avatarPath = `${user.id}/avatar.webp`;
      const bannerPath = `${user.id}/banner.webp`;

      await Promise.all([
        supabase.storage.from('avatars').remove([avatarPath]),
        supabase.storage.from('banners').remove([bannerPath]),
      ]);
    } catch (storageErr) {
      console.warn('[Delete] Erreur cleanup Storage (non bloquant)', storageErr);
      // Continue quand même
    }

    // Sign out
    await supabase.auth.signOut();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Delete error]', err);
    return NextResponse.json(
      { ok: false, error: 'SERVER_ERROR' }, 
      { status: 500 }
    );
  }
}