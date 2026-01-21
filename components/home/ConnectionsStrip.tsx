/**
 * =============================================================================
 * Fichier      : components/home/ConnectionsStrip.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 2.1.0 (2026-01-21)
 * Objet        : Connexions humaines - Rencontres suggérées (chaleureux)
 * -----------------------------------------------------------------------------
 * Description  :
 * - Cards premium de personnes suggérées
 * - Focus sur l'humain, pas sur les scores
 * - Design chaleureux, empathique
 * - Hover effects élégants
 * - Pas de grille KPI froide
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 2.1.0 (2026-01-21)
 * - [IMPROVED] Thème clair par défaut (contrastes, bg, borders, textes)
 * - [IMPROVED] Layout bord-à-bord : contenu aligné aux bords écran (plus centré)
 * - [CHORE] Aucune régression logique/animations
 * =============================================================================
 */

'use client';

import { motion } from 'framer-motion';
import { Heart, MessageCircle, Sparkles } from 'lucide-react';
import { useLang } from '@/lib/i18n/LanguageProvider';

// Mock connections (à remplacer par fetch Supabase + AI matching)
const MOCK_CONNECTIONS = [
  {
    id: 1,
    name: 'Maria',
    location: 'Barcelona, Spain',
    sharedExperience: 'Rediscovering joy after loss',
    resonance: 92,
    avatar: '👩🏻',
    recent: true,
  },
  {
    id: 2,
    name: 'Kenji',
    location: 'Osaka, Japan',
    sharedExperience: 'Finding hope in small moments',
    resonance: 88,
    avatar: '👨🏻',
    recent: false,
  },
  {
    id: 3,
    name: 'Anonymous',
    location: 'Cairo, Egypt',
    sharedExperience: 'Navigating cultural identity',
    resonance: 85,
    avatar: '🧑🏽',
    recent: true,
  },
];

export default function ConnectionsStrip() {
  const { t } = useLang();

  return (
    // Pleine largeur (bords écran) + garde une lecture confortable
    <section className="w-full px-6 py-16 md:py-24">
      {/* Header */}
      <div className="mb-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-2">
            <Sparkles className="h-4 w-4 text-violet-600" />
            <span className="text-sm font-semibold text-violet-700">
              {t('connections.suggested_for_you')}
            </span>
          </div>

          <h2 className="mt-6 text-4xl font-bold text-slate-900 md:text-5xl">
            {t('connections.title')}
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            {t('connections.subtitle')}
          </p>
        </motion.div>
      </div>

      {/* Connections grid (large, bord-à-bord, mais lisible) */}
      <div className="mx-auto grid w-full gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {MOCK_CONNECTIONS.map((person, idx) => (
          <motion.div
            key={person.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: idx * 0.15 }}
            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white/70 p-6 backdrop-blur-md transition-all hover:border-slate-300 hover:bg-white/85 hover:shadow-2xl hover:shadow-violet-500/10"
          >
            {/* Glow on hover */}
            <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100">
              <div className="absolute inset-0 bg-linear-to-br from-violet-400/10 via-transparent to-sky-400/10" />
            </div>

            {/* Content */}
            <div className="relative z-10">
              {/* Avatar + badge */}
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-linear-to-br from-violet-400/15 to-sky-400/15 text-3xl">
                    {person.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{person.name}</div>
                    <div className="text-xs text-slate-500">{person.location}</div>
                  </div>
                </div>

                {person.recent && (
                  <div className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                    <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                    New
                  </div>
                )}
              </div>

              {/* Shared experience */}
              <div className="mb-4">
                <div className="mb-1 text-xs font-medium text-slate-500">
                  {t('connections.shared_experience')}
                </div>
                <p className="text-sm leading-relaxed text-slate-700">
                  {person.sharedExperience}
                </p>
              </div>

              {/* Resonance */}
              <div className="mb-5 flex items-center gap-2">
                <div className="flex-1 overflow-hidden rounded-full bg-slate-900/5">
                  <div
                    className="h-1.5 rounded-full bg-linear-to-r from-violet-500 to-sky-500"
                    style={{ width: `${person.resonance}%` }}
                  />
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold text-violet-700">
                  <Heart className="h-3 w-3" />
                  {person.resonance}% {t('connections.match_score')}
                </div>
              </div>

              {/* CTA */}
              <button className="float flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-4 py-3 text-sm font-semibold text-slate-900 transition-all hover:border-slate-300 hover:bg-white">
                <MessageCircle className="h-4 w-4" />
                {t('connections.connect_btn')}
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Discover more CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="mt-12 text-center"
      >
        <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-6 py-3 text-sm font-semibold text-slate-900 backdrop-blur-md transition-all hover:border-slate-300 hover:bg-white">
          {t('connections.discover_more')}
          <Sparkles className="h-4 w-4" />
        </button>
      </motion.div>
    </section>
  );
}
