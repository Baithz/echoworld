/**
 * =============================================================================
 * Fichier      : components/auth/ForgotPasswordView.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-26)
 * Objet        : Vue "Mot de passe oublié" — demande email reset (API server-side)
 * -----------------------------------------------------------------------------
 * Description  :
 * - Formulaire email + appel à /api/auth/forgot-password (anti-CORS)
 * - UX cohérente Auth (thème clair, arrondis, icônes lucide)
 * - Messages succès/erreur + loading + accessibilité de base
 * - SAFE: n’altère pas la session courante, fail-soft sur réponses API
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.0.0 (2026-01-26)
 * - [NEW] Vue reset password (request email) via /api/auth/forgot-password
 * =============================================================================
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { getAuthErrorMessage } from '@/lib/supabase/client';

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export default function ForgotPasswordView() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setError(null);
    setOk(null);

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setError('Veuillez renseigner votre email.');
      return;
    }
    if (!isValidEmail(cleanEmail)) {
      setError('Adresse email invalide.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result?.error) {
        const errorMsg = result?.error || 'Erreur lors de la demande de réinitialisation';
        setError(getAuthErrorMessage(errorMsg));
        return;
      }

      setOk(
        result?.message ||
          '✅ Si un compte existe pour cet email, un lien de réinitialisation a été envoyé.'
      );
    } catch (e2) {
      console.error('[FORGOT PASSWORD ERROR]', e2);
      setError(
        e2 instanceof Error
          ? getAuthErrorMessage(e2)
          : 'Erreur lors de la demande. Veuillez réessayer.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
        <div className="mb-6 space-y-1">
          <h1 className="text-xl font-extrabold text-slate-950">Mot de passe oublié</h1>
          <p className="text-sm text-slate-600">
            Entrez votre email pour recevoir un lien de réinitialisation.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4" aria-busy={loading}>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-900">Email</span>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm focus-within:border-slate-300">
              <Mail className="h-4 w-4 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                inputMode="email"
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
            {loading ? 'Envoi…' : 'Envoyer le lien'}
            <ArrowRight className="h-4 w-4 opacity-80 transition-transform group-hover:translate-x-0.5" />
          </button>

          <div className="pt-1 text-center text-sm text-slate-600">
            <Link href="/login" className="font-semibold text-violet-700 hover:text-violet-800">
              Retour à la connexion
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
