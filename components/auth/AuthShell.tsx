/**
 * =============================================================================
 * Fichier      : components/auth/AuthShell.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 3.0.3 (2026-01-25)
 * Objet        : Shell Auth COMPLET - OAuth + Inscription professionnelle + Validation âge
 * -----------------------------------------------------------------------------
 * Description  :
 * - Design premium avec colonne droite (bénéfices)
 * - OAuth : Google, GitHub, Discord
 * - Inscription complète : nom, prénom, date naissance, email, password
 * - Validation d'âge : 15 ans (France), 13 ans (reste du monde)
 * - Conditions d'utilisation obligatoires
 * - Animations Framer Motion
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 3.0.3 (2026-01-25)
 * - [FIX] Correction erreur TypeScript sur l'appel RPC
 * - [NEW] Ajout du type CreateProfileParams pour le RPC
 * - [NEW] Fichier supabase-rpc.d.ts pour déclarer les types RPC
 * - [KEEP] Toutes fonctionnalités v3.0.2 conservées
 * 3.0.2 (2026-01-25)
 * - [FIX] Appel manuel de create_profile_from_signup via RPC après inscription
 * - [FIX] Contournement du problème de permissions sur auth.users trigger
 * - [KEEP] Toutes fonctionnalités v3.0.1 conservées
 * 3.0.1 (2026-01-25)
 * - [FIX] Correction erreurs ESLint (apostrophes échappées, variable inutilisée)
 * - [KEEP] Toutes fonctionnalités v3.0.0 conservées
 * 3.0.0 (2026-01-25)
 * - [NEW] Champs inscription: firstName, lastName, dateOfBirth
 * - [NEW] Validation âge: 15+ (FR), 13+ (autres pays)
 * - [NEW] Checkbox CGU obligatoire
 * - [NEW] Design premium avec colonne droite bénéfices
 * - [KEEP] OAuth (Google, GitHub, Discord)
 * - [KEEP] Redirections vers /account
 * =============================================================================
 */

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Lock,
  User as UserIcon,
  Loader2,
  LogIn,
  UserPlus,
  Shield,
  Sparkles,
  HeartHandshake,
  ArrowRight,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

type Tab = 'login' | 'register';

// Type pour les paramètres de la fonction RPC create_profile_from_signup
type CreateProfileParams = {
  user_id: string;
  user_first_name: string;
  user_last_name: string;
  user_date_of_birth: string;
  user_country: string;
};

function getErrorMessage(e: unknown): string {
  if (!e) return 'Erreur inconnue.';
  if (typeof e === 'string') return e;
  if (e instanceof Error) return e.message || 'Erreur.';
  if (typeof e === 'object' && e !== null && 'message' in e && typeof (e as { message?: unknown }).message === 'string') {
    return (e as { message: string }).message;
  }
  return 'Erreur.';
}

function calculateAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

