/**
 * =============================================================================
 * Fichier      : components/home/WorldGlobe.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 4.0.0 (2026-01-21)
 * Objet        : Globe IMMERSIF fullscreen - Markers 3D premium - Zoom intelligent
 * -----------------------------------------------------------------------------
 * Refonte complète :
 * ✅ Globe FULLSCREEN (pas de container visible)
 * ✅ Centrage PARFAIT de la Terre
 * ✅ Markers 3D PREMIUM (pas de ronds moches)
 * ✅ Zoom intelligent avec labels pays/villes
 * ✅ Effets glow + pulse selon émotions
 * ✅ Transition fluide globe → détails géographiques
 * =============================================================================
 */

'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Heart, Sparkles, MapPin } from 'lucide-react';
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
  altitude: number;
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
  { id: 9, lat: 55.7558, lng: 37.6173, city: 'Moscow', country: 'Russia', preview: 'Winter warmth from a cup of tea...', emotion: 'hope' },
  { id: 10, lat: 28.6139, lng: 77.209, city: 'New Delhi', country: 'India', preview: 'Found peace in meditation...', emotion: 'reflection' },
  { id: 11, lat: -1.2921, lng: 36.8219, city: 'Nairobi', country: 'Kenya', preview: 'Community came together beautifully...', emotion: 'solidarity' },
  { id: 12, lat: 1.3521, lng: 103.8198, city: 'Singapore', country: 'Singapore', preview: 'Grateful for small blessings...', emotion: 'gratitude' },
];

const EMOTION_COLORS: Record<Emotion, string> = {
  joy: '#10B981',      // emerald-500
  hope: '#06B6D4',     // cyan-500
  gratitude: '#8B5CF6', // violet-500
  reflection: '#F59E0B', // amber-500
  solidarity: '#EC4899', // pink-500
};

