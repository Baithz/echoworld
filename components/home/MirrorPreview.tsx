/**
 * =============================================================================
 * Fichier      : components/home/MirrorPreview.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.1 (2026-01-21)
 * Objet        : Section "Global Mirror" (preview) avec tabs via URL (?tab=...)
 * -----------------------------------------------------------------------------
 * Description  :
 * - Tabs synchronisées avec l'URL : /?tab=map|stories|connections|pulse
 * - UI glass premium cohérente avec la home existante
 * - MVP panels : Map (SVG placeholder), Stories, Pulse, Connections
 *
 * Correctifs (sans régression) :
 * - [FIX] ESLint purity : suppression de Math.random() pendant le render (PulsePanel)
 * - [SAFE] Valeurs "breakdown" stables (useMemo) et rafraîchies à intervalle contrôlé
 * - [SAFE] Canonical Tailwind : h-[420px] -> h-105, w/h-[210px] -> w/h-52.5, w/h-[170px] -> w/h-42.5
 * =============================================================================
 */

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Globe, MessageCircle, Users, TrendingUp, Heart, Sparkles, Languages } from 'lucide-react';
import { useLang } from '@/lib/i18n/LanguageProvider';

type TabId = 'map' | 'stories' | 'connections' | 'pulse';

const TAB_IDS: readonly TabId[] = ['map', 'stories', 'connections', 'pulse'] as const;

function isTabId(v: string | null): v is TabId {
  return !!v && (TAB_IDS as readonly string[]).includes(v);
}

type Story = {
  id: number;
  country: string;
  emotion: 'joy' | 'hope' | 'love' | 'resilience' | 'gratitude' | 'courage';
  text: string;
  lat: number;
  lng: number;
};

const EMOTION_COLORS: Record<Story['emotion'], string> = {
  joy: '#FFD700',
  hope: '#87CEEB',
  love: '#FF69B4',
  resilience: '#9370DB',
  gratitude: '#90EE90',
  courage: '#FF6347',
};

const STORIES_MOCK: Story[] = [
  { id: 1, country: 'France', emotion: 'joy', text: "Aujourd'hui, j'ai réussi mon examen !", lat: 48.8566, lng: 2.3522 },
  { id: 2, country: 'India', emotion: 'hope', text: 'The monsoon arrived — our crops will be good.', lat: 20.5937, lng: 78.9629 },
  { id: 3, country: 'Brazil', emotion: 'love', text: 'Minha filha nasceu hoje!', lat: -14.235, lng: -51.9253 },
  { id: 4, country: 'Japan', emotion: 'resilience', text: '失敗から学んだ。明日はもっと良くなる。', lat: 36.2048, lng: 138.2529 },
  { id: 5, country: 'Kenya', emotion: 'gratitude', text: 'Family is everything. Today we celebrated together.', lat: -0.0236, lng: 37.9062 },
];

