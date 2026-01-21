/**
 * =============================================================================
 * Fichier      : components/home/WorldGlobe.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 2.0.1 (2026-01-21)
 * Objet        : Globe monde interactif (MVP) - Stories intégrées sur carte
 * -----------------------------------------------------------------------------
 * Description  :
 * - MVP: Projection SVG simplifiée (pas de lib 3D encore)
 * - Points lumineux représentant les stories
 * - Pulse, ripple, hover effects
 * - Focus smooth sur survol
 * - Prépare l'intégration future MapLibre ou react-globe.gl
 *
 * Correctifs (sans régression) :
 * - [FIX] Apostrophes dans les strings preview (évite parsing error TS/ESLint)
 * =============================================================================
 */

'use client';

import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import { useLang } from '@/lib/i18n/LanguageProvider';
import { useState } from 'react';

// Mock stories (à remplacer par fetch Supabase)
const MOCK_STORIES = [
  {
    id: 1,
    x: 25,
    y: 35,
    city: 'Paris',
    country: 'France',
    preview: "Found hope in a stranger's smile today...",
    emotion: 'joy',
  },
  {
    id: 2,
    x: 75,
    y: 45,
    city: 'Tokyo',
    country: 'Japan',
    preview: "My grandmother's recipe brought back memories...",
    emotion: 'gratitude',
  },
  {
    id: 3,
    x: 15,
    y: 65,
    city: 'São Paulo',
    country: 'Brazil',
    preview: 'Dancing in the rain with my daughter...',
    emotion: 'joy',
  },
  {
    id: 4,
    x: 50,
    y: 25,
    city: 'Cairo',
    country: 'Egypt',
    preview: 'Realized we are more similar than different...',
    emotion: 'reflection',
  },
  {
    id: 5,
    x: 85,
    y: 75,
    city: 'Sydney',
    country: 'Australia',
    preview: 'Watching the sunrise, feeling grateful...',
    emotion: 'hope',
  },
];

const EMOTION_COLORS = {
  joy: { from: '#34D399', to: '#38BDF8' }, // emerald to sky
  hope: { from: '#38BDF8', to: '#A78BFA' }, // sky to violet
  gratitude: { from: '#A78BFA', to: '#EC4899' }, // violet to pink
  reflection: { from: '#FBBF24', to: '#FB923C' }, // amber to orange
  solidarity: { from: '#FB7185', to: '#EF4444' }, // rose to red
};

export default function WorldGlobe() {
  const { t } = useLang();
  const [hoveredStory, setHoveredStory] = useState<number | null>(null);

  return (
    <div className="relative h-150 w-full overflow-hidden rounded-3xl border border-white/10 bg-slate-950/50 backdrop-blur-sm md:h-175">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.08),transparent_70%)]" />
      </div>

      {/* "Map" container (SVG ou future Canvas) */}
      <div className="relative h-full w-full">
        {/* Grid overlay (simule les continents) */}
        <svg
          className="absolute inset-0 h-full w-full opacity-10"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="white"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Stories points */}
        {MOCK_STORIES.map((story, idx) => {
          const isHovered = hoveredStory === story.id;
          const emotionColor =
            EMOTION_COLORS[story.emotion as keyof typeof EMOTION_COLORS];

          return (
            <motion.div
              key={story.id}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: idx * 0.15 }}
              className="absolute cursor-pointer"
              style={{
                left: `${story.x}%`,
                top: `${story.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
              onMouseEnter={() => setHoveredStory(story.id)}
              onMouseLeave={() => setHoveredStory(null)}
            >
              {/* Ripple effect */}
              <div className="absolute inset-0 -z-10">
                <div className="ripple absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20" />
              </div>

              {/* Glow background */}
              <div
                className={`absolute inset-0 -z-10 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full blur-xl transition-opacity ${
                  isHovered ? 'opacity-70' : 'opacity-40'
                }`}
                style={{
                  background: `linear-gradient(to bottom right, ${emotionColor.from}, ${emotionColor.to})`,
                }}
              />

              {/* Point */}
              <div
                className={`map-pulse flex h-6 w-6 items-center justify-center rounded-full border border-white/30 shadow-lg transition-transform ${
                  isHovered ? 'scale-125' : ''
                }`}
                style={{
                  background: `linear-gradient(to bottom right, ${emotionColor.from}, ${emotionColor.to})`,
                }}
              >
                <MapPin className="h-3.5 w-3.5 text-white" />
              </div>

              {/* Tooltip on hover */}
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute left-1/2 top-full z-20 mt-3 w-64 -translate-x-1/2 rounded-xl border border-white/10 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-lg"
                >
                  <div className="mb-1 flex items-center gap-2 text-xs text-slate-400">
                    <span className="font-semibold text-white">
                      {story.city}
                    </span>
                    <span>•</span>
                    <span>{story.country}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-200">
                    {story.preview}
                  </p>
                  <div className="mt-2 text-xs font-medium text-violet-300">
                    {t('story.read_more')} →
                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        })}

        {/* Overlay text (hints) */}
        <div className="pointer-events-none absolute inset-0 flex items-end justify-center p-8">
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="text-sm font-medium text-slate-400">
              {t('world.hover_tip')}
            </p>
            <p className="text-xs text-slate-500">{t('world.zoom_hint')}</p>
          </div>
        </div>
      </div>

      {/* Stats overlay (top) */}
      <div className="pointer-events-none absolute left-6 top-6 flex flex-col gap-2">
        <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-950/40 px-4 py-2 backdrop-blur-sm">
          <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          <span className="text-xs font-semibold text-emerald-300">
            {t('world.live_indicator')}
          </span>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 backdrop-blur-sm">
          <div className="text-2xl font-bold text-white">
            {MOCK_STORIES.length * 234}
          </div>
          <div className="text-xs text-slate-400">{t('world.story_count')}</div>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 backdrop-blur-sm">
          <div className="text-2xl font-bold text-white">127</div>
          <div className="text-xs text-slate-400">
            {t('world.countries_count')}
          </div>
        </div>
      </div>
    </div>
  );
}