const EMOTION_GLOW: Record<Emotion, string> = {
  joy: 'rgba(16, 185, 129, 0.6)',
  hope: 'rgba(6, 182, 212, 0.6)',
  gratitude: 'rgba(139, 92, 246, 0.6)',
  reflection: 'rgba(245, 158, 11, 0.6)',
  solidarity: 'rgba(236, 72, 153, 0.6)',
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
  const [altitude, setAltitude] = useState(2.5); // Pour détecter le niveau de zoom

  // Points de données avec markers premium
  const pointsData: StoryPoint[] = useMemo(
    () =>
      MOCK_STORIES.map((story) => ({
        ...story,
        size: 1.2, // Plus gros pour visibilité
        color: EMOTION_COLORS[story.emotion],
        altitude: 0.015, // Légèrement au-dessus de la surface
      })),
    []
  );

  // Arcs de connexion (lignes entre stories similaires) - OPTIONNEL
  const arcsData = useMemo(() => {
    const arcs: Array<{ startLat: number; startLng: number; endLat: number; endLng: number; color: string }> = [];
    
    // Créer quelques connexions visuelles entre stories de même émotion
    for (let i = 0; i < MOCK_STORIES.length - 1; i++) {
      const story1 = MOCK_STORIES[i];
      const story2 = MOCK_STORIES[i + 1];
      
      if (story1.emotion === story2.emotion) {
        arcs.push({
          startLat: story1.lat,
          startLng: story1.lng,
          endLat: story2.lat,
          endLng: story2.lng,
          color: EMOTION_COLORS[story1.emotion],
        });
      }
    }
    
    return arcs;
  }, []);

  // Labels pour pays (s'affichent au zoom)
  const labelsData = useMemo(() => {
    return MOCK_STORIES.map((story) => ({
      lat: story.lat,
      lng: story.lng,
      text: story.city,
      color: 'rgba(255, 255, 255, 0.9)',
      size: 0.8,
    }));
  }, []);

  // Mesure du container (fullscreen)
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      setContainerSize({ w: Math.round(rect.width), h: Math.round(rect.height) });
    };

    update();

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => update());
      ro.observe(el);
      return () => ro.disconnect();
    }

    const onResize = () => update();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Configuration initiale du globe
  const recenter = useCallback((ms = 800) => {
    const g = globeEl.current;
    if (!g) return;

    // POV PARFAITEMENT CENTRÉ
    g.pointOfView(
      { 
        lat: 20,      // Légèrement au-dessus de l'équateur pour meilleur cadrage
        lng: 15,      // Légèrement décalé pour montrer Europe/Afrique
        altitude: 2.5 // Distance optimale pour voir la Terre entière
      }, 
      ms
    );
  }, []);

  useEffect(() => {
    const g = globeEl.current;
    if (!g) return;

    recenter(0);

    const controls = g.controls();

    // Navigation fluide
    controls.enableZoom = true;
    controls.enablePan = false;
    controls.rotateSpeed = 0.5;
    controls.zoomSpeed = 0.8;

    // Limites de zoom pour révéler détails
    controls.minDistance = 120;  // Zoom max (voir détails)
    controls.maxDistance = 500;  // Zoom min (vue globale)

    // AutoRotate jusqu'à interaction
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.3;

    const onStart = () => {
      setHasInteracted(true);
      controls.autoRotate = false;
    };

    // Détecter le niveau de zoom pour afficher labels
    const onChange = () => {
      const pov = g.pointOfView();
      setAltitude(pov.altitude);
    };

    controls.addEventListener?.('start', onStart);
    controls.addEventListener?.('change', onChange);

    return () => {
      controls.removeEventListener?.('start', onStart);
      controls.removeEventListener?.('change', onChange);
    };
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
    
    // Change cursor
    if (containerRef.current) {
      containerRef.current.style.cursor = p ? 'pointer' : 'grab';
    }
  };

  const onPointClick = (point: unknown) => {
    const p = point as Partial<StoryPoint>;
    if (!p?.lat || !p?.lng) return;

    const g = globeEl.current;
    if (!g) return;

    // Zoom intelligent vers la story
    g.pointOfView(
      {
        lat: p.lat,
        lng: p.lng,
        altitude: 0.5, // Zoom rapproché pour voir détails
      },
      1200
    );

    console.log('Story clicked:', p?.id, p?.city, p?.country);
  };

  // Tooltip positioning
  const tooltipLeft = clamp(mouse.x + 16, 12, Math.max(12, containerSize.w - 310));
  const tooltipTop = clamp(mouse.y + 16, 12, Math.max(12, containerSize.h - 160));

  // Afficher labels uniquement en zoom rapproché
  const showLabels = altitude < 1.5;

  return (
    <div
      ref={containerRef}
      onMouseMove={onMouseMove}
      className="relative h-[calc(100vh-120px)] w-full overflow-hidden"
      style={{ cursor: hovered ? 'pointer' : 'grab' }}
    >
      {/* Globe (NO BORDER, NO CONTAINER) */}
      <div className="absolute inset-0 z-0">
        <Globe
          ref={globeEl}
          
          // ===== POINTS (Markers premium) =====
          pointsData={pointsData}
          pointLat="lat"
          pointLng="lng"
          pointColor="color"
          pointAltitude="altitude"
          pointRadius={1.2}
          pointResolution={12} // Markers plus détaillés
          
          // ===== LABELS (villes au zoom) =====
          labelsData={showLabels ? labelsData : []}
          labelLat="lat"
          labelLng="lng"
          labelText="text"
          labelSize="size"
          labelColor="color"
          labelResolution={2}
          labelAltitude={0.02}
          
          // ===== ARCS (connexions visuelles) =====
          arcsData={arcsData}
          arcStartLat="startLat"
          arcStartLng="startLng"
          arcEndLat="endLat"
          arcEndLng="endLng"
          arcColor="color"
          arcStroke={0.4}
          arcDashLength={0.4}
          arcDashGap={0.2}
          arcDashAnimateTime={2000}
          
          // ===== TEXTURES GLOBE =====
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
          bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
          
          // ===== ATMOSPHERE =====
          atmosphereColor="rgba(139, 92, 246, 0.2)"
          atmosphereAltitude={0.15}
          
          // ===== BACKGROUND (transparent pour voir le layout) =====
          backgroundColor="rgba(0,0,0,0)"
          
          // ===== INTERACTIONS =====
          pointLabel={() => ''} // Tooltip React custom
          onPointHover={onPointHover}
          onPointClick={onPointClick}
          enablePointerInteraction
          animateIn
        />
      </div>

      {/* UI Overlay: Stats (top-left) */}
      <div className="pointer-events-none absolute left-6 top-6 z-10 flex flex-col gap-3">
        {/* Live indicator */}
        <div className="flex items-center gap-2 rounded-full border border-emerald-400/30 bg-slate-950/60 px-4 py-2 backdrop-blur-md">
          <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          <span className="text-xs font-semibold text-emerald-200">
            {t('world.live_indicator')}
          </span>
        </div>

        {/* Story count */}
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-rose-400" />
            <div className="text-2xl font-bold text-white">
              {MOCK_STORIES.length * 234}
            </div>
          </div>
          <div className="mt-1 text-xs text-slate-300">{t('world.story_count')}</div>
        </div>

        {/* Countries count */}
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-sky-400" />
            <div className="text-2xl font-bold text-white">127</div>
          </div>
          <div className="mt-1 text-xs text-slate-300">{t('world.countries_count')}</div>
        </div>
      </div>

      {/* Hint d'interaction (bottom-center) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-8 z-10 flex justify-center">
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-6 py-3 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Sparkles className="h-4 w-4 text-violet-300" />
            <div className="text-center">
              <p className="text-sm font-medium text-slate-200">
                {t('world.hover_tip')}
              </p>
              <p className="text-xs text-slate-400">{t('world.zoom_hint')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bouton Recentrer (bottom-right) */}
      <div className="absolute bottom-6 right-6 z-10">
        <button
          type="button"
          onClick={() => recenter(800)}
          className="group flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-3 text-sm font-semibold text-white backdrop-blur-md transition-all hover:border-white/20 hover:bg-slate-950/80 focus:outline-none focus:ring-2 focus:ring-white/30"
        >
          <svg
            className="h-4 w-4 transition-transform group-hover:rotate-180"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Recentrer
        </button>
      </div>

      {/* Tooltip premium (React) - Avec glow selon émotion */}
      {hovered && (
        <div
          className="pointer-events-none absolute z-20 w-[300px]"
          style={{ left: tooltipLeft, top: tooltipTop }}
        >
          <div 
            className="relative overflow-hidden rounded-2xl border bg-slate-950/90 p-5 shadow-2xl backdrop-blur-xl"
            style={{ 
              borderColor: hovered.color + '40',
              boxShadow: `0 0 40px ${EMOTION_GLOW[hovered.emotion]}, 0 20px 60px rgba(0,0,0,0.4)`
            }}
          >
            {/* Glow background selon émotion */}
            <div 
              className="pointer-events-none absolute inset-0 opacity-20"
              style={{
                background: `radial-gradient(circle at top right, ${hovered.color}40, transparent 70%)`
              }}
            />

            {/* Content */}
            <div className="relative z-10">
              {/* Header avec icône émotion */}
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-bold text-white">
                    {hovered.city}
                  </div>
                  <div className="text-sm text-slate-300">{hovered.country}</div>
                </div>
                
                <div 
                  className="flex h-8 w-8 items-center justify-center rounded-full"
                  style={{ backgroundColor: hovered.color + '20' }}
                >
                  <Heart 
                    className="h-4 w-4" 
                    style={{ color: hovered.color }}
                  />
                </div>
              </div>

              {/* Preview */}
              <p className="mb-3 text-sm leading-relaxed text-slate-200">
                {hovered.preview}
              </p>

              {/* CTA */}
              <div className="flex items-center justify-between">
                <span 
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: hovered.color }}
                >
                  {hovered.emotion}
                </span>
                <span className="text-xs font-semibold text-violet-300">
                  {t('story.read_more')} →
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Légende émotions (top-right) */}
      <div className="pointer-events-none absolute right-6 top-6 z-10 hidden lg:block">
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 backdrop-blur-md">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Émotions
          </div>
          <div className="space-y-2">
            {Object.entries(EMOTION_COLORS).map(([emotion, color]) => (
              <div key={emotion} className="flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs text-slate-300 capitalize">{emotion}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hint rotation si pas encore interagi (top-center, mobile only) */}
      {!hasInteracted && (
        <div className="pointer-events-none absolute left-1/2 top-6 z-10 -translate-x-1/2 lg:hidden">
          <div className="rounded-full border border-white/10 bg-slate-950/60 px-4 py-2 backdrop-blur-md">
            <p className="text-xs text-slate-300">
              👆 Glisse pour tourner • Pince pour zoomer
            </p>
          </div>
        </div>
      )}
    </div>
  );
}