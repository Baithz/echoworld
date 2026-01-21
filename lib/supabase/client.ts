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
 * - [FIX] Suppression du `any` (conforme ESLint @typescript-eslint/no-explicit-any)
 * - [IMPROVED] Détection plus robuste des erreurs réseau (Failed to fetch, etc.)
 * - [CHORE] Aucun changement fonctionnel côté client Supabase
 * 1.2.0 (2026-01-21)
 * - [NEW] Helper getAuthErrorMessage pour messages clairs
 * - [IMPROVED] Validation des variables d'environnement
 * - [IMPROVED] Configuration storage optimisée pour CORS
 * - [DEBUG] Logs conditionnels (development only)
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
    // Configuration storage (évite collisions / multi-projets)
    storageKey: 'echoworld-auth-token',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});

type AuthErrorLike =
  | { message?: string | null; name?: string | null; status?: number | null }
  | Error
  | unknown;

/**
 * Helper pour traduire les erreurs Supabase en messages clairs
 */
export function getAuthErrorMessage(error: AuthErrorLike): string {
  if (!error) return 'Erreur inconnue';

  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message?: unknown }).message ?? '')
      : String(error);

  const m = message.toLowerCase();

  // Erreurs réseau / CORS
  if (
    m.includes('cors') ||
    m.includes('networkerror') ||
    m.includes('failed to fetch') ||
    m.includes('load failed')
  ) {
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

  if (message.includes('Password should be at least') || m.includes('password')) {
    return 'Le mot de passe doit contenir au moins 8 caractères.';
  }

  // Message par défaut (affiche le message original si présent)
  return message || 'Erreur inconnue';
}
