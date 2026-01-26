/**
 * =============================================================================
 * Fichier      : app/api/auth/signup/route.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 2.0.0 (2026-01-26)
 * Objet        : Signup via API + seed profiles/user_settings (compliance DOB + CGU)
 * -----------------------------------------------------------------------------
 * Description  :
 * - Conserve le flow /api/auth/signup (anti-CORS) + réponses JSON existantes
 * - Ajoute dateOfBirth + tosAccepted + validation âge min (16)
 * - Crée l’utilisateur via Supabase Auth (Anon)
 * - Seed profiles + user_settings via Service Role (fiable, bypass RLS)
 * - Rollback best-effort (admin.deleteUser) si seed échoue
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 2.0.0 (2026-01-26)
 * - [NEW] Validation DOB + CGU (RGPD/COPPA)
 * - [NEW] Upsert profiles (date_of_birth, age_verified, tos_accepted_at)
 * - [NEW] Upsert user_settings (defaults + for_me_*)
 * - [FIX] Rollback possible via Service Role (best-effort)
 * - [KEEP] Contrat JSON, messages, status codes, GET env_check
 * =============================================================================
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

type SignupBody = {
  email?: string;
  password?: string;
  dateOfBirth?: string;
  tosAccepted?: boolean;
};

function getEnvVar(key: string): string {
  const value = process.env[key];
  if (!value) {
    console.error(`[ENV ERROR] Variable manquante: ${key}`);
    throw new Error(`Variable d'environnement manquante: ${key}`);
  }
  return value;
}

function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;

  return age;
}

function getMinimumAge(): number {
  return 16;
}

function generateDefaultHandle(userId: string): string {
  const clean = (userId ?? '').trim().toLowerCase().replace(/-/g, '');
  return `user_${clean.slice(0, 6)}`;
}

export async function POST(request: NextRequest) {
  try {
    let supabaseUrl: string;
    let supabaseAnonKey: string;

    // NEW (server only): service role pour seed DB + rollback
    let supabaseServiceRoleKey: string;

    try {
      supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
      supabaseAnonKey = getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');

      // IMPORTANT: variable serveur (NE PAS prefixer NEXT_PUBLIC)
      supabaseServiceRoleKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');
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

    const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });

    const supabaseService = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    const body = (await request.json().catch(() => ({}))) as SignupBody;
    const email = (body.email ?? '').trim();
    const password = body.password ?? '';

    // NEW
    const dateOfBirth = (body.dateOfBirth ?? '').trim();
    const tosAccepted = Boolean(body.tosAccepted);

    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 8 caractères' }, { status: 400 });
    }

    // NEW: validations compliance
    if (!dateOfBirth) {
      return NextResponse.json({ error: 'Date de naissance requise' }, { status: 400 });
    }

    if (!tosAccepted) {
      return NextResponse.json({ error: "Vous devez accepter les Conditions Générales d'Utilisation" }, { status: 400 });
    }

    const minAge = getMinimumAge();
    const age = calculateAge(dateOfBirth);

    if (!Number.isFinite(age) || age < minAge) {
      return NextResponse.json({ error: `Vous devez avoir au moins ${minAge} ans pour créer un compte` }, { status: 400 });
    }

    const { data, error } = await supabaseAnon.auth.signUp({ email, password });

    if (error) {
      console.error('[SIGNUP ERROR]', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const userId = data.user?.id;
    if (!userId) {
      console.error('[SIGNUP ERROR] Missing data.user.id');
      return NextResponse.json(
        { error: 'Erreur serveur', details: "Erreur création compte (user.id manquant)" },
        { status: 500 }
      );
    }

    // -------------------------------------------------------------------------
    // Seed DB (profiles + user_settings) via Service Role (bypass RLS)
    // -------------------------------------------------------------------------
    const nowIso = new Date().toISOString();
    const defaultHandle = generateDefaultHandle(userId);

    const { error: pErr } = await supabaseService
      .from('profiles')
      .upsert(
        {
          id: userId,
          handle: defaultHandle,
          date_of_birth: dateOfBirth,
          age_verified: true,
          tos_accepted_at: nowIso,
          public_profile_enabled: true,
        },
        { onConflict: 'id' }
      );

    if (pErr) {
      console.error('[SIGNUP SEED] profiles error', pErr);

      // rollback best-effort
      try {
        await supabaseService.auth.admin.deleteUser(userId);
      } catch (rbErr) {
        console.error('[SIGNUP ROLLBACK] deleteUser failed', rbErr);
      }

      return NextResponse.json(
        { error: 'Erreur serveur', details: 'Erreur création profil (rollback best-effort)' },
        { status: 500 }
      );
    }

    const { error: sErr } = await supabaseService
      .from('user_settings')
      .upsert(
        {
          user_id: userId,
          default_echo_visibility: 'world',
          default_anonymous: false,
          allow_responses: true,
          allow_mirrors: true,
          notifications_soft: true,
          theme: 'system',
          for_me_enabled: true,
          for_me_use_likes: true,
          for_me_use_mirrors: true,
          for_me_include_fresh: true,
          for_me_max_items: 18,
        },
        { onConflict: 'user_id' }
      );

    if (sErr) {
      console.error('[SIGNUP SEED] user_settings error', sErr);

      // rollback best-effort
      try {
        await supabaseService.from('profiles').delete().eq('id', userId);
        await supabaseService.auth.admin.deleteUser(userId);
      } catch (rbErr) {
        console.error('[SIGNUP ROLLBACK] cleanup failed', rbErr);
      }

      return NextResponse.json(
        { error: 'Erreur serveur', details: 'Erreur création settings (rollback best-effort)' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        data,
        message: data.session ? 'Compte créé avec succès' : 'Compte créé. Vérifiez votre email pour confirmer.',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[SIGNUP EXCEPTION]', error);
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
    status: 'Signup endpoint actif',
    env_check: {
      url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,

      // NEW
      service_role: !!process.env.SUPABASE_SERVICE_ROLE_KEY,

      url_value: process.env.NEXT_PUBLIC_SUPABASE_URL || 'MANQUANTE',
    },
  });
}
