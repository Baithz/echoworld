/**
 * =============================================================================
 * Fichier      : components/home/Hero.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.2.0 (2026-01-21)
 * Objet        : Hero section premium (homepage) - UI moderne et novatrice
 *               + Sélecteur de langue + Textes traduits (t()) via Provider global
 *               + Largeur élargie (layout plus immersif) + WOW visuals
 * -----------------------------------------------------------------------------
 * Description  :
 * - Hero : badge, headline gradient, CTA, cards features
 * - Animations légères (Framer Motion)
 * - Sélecteur de langue (LanguageSelect)
 * - Textes dynamiques via useLang().t()
 * - Largeur : max-w-7xl (plus large, sans casser la lisibilité)
 *
 * Correctifs (sans régression) :
 * - [SAFE] Keys i18n inchangées
 * - [SAFE] Routes CTA inchangées (/share, /world-map, /login)
 * - [IMPROVED] Mise en scène premium : glow, frame, meilleure hiérarchie
 * =============================================================================
 */

'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Globe, Sparkles, PenLine, ArrowRight, ShieldCheck, MapPinned, Users } from 'lucide-react';
import LanguageSelect from '@/components/home/LanguageSelect';
import { useLang } from '@/lib/i18n/LanguageProvider';
import type { I18nKey } from '@/lib/i18n/messages';

const FEATURE_KEYS: ReadonlyArray<{ title: I18nKey; desc: I18nKey; icon: 'privacy' | 'map' | 'discovery' }> = [
  { title: 'hero.card1_title', desc: 'hero.card1_desc', icon: 'privacy' },
  { title: 'hero.card2_title', desc: 'hero.card2_desc', icon: 'map' },
  { title: 'hero.card3_title', desc: 'hero.card3_desc', icon: 'discovery' },
] as const;

function FeatureIcon({ kind }: { kind: 'privacy' | 'map' | 'discovery' }) {
  const cls = 'h-4 w-4';
  if (kind === 'privacy') return <ShieldCheck className={`${cls} text-emerald-300`} />;
  if (kind === 'map') return <MapPinned className={`${cls} text-sky-300`} />;
  return <Users className={`${cls} text-violet-300`} />;
}

export default function Hero() {
  const { t } = useLang();

  return (
    <section className="mx-auto max-w-7xl px-6 pt-18 pb-14 md:pt-22 md:pb-16">
      {/* HERO FRAME */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/4 px-6 py-10 backdrop-blur md:px-10 md:py-14">
        {/* Background accents */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 left-1/2 h-120 w-120 -translate-x-1/2 rounded-full bg-linear-to-tr from-sky-500/20 via-violet-500/18 to-emerald-500/16 blur-3xl" />
          <div className="absolute -bottom-40 -right-40 h-120 w-120 rounded-full bg-linear-to-tr from-emerald-500/12 via-sky-500/10 to-violet-500/12 blur-3xl" />
          <div className="absolute inset-0 ew-hero-noise opacity-[0.08]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_15%,rgba(255,255,255,0.08),transparent_50%)]" />
        </div>

        {/* Top row: badge + language */}
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5">
              <Sparkles className="h-4 w-4 text-emerald-300" />
            </span>
            <span className="font-semibold text-white">EchoWorld</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-300">{t('hero.badge_suffix')}</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="self-start sm:self-auto"
          >
            <LanguageSelect />
          </motion.div>
        </div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.05 }}
          className="relative mt-7 text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl"
        >
          <span className="text-white">{t('hero.title_line1')}</span>
          <span className="block bg-linear-to-r from-sky-300 via-violet-300 to-emerald-300 bg-clip-text text-transparent">
            {t('hero.title_line2')}
          </span>

          {/* subtle underline glow */}
          <span className="pointer-events-none absolute -bottom-3 left-0 h-px w-56 bg-linear-to-r from-sky-400/0 via-sky-300/60 to-emerald-300/0" />
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.10 }}
          className="relative mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-slate-300 md:text-xl"
        >
          {t('hero.subtitle')}
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.15 }}
          className="relative mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          <Link
            href="/share"
            className="group inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm shadow-white/10 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-white/40"
          >
            <PenLine className="h-4 w-4" />
            {t('hero.cta_share')}
            <ArrowRight className="h-4 w-4 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
          </Link>

          <Link
            href="/world-map"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
          >
            <Globe className="h-4 w-4 text-sky-200" />
            {t('hero.cta_map')}
          </Link>

          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-1 py-3 text-sm font-semibold text-slate-200 transition hover:text-white"
          >
            {t('hero.cta_login')}
            <ArrowRight className="h-4 w-4 opacity-70" />
          </Link>
        </motion.div>

        {/* Feature cards */}
        <div className="relative mt-10 grid gap-3 sm:grid-cols-3">
          {FEATURE_KEYS.map(({ title, desc, icon }) => (
            <div
              key={title}
              className="group rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-white/15 hover:bg-white/7"
            >
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                  <FeatureIcon kind={icon} />
                </span>
                <div className="text-sm font-semibold text-white">{t(title)}</div>
              </div>
              <div className="mt-2 text-sm leading-relaxed text-slate-300">{t(desc)}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
