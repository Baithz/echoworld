/**
 * =============================================================================
 * Fichier      : components/home/PulseHeart.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 2.0.0 (2026-01-21)
 * Objet        : Cœur émotionnel global - ECG + % + métaphore vivante
 * -----------------------------------------------------------------------------
 * Description  :
 * - GROS CŒUR animé (heartbeat)
 * - Ligne ECG qui défile
 * - Pourcentage global (positivité)
 * - Petit breakdown émotions (discret)
 * - État LIVE
 * - Pas de donut, pas de KPI techniques
 * =============================================================================
 */

'use client';

import { motion } from 'framer-motion';
import { Heart, Activity } from 'lucide-react';
import { useLang } from '@/lib/i18n/LanguageProvider';
import type { I18nKey } from '@/lib/i18n/messages';

// Mock data (à remplacer par fetch Supabase)
const GLOBAL_POSITIVITY = 68;
const EMOTION_BREAKDOWN = [
  { key: 'pulse.emotion_joy', value: 32, color: 'emerald' },
  { key: 'pulse.emotion_hope', value: 24, color: 'sky' },
  { key: 'pulse.emotion_gratitude', value: 18, color: 'violet' },
  { key: 'pulse.emotion_reflection', value: 14, color: 'amber' },
  { key: 'pulse.emotion_solidarity', value: 12, color: 'rose' },
];

export default function PulseHeart() {
  const { t } = useLang();

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/50 p-8 backdrop-blur-sm md:p-10">
      {/* Background accent */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(236,72,153,0.08),transparent_60%)]" />
      </div>

      {/* Header */}
      <div className="relative z-10 mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white md:text-3xl">
            {t('pulse.title')}
          </h2>
          <p className="mt-1 text-sm text-slate-400">{t('pulse.global_mood')}</p>
        </div>

        {/* Live indicator */}
        <div className="flex items-center gap-2 rounded-full border border-rose-400/20 bg-rose-950/40 px-3 py-1.5 backdrop-blur-sm">
          <div className="h-2 w-2 animate-pulse rounded-full bg-rose-400" />
          <span className="text-xs font-semibold text-rose-300">
            {t('pulse.live_status')}
          </span>
        </div>
      </div>

      {/* Main heart + percentage */}
      <div className="relative z-10 flex flex-col items-center justify-center py-8">
        {/* Big heart */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative"
        >
          {/* Glow */}
          <div className="glow-breathe absolute inset-0 -z-10 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-linear-to-br from-rose-400/40 via-pink-400/30 to-red-400/20 blur-3xl" />

          {/* Heart icon */}
          <Heart className="heartbeat h-24 w-24 fill-rose-400 text-rose-400 drop-shadow-2xl md:h-32 md:w-32" />
        </motion.div>

        {/* Percentage */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-6 text-center"
        >
          <div className="text-6xl font-bold text-white md:text-7xl">
            {GLOBAL_POSITIVITY}%
          </div>
          <div className="mt-2 text-sm font-medium text-slate-300">
            {t('pulse.positivity_label')}
          </div>
        </motion.div>
      </div>

      {/* ECG Line */}
      <div className="relative z-10 mt-8 overflow-hidden rounded-xl border border-white/10 bg-slate-950/60 p-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-400">
          <Activity className="h-4 w-4" />
          <span>{t('pulse.heartbeat_label')}</span>
        </div>

        <div className="relative h-16 overflow-hidden">
          {/* ECG path (simplified) */}
          <svg
            className="ecg-line absolute inset-0 h-full w-[200%]"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 200 64"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="ecg-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(244,63,94,0)" />
                <stop offset="50%" stopColor="rgba(244,63,94,1)" />
                <stop offset="100%" stopColor="rgba(244,63,94,0)" />
              </linearGradient>
            </defs>
            <path
              d="M 0 32 L 20 32 L 22 20 L 24 44 L 26 32 L 46 32 L 48 20 L 50 44 L 52 32 L 72 32 L 74 20 L 76 44 L 78 32 L 98 32 L 100 20 L 102 44 L 104 32 L 124 32 L 126 20 L 128 44 L 130 32 L 150 32 L 152 20 L 154 44 L 156 32 L 176 32 L 178 20 L 180 44 L 182 32 L 200 32"
              stroke="url(#ecg-gradient)"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Emotion breakdown (discret) */}
      <div className="relative z-10 mt-6 space-y-2">
        {EMOTION_BREAKDOWN.map((emotion) => {
          const colors = {
            emerald: '#34D399',
            sky: '#38BDF8',
            violet: '#A78BFA',
            amber: '#FBBF24',
            rose: '#FB7185',
          };
          const bgColor = colors[emotion.color as keyof typeof colors];
          
          return (
            <div
              key={emotion.key}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: bgColor }}
                />
                <span className="text-slate-300">{t(emotion.key as I18nKey)}</span>
              </div>
              <span className="font-semibold text-white">{emotion.value}%</span>
            </div>
          );
        })}
      </div>

      {/* Bottom message */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1 }}
        className="relative z-10 mt-8 text-center text-sm italic text-slate-400"
      >
        {t('pulse.breathing_world')}
      </motion.p>
    </div>
  );
}