export default function AuthShell() {
  const [tab, setTab] = useState<Tab>('login');

  // Login states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Signup states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [country, setCountry] = useState('FR'); // France par défaut
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState<string | null>(null);

  // OAuth states
  const [googleLoading, setGoogleLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [discordLoading, setDiscordLoading] = useState(false);

  const tabLabel = useMemo(() => {
    return tab === 'login' ? 'Connexion' : 'Inscription';
  }, [tab]);

  const isLogin = tab === 'login';

  const canLogin = loginEmail.trim().length > 0 && loginPassword.length > 0;
  
  const canSignup = useMemo(() => {
    if (!firstName.trim() || !lastName.trim()) return false;
    if (!dateOfBirth) return false;
    if (!signupEmail.trim() || signupPassword.length < 8) return false;
    if (signupPassword !== signupConfirm) return false;
    if (!acceptTerms) return false;
    
    // Validation âge
    const age = calculateAge(dateOfBirth);
    const minAge = country === 'FR' ? 15 : 13;
    if (age < minAge) return false;
    
    return true;
  }, [firstName, lastName, dateOfBirth, signupEmail, signupPassword, signupConfirm, acceptTerms, country]);

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
      // Validation âge finale
      const age = calculateAge(dateOfBirth);
      const minAge = country === 'FR' ? 15 : 13;
      
      if (age < minAge) {
        throw new Error(`Vous devez avoir au moins ${minAge} ans pour créer un compte.`);
      }

      // Étape 1: Créer le compte Supabase Auth
      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: signupEmail.trim(),
        password: signupPassword,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            date_of_birth: dateOfBirth,
            country: country,
          },
        },
      });

      if (signupError) throw signupError;

      // Étape 2: Créer le profil dans la table profiles via RPC
      if (signupData.user) {
        const profileParams: CreateProfileParams = {
          user_id: signupData.user.id,
          user_first_name: firstName.trim(),
          user_last_name: lastName.trim(),
          user_date_of_birth: dateOfBirth,
          user_country: country,
        };

        const { error: profileError } = await supabase.rpc(
          'create_profile_from_signup',
          profileParams
        );

        if (profileError) {
          console.error('Erreur création profil:', profileError);
          // On ne bloque pas l'inscription si la création du profil échoue
          // Le profil sera créé à la première connexion
        }
      }

      setSignupSuccess('Compte créé avec succès ! Vérifiez votre email pour confirmer votre inscription.');

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

  const handleOAuthLogin = async (provider: 'google' | 'github' | 'discord') => {
    if (provider === 'google') setGoogleLoading(true);
    if (provider === 'github') setGithubLoading(true);
    if (provider === 'discord') setDiscordLoading(true);

    setLoginError(null);
    setSignupError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/account`,
        },
      });

      if (error) throw error;
    } catch (err) {
      const msg = getErrorMessage(err);
      if (tab === 'login') {
        setLoginError(msg || `Erreur de connexion avec ${provider}.`);
      } else {
        setSignupError(msg || `Erreur de connexion avec ${provider}.`);
      }
    } finally {
      if (provider === 'google') setGoogleLoading(false);
      if (provider === 'github') setGithubLoading(false);
      if (provider === 'discord') setDiscordLoading(false);
    }
  };

  const ageValidationMessage = useMemo(() => {
    if (!dateOfBirth) return null;
    const age = calculateAge(dateOfBirth);
    const minAge = country === 'FR' ? 15 : 13;
    
    if (age < minAge) {
      return (
        <div className="mt-2 flex items-start gap-2 text-xs text-rose-600">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          <span>
            {country === 'FR' 
              ? `Vous devez avoir au moins 15 ans pour créer un compte (loi française).`
              : `Vous devez avoir au moins 13 ans pour créer un compte.`}
          </span>
        </div>
      );
    }
    
    return (
      <div className="mt-2 text-xs text-emerald-600">
        ✓ Âge valide ({age} ans)
      </div>
    );
  }, [dateOfBirth, country]);

  return (
    <section className="mx-auto w-full max-w-6xl px-6 pt-28 pb-20 md:pt-32">
      {/* Header */}
      <div className="mx-auto mb-8 max-w-2xl text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-4 py-2 shadow-sm backdrop-blur-md">
          <Sparkles className="h-4 w-4 text-violet-600" />
          <span className="text-sm font-semibold text-slate-900">EchoWorld</span>
          <span className="text-slate-400">•</span>
          <span className="text-sm text-slate-600">Votre histoire, notre monde</span>
        </div>

        <h1 className="text-balance text-4xl font-bold tracking-tight text-slate-950 md:text-5xl">
          {tabLabel}
        </h1>
        <p className="mt-3 text-base text-slate-600 md:text-lg">
          Accédez à votre espace, partagez des échos, et explorez les histoires du monde.
        </p>
      </div>

      {/* Card */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/70 shadow-xl shadow-black/5 backdrop-blur-xl">
        {/* Subtle background accent */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 opacity-70 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.18),transparent_60%)]" />
          <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.16),transparent_55%)]" />
        </div>

        <div className="relative z-10 grid gap-0 md:grid-cols-[1.15fr_0.85fr]">
          {/* Left: forms */}
          <div className="p-6 md:p-10">
            {/* Tabs */}
            <div className="mb-6 flex items-center justify-between gap-3">
              <div
                className="inline-flex rounded-2xl border border-slate-200 bg-white/70 p-1 shadow-sm"
                role="tablist"
                aria-label="Authentification"
              >
                <button
                  id="tab-login"
                  type="button"
                  onClick={() => setTab('login')}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    isLogin ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-700 hover:bg-white'
                  }`}
                  role="tab"
                  aria-selected={isLogin}
                  aria-controls="panel-login"
                >
                  <LogIn className="mr-2 inline h-4 w-4" />
                  Connexion
                </button>
                <button
                  id="tab-register"
                  type="button"
                  onClick={() => setTab('register')}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    !isLogin ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-700 hover:bg-white'
                  }`}
                  role="tab"
                  aria-selected={!isLogin}
                  aria-controls="panel-register"
                >
                  <UserPlus className="mr-2 inline h-4 w-4" />
                  Inscription
                </button>
              </div>

              <div className="hidden text-sm text-slate-600 md:block">
                {isLogin ? (
                  <span>
                    Pas de compte ?{' '}
                    <button
                      type="button"
                      onClick={() => setTab('register')}
                      className="font-semibold text-violet-700 hover:text-violet-800"
                    >
                      Créer un compte
                    </button>
                  </span>
                ) : (
                  <span>
                    Déjà un compte ?{' '}
                    <button
                      type="button"
                      onClick={() => setTab('login')}
                      className="font-semibold text-violet-700 hover:text-violet-800"
                    >
                      Se connecter
                    </button>
                  </span>
                )}
              </div>
            </div>

            {/* OAuth Buttons */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => handleOAuthLogin('google')}
                disabled={googleLoading}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white/70 px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-white hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              >
                {googleLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                Continuer avec Google
              </button>

              <button
                type="button"
                onClick={() => handleOAuthLogin('github')}
                disabled={githubLoading}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white/70 px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-white hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              >
                {githubLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path
                      fillRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                Continuer avec GitHub
              </button>

              <button
                type="button"
                onClick={() => handleOAuthLogin('discord')}
                disabled={discordLoading}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white/70 px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-white hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              >
                {discordLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <svg className="h-5 w-5" fill="#5865F2" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                  </svg>
                )}
                Continuer avec Discord
              </button>
            </div>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">ou</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            {/* Active form */}
            <AnimatePresence mode="wait">
              {isLogin ? (
                <motion.div
                  key="login"
                  id="panel-login"
                  role="tabpanel"
                  aria-labelledby="tab-login"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                >
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-bold text-slate-900">Bon retour parmi nous</h2>
                      <p className="mt-2 text-sm text-slate-600">
                        Connecte-toi pour accéder à ton profil et tes échos.
                      </p>
                    </div>

                    {loginError && (
                      <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                        <AlertTriangle className="mt-0.5 h-4 w-4" />
                        <span>{loginError}</span>
                      </div>
                    )}

                    <label className="block">
                      <span className="mb-1 block text-sm font-semibold text-slate-900">Email</span>
                      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
                        <Mail className="h-4 w-4 text-slate-500" />
                        <input
                          type="email"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          placeholder="ton@email.com"
                          autoComplete="email"
                          disabled={loginLoading}
                          className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-70"
                          required
                        />
                      </div>
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-sm font-semibold text-slate-900">Mot de passe</span>
                      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
                        <Lock className="h-4 w-4 text-slate-500" />
                        <input
                          type="password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="••••••••"
                          autoComplete="current-password"
                          disabled={loginLoading}
                          className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-70"
                          required
                        />
                      </div>
                    </label>

                    <button
                      type="submit"
                      disabled={!canLogin || loginLoading}
                      className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {loginLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Connexion…
                        </>
                      ) : (
                        <>
                          Se connecter
                          <ArrowRight className="h-4 w-4 opacity-80 transition-transform group-hover:translate-x-0.5" />
                        </>
                      )}
                    </button>

                    <div className="text-center text-sm text-slate-500">
                      Mot de passe oublié ?{' '}
                      <Link href="/auth/forgot-password" className="font-semibold text-violet-700 hover:text-violet-800">
                        Réinitialiser
                      </Link>
                    </div>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="register"
                  id="panel-register"
                  role="tabpanel"
                  aria-labelledby="tab-register"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                >
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-bold text-slate-900">Rejoins la communauté</h2>
                      <p className="mt-2 text-sm text-slate-600">
                        Crée ton compte pour partager tes échos avec le monde.
                      </p>
                    </div>

                    {signupError && (
                      <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                        <AlertTriangle className="mt-0.5 h-4 w-4" />
                        <span>{signupError}</span>
                      </div>
                    )}

                    {signupSuccess && (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                        {signupSuccess}
                      </div>
                    )}

                    {/* Nom et Prénom */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 block text-sm font-semibold text-slate-900">
                          Prénom <span className="text-rose-600">*</span>
                        </span>
                        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
                          <UserIcon className="h-4 w-4 text-slate-500" />
                          <input
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="Jean"
                            autoComplete="given-name"
                            disabled={signupLoading}
                            className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-70"
                            required
                          />
                        </div>
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-sm font-semibold text-slate-900">
                          Nom <span className="text-rose-600">*</span>
                        </span>
                        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
                          <UserIcon className="h-4 w-4 text-slate-500" />
                          <input
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Dupont"
                            autoComplete="family-name"
                            disabled={signupLoading}
                            className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-70"
                            required
                          />
                        </div>
                      </label>
                    </div>

                    {/* Date de naissance et Pays */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 block text-sm font-semibold text-slate-900">
                          Date de naissance <span className="text-rose-600">*</span>
                        </span>
                        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
                          <Calendar className="h-4 w-4 text-slate-500" />
                          <input
                            type="date"
                            value={dateOfBirth}
                            onChange={(e) => setDateOfBirth(e.target.value)}
                            max={new Date().toISOString().split('T')[0]}
                            disabled={signupLoading}
                            className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-70"
                            required
                          />
                        </div>
                        {ageValidationMessage}
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-sm font-semibold text-slate-900">
                          Pays <span className="text-rose-600">*</span>
                        </span>
                        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
                          <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <select
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            disabled={signupLoading}
                            className="w-full bg-transparent text-sm text-slate-900 focus:outline-none disabled:opacity-70"
                            required
                          >
                            <option value="FR">France (15 ans minimum)</option>
                            <option value="US">États-Unis (13 ans minimum)</option>
                            <option value="GB">Royaume-Uni (13 ans minimum)</option>
                            <option value="DE">Allemagne (13 ans minimum)</option>
                            <option value="ES">Espagne (13 ans minimum)</option>
                            <option value="IT">Italie (13 ans minimum)</option>
                            <option value="OTHER">Autre pays (13 ans minimum)</option>
                          </select>
                        </div>
                      </label>
                    </div>

                    {/* Email */}
                    <label className="block">
                      <span className="mb-1 block text-sm font-semibold text-slate-900">
                        Email <span className="text-rose-600">*</span>
                      </span>
                      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
                        <Mail className="h-4 w-4 text-slate-500" />
                        <input
                          type="email"
                          value={signupEmail}
                          onChange={(e) => setSignupEmail(e.target.value)}
                          placeholder="ton@email.com"
                          autoComplete="email"
                          disabled={signupLoading}
                          className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-70"
                          required
                        />
                      </div>
                    </label>

                    {/* Mot de passe */}
                    <label className="block">
                      <span className="mb-1 block text-sm font-semibold text-slate-900">
                        Mot de passe <span className="text-rose-600">*</span>
                      </span>
                      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
                        <Lock className="h-4 w-4 text-slate-500" />
                        <input
                          type="password"
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          placeholder="•••••••• (8+ caractères)"
                          autoComplete="new-password"
                          disabled={signupLoading}
                          minLength={8}
                          className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-70"
                          required
                        />
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Minimum 8 caractères. Utilisez une phrase de passe sécurisée.
                      </div>
                    </label>

                    {/* Confirmation mot de passe */}
                    <label className="block">
                      <span className="mb-1 block text-sm font-semibold text-slate-900">
                        Confirmer le mot de passe <span className="text-rose-600">*</span>
                      </span>
                      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
                        <Lock className="h-4 w-4 text-slate-500" />
                        <input
                          type="password"
                          value={signupConfirm}
                          onChange={(e) => setSignupConfirm(e.target.value)}
                          placeholder="••••••••"
                          autoComplete="new-password"
                          disabled={signupLoading}
                          className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-70"
                          required
                        />
                      </div>
                      {signupPassword && signupConfirm && signupPassword !== signupConfirm && (
                        <div className="mt-2 text-xs text-rose-600">
                          Les mots de passe ne correspondent pas.
                        </div>
                      )}
                    </label>

                    {/* Checkbox CGU */}
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acceptTerms}
                        onChange={(e) => setAcceptTerms(e.target.checked)}
                        disabled={signupLoading}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 disabled:opacity-70"
                        required
                      />
                      <span className="text-xs text-slate-600">
                        J&apos;accepte les{' '}
                        <Link href="/terms" className="font-semibold text-violet-700 hover:text-violet-800">
                          Conditions d&apos;utilisation
                        </Link>{' '}
                        et la{' '}
                        <Link href="/privacy" className="font-semibold text-violet-700 hover:text-violet-800">
                          Politique de confidentialité
                        </Link>
                        . Je confirme avoir l&apos;âge minimum requis ({country === 'FR' ? '15 ans' : '13 ans'}).
                      </span>
                    </label>

                    <button
                      type="submit"
                      disabled={!canSignup || signupLoading}
                      className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {signupLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Création…
                        </>
                      ) : (
                        <>
                          Créer mon compte
                          <ArrowRight className="h-4 w-4 opacity-80 transition-transform group-hover:translate-x-0.5" />
                        </>
                      )}
                    </button>

                    <div className="pt-2 text-center text-sm text-slate-600 md:hidden">
                      Déjà un compte ?{' '}
                      <button
                        type="button"
                        onClick={() => setTab('login')}
                        className="font-semibold text-violet-700 hover:text-violet-800"
                      >
                        Se connecter
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right: benefits */}
          <div className="border-t border-slate-200/70 bg-white/55 p-6 md:border-t-0 md:border-l md:p-10">
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-sm font-semibold text-slate-900">
                <Shield className="h-4 w-4 text-slate-700" />
                Sécurisé & Conforme RGPD
              </div>
            </div>

            <div className="space-y-5">
              <div className="flex gap-3">
                <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white">
                  <HeartHandshake className="h-4 w-4 text-violet-700" />
                </div>
                <div>
                  <div className="font-semibold text-slate-950">Créer des liens</div>
                  <div className="text-sm text-slate-600">
                    Trouvez des parcours similaires et connectez-vous avec respect.
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white">
                  <Sparkles className="h-4 w-4 text-sky-700" />
                </div>
                <div>
                  <div className="font-semibold text-slate-950">Partager un écho</div>
                  <div className="text-sm text-slate-600">
                    Publiez anonymement ou non. Votre histoire peut aider quelqu&apos;un.
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
                <div className="text-sm font-semibold text-slate-900">Protection des mineurs</div>
                <div className="mt-1 text-sm text-slate-600">
                  EchoWorld respecte les lois sur la protection des mineurs : 15 ans minimum en France, 13 ans dans le reste du monde.
                </div>
              </div>

              <Link
                href="/explore"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-white"
              >
                Explorer sans compte
                <ArrowRight className="h-4 w-4 opacity-70 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}