/**
 * =============================================================================
 * Fichier      : components/home/WorldGlobe.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 3.1.1 (2026-01-21)
 * Objet        : Globe monde 3D RÉEL - Stories intégrées sur globe interactif
 * -----------------------------------------------------------------------------
 * Améliorations UX (sans régression) :
 * - Globe centré + POV initial plus naturel
 * - Fond "stars" supprimé (moins oldschool) => on laisse le background du layout
 * - Tooltip React (clean, premium) au lieu du label HTML "cheap"
 * - Zoom/controls mieux réglés + bouton Recentrer
 *
 * Correctifs lint (sans régression) :
 * - [FIX] react-hooks/refs : ne pas lire containerRef.current en render
 *         => mesure via ResizeObserver + state containerSize
 * =============================================================================
 */

'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useLang } from '@/lib/i18n/LanguageProvider';
import type { GlobeMethods } from 'react-globe.gl';

const Globe = dynamic(() => import('react-globe.gl'), { ssr: false });

type Emotion = 'joy' | 'hope' | 'gratitude' | 'reflection' | 'solidarity';

type Story = {
  id: number;
  lat: number;
  lng: number;
  city: string;
  country: string;
  preview: string;
  emotion: Emotion;
};

type StoryPoint = Story & {
  size: number;
  color: string;
};

const MOCK_STORIES: Story[] = [
  { id: 1, lat: 48.8566, lng: 2.3522, city: 'Paris', country: 'France', preview: "Found hope in a stranger's smile today...", emotion: 'joy' },
  { id: 2, lat: 35.6762, lng: 139.6503, city: 'Tokyo', country: 'Japan', preview: "My grandmother's recipe brought back memories...", emotion: 'gratitude' },
  { id: 3, lat: -23.5505, lng: -46.6333, city: 'São Paulo', country: 'Brazil', preview: 'Dancing in the rain with my daughter...', emotion: 'joy' },
  { id: 4, lat: 30.0444, lng: 31.2357, city: 'Cairo', country: 'Egypt', preview: 'Realized we are more similar than different...', emotion: 'reflection' },
  { id: 5, lat: -33.8688, lng: 151.2093, city: 'Sydney', country: 'Australia', preview: 'Watching the sunrise, feeling grateful...', emotion: 'hope' },
  { id: 6, lat: 40.7128, lng: -74.006, city: 'New York', country: 'USA', preview: 'Found strength in community today...', emotion: 'solidarity' },
  { id: 7, lat: 51.5074, lng: -0.1278, city: 'London', country: 'UK', preview: 'A random act of kindness changed my day...', emotion: 'gratitude' },
  { id: 8, lat: 19.4326, lng: -99.1332, city: 'Mexico City', country: 'Mexico', preview: 'Celebrating life with family...', emotion: 'joy' },
];