type EmotionKey = Story['emotion'];
type EmotionStat = { k: EmotionKey; color: string; pct: number };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function mulberry32(seed: number) {
  // Deterministic PRNG: stable per seed, no Math.random during render
  let s = seed | 0;

  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildEmotionStats(seed: number): EmotionStat[] {
  const rand = mulberry32(seed);

  const base: Array<{ k: EmotionKey; color: string; base: number }> = [
    { k: 'joy', color: EMOTION_COLORS.joy, base: 24 },
    { k: 'hope', color: EMOTION_COLORS.hope, base: 18 },
    { k: 'love', color: EMOTION_COLORS.love, base: 16 },
    { k: 'gratitude', color: EMOTION_COLORS.gratitude, base: 14 },
    { k: 'resilience', color: EMOTION_COLORS.resilience, base: 14 },
    { k: 'courage', color: EMOTION_COLORS.courage, base: 14 },
  ];

  // Add a small deterministic jitter then normalize to ~100
  const jittered = base.map((e) => {
    const jitter = (rand() - 0.5) * 10; // -5..+5
    return { ...e, v: clamp(e.base + jitter, 8, 35) };
  });

  const sum = jittered.reduce((acc, e) => acc + e.v, 0);
  const scaled = jittered.map((e) => ({ k: e.k, color: e.color, pct: Math.round((e.v / sum) * 100) }));

  // Fix rounding drift to exactly 100
  const drift = 100 - scaled.reduce((acc, e) => acc + e.pct, 0);
  if (drift !== 0) scaled[0] = { ...scaled[0], pct: scaled[0].pct + drift };

  return scaled;
}

export default function MirrorPreview() {
  const { t } = useLang();

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlTab = searchParams.get('tab');
  const activeTab: TabId = isTabId(urlTab) ? urlTab : 'map';

  const [globalPulse, setGlobalPulse] = useState<number>(68);

  useEffect(() => {
    const id = window.setInterval(() => {
      setGlobalPulse((prev) => {
        const change = (Math.random() - 0.5) * 3;
        return clamp(prev + change, 0, 100);
      });
    }, 3000);
    return () => window.clearInterval(id);
  }, []);

  const countriesCount = useMemo(() => new Set(STORIES_MOCK.map((s) => s.country)).size, []);
  const storiesCount = STORIES_MOCK.length;

  function setTab(tab: TabId) {
    const next = new URLSearchParams(searchParams.toString());
    next.set('tab', tab);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  const tabs = useMemo(
    () =>
      [
        { id: 'map' as const, label: t('mirror.tab_map'), icon: Globe },
        { id: 'stories' as const, label: t('mirror.tab_stories'), icon: MessageCircle },
        { id: 'connections' as const, label: t('mirror.tab_connections'), icon: Users },
        { id: 'pulse' as const, label: t('mirror.tab_pulse'), icon: TrendingUp },
      ] as const,
    [t]
  );

  return (
    <section className="mx-auto max-w-7xl px-6 pb-24">
      <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
              <Sparkles className="h-5 w-5 text-emerald-300" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">{t('mirror.title')}</div>
              <div className="mt-1 text-sm text-slate-300">{t('mirror.subtitle')}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
              <Heart className="h-4 w-4 text-pink-300" />
              <span>
                {t('mirror.pulse_label')} <strong>{globalPulse.toFixed(0)}%</strong>
              </span>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
              <Languages className="h-4 w-4 text-sky-300" />
              <span>
                <strong>{storiesCount}</strong> {t('mirror.active_stories')} • <strong>{countriesCount}</strong> {t('mirror.countries')}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTab(tab.id)}
                className={[
                  'inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition',
                  'border',
                  isActive
                    ? 'border-sky-400/40 bg-sky-400/10 text-sky-200'
                    : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10',
                  'focus:outline-none focus:ring-2 focus:ring-white/25',
                ].join(' ')}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="mt-6">
          {activeTab === 'map' && <MapPanel stories={STORIES_MOCK} />}
          {activeTab === 'stories' && <StoriesPanel stories={STORIES_MOCK} />}
          {activeTab === 'pulse' && <PulsePanel globalPulse={globalPulse} />}
          {activeTab === 'connections' && <ConnectionsPanel />}
        </div>

        {/* Local styles for SVG markers */}
        <style jsx global>{`
          @keyframes ewPulse {
            0%,
            100% {
              transform: scale(1);
              opacity: 0.85;
            }
            50% {
              transform: scale(1.28);
              opacity: 1;
            }
          }
          @keyframes ewRipple {
            0% {
              r: 8;
              opacity: 0.45;
            }
            100% {
              r: 35;
              opacity: 0;
            }
          }
          .ew-pulse {
            transform-origin: center;
            animation: ewPulse 2.2s ease-in-out infinite;
          }
          .ew-ripple {
            animation: ewRipple 3.2s ease-out infinite;
          }
          .ew-pulse-0 {
            animation-duration: 2.1s;
          }
          .ew-pulse-1 {
            animation-duration: 2.4s;
          }
          .ew-pulse-2 {
            animation-duration: 2.7s;
          }
          .ew-pulse-3 {
            animation-duration: 3.0s;
          }
          .ew-pulse-4 {
            animation-duration: 3.3s;
          }

          .ew-ripple-0 {
            animation-duration: 3.0s;
          }
          .ew-ripple-1 {
            animation-duration: 3.4s;
          }
          .ew-ripple-2 {
            animation-duration: 3.8s;
          }
          .ew-ripple-3 {
            animation-duration: 4.2s;
          }
          .ew-ripple-4 {
            animation-duration: 4.6s;
          }
        `}</style>
      </div>
    </section>
  );
}

function MapPanel({ stories }: { stories: Story[] }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/3 p-5 md:p-6">
      <div className="rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_50%_50%,rgba(56,189,248,0.08),transparent_55%)] p-4">
        <div className="relative h-105 overflow-hidden rounded-2xl">
          <svg className="h-full w-full" viewBox="0 0 1000 500" aria-hidden="true">
            <path
              d="M 100 150 Q 200 120, 300 150 T 500 140 T 700 160 T 900 150"
              stroke="rgba(96,165,250,0.35)"
              fill="none"
              strokeWidth="2"
            />
            <path
              d="M 150 300 Q 250 280, 350 300 T 550 290 T 750 310 T 850 300"
              stroke="rgba(96,165,250,0.35)"
              fill="none"
              strokeWidth="2"
            />

            {stories.map((story, idx) => {
              const x = ((story.lng + 180) / 360) * 1000;
              const y = ((90 - story.lat) / 180) * 500;
              const color = EMOTION_COLORS[story.emotion];

              return (
                <g key={story.id}>
                  <circle cx={x} cy={y} r="8" fill={color} opacity="0.85" className={`ew-pulse ew-pulse-${idx % 5}`} />
                  <circle
                    cx={x}
                    cy={y}
                    r="20"
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    opacity="0.3"
                    className={`ew-ripple ew-ripple-${idx % 5}`}
                  />
                </g>
              );
            })}
          </svg>

          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(2,6,23,0.0),rgba(2,6,23,0.55))]" />
        </div>
      </div>
    </div>
  );
}

