/**
 * =============================================================================
 * Fichier      : components/auth/LoginForm.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-21)
 * Objet        : Form Connexion (email/password) - Supabase Auth
 * -----------------------------------------------------------------------------
 * Description  :
 * - supabase.auth.signInWithPassword
 * - Loading + erreurs
 * - UI cohérente thème clair
 * =============================================================================
 */

'use client';

import { useState } from 'react';
import { Mail, Lock, AlertTriangle, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

export default function LoginForm({
  onSwitchToRegister,
}: {
  onSwitchToRegister?: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOk(null);

    if (!email.trim() || !password) {
      setError('Veuillez renseigner email et mot de passe.');
      return;
    }

    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message);
      } else {
        setOk('Connexion réussie. Redirection…');
        // TODO: redirection (si tu veux) -> / (ou /explore)
        // window.location.href = '/';
      }
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : 'Login error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Email */}
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-slate-900">Email</span>
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
          <Mail className="h-4 w-4 text-slate-500" />
          <input
            type="email"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
        </div>
      </label>

      {/* Password */}
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-slate-900">
          Mot de passe
        </span>
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
          <Lock className="h-4 w-4 text-slate-500" />
          <input
            type="password"
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
        </div>
      </label>

      {/* Messages */}
      {error && (
        <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          <AlertTriangle className="mt-0.5 h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {ok && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {ok}
        </div>
      )}

      {/* CTA */}
      <button
        type="submit"
        disabled={loading}
        className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? 'Connexion…' : 'Se connecter'}
        <ArrowRight className="h-4 w-4 opacity-80 transition-transform group-hover:translate-x-0.5" />
      </button>

      {/* Switch */}
      {onSwitchToRegister && (
        <div className="pt-2 text-center text-sm text-slate-600 md:hidden">
          Pas de compte ?{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="font-semibold text-violet-700 hover:text-violet-800"
          >
            Créer un compte
          </button>
        </div>
      )}
    </form>
  );
}
