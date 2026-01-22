/**
 * =============================================================================
 * Fichier      : components/home/PulseHeart.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 2.2.0 (2026-01-22)
 * Objet        : Cœur émotionnel global - ECG + % + métaphore vivante
 * -----------------------------------------------------------------------------
 * Fix v2.2.0 :
 * - [NEW] Stats réelles depuis Supabase (echoes) : published + world/local
 * - [NEW] Breakdown % par émotion (fenêtre glissante 30j)
 * - [NEW] Score global (0–100) pondéré par émotion (au lieu d’un “positif” toujours 100)
 * - [SAFE] Fallback mock + UI/animations inchangées (zéro régression)
 * =============================================================================
 */

'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Activity } from 'lucide-react';
import { useLang } from '@/lib/i18n/LanguageProvider';
import type { I18nKey } from '@/lib/i18n/messages';
import { supabase } from '@/lib/supabase/client';

type Emotion =
  | 'joy'
  | 'hope'
  | 'love'
  | 'resilience'
  | 'gratitude'
  | 'courage'
  | 'peace'
  | 'wonder';

type EchoRowLite = {
  emotion: Emotion | null;
  created_at: string | null;
};

type BreakdownItem = {
  key: I18nKey;
  value: number; // %
  color: 'emerald' | 'sky' | 'violet' | 'amber' | 'rose' | 'slate' | 'red' | 'green';
};

// -----------------------------------------------------------------------------
// Fallback SAFE (si zéro data / erreur) — UI inchangée
// -----------------------------------------------------------------------------
const FALLBACK_GLOBAL = 68;
const FALLBACK_BREAKDOWN: BreakdownItem[] = [
  { key: 'pulse.emotion_joy' as I18nKey, value: 32, color: 'emerald' },
  { key: 'pulse.emotion_hope' as I18nKey, value: 24, color: 'sky' },
  { key: 'pulse.emotion_gratitude' as I18nKey, value: 18, color: 'violet' },
  { key: 'pulse.emotion_reflection' as I18nKey, value: 14, color: 'amber' },
  { key: 'pulse.emotion_solidarity' as I18nKey, value: 12, color: 'rose' },
];

const COLORS: Record<BreakdownItem['color'], string> = {
  emerald: '#34D399',
  sky: '#38BDF8',
  violet: '#A78BFA',
  amber: '#FBBF24',
  rose: '#FB7185',
  slate: '#94A3B8',
  red: '#EF4444',
  green: '#22C55E',
};

// -----------------------------------------------------------------------------
// Mapping émotions -> i18n keys (si tes messages n’ont pas encore ces clés,
// tu peux temporairement laisser fallback par défaut).
// -----------------------------------------------------------------------------
const EMOTION_I18N: Record<Emotion, I18nKey> = {
  joy: 'pulse.emotion_joy' as I18nKey,
  hope: 'pulse.emotion_hope' as I18nKey,
  love: 'pulse.emotion_love' as I18nKey,
  resilience: 'pulse.emotion_resilience' as I18nKey,
  gratitude: 'pulse.emotion_gratitude' as I18nKey,
  courage: 'pulse.emotion_courage' as I18nKey,
  peace: 'pulse.emotion_peace' as I18nKey,
  wonder: 'pulse.emotion_wonder' as I18nKey,
};

