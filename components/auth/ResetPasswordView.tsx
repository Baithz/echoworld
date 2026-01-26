/**
 * =============================================================================
 * Fichier      : components/auth/ResetPasswordView.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-26)
 * Objet        : Vue "Réinitialiser le mot de passe" — update password via Supabase
 * -----------------------------------------------------------------------------
 * Description  :
 * - Affiche un formulaire nouveau mot de passe + confirmation
 * - Consomme le lien Supabase (hash tokens) et met à jour la session si nécessaire
 * - Appelle supabase.auth.updateUser({ password }) pour finaliser le reset
 * - UX cohérente Auth (thème clair, arrondis, icônes)
 * - SAFE: messages neutres + fail-soft si lien invalide/expiré
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.0.0 (2026-01-26)
 * - [NEW] Vue reset password (form + updateUser)
 * =============================================================================
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Lock, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { supabase, getAuthErrorMessage } from '@/lib/supabase/client';

function parseHashParams(hash: string): Record<string, string> {
  const raw = (hash || '').replace(/^#/, '');
  const out: Record<string, string> = {};
  if (!raw) return out;

  for (const part of raw.split('&')) {
    const [k, v] = part.split('=');
    if (!k) continue;
    out[decodeURIComponent(k)] = decodeURIComponent(v || '');
  }
  return out;
}

export default function ResetPasswordView() {
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');

  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const hashParams = useMemo(() => {
    if (typeof window === 'undefined') return {};
    return parseHashParams(window.location.hash || '');
  }, []);

  useEffect(() => {
    // Objectif: établir une session si le lien Supabase contient access_token/refresh_token
    // (resetPasswordForEmail inclut typiquement ces tokens dans le hash).
    const init = async () => {
      try {
        if (typeof window === 'undefined') return;

        const access_token = hashParams['access_token'];
        const refresh_token = hashParams['refresh_token'];

        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
        }

        // On ne bloque pas l’UI si tokens absents (cas: lien expiré)
        setReady(true);
      } catch (e) {
        console.error('[RESET PASSWORD INIT ERROR]', e);
        setReady(true);
      }
    };

    void init();
  }, [hashParams]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setError(null);
    setOk(null);

    if (!password || !password2) {
      setError('Veuillez renseigner les deux champs.');
      return;
    }

    if (password.length < 8) {
      setError('Mot de passe trop court (8 caractères minimum).');
      return;
    }

    if (password !== password2) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      const { error: updErr } = await supabase.auth.updateUser({ password });

      if (updErr) {
        setError(getAuthErrorMessage(updErr.message));
        return;
      }

      setOk('✅ Mot de passe mis à jour. Vous pouvez vous reconnecter.');
      setPassword('');
      setPassword2('');
    } catch (e2) {
      console.error('[RESET PASSWORD ERROR]', e2);
      setError(
        e2 instanceof Error
          ? getAuthErrorMessage(e2)
          : 'Erreur lors de la mise à jour du mot de passe.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-10">
        <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
          <div className="text-sm text-slate-700">Chargement…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
        <div className="mb-6 space-y-1">
          <h1 className="text-xl font-extrabold text-slate-950">Nouveau mot de passe</h1>
          <p className="text-sm text-slate-600">
            Choisissez un nouveau mot de passe (8 caractères minimum).
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4" aria-busy={loading}>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-900">Nouveau mot de passe</span>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm focus-within:border-slate-300">
              <Lock className="h-4 w-4 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={loading}
                className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-70"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-900">Confirmer</span>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm focus-within:border-slate-300">
              <Lock className="h-4 w-4 text-slate-500" />
              <input
                type="password"
                value={password2}
                onChange={(ev) => setPassword2(ev.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={loading}
                className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-70"
              />
            </div>
          </label>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {ok && (
            <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <CheckCircle2 className="mt-0.5 h-4 w-4" />
              <span>{ok}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Mise à jour…' : 'Mettre à jour'}
            <ArrowRight className="h-4 w-4 opacity-80 transition-transform group-hover:translate-x-0.5" />
          </button>

          <div className="pt-1 text-center text-sm text-slate-600">
            <Link href="/login" className="font-semibold text-violet-700 hover:text-violet-800">
              Retour à la connexion
            </Link>
          </div>
        </form>

        {!ok && (
          <div className="mt-4 text-xs text-slate-500">
            Si le lien est expiré, refaites une demande depuis « Mot de passe oublié ».
          </div>
        )}
      </div>
    </div>
  );
}
