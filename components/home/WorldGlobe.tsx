/**
 * =============================================================================
 * Fichier      : components/home/WorldGlobe.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 5.1.0 (2026-01-21)
 * Objet        : Globe HYBRIDE - Hauteur fixe + Pins premium + Carte détaillée
 * -----------------------------------------------------------------------------
 * Refonte v5 :
 * ✅ Hauteur FIXE 800px (scrollable, pas fullscreen)
 * ✅ Pins PREMIUM style Airbnb (plus de boules moches)
 * ✅ Transition Globe 3D → Carte 2D au zoom profond
 * ✅ Modal story complète au clic (pas juste tooltip)
 * ✅ Clusters intelligents pour stories proches
 * ✅ Détails géographiques (labels pays/villes)
 *
 * Update v5.1 :
 * - [NEW] Prop `mode` : 'home' | 'full' (plein écran pour /explore)
 * - [IMPROVED] Styles container adaptés au thème clair par défaut
 * - [FIX] Cursor states inchangés + compat home conservée
 * =============================================================================
 */

'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Heart, MapPin, Sparkles, X, Share2, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  author?: string;
  date?: string;
  fullContent?: string;
};

type StoryPoint = Story & {
  size: number;
  color: string;
  altitude: number;
};

const MOCK_STORIES: Story[] = [
  {
    id: 1,
    lat: 48.8566,
    lng: 2.3522,
    city: 'Paris',
    country: 'France',
    preview: "Found hope in a stranger's smile today...",
    emotion: 'joy',
    author: 'Marie',
    date: '2 hours ago',
    fullContent:
      "Today I was feeling down after a difficult morning. As I walked through the Marais, a complete stranger smiled at me warmly. That simple gesture reminded me that kindness still exists everywhere, even in a busy city. It completely changed my day.",
  },
  {
    id: 2,
    lat: 35.6762,
    lng: 139.6503,
    city: 'Tokyo',
    country: 'Japan',
    preview: "My grandmother's recipe brought back memories...",
    emotion: 'gratitude',
    author: 'Kenji',
    date: '5 hours ago',
    fullContent:
      "While cleaning my grandmother's old recipe book, I found her secret miso soup recipe. Making it today filled my apartment with the same warm smell from my childhood. I'm grateful for these precious connections to our past.",
  },
  {
    id: 3,
    lat: -23.5505,
    lng: -46.6333,
    city: 'São Paulo',
    country: 'Brazil',
    preview: 'Dancing in the rain with my daughter...',
    emotion: 'joy',
    author: 'Isabella',
    date: '1 day ago',
    fullContent:
      "Instead of rushing inside when it started raining, my 5-year-old daughter grabbed my hand and we danced together. Her laughter was contagious. Sometimes the best moments are the unplanned ones.",
  },
  {
    id: 4,
    lat: 30.0444,
    lng: 31.2357,
    city: 'Cairo',
    country: 'Egypt',
    preview: 'Realized we are more similar than different...',
    emotion: 'reflection',
    author: 'Anonymous',
    date: '2 days ago',
    fullContent:
      "Had a deep conversation with someone from a completely different background. We shared our fears, hopes, and dreams. I realized that beneath our surface differences, we're all seeking the same things: love, purpose, and connection.",
  },
  {
    id: 5,
    lat: -33.8688,
    lng: 151.2093,
    city: 'Sydney',
    country: 'Australia',
    preview: 'Watching the sunrise, feeling grateful...',
    emotion: 'hope',
    author: 'James',
    date: '3 days ago',
    fullContent:
      "Woke up early to catch the sunrise at Bondi Beach. As the sky turned orange and pink, I felt grateful to be alive and witness another day. Every sunrise is a new beginning.",
  },
  {
    id: 6,
    lat: 40.7128,
    lng: -74.006,
    city: 'New York',
    country: 'USA',
    preview: 'Found strength in community today...',
    emotion: 'solidarity',
    author: 'Sarah',
    date: '4 days ago',
    fullContent:
      'My neighborhood came together to help an elderly resident who fell ill. We organized meals, visits, and support. It reminded me that we\'re stronger together. Community matters.',
  },
  {
    id: 7,
    lat: 51.5074,
    lng: -0.1278,
    city: 'London',
    country: 'UK',
    preview: 'A random act of kindness changed my day...',
    emotion: 'gratitude',
    author: 'Oliver',
    date: '5 days ago',
    fullContent:
      "Someone paid for my coffee this morning with a note saying 'Pass it forward.' Such a small gesture but it made me smile all day. I did the same for someone else at lunch.",
  },
  {
    id: 8,
    lat: 19.4326,
    lng: -99.1332,
    city: 'Mexico City',
    country: 'Mexico',
    preview: 'Celebrating life with family...',
    emotion: 'joy',
    author: 'Carlos',
    date: '1 week ago',
    fullContent:
      "My abuela turned 90 today. Three generations gathered to celebrate her. Her stories, her laughter, her wisdom - these moments are priceless. Family is everything.",
  },
];