function StoriesPanel({ stories }: { stories: Story[] }) {
  return (
    <div className="grid gap-3">
      {stories.map((s, idx) => {
        const color = EMOTION_COLORS[s.emotion];
        return (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: idx * 0.05 }}
            className="rounded-2xl border border-white/10 bg-white/5 p-5"
            style={{ borderLeft: `4px solid ${color}` }}
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: `${color}22`, color }}>
                {s.emotion}
              </span>
              <span className="text-xs text-slate-400">📍 {s.country}</span>
            </div>
            <div className="mt-3 text-base leading-relaxed text-slate-100">{s.text}</div>

            <div className="mt-4">
              <button
                type="button"
                className="rounded-xl border border-sky-400/25 bg-sky-400/10 px-4 py-2 text-sm font-semibold text-sky-200 transition hover:bg-sky-400/15 focus:outline-none focus:ring-2 focus:ring-white/25"
              >
                Se connecter
              </button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function PulsePanel({ globalPulse }: { globalPulse: number }) {
  const { t } = useLang();

  // Stable base list (no random)
  const base = useMemo(
    () => [
      { k: 'joy' as const, color: EMOTION_COLORS.joy },
      { k: 'hope' as const, color: EMOTION_COLORS.hope },
      { k: 'love' as const, color: EMOTION_COLORS.love },
      { k: 'gratitude' as const, color: EMOTION_COLORS.gratitude },
      { k: 'resilience' as const, color: EMOTION_COLORS.resilience },
      { k: 'courage' as const, color: EMOTION_COLORS.courage },
    ],
    []
  );

  // Controlled "random-looking" values updated in effect (allowed)
  const [stats, setStats] = useState<EmotionStat[]>(() => buildEmotionStats(1337));

  useEffect(() => {
    const id = window.setInterval(() => {
      // Seed drifts slowly with pulse -> coherent evolution and deterministic per tick
      const nextSeed = Math.round(globalPulse * 1000) + Date.now();
      setStats(buildEmotionStats(nextSeed));
    }, 6000);
    return () => window.clearInterval(id);
  }, [globalPulse]);

  // Keep ordering stable (base order)
  const ordered = useMemo(() => {
    const byKey = new Map(stats.map((s) => [s.k, s]));
    return base.map((b) => byKey.get(b.k) ?? { k: b.k, color: b.color, pct: 0 });
  }, [base, stats]);

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center">
        <div className="text-sm font-semibold text-sky-200">{t('pulse.title')}</div>

        <div
          className="mx-auto mt-6 flex h-52.5 w-52.5 items-center justify-center rounded-full"
          style={{
            background: `conic-gradient(rgba(56,189,248,0.95) ${globalPulse * 3.6}deg, rgba(255,255,255,0.10) 0deg)`,
          }}
        >
          <div className="flex h-42.5 w-42.5 flex-col items-center justify-center rounded-full bg-slate-950">
            <div className="text-5xl font-semibold text-white">{globalPulse.toFixed(0)}%</div>
            <div className="mt-1 text-sm text-slate-400">{t('pulse.positivity')}</div>
          </div>
        </div>

        <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-slate-300">{t('pulse.description')}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {ordered.map((e) => (
          <div key={e.k} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full" style={{ background: `${e.color}22` }}>
              ✨
            </div>
            <div className="text-sm font-semibold capitalize text-white">{e.k}</div>
            <div className="mt-1 text-lg font-semibold" style={{ color: e.color }}>
              {e.pct}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConnectionsPanel() {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <div className="text-sm font-semibold text-sky-200">Connexions suggérées</div>
      <div className="mt-2 text-sm text-slate-300">Notre IA relie des vécus similaires, dans des contextes culturels différents.</div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {[
          { name: 'Marie', country: 'France', topic: 'Parentalité', match: '92%' },
          { name: 'Rajesh', country: 'India', topic: 'Entrepreneuriat', match: '88%' },
          { name: 'Sofia', country: 'Brazil', topic: 'Résilience', match: '85%' },
        ].map((p) => (
          <div key={p.name} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-semibold text-white">{p.name}</div>
                <div className="mt-1 text-xs text-slate-400">📍 {p.country}</div>
              </div>
              <div className="rounded-full border border-sky-400/25 bg-sky-400/10 px-3 py-1 text-xs font-semibold text-sky-200">{p.match}</div>
            </div>

            <div className="mt-4 text-sm text-slate-300">
              Thème commun : <strong className="text-slate-100">{p.topic}</strong>
            </div>

            <button
              type="button"
              className="mt-4 w-full rounded-xl bg-linear-to-r from-sky-500/90 to-violet-500/90 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-white/25"
            >
              Démarrer une conversation
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
