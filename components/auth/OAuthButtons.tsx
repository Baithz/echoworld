/**
 * =============================================================================
 * Fichier      : components/auth/OAuthButtons.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-21)
 * Objet        : Boutons OAuth (Google en priorité) - UI premium + hook Supabase
 * -----------------------------------------------------------------------------
 * Description  :
 * - Google OAuth via supabase.auth.signInWithOAuth
 * - Gestion état loading + erreur
 * - Redirect simple sur /login (detectSessionInUrl=true dans client)
 * =============================================================================
 */

'use client';

import { useState } from 'react';
import { Chrome, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

export default function OAuthButtons() {
  const [loadingProvider, setLoadingProvider] = useState<null | 'google'>(null);
  const [error, setError] = useState<string | null>(null);

  const signInGoogle = async () => {
    setError(null);
    setLoadingProvider('google');

    try {
      const redirectTo =
        typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined;

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: redirectTo ? { redirectTo } : undefined,
      });

      if (oauthError) setError(oauthError.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'OAuth error');
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={signInGoogle}
        disabled={loadingProvider !== null}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
      >
        <Chrome className="h-4 w-4" />
        {loadingProvider === 'google' ? 'Connexion Google…' : 'Continuer avec Google'}
      </button>

      {error && (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