const EMOTION_COLORS: Record<Emotion, string> = {
  joy: '#34D399',
  hope: '#38BDF8',
  gratitude: '#A78BFA',
  reflection: '#FBBF24',
  solidarity: '#FB7185',
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function WorldGlobe() {
  const { t } = useLang();

  const globeEl = useRef<GlobeMethods | undefined>(undefined);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  const [mouse, setMouse] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hovered, setHovered] = useState<StoryPoint | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);

  const pointsData: StoryPoint[] = useMemo(
    () =>
      MOCK_STORIES.map((story) => ({
        ...story,
        size: 0.85,
        color: EMOTION_COLORS[story.emotion],
      })),
    []
  );

  // ✅ Mesure du container via state (pas de containerRef.current en render)
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      setContainerSize({ w: Math.round(rect.width), h: Math.round(rect.height) });
    };

    update();

    // ResizeObserver si dispo (navigateur moderne)
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => update());
      ro.observe(el);
      return () => ro.disconnect();
    }

    // Fallback (rare) : resize window
    const onResize = () => update();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const recenter = useCallback((ms = 800) => {
    const g = globeEl.current;
    if (!g) return;

    // POV plus “cinéma”, terre bien cadrée
    g.pointOfView({ lat: 18, lng: 0, altitude: 1.85 }, ms);
  }, []);

  useEffect(() => {
    const g = globeEl.current;
    if (!g) return;

    recenter(0);

    const controls = g.controls();

    // Navigation
    controls.enableZoom = true;
    controls.enablePan = false;
    controls.rotateSpeed = 0.55;
    controls.zoomSpeed = 0.75;

    // Distance caméra
    controls.minDistance = 140;
    controls.maxDistance = 420;

    // AutoRotate doux tant que pas d’interaction
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.35;

    const onStart = () => {
      setHasInteracted(true);
      controls.autoRotate = false;
    };

    controls.addEventListener?.('start', onStart);
    return () => controls.removeEventListener?.('start', onStart);
  }, [recenter]);

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setMouse({
      x: clamp(e.clientX - rect.left, 0, rect.width),
      y: clamp(e.clientY - rect.top, 0, rect.height),
    });
  };

  const onPointHover = (point: unknown) => {
    const p = (point as StoryPoint | null) ?? null;
    setHovered(p);
  };

  const onPointClick = (point: unknown) => {
    const p = point as Partial<StoryPoint>;
    // eslint-disable-next-line no-console
    console.log('Story clicked:', p?.id, p?.city, p?.country);
  };

  // Tooltip positioning (utilise uniquement le state containerSize)
  const tooltipLeft = clamp(mouse.x + 14, 12, Math.max(12, containerSize.w - 292));
  const tooltipTop = clamp(mouse.y + 14, 12, Math.max(12, containerSize.h - 140));

  return (
    <div
      ref={containerRef}
      onMouseMove={onMouseMove}
      className="relative h-[600px] w-full overflow-hidden rounded-3xl border border-white/10 bg-slate-950/30 backdrop-blur-sm md:h-[700px]"
    >
      {/* Glow premium (léger, pas de “demo”) */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_25%,rgba(56,189,248,0.10),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_65%,rgba(167,139,250,0.10),transparent_60%)]" />
      </div>

      {/* Globe */}
      <div className="absolute inset-0 z-0">
        <Globe
          ref={globeEl}
          pointsData={pointsData}
          pointLat="lat"
          pointLng="lng"
          pointColor="color"
          pointAltitude={0.012}
          pointRadius={0.9}
          globeImageUrl="https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
          bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
          // IMPORTANT : pas de backgroundImageUrl => on garde le background du layout
          atmosphereColor="rgba(139, 92, 246, 0.25)"
          atmosphereAltitude={0.16}
          // Tooltip HTML désactivé (tooltip React premium)
          pointLabel={() => ''}
          onPointHover={onPointHover}
          onPointClick={onPointClick}
          enablePointerInteraction
          animateIn
        />
      </div>

      {/* UI: stats (top-left) */}
      <div className="pointer-events-none absolute left-6 top-6 z-10 flex flex-col gap-2">
        <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-950/30 px-4 py-2 backdrop-blur-sm">
          <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          <span className="text-xs font-semibold text-emerald-200">{t('world.live_indicator')}</span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 backdrop-blur-sm">
          <div className="text-2xl font-bold text-white">{MOCK_STORIES.length * 234}</div>
          <div className="text-xs text-slate-300/80">{t('world.story_count')}</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 backdrop-blur-sm">
          <div className="text-2xl font-bold text-white">127</div>
          <div className="text-xs text-slate-300/80">{t('world.countries_count')}</div>
        </div>
      </div>

      {/* Hint (bottom) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-8 z-10 flex justify-center">
        <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-6 py-3 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-sm font-medium text-slate-200">{t('world.hover_tip')}</p>
            <p className="text-xs text-slate-400">{t('world.zoom_hint')}</p>
          </div>
        </div>
      </div>

      {/* Bouton Recentrer (bottom-right) */}
      <div className="absolute bottom-6 right-6 z-10">
        <button
          type="button"
          onClick={() => recenter(700)}
          className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-slate-950/70 focus:outline-none focus:ring-2 focus:ring-white/20"
        >
          Recentrer
        </button>
      </div>

      {/* Tooltip premium (React) */}
      {hovered && (
        <div
          className="pointer-events-none absolute z-20 w-[280px] -translate-y-2"
          style={{ left: tooltipLeft, top: tooltipTop }}
        >
          <div className="rounded-2xl border border-white/10 bg-slate-950/75 p-4 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-white">
                {hovered.city} <span className="text-slate-400">•</span>{' '}
                <span className="text-slate-300">{hovered.country}</span>
              </div>
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: hovered.color }}
                aria-hidden="true"
              />
            </div>

            <div className="mt-2 text-sm leading-relaxed text-slate-200">{hovered.preview}</div>

            <div className="mt-3 text-xs font-semibold text-violet-200">{t('story.read_more')} →</div>
          </div>
        </div>
      )}

      {/* Micro-indice si l’utilisateur n’a pas encore touché */}
      {!hasInteracted && (
        <div className="pointer-events-none absolute right-6 top-6 z-10 hidden md:block">
          <div className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-2 text-xs text-slate-300 backdrop-blur-sm">
            Astuce : clique-glisse pour tourner • molette pour zoomer
          </div>
        </div>
      )}
    </div>
  );
}
