/**
 * =============================================================================
 * Fichier      : app/api/account/export/route.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.3 (2026-01-27)
 * Objet        : Export données utilisateur (RGPD Article 20 - Portabilité)
 * -----------------------------------------------------------------------------
 * Description  :
 * - Export JSON complet : profil + settings + echoes + messages + follows
 * - Génération ZIP avec data.json + fichiers Storage (avatars/banners)
 * - Download direct (Content-Disposition: attachment)
 * - Auth requise (session valide)
 * - FAIL-SOFT : si Storage inaccessible, export quand même le JSON
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.0.3 (2026-01-27)
 * - [FIX] Retourne un Blob ZIP (BodyInit OK) au lieu d’un Uint8Array (TS2345)
 * - [FIX] Supprime Buffer.* (compat Web/Edge) : JSZip reçoit Uint8Array
 * - [KEEP] FAIL-SOFT Storage + JSON export inchangés
 * 1.0.2 (2026-01-27)
 * - [FIX] Génération ZIP avec uint8array au lieu de nodebuffer (compatibilité TS Web API)
 * 1.0.1 (2026-01-27)
 * - [FIX] Utilisation Response au lieu de NextResponse pour type Buffer (TS2345)
 * 1.0.0 (2026-01-27)
 * - [NEW] Export données RGPD complet
 * - [NEW] Génération ZIP avec JSZip
 * - [NEW] Include avatars/banners depuis Storage
 * - [SAFE] FAIL-SOFT si fichiers Storage manquants
 * =============================================================================
 */

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import JSZip from 'jszip';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;

    if (!user) {
      return NextResponse.json({ ok: false, error: 'UNAUTHENTICATED' }, { status: 401 });
    }

    const userId = user.id;

    // Fetch toutes les données utilisateur
    const [profile, settings, echoes, messages, follows] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('echoes').select('*').eq('user_id', userId),
      supabase.from('messages').select('*').eq('sender_id', userId),
      supabase.from('follows').select('*').or(`follower_id.eq.${userId},following_id.eq.${userId}`),
    ]);

    const exportData = {
      export_date: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
      },
      profile: profile.data ?? null,
      settings: settings.data ?? null,
      echoes: echoes.data ?? [],
      messages: messages.data ?? [],
      follows: follows.data ?? [],
    };

    // Créer ZIP
    const zip = new JSZip();
    zip.file('data.json', JSON.stringify(exportData, null, 2));

    // Tenter d'ajouter avatar depuis Storage (FAIL-SOFT)
    try {
      const avatarPath = `${userId}/avatar.webp`;
      const { data: avatarData, error: avatarError } = await supabase.storage
        .from('avatars')
        .download(avatarPath);

      if (!avatarError && avatarData) {
        const arrayBuffer = await avatarData.arrayBuffer();
        zip.file('avatar.webp', new Uint8Array(arrayBuffer));
      }
    } catch (err) {
      console.warn('[Export] Avatar non trouvé ou inaccessible', err);
      // Continue sans avatar
    }

    // Tenter d'ajouter banner depuis Storage (FAIL-SOFT)
    try {
      const bannerPath = `${userId}/banner.webp`;
      const { data: bannerData, error: bannerError } = await supabase.storage
        .from('banners')
        .download(bannerPath);

      if (!bannerError && bannerData) {
        const arrayBuffer = await bannerData.arrayBuffer();
        zip.file('banner.webp', new Uint8Array(arrayBuffer));
      }
    } catch (err) {
      console.warn('[Export] Banner non trouvé ou inaccessible', err);
      // Continue sans banner
    }

    // Générer ZIP en Blob (BodyInit OK)
    const zipBlob = await zip.generateAsync({ type: 'blob' });

    return new Response(zipBlob, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="echoworld-export-${userId}.zip"`,
      },
    });
  } catch (err) {
    console.error('[Export error]', err);
    return NextResponse.json({ ok: false, error: 'SERVER_ERROR' }, { status: 500 });
  }
}
