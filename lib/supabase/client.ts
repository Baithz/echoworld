/**
 * =============================================================================
 * Fichier      : lib/supabase/client.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.2.1 (2026-01-21)
 * Objet        : Client Supabase avec gestion d'erreurs améliorée
 * -----------------------------------------------------------------------------
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.2.1 (2026-01-21)
 * - [FIX] ESLint no-explicit-any : getAuthErrorMessage(error: unknown)
 * - [CHORE] Extraction message robuste via type-guards
 * =============================================================================
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Validation des variables d'environnement
if (!url || !anon) {
  throw new Error(
    '❌ Configuration Supabase manquante !\n' +
      'Vérifiez que NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY ' +
      'sont bien définies dans .env.local ou dans Vercel.'
  );
}

// DEBUG (développement uniquement)
if (process.env.NODE_ENV === 'development') {
  console.log('[SUPABASE] Configuration :', {
    url,
    anonKeyPresent: !!anon,
    anonKeyLength: anon.length,
  });
}

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'echoworld-auth-token',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});

/**
 * Helper pour traduire les erreurs Supabase en messages clairs
 */
export function getAuthErrorMessage(error: unknown): string {
  if (!error) return 'Erreur inconnue';

  const message = extractErrorMessage(error);

  // Erreurs réseau / CORS
  if (message.includes('CORS') || message.includes('NetworkError')) {
    return 'Erreur de connexion au serveur. Vérifiez votre connexion internet.';
  }

  // Erreurs authentification
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
