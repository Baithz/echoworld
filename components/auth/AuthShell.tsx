/**
 * =============================================================================
 * Fichier      : components/auth/AuthShell.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 2.1.1 (2026-01-25)
 * Objet        : Shell auth - Tabs Connexion/Inscription + redirections
 * -----------------------------------------------------------------------------
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 2.1.1 (2026-01-25)
 * - [FIX] Utilise window.location.replace au lieu de router.replace pour éviter les problèmes de navigation
 * - [KEEP] Redirection vers /account après connexion/inscription réussie
 * 2.1.0 (2026-01-25)
 * - [FIX] Redirection vers /account après connexion réussie (au lieu de /)
 * - [FIX] Redirection vers /account après inscription réussie
 * - [KEEP] UI tabs inchangée, formulaires login/signup conservés
 * - [KEEP] Toasts success/error, loading states, validation
 * =============================================================================
 */

'use client';

import { useState } from 'react';
import { Mail, Lock, User as UserIcon, Loader2, LogIn, UserPlus } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

type TabId = 'login' | 'signup';

function getErrorMessage(e: unknown): string {
  if (!e) return 'Erreur inconnue.';
  if (typeof e === 'string') return e;
  if (e instanceof Error) return e.message || 'Erreur.';
  if (typeof e === 'object' && e !== null && 'message' in e && typeof (e as { message?: unknown }).message === 'string') {
    return (e as { message: string }).message;
  }
  return 'Erreur.';
}

