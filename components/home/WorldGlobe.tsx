/**
 * =============================================================================
 * Fichier      : components/home/WorldGlobe.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 3.0.2 (2026-01-21)
 * Objet        : Globe monde 3D RÉEL - Stories intégrées sur globe interactif
 * -----------------------------------------------------------------------------
 * Correctifs (sans régression) :
 * - [FIX] Ref typée EXACTEMENT comme attendu par react-globe.gl :
 *         MutableRefObject<GlobeMethods | undefined>
 * - [FIX] Supprime le cast RefObject<unknown> (cause de l’erreur TS)
 * - [SAFE] Logique, props, interactions et labels inchangés
 * =============================================================================
 */

'use client';

import { useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useLang } from '@/lib/i18n/LanguageProvider';
import type { GlobeMethods } from 'react-globe.gl';

// Import dynamique de Globe pour éviter SSR issues
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

function escapeHtml(input: string): string {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export default function WorldGlobe() {
  const { t } = useLang();

  // ✅ EXACTEMENT le type attendu par react-globe.gl
  const globeEl = useRef<GlobeMethods | undefined>(undefined);

  const pointsData: StoryPoint[] = useMemo(
    () =>
      MOCK_STORIES.map((story) => ({
        ...story,
        size: 0.8,
        color: EMOTION_COLORS[story.emotion],
      })),
    []
  );

  useEffect(() => {
    const g = globeEl.current;
    if (!g) return;

    g.pointOfView({ lat: 20, lng: 10, altitude: 2.5 }, 0);

    const controls = g.controls();
    // controls = OrbitControls (types côté lib), on garde tel quel
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;
    controls.enableZoom = true;
    controls.minDistance = 180;
    controls.maxDistance = 500;
  }, []);

  const pointLabel = (d: unknown) => {
    const p = d as Partial<StoryPoint>;
    const city = escapeHtml(String(p.city ?? ''));
    const country = escapeHtml(String(p.country ?? ''));
    const preview = escapeHtml(String(p.preview ?? ''));

    return `
      <div style="
        background: rgba(15, 23, 42, 0.95);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 12px 16px;
        color: white;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
        line-height: 1.5;
        max-width: 250px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
      ">
        <div style="
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          font-size: 12px;
          color: rgb(148, 163, 184);
        ">
          <strong style="color: white;">${city}</strong>
          <span>•</span>
          <span>${country}</span>
        </div>
        <div style="color: rgb(226, 232, 240);">
          ${preview}
        </div>
        <div style="
          margin-top: 8px;
          font-size: 12px;
          color: rgb(167, 139, 250);
          font-weight: 500;
        ">
          ${escapeHtml(t('story.read_more'))} →
        </div>
      </div>
    `;
  };

  const onPointClick = (point: unknown) => {
    const p = point as Partial<StoryPoint>;
    // eslint-disable-next-line no-console
    console.log('Story clicked:', p?.id, p?.city, p?.country);
  };

  const onPointHover = (point: unknown) => {
    const p = point as Partial<StoryPoint> | null;
    if (globeEl.current && p?.lat != null && p?.lng != null) {
      // Optionnel: zoomer légèrement sur le point
      // globeEl.current.pointOfView({ lat: p.lat, lng: p.lng, altitude: 1.8 }, 800);
    }
  };

  return (
    <div className="relative h-[600px] w-full overflow-hidden rounded-3xl border border-white/10 bg-slate-950/50 backdrop-blur-sm md:h-[700px]">
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.08),transparent_70%)]" />
      </div>

      <div className="absolute inset-0">
        <Globe
          ref={globeEl}
          pointsData={pointsData}
          pointLat="lat"
          pointLng="lng"
          pointColor="color"
          pointAltitude={0.01}
          pointRadius={0.8}
          globeImageUrl="https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
          bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
          backgroundImageUrl="https://unpkg.com/three-globe/example/img/night-sky.png"
          atmosphereColor="rgba(139, 92, 246, 0.3)"
          atmosphereAltitude={0.15}
          pointLabel={pointLabel}
          onPointClick={onPointClick}
          onPointHover={onPointHover}
          enablePointerInteraction={true}
          animateIn={true}
        />
      </div>

      <div className="pointer-events-none absolute left-6 top-6 z-10 flex flex-col gap-2">
        <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-950/40 px-4 py-2 backdrop-blur-sm">
          <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          <span className="text-xs font-semibold text-emerald-300">{t('world.live_indicator')}</span>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 backdrop-blur-sm">
          <div className="text-2xl font-bold text-white">{MOCK_STORIES.length * 234}</div>
          <div className="text-xs text-slate-400">{t('world.story_count')}</div>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 backdrop-blur-sm">
          <div className="text-2xl font-bold text-white">127</div>
          <div className="text-xs text-slate-400">{t('world.countries_count')}</div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-8 z-10 flex justify-center">
        <div className="rounded-xl border border-white/10 bg-slate-950/60 px-6 py-3 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-sm font-medium text-slate-300">{t('world.hover_tip')}</p>
            <p className="text-xs text-slate-500">{t('world.zoom_hint')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
