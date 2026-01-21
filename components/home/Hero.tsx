/**
 * =============================================================================
 * Fichier      : components/home/Hero.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.3 (2026-01-21)
 * Objet        : Hero section premium (homepage) - UI moderne et novatrice
 *               + Sélecteur de langue (détection + persistance via Provider global)
 * -----------------------------------------------------------------------------
 * Description  :
 * - Hero : badge, headline gradient, CTA, cards features
 * - Animations légères (Framer Motion)
 * - Ajoute un sélecteur de langue (MVP i18n) sans impacter le layout existant
 *
 * Correctifs (sans régression) :
 * - [FIX] Classe canonical Tailwind v4 : bg-linear-to-r
 * - [ADD] LanguageSelect : sélection langue + persistance (localStorage)
 * - [SAFE] Aucun changement de structure majeure : on insère un bloc UI discret
 * =============================================================================
 */

'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Globe, Sparkles, PenLine } from 'lucide-react';
import LanguageSelect from '@/components/home/LanguageSelect';

export default function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200"
        >
          <Sparkles className="h-4 w-4 text-emerald-300" />
          <span>EchoWorld</span>
          <span className="text-slate-400">•</span>
          <span className="text-slate-300">global empathy platform</span>
        </motion.div>

        {/* Lang selector (MVP i18n) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="self-start sm:self-auto"
        >
          <LanguageSelect />
        </motion.div>
      </div>

      <motion.h1
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.05 }}
        className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl"
      >
        Your Story, Their Echo,
        <span className="block bg-linear-to-r from-sky-300 via-violet-300 to-emerald-300 bg-clip-text text-transparent">
          Our World.
        </span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.10 }}
        className="mt-5 max-w-2xl text-pretty text-lg leading-relaxed text-slate-300 md:text-xl"
      >
        Share a personal echo. Place it on the map. Discover how human experiences resonate across borders.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15 }}
        className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        <Link
          href="/share"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm shadow-white/10 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-white/40"
        >
          <PenLine className="h-4 w-4" />
          Share your echo
        </Link>

        <Link
          href="/world-map"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
        >
          <Globe className="h-4 w-4" />
          Explore world map
        </Link>

        <Link href="/login" className="px-5 py-3 text-sm font-semibold text-slate-200 hover:text-white">
          Login →
        </Link>
      </motion.div>

      <div className="mt-10 grid gap-3 sm:grid-cols-3">
        {[
          ['Anonymous or named', 'Choose what you reveal. Identity stays yours.'],
          ['Map-first experience', 'Echoes become a living layer on the planet.'],
          ['Meaningful discovery', 'Find similar feelings across cultures.'],
        ].map(([t, d]) => (
          <div key={t} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm font-semibold">{t}</div>
            <div className="mt-1 text-sm text-slate-300">{d}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