export default function AuthShell() {
  const [activeTab, setActiveTab] = useState<TabId>('login');

  // Login states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Signup states
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState<string | null>(null);

  const canLogin = loginEmail.trim().length > 0 && loginPassword.length > 0;
  const canSignup =
    signupEmail.trim().length > 0 &&
    signupPassword.length >= 8 &&
    signupPassword === signupConfirm;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canLogin) return;

    setLoginLoading(true);
    setLoginError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      });

      if (error) throw error;

      // ✅ Redirection vers /account après connexion réussie
      window.location.replace('/account');
    } catch (err) {
      setLoginError(getErrorMessage(err) || 'Identifiants incorrects.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSignup) return;

    setSignupLoading(true);
    setSignupError(null);
    setSignupSuccess(null);

    try {
      const { error } = await supabase.auth.signUp({
        email: signupEmail.trim(),
        password: signupPassword,
      });

      if (error) throw error;

      setSignupSuccess('Compte créé. Vérifiez votre boîte mail pour confirmer votre adresse.');

      // ✅ Redirection vers /account après inscription réussie
      // Note: Si confirmation email requise, l'utilisateur devra cliquer sur le lien
      // Pour un flux sans confirmation, on redirige immédiatement
      setTimeout(() => {
        window.location.replace('/account');
      }, 2000);
    } catch (err) {
      const msg = getErrorMessage(err);
      if (msg.toLowerCase().includes('user already registered') || msg.toLowerCase().includes('already exists')) {
        setSignupError('Cette adresse email est déjà utilisée.');
      } else {
        setSignupError(msg || 'Erreur lors de la création du compte.');
      }
    } finally {
      setSignupLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-6 pt-28 pb-20 md:pt-32">
      <div className="rounded-3xl border border-slate-200 bg-white/70 p-8 shadow-xl shadow-black/5 backdrop-blur-xl md:p-12">
        {/* Tabs */}
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/60 p-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setLoginError(null);
              setSignupError(null);
              setSignupSuccess(null);
            }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
              activeTab === 'login'
                ? 'bg-white text-slate-900 shadow'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LogIn className="h-4 w-4" />
            Connexion
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('signup');
              setLoginError(null);
              setSignupError(null);
              setSignupSuccess(null);
            }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
              activeTab === 'signup'
                ? 'bg-white text-slate-900 shadow'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="h-4 w-4" />
            Inscription
          </button>
        </div>

        {/* Login Form */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin} className="mt-8 space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-900">Bon retour parmi nous</h2>
              <p className="mt-2 text-sm text-slate-600">
                Connecte-toi pour accéder à ton profil et tes échos.
              </p>
            </div>

            {loginError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                {loginError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="login-email" className="text-sm font-semibold text-slate-900">
                  Email
                </label>
                <div className="relative mt-2">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    id="login-email"
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="ton@email.com"
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm text-slate-900 outline-none focus:border-slate-300"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="text-sm font-semibold text-slate-900">
                  Mot de passe
                </label>
                <div className="relative mt-2">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    id="login-password"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm text-slate-900 outline-none focus:border-slate-300"
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={!canLogin || loginLoading}
              className={`flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 text-base font-semibold shadow-lg transition-all ${
                canLogin && !loginLoading
                  ? 'bg-slate-900 text-white hover:scale-[1.01] hover:shadow-xl'
                  : 'cursor-not-allowed bg-slate-200 text-slate-500'
              }`}
            >
              {loginLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Connexion en cours…
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  Se connecter
                </>
              )}
            </button>

            <div className="text-center text-sm text-slate-500">
              Mot de passe oublié ?{' '}
              <a href="/reset-password" className="font-semibold text-slate-900 hover:underline">
                Réinitialiser
              </a>
            </div>
          </form>
        )}

        {/* Signup Form */}
        {activeTab === 'signup' && (
          <form onSubmit={handleSignup} className="mt-8 space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-900">Rejoins la communauté</h2>
              <p className="mt-2 text-sm text-slate-600">
                Crée ton compte pour partager tes échos avec le monde.
              </p>
            </div>

            {signupError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                {signupError}
              </div>
            )}

            {signupSuccess && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                {signupSuccess}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="signup-email" className="text-sm font-semibold text-slate-900">
                  Email
                </label>
                <div className="relative mt-2">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    id="signup-email"
                    type="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="ton@email.com"
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm text-slate-900 outline-none focus:border-slate-300"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="signup-password" className="text-sm font-semibold text-slate-900">
                  Mot de passe
                </label>
                <div className="relative mt-2">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    id="signup-password"
                    type="password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm text-slate-900 outline-none focus:border-slate-300"
                    autoComplete="new-password"
                    required
                    minLength={8}
                  />
                </div>
                <div className="mt-2 text-xs text-slate-500">Minimum 8 caractères.</div>
              </div>

              <div>
                <label htmlFor="signup-confirm" className="text-sm font-semibold text-slate-900">
                  Confirmer le mot de passe
                </label>
                <div className="relative mt-2">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    id="signup-confirm"
                    type="password"
                    value={signupConfirm}
                    onChange={(e) => setSignupConfirm(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm text-slate-900 outline-none focus:border-slate-300"
                    autoComplete="new-password"
                    required
                  />
                </div>
                {signupPassword && signupConfirm && signupPassword !== signupConfirm && (
                  <div className="mt-2 text-xs text-rose-600">Les mots de passe ne correspondent pas.</div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={!canSignup || signupLoading}
              className={`flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 text-base font-semibold shadow-lg transition-all ${
                canSignup && !signupLoading
                  ? 'bg-slate-900 text-white hover:scale-[1.01] hover:shadow-xl'
                  : 'cursor-not-allowed bg-slate-200 text-slate-500'
              }`}
            >
              {signupLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Création en cours…
                </>
              ) : (
                <>
                  <UserIcon className="h-5 w-5" />
                  Créer mon compte
                </>
              )}
            </button>

            <div className="text-center text-xs text-slate-500">
              En créant un compte, tu acceptes nos{' '}
              <a href="/terms" className="font-semibold text-slate-900 hover:underline">
                Conditions d&apos;utilisation
              </a>{' '}
              et notre{' '}
              <a href="/privacy" className="font-semibold text-slate-900 hover:underline">
                Politique de confidentialité
              </a>
              .
            </div>
          </form>
        )}
      </div>
    </div>
  );
}