/**
 * =============================================================================
 * Fichier      : app/api/auth/login/route.ts (VERSION FINALE)
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.2.0 (2026-01-21)
 * Objet        : Route Handler Login - Sans erreurs TypeScript
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
          details: envError instanceof Error ? envError.message : 'Variables non configurées'
        },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      },
    });

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email et mot de passe requis' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('[LOGIN ERROR]', error);
      
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

    return NextResponse.json(
      {
        data,
        message: 'Connexion réussie',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[LOGIN EXCEPTION]', error);
    return NextResponse.json(
      { 
        error: 'Erreur serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'Login endpoint actif',
    env_check: {
      url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      url_value: process.env.NEXT_PUBLIC_SUPABASE_URL || 'MANQUANTE',
    }
  });
}