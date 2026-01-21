/**
 * =============================================================================
 * Fichier      : components/auth/RegisterForm.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.2.0 (2026-01-21)
 * Objet        : Form Inscription (email/password) - Supabase Auth
 * -----------------------------------------------------------------------------
 * Description  :
 * - supabase.auth.signUp
 * - Loading + erreurs + message de confirmation
 * - UI cohérente thème clair
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.2.0 (2026-01-21)
 * - [IMPROVED] Utilisation de getAuthErrorMessage pour messages clairs
 * - [IMPROVED] Console.error pour debug
 * - [IMPROVED] Gestion d'erreurs plus robuste
 * 1.1.0 (2026-01-21)
 * - [IMPROVED] Gestion post-signup : redirect si session immédiate, sinon message confirmation email
 * - [IMPROVED] Disable complet + micro-helper password (sans changer le layout)
 * - [CHORE] Aucune régression UI/UX (mêmes classes, mêmes blocs)
 * =============================================================================
 */

'use client';

import { useState } from 'react';
import { Mail, Lock, AlertTriangle, ArrowRight } from 'lucide-react';
import { supabase, getAuthErrorMessage } from '@/lib/supabase/client';

export default function RegisterForm({
  onSwitchToLogin,
}: {
  onSwitchToLogin?: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setError(null);
    setOk(null);

    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      setError('Veuillez renseigner email et mot de passe.');
      return;
    }

    if (password.length < 8) {
      setError('Mot de passe trop court (8 caractères minimum).');
      return;
    }

    setLoading(true);
    try {
      const emailRedirectTo =
        typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined;

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: emailRedirectTo ? { emailRedirectTo } : undefined,
      });

      if (signUpError) {
        // Utilisation du helper pour message clair
        setError(getAuthErrorMessage(signUpError));
        return;
      }

      // Si la confirmation email est désactivée, Supabase peut renvoyer une session directe
      if (data?.session) {
        setOk('Compte créé. Connexion…');
        window.location.replace('/');
        return;
      }

      setOk(
        "Compte créé. Si la confirmation email est activée, vérifiez votre boîte mail pour valider l'inscription."
      );
    } catch (e2) {
      // Log pour debug
      console.error('[REGISTER ERROR]', e2);
      // Message clair à l'utilisateur
      setError(
        e2 instanceof Error
          ? getAuthErrorMessage(e2)
          : 'Erreur lors de l\'inscription. Veuillez réessayer.'
      );
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
            disabled={loading}
            className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-70"
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
            placeholder="•••••••• (8+)"
            autoComplete="new-password"
            disabled={loading}
            className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-70"
          />
        </div>
        <div className="mt-1 text-xs text-slate-500">
          8+ caractères recommandé (phrase de passe).
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
        {loading ? 'Création…' : 'Créer un compte'}
        <ArrowRight className="h-4 w-4 opacity-80 transition-transform group-hover:translate-x-0.5" />
      </button>

      {/* Switch */}
      {onSwitchToLogin && (
        <div className="pt-2 text-center text-sm text-slate-600 md:hidden">
          Déjà un compte ?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="font-semibold text-violet-700 hover:text-violet-800"
          >
            Se connecter
          </button>
        </div>
      )}
    </form>
  );
}