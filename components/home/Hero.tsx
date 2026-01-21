/**
 * =============================================================================
 * Fichier      : components/home/Hero.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 2.1.0 (2026-01-21)
 * Objet        : Hero section redesign — Immersif, poétique, émotionnel
 * -----------------------------------------------------------------------------
 * Description  :
 * - Typographie forte, hiérarchie claire
 * - Respiration (pas de surcharge)
 * - Badge + language select (discrets)
 * - CTAs premium (glow, transitions)
 * - Pas de cards features plates
 * - Composant flexible (sans wrapper section) pour grid layout
 * =============================================================================
 */

'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';
import LanguageSelect from '@/components/home/LanguageSelect';
import { useLang } from '@/lib/i18n/LanguageProvider';

export default function Hero() {
  const { t } = useLang();

  return (
    <>
      {/* Floating gradient accent */}
      <div className="pointer-events-none absolute -inset-10 overflow-hidden">
        <div className="absolute -top-20 left-1/2 h-100 w-100 -translate-x-1/2 rounded-full bg-linear-to-br from-violet-400/20 via-sky-400/15 to-transparent blur-3xl" />
      </div>

      {/* Top row: badge + language */}
      <div className="relative z-10 mb-12 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-3 rounded-full border border-white/8 bg-white/3 px-5 py-2.5 backdrop-blur-sm"
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-violet-400/20 to-sky-400/20 border border-white/10">
            <Sparkles className="h-4 w-4 text-violet-300" />
          </span>
          <span className="text-sm font-semibold text-white">
            {t('hero.badge_prefix')}
          </span>
          <span className="text-slate-400">•</span>
          <span className="text-sm text-slate-300">{t('hero.badge_suffix')}</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <LanguageSelect />
        </motion.div>
      </div>

      {/* Main headline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="relative z-10 max-w-4xl"
      >
        <h1 className="text-balance text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
          <span className="block text-white">{t('hero.title_line1')}</span>
          <span className="block bg-linear-to-r from-violet-300 via-sky-300 to-emerald-300 bg-clip-text text-transparent">
            {t('hero.title_line2')}
          </span>
        </h1>

        {/* Underline glow */}
        <div className="pointer-events-none mt-4 h-px w-64 bg-linear-to-r from-violet-400/0 via-violet-300/60 to-transparent" />
      </motion.div>

      {/* Subtitle (poétique) */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.35 }}
        className="relative z-10 mt-8 max-w-2xl text-balance text-lg leading-relaxed text-slate-300 sm:text-xl md:text-2xl"
      >
        {t('hero.subtitle')}
      </motion.p>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        className="relative z-10 mt-12 flex flex-col gap-4 sm:flex-row sm:items-center"
      >
        {/* CTA primary: Share */}
        <Link
          href="/share"
          className="group relative inline-flex items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-white px-8 py-4 text-base font-semibold text-slate-950 shadow-lg shadow-white/10 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-white/15 focus:outline-none focus:ring-2 focus:ring-white/30"
        >
          <span className="relative z-10">{t('hero.cta_share')}</span>
          <ArrowRight className="relative z-10 h-5 w-5 transition-transform group-hover:translate-x-1" />

          {/* Glow on hover */}
          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100">
            <div className="absolute inset-0 rounded-2xl bg-linear-to-r from-violet-200/30 via-sky-200/30 to-emerald-200/30 blur-xl" />
          </div>
        </Link>

        {/* CTA secondary: Explore */}
        <Link
          href="/world-map"
          className="inline-flex items-center justify-center gap-2.5 rounded-2xl border border-white/10 bg-white/4 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/8 focus:outline-none focus:ring-2 focus:ring-white/20"
        >
          {t('hero.cta_explore')}
          <ArrowRight className="h-5 w-5 opacity-60" />
        </Link>

        {/* CTA tertiary: Login (discret) */}
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-2 py-4 text-base font-medium text-slate-300 transition-colors hover:text-white"
        >
          {t('hero.cta_login')}
          <ArrowRight className="h-4 w-4 opacity-50" />
        </Link>
      </motion.div>
    </>
  );
}