// Score pondéré (0–100). Ajustable.
const EMOTION_WEIGHT: Record<Emotion, number> = {
  joy: 1.0,
  love: 0.95,
  gratitude: 0.9,
  hope: 0.85,
  wonder: 0.8,
  peace: 0.75,
  courage: 0.7,
  resilience: 0.65,
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function round(n: number) {
  return Math.round(n);
}

export default function PulseHeart() {
  const { t } = useLang();

  const [globalScore, setGlobalScore] = useState<number>(FALLBACK_GLOBAL);
  const [breakdown, setBreakdown] = useState<BreakdownItem[]>(FALLBACK_BREAKDOWN);
  const [loading, setLoading] = useState(false);

  // Fenêtre glissante
  const WINDOW_DAYS = 30;

  useEffect(() => {
    let mounted = true;

    const loadPulse = async () => {
      setLoading(true);

      try {
        const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

        const { data, error } = await supabase
          .from('echoes')
          .select('emotion,created_at')
          .eq('status', 'published')
          .in('visibility', ['world', 'local'])
          .gte('created_at', since)
          .limit(5000);

        if (error) throw error;

        const rows = (data as EchoRowLite[] | null) ?? [];
        const emotions = rows.map((r) => r.emotion).filter((e): e is Emotion => !!e);

        if (!mounted) return;

        if (!emotions.length) {
          // Rien à calculer -> fallback SAFE
          setGlobalScore(FALLBACK_GLOBAL);
          setBreakdown(FALLBACK_BREAKDOWN);
          return;
        }

        // Count
        const counts = new Map<Emotion, number>();
        for (const e of emotions) counts.set(e, (counts.get(e) ?? 0) + 1);

        const total = emotions.length;

        // Breakdown top 5 (discret)
        const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);

        const top = sorted.slice(0, 5);
        const nextBreakdown: BreakdownItem[] = top.map(([emo, cnt], idx) => {
          // palette simple (garde l’esprit “discret”)
          const palette: BreakdownItem['color'][] = ['emerald', 'sky', 'violet', 'amber', 'rose'];
          const pct = (cnt / total) * 100;
          return {
            key: EMOTION_I18N[emo],
            value: round(pct),
            color: palette[idx] ?? 'slate',
          };
        });

        // Normaliser à 100 (évite somme 99/101 à cause des arrondis)
        const sum = nextBreakdown.reduce((acc, x) => acc + x.value, 0);
        if (sum !== 100 && nextBreakdown.length > 0) {
          const delta = 100 - sum;
          nextBreakdown[0] = { ...nextBreakdown[0], value: clamp(nextBreakdown[0].value + delta, 0, 100) };
        }

        // Score global pondéré
        const maxW = Math.max(...Object.values(EMOTION_WEIGHT));
        const weighted =
          Array.from(counts.entries()).reduce((acc, [emo, cnt]) => acc + EMOTION_WEIGHT[emo] * cnt, 0) / total;

        const score = clamp((weighted / maxW) * 100, 0, 100);

        setGlobalScore(round(score));
        setBreakdown(nextBreakdown);
      } catch {
        if (!mounted) return;
        // fallback SAFE
        setGlobalScore(FALLBACK_GLOBAL);
        setBreakdown(FALLBACK_BREAKDOWN);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadPulse();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/70 p-8 backdrop-blur-md md:p-10">
      {/* Background accent */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(236,72,153,0.10),transparent_60%)]" />
      </div>

      {/* Header */}
      <div className="relative z-10 mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">{t('pulse.title')}</h2>
          <p className="mt-1 text-sm text-slate-500">{t('pulse.global_mood')}</p>
        </div>

        {/* Live indicator */}
        <div className="flex items-center gap-2 rounded-full border border-rose-300 bg-rose-50 px-3 py-1.5">
          <div className="h-2 w-2 animate-pulse rounded-full bg-rose-400" />
          <span className="text-xs font-semibold text-rose-600">{t('pulse.live_status')}</span>
        </div>
      </div>

      {/* Main heart + percentage */}
      <div className="relative z-10 flex flex-col items-center justify-center py-8">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative"
        >
          <div className="glow-breathe absolute inset-0 -z-10 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-linear-to-br from-rose-400/35 via-pink-400/25 to-red-400/15 blur-3xl" />
          <Heart className="heartbeat h-24 w-24 fill-rose-500 text-rose-500 drop-shadow-xl md:h-32 md:w-32" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-6 text-center"
        >
          <div className="text-6xl font-bold text-slate-900 md:text-7xl">
            {loading ? '…' : `${globalScore}%`}
          </div>
          <div className="mt-2 text-sm font-medium text-slate-600">{t('pulse.positivity_label')}</div>
        </motion.div>
      </div>

      {/* ECG Line */}
      <div className="relative z-10 mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white/80 p-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-500">
          <Activity className="h-4 w-4" />
          <span>{t('pulse.heartbeat_label')}</span>
        </div>

        <div className="relative h-16 overflow-hidden">
          <svg
            className="ecg-line absolute inset-0 h-full w-[200%]"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 200 64"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="ecg-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(244,63,94,0)" />
                <stop offset="50%" stopColor="rgba(244,63,94,0.9)" />
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

      {/* Emotion breakdown */}
      <div className="relative z-10 mt-6 space-y-2">
        {breakdown.map((emotion) => {
          const bgColor = COLORS[emotion.color];

          return (
            <div key={emotion.key} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: bgColor }} />
                <span className="text-slate-600">{t(emotion.key as I18nKey)}</span>
              </div>
              <span className="font-semibold text-slate-900">{emotion.value}%</span>
            </div>
          );
        })}
      </div>

      {/* Bottom message */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1 }}
        className="relative z-10 mt-8 text-center text-sm italic text-slate-500"
      >
        {t('pulse.breathing_world')}
      </motion.p>
    </div>
  );
}