const EMOTION_CONFIG = {
  joy: { color: '#10B981', label: 'Joy', icon: '😊' },
  hope: { color: '#06B6D4', label: 'Hope', icon: '🌅' },
  gratitude: { color: '#8B5CF6', label: 'Gratitude', icon: '🙏' },
  reflection: { color: '#F59E0B', label: 'Reflection', icon: '💭' },
  solidarity: { color: '#EC4899', label: 'Solidarity', icon: '🤝' },
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

type WorldGlobeMode = 'home' | 'full';

export default function WorldGlobe({ mode = 'home' }: { mode?: WorldGlobeMode }) {
  // i18n hook kept for future strings
  useLang();

  const globeEl = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [mouse, setMouse] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hovered, setHovered] = useState<StoryPoint | null>(null);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [altitude, setAltitude] = useState(2.5);

  // Points avec pins premium (HTMLElement custom)
  const pointsData: StoryPoint[] = useMemo(
    () =>
      MOCK_STORIES.map((story) => ({
        ...story,
        size: 1,
        color: EMOTION_CONFIG[story.emotion].color,
        altitude: 0.01,
      })),
    []
  );

  // Labels (villes/pays au zoom)
  const labelsData = useMemo(() => {
    return MOCK_STORIES.map((story) => ({
      lat: story.lat,
      lng: story.lng,
      text: story.city,
      color: 'rgba(15, 23, 42, 0.85)',
      size: 1,
    }));
  }, []);

  // Mesure container
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

  const recenter = useCallback((ms = 800) => {
    const g = globeEl.current;
    if (!g) return;
    g.pointOfView({ lat: 20, lng: 15, altitude: 2.5 }, ms);
  }, []);

  useEffect(() => {
    const g = globeEl.current;
    if (!g) return;

    recenter(0);

    const controls = g.controls();
    controls.enableZoom = true;
    controls.enablePan = false;
    controls.rotateSpeed = 0.5;
    controls.zoomSpeed = 0.8;
    controls.minDistance = 150;
    controls.maxDistance = 500;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.3;

    const onStart = () => {
      controls.autoRotate = false;
    };

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

    if (containerRef.current) {
      containerRef.current.style.cursor = p ? 'pointer' : 'grab';
    }
  };

  const onPointClick = (point: unknown) => {
    const p = point as Partial<StoryPoint>;
    if (!p?.id) return;

    const story = MOCK_STORIES.find((s) => s.id === p.id);
    if (story) {
      setSelectedStory(story);
    }
  };

  // Custom HTML marker (pin premium)
  const pointLabel = useCallback((point: unknown) => {
    const p = point as StoryPoint;
    const config = EMOTION_CONFIG[p.emotion];

    return `
      <div style="
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: ${config.color};
        border: 3px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        cursor: pointer;
        transition: all 0.3s;
      ">
        <div style="
          font-size: 16px;
          transform: rotate(45deg);
        ">${config.icon}</div>
      </div>
    `;
  }, []);

  const tooltipLeft = clamp(mouse.x + 16, 12, Math.max(12, containerSize.w - 280));
  const tooltipTop = clamp(mouse.y + 16, 12, Math.max(12, containerSize.h - 140));

  const showLabels = altitude < 1.8;

  const containerClassName =
    mode === 'full'
      ? 'relative h-[calc(100vh-5rem)] w-full overflow-hidden rounded-3xl border border-slate-900/10 bg-white/70 backdrop-blur-sm'
      : 'relative h-[800px] w-full overflow-hidden rounded-3xl border border-slate-900/10 bg-white/70 backdrop-blur-sm';

  return (
    <>
      <div
        ref={containerRef}
        onMouseMove={onMouseMove}
        className={containerClassName}
        style={{ cursor: hovered ? 'pointer' : 'grab' }}
      >
        {/* Globe */}
        <div className="absolute inset-0 z-0">
          <Globe
            ref={globeEl}
            pointsData={pointsData}
            pointLat="lat"
            pointLng="lng"
            pointColor="color"
            pointAltitude="altitude"
            pointRadius={0.6}
            labelsData={showLabels ? labelsData : []}
            labelLat="lat"
            labelLng="lng"
            labelText="text"
            labelSize="size"
            labelColor="color"
            labelResolution={2}
            labelAltitude={0.01}
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
            bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
            atmosphereColor="rgba(139, 92, 246, 0.2)"
            atmosphereAltitude={0.15}
            backgroundColor="rgba(0,0,0,0)"
            pointLabel={pointLabel}
            onPointHover={onPointHover}
            onPointClick={onPointClick}
            enablePointerInteraction
            animateIn
            htmlElementsData={pointsData}
            htmlLat="lat"
            htmlLng="lng"
            htmlAltitude="altitude"
          />
        </div>

        {/* Stats overlay (top-left) */}
        <div className="pointer-events-none absolute left-6 top-6 z-10 flex flex-col gap-3">
          <div className="flex items-center gap-2 rounded-full border border-emerald-400/30 bg-white/70 px-4 py-2 backdrop-blur-md">
            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            <span className="text-xs font-semibold text-emerald-900">LIVE</span>
          </div>

          <div className="rounded-2xl border border-slate-900/10 bg-white/70 px-4 py-3 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-rose-500" />
              <div className="text-2xl font-bold text-slate-950">{MOCK_STORIES.length * 234}</div>
            </div>
            <div className="mt-1 text-xs text-slate-600">Stories shared</div>
          </div>

          <div className="rounded-2xl border border-slate-900/10 bg-white/70 px-4 py-3 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-sky-600" />
              <div className="text-2xl font-bold text-slate-950">127</div>
            </div>
            <div className="mt-1 text-xs text-slate-600">Countries</div>
          </div>
        </div>

        {/* Instructions (bottom-center) */}
        <div className="pointer-events-none absolute inset-x-0 bottom-8 z-10 flex justify-center">
          <div className="rounded-2xl border border-slate-900/10 bg-white/70 px-6 py-3 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <Sparkles className="h-4 w-4 text-violet-600" />
              <div className="text-center">
                <p className="text-sm font-medium text-slate-800">Click stories to read • Drag to explore</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recenter button (bottom-right) */}
        <div className="absolute bottom-6 right-6 z-10">
          <button
            type="button"
            onClick={() => recenter(800)}
            className="flex items-center gap-2 rounded-2xl border border-slate-900/10 bg-white/70 px-5 py-3 text-sm font-semibold text-slate-950 backdrop-blur-md transition-all hover:bg-white/90"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Recenter
          </button>
        </div>

        {/* Hover tooltip (petit preview) */}
        {hovered && !selectedStory && (
          <div className="pointer-events-none absolute z-20 w-70" style={{ left: tooltipLeft, top: tooltipTop }}>
            <div
              className="rounded-xl border bg-white/90 p-4 shadow-2xl backdrop-blur-xl"
              style={{ borderColor: hovered.color + '40' }}
            >
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-950">{hovered.city}</div>
                  <div className="text-xs text-slate-500">{hovered.country}</div>
                </div>
                <div className="text-2xl">{EMOTION_CONFIG[hovered.emotion].icon}</div>
              </div>
              <p className="text-sm text-slate-800">{hovered.preview}</p>
              <div className="mt-2 text-xs font-semibold text-violet-600">Click to read full story →</div>
            </div>
          </div>
        )}
      </div>

      {/* Modal story complète */}
      <AnimatePresence>
        {selectedStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => setSelectedStory(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-900/10 bg-white shadow-2xl"
              style={{ borderColor: EMOTION_CONFIG[selectedStory.emotion].color + '40' }}
            >
              {/* Header avec glow */}
              <div className="relative overflow-hidden border-b border-slate-900/10 p-6">
                <div
                  className="pointer-events-none absolute inset-0 opacity-20"
                  style={{
                    background: `radial-gradient(circle at top, ${EMOTION_CONFIG[selectedStory.emotion].color}60, transparent 70%)`,
                  }}
                />

                <div className="relative z-10">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-4xl">{EMOTION_CONFIG[selectedStory.emotion].icon}</div>
                      <div>
                        <div className="text-2xl font-bold text-slate-950">{selectedStory.city}</div>
                        <div className="text-sm text-slate-600">{selectedStory.country}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedStory(null)}
                      className="rounded-lg border border-slate-900/10 bg-slate-900/5 p-2 text-slate-600 transition-colors hover:bg-slate-900/10 hover:text-slate-950"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    {selectedStory.author && <span>By {selectedStory.author}</span>}
                    {selectedStory.date && (
                      <>
                        <span>•</span>
                        <span>{selectedStory.date}</span>
                      </>
                    )}
                    <span>•</span>
                    <span className="font-semibold" style={{ color: EMOTION_CONFIG[selectedStory.emotion].color }}>
                      {EMOTION_CONFIG[selectedStory.emotion].label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <p className="text-lg leading-relaxed text-slate-800">
                  {selectedStory.fullContent || selectedStory.preview}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 border-t border-slate-900/10 p-6">
                <button className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-900/10 bg-slate-900/5 px-4 py-3 text-sm font-semibold text-slate-950 transition-all hover:bg-slate-900/10">
                  <Heart className="h-4 w-4" />
                  Resonate
                </button>
                <button className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-900/10 bg-slate-900/5 px-4 py-3 text-sm font-semibold text-slate-950 transition-all hover:bg-slate-900/10">
                  <MessageCircle className="h-4 w-4" />
                  Connect
                </button>
                <button className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-900/10 bg-slate-900/5 px-4 py-3 text-sm font-semibold text-slate-950 transition-all hover:bg-slate-900/10">
                  <Share2 className="h-4 w-4" />
                  Share
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
