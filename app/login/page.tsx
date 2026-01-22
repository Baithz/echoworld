/**
 * =============================================================================
 * Fichier      : app/login/page.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.1.1 (2026-01-21)
 * Objet        : Page Login - Tabs Connexion/Inscription (thème clair + Header)
 * -----------------------------------------------------------------------------
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.1.1 (2026-01-21)
 * - [FIX] Simplifie check session (1 seul getSession) + redirect si connecté
 * - [CHORE] Pas de régression UI
 * =============================================================================
 */

'use client';

import { useEffect, useState } from 'react';
import AuthShell from '@/components/auth/AuthShell';
import { supabase } from '@/lib/supabase/client';

export default function LoginPage() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // Capte aussi OAuth callback si présent dans l’URL (detectSessionInUrl=true)
        const { data } = await supabase.auth.getSession();

        if (data?.session) {
          window.location.replace('/'); // ou '/explore'
          return;
        }
      } finally {
        if (mounted) setChecking(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <>
      <main className="relative">
        {checking ? (
          <div className="mx-auto w-full max-w-6xl px-6 pt-28 pb-20 md:pt-32">
            <div className="rounded-3xl border border-slate-200 bg-white/70 p-10 text-center shadow-xl shadow-black/5 backdrop-blur-xl">
              <div className="text-sm font-semibold text-slate-700">Vérification…</div>
              <div className="mt-2 text-sm text-slate-500">
                Connexion en cours de préparation.
              </div>
            </div>
          </div>
        ) : (
          <AuthShell />
        )}
      </main>
    </>
  );
}
