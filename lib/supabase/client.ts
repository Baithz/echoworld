/**
 * =============================================================================
 * Fichier      : lib/supabase/client.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.3.0 (2026-01-21)
 * Objet        : Client Supabase avec gestion d'erreurs améliorée
 * -----------------------------------------------------------------------------
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.3.0 (2026-01-21)
 * - [SAFE] Singleton explicite (évite multi-instances en HMR)
 * - [SAFE] Storage SSR-safe (fallback null)
 * - [KEEP] Helper getAuthErrorMessage conservé sans régression
 * =============================================================================
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!url || !anon) {
  throw new Error(
    '❌ Configuration Supabase manquante !\n' +
      'Vérifiez que NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY ' +
      'sont bien définies dans .env.local ou dans Vercel.'
  );
}

const storage =
  typeof window !== 'undefined' ? window.localStorage : undefined;

let _supabase: ReturnType<typeof createClient> | null = null;

export const supabase =
  _supabase ??
  (_supabase = createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'echoworld-auth-token',
      storage,
    },
  }));

export function getAuthErrorMessage(error: unknown): string {
  if (!error) return 'Erreur inconnue';

  const message = extractErrorMessage(error);

  if (message.includes('CORS') || message.includes('NetworkError')) {
    return 'Erreur de connexion au serveur. Vérifiez votre connexion internet.';
  }

  if (message.includes('Invalid login credentials')) {
    return 'Email ou mot de passe incorrect.';
  }

  if (message.includes('Email not confirmed')) {
    return 'Veuillez confirmer votre email avant de vous connecter.';
  }

  if (message.includes('User already registered')) {
    return 'Cet email est déjà utilisé.';
  }

  if (message.includes('Password should be at least')) {
    return 'Le mot de passe doit contenir au moins 8 caractères.';
  }

  return message;
}

function extractErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;

  if (error instanceof Error) return error.message || 'Erreur inconnue';

  if (typeof error === 'object' && error !== null) {
    const maybeMsg = (error as { message?: unknown }).message;
    if (typeof maybeMsg === 'string') return maybeMsg;
  }

  return String(error);
}
