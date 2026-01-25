/**
 * =============================================================================
 * Fichier      : types/supabase-rpc.d.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.1 (2026-01-25)
 * Objet        : Déclarations TypeScript pour les fonctions RPC Supabase
 * -----------------------------------------------------------------------------
 * Description  :
 * - Définit les types pour les fonctions RPC personnalisées
 * - Permet à TypeScript de valider les appels à supabase.rpc()
 * - Évite les erreurs de type lors de l'utilisation des fonctions RPC
 * 
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.0.1 (2026-01-25)
 * - [FIX] Suppression de l'import inutilisé SupabaseClient
 * - [FIX] Remplacement de 'any' par 'unknown' pour conformité ESLint
 * - [FIX] Typage strict pour les erreurs PostgrestError
 * =============================================================================
 */

import type { PostgrestError } from '@supabase/supabase-js';

declare module '@supabase/supabase-js' {
  interface SupabaseClient {
    rpc<T = unknown>(
      fn: 'create_profile_from_signup',
      args: {
        user_id: string;
        user_first_name: string;
        user_last_name: string;
        user_date_of_birth: string;
        user_country: string;
      }
    ): Promise<{ data: T | null; error: PostgrestError | null }>;

    rpc<T = unknown>(
      fn: 'calculate_user_age',
      args: {
        birth_date: string;
      }
    ): Promise<{ data: T | null; error: PostgrestError | null }>;

    rpc<T = unknown>(
      fn: 'check_user_minimum_age',
      args: {
        birth_date: string;
        user_country: string;
      }
    ): Promise<{ data: T | null; error: PostgrestError | null }>;

    // Ajoutez d'autres fonctions RPC ici au fur et à mesure
  }
}