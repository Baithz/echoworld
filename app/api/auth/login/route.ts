/**
 * =============================================================================
 * Fichier      : app/api/auth/login/route.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-21)
 * Objet        : Route Handler - Connexion (contourne CORS)
 * -----------------------------------------------------------------------------
 * Description  :
 * Cette route s'exécute côté serveur et ne subit donc pas les restrictions CORS.
 * Elle fait office de proxy entre le frontend et Supabase.
 * 
 * Installation :
 * Créez ce fichier à : app/api/auth/login/route.ts
 * =============================================================================
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Client Supabase côté serveur
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false, // Pas de session côté serveur
    },
  }
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email et mot de passe requis' },
        { status: 400 }
      );
    }

    // Appel à Supabase (côté serveur, pas de CORS !)
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('[LOGIN ERROR]', error);
      
      // Messages personnalisés
      let errorMessage = error.message;
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'Email ou mot de passe incorrect';
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = 'Veuillez confirmer votre email avant de vous connecter';
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    // Succès
    return NextResponse.json(
      {
        data,
        message: 'Connexion réussie',
      },
      { status: 200 }
    );
} catch (error: unknown) {
  console.error('[LOGIN EXCEPTION]', error);

  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Erreur serveur';

  return NextResponse.json({ error: message }, { status: 500 });
}
}