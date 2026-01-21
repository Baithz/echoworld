/**
 * =============================================================================
 * Fichier      : components/home/WorldGlobe.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 5.0.1 (2026-01-21)
 * Objet        : Globe HYBRIDE - Hauteur fixe + Pins premium + UX moderne
 * -----------------------------------------------------------------------------
 * FIX v5.0.1 :
 * - [FIX] Pins premium: utilisation correcte htmlElementsData + htmlElement
 * - [FIX] Terre centrée (POV initial neutre) + Recenter fiable
 * - [IMPROVED] Tooltip React premium (sans label HTML cheap)
 * - [IMPROVED] Layout interne propre (aucun accès ref pendant render)
 * =============================================================================
 */

'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Heart, MapPin, Sparkles, X, Share2, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
      "My neighborhood came together to help an elderly resident who fell ill. We organized meals, visits, and support. It reminded me that we're stronger together. Community matters.",
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

const EMOTION_CONFIG: Record<
  Emotion,
  { color: string; label: string; icon: string }
> = {
  joy: { color: '#10B981', label: 'Joy', icon: '😊' },
  hope: { color: '#06B6D4', label: 'Hope', icon: '🌅' },
  gratitude: { color: '#8B5CF6', label: 'Gratitude', icon: '🙏' },
  reflection: { color: '#F59E0B', label: 'Reflection', icon: '💭' },
  solidarity: { color: '#EC4899', label: 'Solidarity', icon: '🤝' },
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function WorldGlobe() {
  const globeEl = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [mouse, setMouse] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [hovered, setHovered] = useState<StoryPoint | null>(null);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [altitude, setAltitude] = useState(2.2);

  const pointsData: StoryPoint[] = useMemo(
    () =>
      MOCK_STORIES.map((story) => ({
        ...story,
        color: EMOTION_CONFIG[story.emotion].color,
        altitude: 0.01,
      })),
    []
  );

  const labelsData = useMemo(
    () =>
      MOCK_STORIES.map((story) => ({
        lat: story.lat,
        lng: story.lng,
        text: story.city,
        color: 'rgba(255,255,255,0.9)',
        size: 1,
      })),
    []
  );

  // Mesure container (pour tooltip sans ref pendant render)
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
    // POV neutre => globe visuellement centré
    g.pointOfView({ lat: 15, lng: 0, altitude: 2.2 }, ms);
  }, []);

  useEffect(() => {
    const g = globeEl.current;
    if (!g) return;

    recenter(0);

    const controls = g.controls();
    controls.enableZoom = true;
    controls.enablePan = false;
    controls.rotateSpeed = 0.55;
    controls.zoomSpeed = 0.85;

    // Important: distances raisonnables
    controls.minDistance = 140;
    controls.maxDistance = 520;

    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.28;

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

  const tooltipLeft = clamp(mouse.x + 16, 12, Math.max(12, containerSize.w - 292));
  const tooltipTop = clamp(mouse.y + 16, 12, Math.max(12, containerSize.h - 160));

  const showLabels = altitude < 1.85;

  // ✅ PIN PREMIUM (Airbnb-like) => vrai DOM element via htmlElement
  const htmlElement = useCallback((d: unknown) => {
    const p = d as StoryPoint;
    const cfg = EMOTION_CONFIG[p.emotion];

    const el = document.createElement('div');
    el.style.width = '34px';
    el.style.height = '34px';
    el.style.display = 'grid';
    el.style.placeItems = 'center';
    el.style.cursor = 'pointer';
    el.style.userSelect = 'none';
    el.style.transform = 'translate(-50%, -100%)';

    // pin body
    const pin = document.createElement('div');
    pin.style.width = '34px';
    pin.style.height = '34px';
    pin.style.borderRadius = '999px';
    pin.style.border = '3px solid rgba(255,255,255,0.95)';
    pin.style.background = cfg.color;
    pin.style.boxShadow = '0 10px 25px rgba(0,0,0,0.35)';
    pin.style.display = 'grid';
    pin.style.placeItems = 'center';
    pin.style.transition = 'transform .18s ease, filter .18s ease';
    pin.style.filter = 'saturate(1.05)';

    const emoji = document.createElement('div');
    emoji.textContent = cfg.icon;
    emoji.style.fontSize = '16px';
    emoji.style.lineHeight = '1';
    pin.appendChild(emoji);

    // little tail
    const tail = document.createElement('div');
    tail.style.width = '10px';
    tail.style.height = '10px';
    tail.style.background = cfg.color;
    tail.style.position = 'absolute';
    tail.style.left = '50%';
    tail.style.bottom = '2px';
    tail.style.transform = 'translateX(-50%) rotate(45deg)';
    tail.style.borderRight = '3px solid rgba(255,255,255,0.95)';
    tail.style.borderBottom = '3px solid rgba(255,255,255,0.95)';
    tail.style.borderRadius = '2px';
    tail.style.boxShadow = '0 10px 25px rgba(0,0,0,0.25)';

    el.style.position = 'relative';
    el.appendChild(pin);
    el.appendChild(tail);

    // interactions
    el.addEventListener('mouseenter', () => {
      pin.style.transform = 'scale(1.08)';
      setHovered(p);
    });

    el.addEventListener('mouseleave', () => {
      pin.style.transform = 'scale(1)';
      setHovered(null);
    });

    el.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const story = MOCK_STORIES.find((s) => s.id === p.id) ?? null;
      setSelectedStory(story);
    });

    return el;
  }, []);

  return (
    <>
      <div
        ref={containerRef}
        onMouseMove={onMouseMove}
        className="relative h-[800px] w-full overflow-hidden rounded-3xl border border-white/10 bg-slate-950/20 backdrop-blur-sm"
      >
        {/* subtle glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(56,189,248,0.10),transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(139,92,246,0.12),transparent_60%)]" />
        </div>

        {/* Globe */}
        <div className="absolute inset-0">
          <Globe
            ref={globeEl}
            globeImageUrl="https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
            bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
            backgroundColor="rgba(0,0,0,0)"
            atmosphereColor="rgba(139,92,246,0.20)"
            atmosphereAltitude={0.16}
            enablePointerInteraction
            animateIn

            // Labels (zoom)
            labelsData={showLabels ? labelsData : []}
            labelLat="lat"
            labelLng="lng"
            labelText="text"
            labelSize="size"
            labelColor="color"
            labelAltitude={0.01}
            labelResolution={2}

            // Pins DOM premium
            htmlElementsData={pointsData}
            htmlLat="lat"
            htmlLng="lng"
            htmlAltitude="altitude"
            htmlElement={htmlElement}

            // IMPORTANT: on ne veut pas du tooltip HTML interne
            pointsData={[]}
            pointLabel={() => ''}
          />
        </div>

        {/* UI overlay */}
        <div className="pointer-events-none absolute left-6 top-6 z-10 flex flex-col gap-3">
          <div className="flex items-center gap-2 rounded-full border border-emerald-400/25 bg-slate-950/70 px-4 py-2 backdrop-blur-md">
            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <span className="text-xs font-semibold text-emerald-200">LIVE</span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-rose-400" />
              <div className="text-2xl font-bold text-white">{MOCK_STORIES.length * 234}</div>
            </div>
            <div className="mt-1 text-xs text-slate-300">Stories shared</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-sky-400" />
              <div className="text-2xl font-bold text-white">127</div>
            </div>
            <div className="mt-1 text-xs text-slate-300">Countries</div>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-8 z-10 flex justify-center">
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-6 py-3 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <Sparkles className="h-4 w-4 text-violet-300" />
              <p className="text-sm font-medium text-slate-200">Click a pin • Drag to explore • Zoom for labels</p>
            </div>
          </div>
        </div>

        <div className="absolute bottom-6 right-6 z-10">
          <button
            type="button"
            onClick={() => recenter(800)}
            className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/70 px-5 py-3 text-sm font-semibold text-white backdrop-blur-md transition-all hover:bg-slate-950/90"
          >
            Recenter
          </button>
        </div>

        {/* Tooltip React */}
        {hovered && !selectedStory && (
          <div className="pointer-events-none absolute z-20 w-[280px]" style={{ left: tooltipLeft, top: tooltipTop }}>
            <div
              className="rounded-xl border bg-slate-950/95 p-4 shadow-2xl backdrop-blur-xl"
              style={{ borderColor: hovered.color + '40' }}
            >
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">{hovered.city}</div>
                  <div className="text-xs text-slate-400">{hovered.country}</div>
                </div>
                <div className="text-2xl">{EMOTION_CONFIG[hovered.emotion].icon}</div>
              </div>
              <p className="text-sm text-slate-200">{hovered.preview}</p>
              <div className="mt-2 text-xs font-semibold text-violet-300">Click to read full story →</div>
            </div>
          </div>
        )}
      </div>

      {/* Modal story */}
      <AnimatePresence>
        {selectedStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={() => setSelectedStory(null)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl"
              style={{ borderColor: EMOTION_CONFIG[selectedStory.emotion].color + '40' }}
            >
              <div className="relative overflow-hidden border-b border-white/10 p-6">
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
                        <div className="text-2xl font-bold text-white">{selectedStory.city}</div>
                        <div className="text-sm text-slate-400">{selectedStory.country}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedStory(null)}
                      className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400">
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

              <div className="p-6">
                <p className="text-lg leading-relaxed text-slate-200">
                  {selectedStory.fullContent || selectedStory.preview}
                </p>
              </div>

              <div className="flex gap-3 border-t border-white/10 p-6">
                <button className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10">
                  <Heart className="h-4 w-4" />
                  Resonate
                </button>
                <button className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10">
                  <MessageCircle className="h-4 w-4" />
                  Connect
                </button>
                <button className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10">
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
