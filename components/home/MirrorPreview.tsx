/**
 * =============================================================================
 * Fichier      : components/home/MirrorPreview.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.1.0 (2026-01-21)
 * Objet        : Section "Global Mirror" (home) — WOW layout structuré (sans tabs)
 * -----------------------------------------------------------------------------
 * Description  :
 * - Affiche DIRECTEMENT (sans clic) :
 *   • Carte monde (SVG silhouette + markers)
 *   • Pulse global (gros coeur + ECG + %)
 *   • Extraits stories
 *   • Connexions suggérées
 * - Aucun useSearchParams() => build Vercel OK (pas de suspense CSR bailout)
 *
 * Correctifs (sans régression) :
 * - [FIX] Supprime useSearchParams / router.replace => plus d'erreur Vercel build
 * - [IMPROVED] Mise en page home cohérente (WOW) + pas de contenu caché en tabs
 * - [SAFE] Données mock identiques (stories/pulse/connections)
 * - [SAFE] Pas de Math.random() en render (PRNG déterministe)
 * =============================================================================
 */

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Sparkles, Languages, MessageCircle, Users } from 'lucide-react';
import { useLang } from '@/lib/i18n/LanguageProvider';

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

// Deterministic PRNG (stable per seed, no Math.random during render)
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function MirrorPreview() {
  const { t, lang } = useLang();

  const [globalPulse, setGlobalPulse] = useState<number>(68);

  // Animate pulse locally (OK: effect with setState in interval callback)
  useEffect(() => {
    const id = window.setInterval(() => {
      setGlobalPulse((prev) => {
        const change = (Math.random() - 0.5) * 3; // allowed here (effect callback), not render
        const next = prev + change;
        return Math.max(0, Math.min(100, next));
      });
    }, 2600);
    return () => window.clearInterval(id);
  }, []);

  const countriesCount = useMemo(() => new Set(STORIES_MOCK.map((s) => s.country)).size, []);
  const storiesCount = STORIES_MOCK.length;

  // Deterministic “emotion %” cards
  const emotionCards = useMemo(() => {
    const rng = mulberry32(1337 + (lang.charCodeAt(0) || 0));
    const base = [
      { k: 'Joy', key: 'joy' as const, color: EMOTION_COLORS.joy },
      { k: 'Hope', key: 'hope' as const, color: EMOTION_COLORS.hope },
      { k: 'Love', key: 'love' as const, color: EMOTION_COLORS.love },
      { k: 'Gratitude', key: 'gratitude' as const, color: EMOTION_COLORS.gratitude },
      { k: 'Resilience', key: 'resilience' as const, color: EMOTION_COLORS.resilience },
      { k: 'Courage', key: 'courage' as const, color: EMOTION_COLORS.courage },
    ];

    // generate stable pseudo % (10..32)
    return base.map((e) => ({
      ...e,
      pct: Math.floor(rng() * 23 + 10),
    }));
  }, [lang]);

  return (
    <section className="mx-auto max-w-7xl px-6 pb-24">
      <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur md:p-8">
        {/* Top bar */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
              <Sparkles className="h-5 w-5 text-emerald-300" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">
                {lang === 'fr' ? 'Miroir mondial' : 'Global Mirror'}
              </div>
              <div className="mt-1 text-sm text-slate-300">
                {lang === 'fr'
                  ? 'Une couche vivante d’histoires humaines — repérez les échos au-delà des frontières.'
                  : 'A living layer of human stories — spot echoes beyond borders.'}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
              <Heart className="h-4 w-4 text-pink-300" />
              <span>
                {lang === 'fr' ? 'Pouls global' : 'Global pulse'} : <strong>{globalPulse.toFixed(0)}%</strong>
              </span>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
              <Languages className="h-4 w-4 text-sky-300" />
              <span>
                <strong>{storiesCount}</strong> {lang === 'fr' ? 'histoires actives' : 'active stories'} •{' '}
                <strong>{countriesCount}</strong> {lang === 'fr' ? 'pays' : 'countries'}
              </span>
            </div>
          </div>
        </div>

        {/* WOW grid */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.55fr_1fr]">
          {/* World Map (left) */}
          <div className="rounded-3xl border border-white/10 bg-white/3 p-5 md:p-6">
            <div className="rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_50%_50%,rgba(56,189,248,0.08),transparent_55%)] p-4">
              <div className="relative h-[420px] overflow-hidden rounded-2xl">
                <WorldMapSilhouette stories={STORIES_MOCK} />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(2,6,23,0.0),rgba(2,6,23,0.60))]" />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-300">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2">
                <MessageCircle className="h-4 w-4 text-sky-300" />
                {lang === 'fr' ? 'Stories en temps réel (preview)' : 'Real-time stories (preview)'}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2">
                <Users className="h-4 w-4 text-emerald-300" />
                {lang === 'fr' ? 'Connexions par affinités (bientôt)' : 'Affinity connections (soon)'}
              </span>
            </div>
          </div>

          {/* Pulse (right) */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-white">
                  {lang === 'fr' ? 'Pouls émotionnel' : 'Emotional pulse'}
                </div>
                <div className="mt-1 text-sm text-slate-300">
                  {lang === 'fr'
                    ? 'Une mesure synthétique du “climat humain” — en évolution continue.'
                    : 'A synthetic measure of the “human climate” — continuously evolving.'}
                </div>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                LIVE
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[1fr_1.1fr]">
              <PulseHeart value={globalPulse} />

              <div className="grid grid-cols-2 gap-3">
                {emotionCards.slice(0, 4).map((e) => (
                  <div key={e.key} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs font-semibold text-slate-200">{e.k}</div>
                    <div className="mt-2 text-2xl font-semibold" style={{ color: e.color }}>
                      {e.pct}%
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, e.pct * 3)}%`, background: e.color, opacity: 0.85 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {emotionCards.slice(4).map((e) => (
                <div key={e.key} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs font-semibold text-slate-200">{e.k}</div>
                  <div className="mt-2 text-2xl font-semibold" style={{ color: e.color }}>
                    {e.pct}%
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, e.pct * 3)}%`, background: e.color, opacity: 0.85 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom row: Stories + Connections (direct, no click) */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="text-sm font-semibold text-white">{lang === 'fr' ? "Flux d'histoires" : 'Story feed'}</div>
            <div className="mt-1 text-sm text-slate-300">
              {lang === 'fr'
                ? 'Quelques échos récents — anonymes ou signés.'
                : 'A few recent echoes — anonymous or named.'}
            </div>

            <div className="mt-4 grid gap-3">
              {STORIES_MOCK.map((s, idx) => {
                const color = EMOTION_COLORS[s.emotion];
                return (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.35, delay: idx * 0.03 }}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                    style={{ borderLeft: `4px solid ${color}` }}
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: `${color}22`, color }}>
                        {s.emotion}
                      </span>
                      <span className="text-xs text-slate-400">📍 {s.country}</span>
                    </div>
                    <div className="mt-2 text-sm leading-relaxed text-slate-100">{s.text}</div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="text-sm font-semibold text-white">{lang === 'fr' ? 'Connexions suggérées' : 'Suggested connections'}</div>
            <div className="mt-1 text-sm text-slate-300">
              {lang === 'fr'
                ? 'Des profils proches, des vécus similaires — IA de matching (MVP).'
                : 'Similar lives, close experiences — matching AI (MVP).'}
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {[
                { name: 'Marie', country: 'France', topic: lang === 'fr' ? 'Parentalité' : 'Parenting', match: '92%' },
                { name: 'Rajesh', country: 'India', topic: lang === 'fr' ? 'Entrepreneuriat' : 'Entrepreneurship', match: '88%' },
                { name: 'Sofia', country: 'Brazil', topic: lang === 'fr' ? 'Résilience' : 'Resilience', match: '85%' },
              ].map((p) => (
                <div key={p.name} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold text-white">{p.name}</div>
                      <div className="mt-1 text-xs text-slate-400">📍 {p.country}</div>
                    </div>
                    <div className="rounded-full border border-sky-400/25 bg-sky-400/10 px-3 py-1 text-xs font-semibold text-sky-200">
                      {p.match}
                    </div>
                  </div>

                  <div className="mt-4 text-sm text-slate-300">
                    {lang === 'fr' ? 'Thème commun' : 'Common theme'} : <strong className="text-slate-100">{p.topic}</strong>
                  </div>

                  <button
                    type="button"
                    className="mt-4 w-full rounded-xl bg-linear-to-r from-sky-500/90 to-violet-500/90 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-white/25"
                  >
                    {lang === 'fr' ? 'Démarrer une conversation' : 'Start a conversation'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Local keyframes (scoped) */}
        <style>{`
          .ew-pulse-dot { transform-origin: center; animation: ewPulse 2.2s ease-in-out infinite; }
          .ew-ripple { transform-origin: center; animation: ewRipple 3.2s ease-out infinite; }
          @keyframes ewPulse { 0%,100% { transform: scale(1); opacity: .85 } 50% { transform: scale(1.25); opacity: 1 } }
          @keyframes ewRipple { 0% { transform: scale(1); opacity: .35 } 100% { transform: scale(1.9); opacity: 0 } }
          .ew-ecg { stroke-dasharray: 420; stroke-dashoffset: 420; animation: ewEcg 1.7s linear infinite; }
          @keyframes ewEcg { to { stroke-dashoffset: 0; } }
        `}</style>
      </div>
    </section>
  );
}

function WorldMapSilhouette({ stories }: { stories: Story[] }) {
  // rough world silhouette (stylized) + markers
  return (
    <svg className="h-full w-full" viewBox="0 0 1100 520" aria-hidden="true">
      <defs>
        <linearGradient id="ewSea" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="rgba(56,189,248,0.08)" />
          <stop offset="1" stopColor="rgba(167,139,250,0.06)" />
        </linearGradient>
        <linearGradient id="ewLand" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="rgba(255,255,255,0.10)" />
          <stop offset="1" stopColor="rgba(255,255,255,0.06)" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="1100" height="520" fill="url(#ewSea)" />

      {/* Stylized continents (cleaner than random waves) */}
      <path
        d="M140 170c70-70 160-80 240-40 40 20 70 60 70 95 0 40-25 65-65 75-60 15-120 45-165 85-45 40-125 35-160-15-35-50-10-150 80-200z"
        fill="url(#ewLand)"
        opacity="0.9"
      />
      <path
        d="M520 150c65-55 150-70 220-40 50 22 85 70 75 110-10 40-55 55-95 62-70 12-130 40-160 78-35 45-115 55-150-5-35-60 10-145 110-205z"
        fill="url(#ewLand)"
        opacity="0.85"
      />
      <path
        d="M820 210c45-30 100-35 145-10 40 22 55 65 35 95-18 28-55 35-88 40-45 8-85 25-110 55-22 26-70 30-95-5-28-40 10-120 113-175z"
        fill="url(#ewLand)"
        opacity="0.8"
      />
      <path
        d="M630 330c35-45 85-65 135-55 45 9 75 45 60 82-12 30-45 40-75 48-45 12-78 32-98 60-20 28-68 35-90-5-25-45 5-95 68-130z"
        fill="url(#ewLand)"
        opacity="0.75"
      />

      {/* Soft grid */}
      <g opacity="0.10">
        {Array.from({ length: 14 }).map((_, i) => (
          <line key={`h${i}`} x1="0" x2="1100" y1={i * 40} y2={i * 40} stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
        ))}
        {Array.from({ length: 18 }).map((_, i) => (
          <line key={`v${i}`} y1="0" y2="520" x1={i * 60} x2={i * 60} stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
        ))}
      </g>

      {/* Markers */}
      {stories.map((story, idx) => {
        const x = ((story.lng + 180) / 360) * 1100;
        const y = ((90 - story.lat) / 180) * 520;
        const color = EMOTION_COLORS[story.emotion];
        return (
          <g key={story.id}>
            <circle cx={x} cy={y} r="8" fill={color} opacity="0.9" className="ew-pulse-dot" />
            <circle cx={x} cy={y} r="18" fill="none" stroke={color} strokeWidth="2" opacity="0.35" className="ew-ripple" />
            {/* small glow */}
            <circle cx={x} cy={y} r="22" fill={color} opacity="0.06" />
          </g>
        );
      })}
    </svg>
  );
}

function PulseHeart({ value }: { value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2 text-sm font-semibold text-white">
          <Heart className="h-4 w-4 text-pink-300" />
          Pulse
        </div>
        <div className="text-sm font-semibold text-slate-100">{value.toFixed(0)}%</div>
      </div>

      <div className="mt-4 grid grid-cols-[auto_1fr] items-center gap-4">
        {/* Big heart */}
        <div className="relative">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
            <Heart className="h-10 w-10 text-pink-300" />
          </div>
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_50%_30%,rgba(244,114,182,0.22),transparent_60%)]" />
        </div>

        {/* ECG line */}
        <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
          <svg viewBox="0 0 520 80" className="h-12 w-full" aria-hidden="true">
            <path
              d="M0 45 L70 45 L95 45 L115 18 L135 62 L155 38 L175 45 L230 45 L255 45 L275 26 L292 60 L310 35 L330 45 L390 45 L420 45 L440 22 L455 62 L475 40 L520 45"
              fill="none"
              stroke="rgba(56,189,248,0.95)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="ew-ecg"
            />
          </svg>
          <div className="mt-2 text-xs text-slate-400">
            {value >= 70 ? 'High resonance' : value >= 50 ? 'Balanced resonance' : 'Low resonance'}
          </div>
        </div>
      </div>
    </div>
  );
}
