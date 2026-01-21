/**
 * =============================================================================
 * Fichier      : components/auth/AuthShell.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-21)
 * Objet        : Shell Auth - Tabs Connexion/Inscription + layout cohérent thème clair
 * -----------------------------------------------------------------------------
 * Description  :
 * - Tabs Connexion / Inscription (mobile + desktop)
 * - Layout premium (glass clair + borders slate)
 * - Colonne droite : bénéfices + micro-copy (optionnel)
 * - Intègre LoginForm / RegisterForm + OAuthButtons
 * =============================================================================
 */

'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Sparkles, HeartHandshake, ArrowRight } from 'lucide-react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import OAuthButtons from './OAuthButtons';


type Tab = 'login' | 'register';

export default function AuthShell() {
  const [tab, setTab] = useState<Tab>('login');

  const tabLabel = useMemo(() => {
    return tab === 'login' ? 'Connexion' : 'Inscription';
  }, [tab]);

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
              <div className="inline-flex rounded-2xl border border-slate-200 bg-white/70 p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setTab('login')}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    tab === 'login'
                      ? 'bg-slate-950 text-white shadow-sm'
                      : 'text-slate-700 hover:bg-white'
                  }`}
                  aria-pressed={tab === 'login'}
                >
                  Connexion
                </button>
                <button
                  type="button"
                  onClick={() => setTab('register')}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    tab === 'register'
                      ? 'bg-slate-950 text-white shadow-sm'
                      : 'text-slate-700 hover:bg-white'
                  }`}
                  aria-pressed={tab === 'register'}
                >
                  Inscription
                </button>
              </div>

              <div className="hidden text-sm text-slate-600 md:block">
                {tab === 'login' ? (
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

            {/* OAuth */}
            <OAuthButtons />

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                ou
              </span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            {/* Active form */}
            <AnimatePresence mode="wait">
              {tab === 'login' ? (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                >
                  <LoginForm onSwitchToRegister={() => setTab('register')} />
                </motion.div>
              ) : (
                <motion.div
                  key="register"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                >
                  <RegisterForm onSwitchToLogin={() => setTab('login')} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right: benefits */}
          <div className="border-t border-slate-200/70 bg-white/55 p-6 md:border-t-0 md:border-l md:p-10">
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-sm font-semibold text-slate-900">
                <Shield className="h-4 w-4 text-slate-700" />
                Sécurisé (Supabase Auth)
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
                    Publiez anonymement ou non. Votre histoire peut aider quelqu’un.
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
                <div className="text-sm font-semibold text-slate-900">Conseil</div>
                <div className="mt-1 text-sm text-slate-600">
                  Utilisez une adresse email accessible : elle sert à sécuriser votre compte.
                </div>
              </div>

              <a
                href="/explore"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-white"
              >
                Explorer sans compte
                <ArrowRight className="h-4 w-4 opacity-70 transition-transform group-hover:translate-x-0.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
