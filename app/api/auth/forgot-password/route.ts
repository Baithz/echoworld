/**
 * =============================================================================
 * Fichier      : app/api/auth/forgot-password/route.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-26)
 * Objet        : API Forgot Password — envoi email reset (server-side, anti-CORS)
 * -----------------------------------------------------------------------------
 * Description  :
 * - POST { email } -> déclenche supabase.auth.resetPasswordForEmail()
 * - Réponse neutre (ne révèle pas si l’email existe)
 * - Utilise NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
 * - SAFE: persistSession=false, erreurs loggées, statut HTTP cohérent
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.0.0 (2026-01-26)
 * - [NEW] Endpoint /api/auth/forgot-password (reset email)
 * =============================================================================
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function getEnvVar(key: string): string {
  const value = process.env[key];
  if (!value) {
    console.error(`[ENV ERROR] Variable manquante: ${key}`);
    throw new Error(`Variable d'environnement manquante: ${key}`);
  }
  return value;
}

type Body = { email?: string };

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export async function POST(request: NextRequest) {
  try {
    let supabaseUrl: string;
    let supabaseAnonKey: string;

    try {
      supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
      supabaseAnonKey = getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    } catch (envError) {
      console.error('[ENV ERROR]', envError);
      return NextResponse.json(
        {
          error: 'Configuration serveur manquante',
          details: envError instanceof Error ? envError.message : 'Variables non configurées',
        },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });

    const body = (await request.json().catch(() => ({}))) as Body;
    const email = (body.email ?? '').trim();

    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Adresse email invalide' }, { status: 400 });
    }

    const origin = request.headers.get('origin');
    const baseUrl = origin || process.env.NEXT_PUBLIC_SITE_URL || '';
    const redirectTo = baseUrl ? `${baseUrl}/auth/reset-password` : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined);

    if (error) {
      // Réponse neutre (ne pas leak l’existence du compte) mais log serveur
      console.error('[FORGOT PASSWORD ERROR]', error);
    }

    return NextResponse.json(
      {
        ok: true,
        message: '✅ Si un compte existe pour cet email, un lien de réinitialisation a été envoyé.',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[FORGOT PASSWORD EXCEPTION]', error);
    return NextResponse.json(
      {
        error: 'Erreur serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'Forgot-password endpoint actif',
    env_check: {
      url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      site: !!process.env.NEXT_PUBLIC_SITE_URL,
    },
  });
}
