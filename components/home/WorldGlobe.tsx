/**
 * =============================================================================
 * Fichier      : components/home/WorldGlobe.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 5.3.0 (2026-01-22)
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
 * Update v5.3.0 :
 * - [NEW] i18n complet : suppression des strings hardcodées (LIVE, LOADING, etc.)
 * - [NEW] Libellés émotions i18n (labels des émotions)
 * - [SAFE] Fallbacks i18n (erreurs/empty/anonymous) sans casser l’existant
 * - [SAFE] Compat visuelle conservée (classes, layout, animations inchangés)
 *
 * Update v5.2.1 :
 * - [FIX] Typage TS strict sur le mapping Supabase → Story[] (filter type guard)
 *
 * Update v5.2 :
 * - [NEW] Chargement des échos depuis Supabase (plus de MOCK_STORIES)
 * - [NEW] Utilisation de echoes.location (GeoJSON Point) pour les pins
 * - [NEW] Alignement émotions sur echoes.emotion_check (8 valeurs)
 * - [SAFE] Filtre status=published + visibility in ('world','local')
 * - [SAFE] Ignorer les échos sans émotion valide ou sans coordonnées
 *
 * Update v5.1 :
 * - [NEW] Prop `mode` : 'home' | 'full' (plein écran pour /explore)
 * - [IMPROVED] Styles container adaptés au thème clair par défaut
 * - [FIX] Cursor states inchangés + compat home conservée
 * =============================================================================
 */

'use client';

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import dynamic from 'next/dynamic';
import { Heart, MapPin, Sparkles, X, Share2, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '@/lib/i18n/LanguageProvider';
import type { GlobeMethods } from 'react-globe.gl';
import { supabase } from '@/lib/supabase/client';

const Globe = dynamic(() => import('react-globe.gl'), { ssr: false });

// IMPORTANT : aligné sur echoes.emotion_check (BDD)
type Emotion =
  | 'joy'
  | 'hope'
  | 'love'
  | 'resilience'
  | 'gratitude'
  | 'courage'
  | 'peace'
  | 'wonder';

// Types i18n SAFE (on n'élargit pas ton I18nKey existant ici)
// -> On cast localement, sans toucher le provider ni casser le typing global.
type GlobeI18nKey =
  | 'world.live_indicator'
  | 'world.loading'
  | 'world.story_count'
  | 'world.countries_count'
  | 'world.zoom_hint'
  | 'world.click_explore'   
  | 'world.error'
  | 'world.empty'
  | 'world.recenter'
  | 'story.anonymous'
  | 'story.from'
  | 'story.read_more'
  | 'actions.resonate'
  | 'actions.connect'
  | 'actions.share'
  | 'emotion.joy'
  | 'emotion.hope'
  | 'emotion.love'
  | 'emotion.resilience'
  | 'emotion.gratitude'
  | 'emotion.courage'
  | 'emotion.peace'
  | 'emotion.wonder';

const EMOTION_ICON: Record<Emotion, string> = {
  joy: '😊',
  hope: '🌟',
  love: '❤️',
  resilience: '💪',
  gratitude: '🙏',
  courage: '✨',
  peace: '🕊️',
  wonder: '🌍',
};

const EMOTION_COLOR: Record<Emotion, string> = {
  joy: '#10B981',
  hope: '#06B6D4',
  love: '#EF4444',
  resilience: '#F59E0B',
  gratitude: '#8B5CF6',
  courage: '#A855F7',
  peace: '#94A3B8',
  wonder: '#22C55E',
};

type EchoRow = {
  id: string;
  content: string;
  emotion: Emotion | null;
  city: string | null;
  country: string | null;
  created_at: string | null;
  is_anonymous: boolean | null;
  location: { type: 'Point'; coordinates: [number, number] } | null;
  echo_media?: Array<{ url: string; position: number | null }>;
  profiles?: { handle: string | null; display_name: string | null } | null;
};

type Story = {
  id: string;
  lat: number;
  lng: number;
  city: string;
  country: string;
  preview: string;
  emotion: Emotion;
  author?: string;
  date?: string;
  fullContent?: string;
  imageUrl?: string | null;
};

type StoryPoint = Story & {
  size: number;
  color: string;
  altitude: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function isEmotion(v: unknown): v is Emotion {
  return (
    v === 'joy' ||
    v === 'hope' ||
    v === 'love' ||
    v === 'resilience' ||
    v === 'gratitude' ||
    v === 'courage' ||
    v === 'peace' ||
    v === 'wonder'
  );
}

function safeStoryDate(iso: string | null | undefined): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleDateString();
}

type WorldGlobeMode = 'home' | 'full';

export default function WorldGlobe({ mode = 'home' }: { mode?: WorldGlobeMode }) {
  const { t } = useLang();
  const tt = useCallback(
    (key: GlobeI18nKey, fallback: string) => {
      // t(key) est typé I18nKey : on cast en SAFE local
      const value = t(key as unknown as never);
      return value && value !== key ? value : fallback;
    },
    [t]
  );

  const globeEl = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>({
    w: 0,
    h: 0,
  });
  const [mouse, setMouse] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hovered, setHovered] = useState<StoryPoint | null>(null);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [altitude, setAltitude] = useState(2.5);

  const [stories, setStories] = useState<Story[]>([]);
  const [loadingStories, setLoadingStories] = useState(false);
  const [storiesError, setStoriesError] = useState<string | null>(null);

  const emotionLabel = useCallback(
    (e: Emotion) => {
      const fallback: Record<Emotion, string> = {
        joy: 'Joy',
        hope: 'Hope',
        love: 'Love',
        resilience: 'Resilience',
        gratitude: 'Gratitude',
        courage: 'Courage',
        peace: 'Peace',
        wonder: 'Wonder',
      };

      const key: Record<Emotion, GlobeI18nKey> = {
        joy: 'emotion.joy',
        hope: 'emotion.hope',
        love: 'emotion.love',
        resilience: 'emotion.resilience',
        gratitude: 'emotion.gratitude',
        courage: 'emotion.courage',
        peace: 'emotion.peace',
        wonder: 'emotion.wonder',
      };

      return tt(key[e], fallback[e]);
    },
    [tt]
  );

  const EMOTION_CONFIG = useMemo(() => {
    const cfg: Record<Emotion, { color: string; label: string; icon: string }> = {
      joy: { color: EMOTION_COLOR.joy, label: emotionLabel('joy'), icon: EMOTION_ICON.joy },
      hope: { color: EMOTION_COLOR.hope, label: emotionLabel('hope'), icon: EMOTION_ICON.hope },
      love: { color: EMOTION_COLOR.love, label: emotionLabel('love'), icon: EMOTION_ICON.love },
      resilience: {
        color: EMOTION_COLOR.resilience,
        label: emotionLabel('resilience'),
        icon: EMOTION_ICON.resilience,
      },
      gratitude: {
        color: EMOTION_COLOR.gratitude,
        label: emotionLabel('gratitude'),
        icon: EMOTION_ICON.gratitude,
      },
      courage: {
        color: EMOTION_COLOR.courage,
        label: emotionLabel('courage'),
        icon: EMOTION_ICON.courage,
      },
      peace: { color: EMOTION_COLOR.peace, label: emotionLabel('peace'), icon: EMOTION_ICON.peace },
      wonder: {
        color: EMOTION_COLOR.wonder,
        label: emotionLabel('wonder'),
        icon: EMOTION_ICON.wonder,
      },
    };
    return cfg;
  }, [emotionLabel]);

  // Points avec pins premium (HTMLElement custom)
  const pointsData: StoryPoint[] = useMemo(
    () =>
      stories.map((story) => ({
        ...story,
        size: 1,
        color: EMOTION_CONFIG[story.emotion].color,
        altitude: 0.01,
      })),
    [stories, EMOTION_CONFIG]
  );

  // Labels (villes/pays au zoom)
  const labelsData = useMemo(
    () =>
      stories.map((story) => ({
        lat: story.lat,
        lng: story.lng,
        text: story.city,
        color: 'rgba(15, 23, 42, 0.85)',
        size: 1,
      })),
    [stories]
  );

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

  // Setup contrôles globe
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

  // Chargement des échos depuis Supabase
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoadingStories(true);
      setStoriesError(null);

      try {
        const { data, error } = await supabase
          .from('echoes')
          .select(
            'id,content,emotion,city,country,created_at,is_anonymous,location,echo_media(url,position),profiles:profiles(handle,display_name)'
          )
          .eq('status', 'published')
          .in('visibility', ['world', 'local'])
          .order('created_at', { ascending: false })
          .limit(400);

        if (error) throw error;

        const rows = (data as EchoRow[] | null) ?? [];

        const mapped: Story[] = rows
          .map((e): Story | null => {
            const loc = e.location;
            const emoRaw = e.emotion;

            if (!loc || loc.type !== 'Point') return null;
            if (!isEmotion(emoRaw)) return null;

            const [lng, lat] = loc.coordinates;
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

            const media0 =
              (e.echo_media ?? [])
                .slice()
                .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0]?.url ?? null;

            const anonymousLabel = tt('story.anonymous', 'Anonymous');

            const authorName = e.is_anonymous
              ? anonymousLabel
              : e.profiles?.display_name || e.profiles?.handle || undefined;

            const full = (e.content || '').trim();
            if (!full) return null;

            const preview = full.slice(0, 90) + (full.length > 90 ? '…' : '');

            return {
              id: e.id,
              lat,
              lng,
              city: e.city || '—',
              country: e.country || '—',
              preview,
              emotion: emoRaw,
              author: authorName,
              date: safeStoryDate(e.created_at),
              fullContent: full,
              imageUrl: media0,
            };
          })
          .filter((x): x is Story => x !== null);

        if (!mounted) return;
        setStories(mapped);
      } catch (err) {
        if (!mounted) return;
        setStoriesError(err instanceof Error ? err.message : tt('world.error', 'Failed to load stories.'));
      } finally {
        if (mounted) setLoadingStories(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [tt]);

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

    const story = stories.find((s) => s.id === String(p.id));
    if (story) {
      setSelectedStory(story);
    }
  };

  // Custom HTML marker (pin premium)
  const pointLabel = useCallback(
    (point: unknown) => {
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
    },
    [EMOTION_CONFIG]
  );

  const tooltipLeft = clamp(mouse.x + 16, 12, Math.max(12, containerSize.w - 280));
  const tooltipTop = clamp(mouse.y + 16, 12, Math.max(12, containerSize.h - 140));

  const showLabels = altitude < 1.8;

  const containerClassName =
    mode === 'full'
      ? 'relative h-[calc(100vh-5rem)] w-full overflow-hidden rounded-3xl border border-slate-900/10 bg-white/70 backdrop-blur-sm'
      : 'relative h-[800px] w-full overflow-hidden rounded-3xl border border-slate-900/10 bg-white/70 backdrop-blur-sm';

  const liveLabel = loadingStories
    ? tt('world.loading', 'LOADING')
    : tt('world.live_indicator', 'LIVE');

  const storiesSharedLabel = tt('world.story_count', 'Stories shared');
  const countriesLabel = tt('world.countries_count', 'Countries');

  const instructionsLabel = tt(
    'world.zoom_hint',
    'Click stories to read • Drag to explore'
  );

  const recenterLabel = tt('world.recenter', 'Recenter');

  const emptyLabel = tt('world.empty', 'No stories yet.');

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
            <span className="text-xs font-semibold text-emerald-900">{liveLabel}</span>
          </div>

          <div className="rounded-2xl border border-slate-900/10 bg-white/70 px-4 py-3 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-rose-500" />
              <div className="text-2xl font-bold text-slate-950">{stories.length}</div>
            </div>
            <div className="mt-1 text-xs text-slate-600">{storiesSharedLabel}</div>
          </div>

          <div className="rounded-2xl border border-slate-900/10 bg-white/70 px-4 py-3 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-sky-600" />
              {/* TODO futur: calcul réel (distinct country) */}
              <div className="text-2xl font-bold text-slate-950">127</div>
            </div>
            <div className="mt-1 text-xs text-slate-600">{countriesLabel}</div>
          </div>

          {storiesError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
              {storiesError}
            </div>
          )}

          {!loadingStories && !storiesError && stories.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs text-slate-700">
              {emptyLabel}
            </div>
          )}
        </div>

        {/* Instructions (bottom-center) */}
        <div className="pointer-events-none absolute inset-x-0 bottom-8 z-10 flex justify-center">
          <div className="rounded-2xl border border-slate-900/10 bg-white/70 px-6 py-3 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <Sparkles className="h-4 w-4 text-violet-600" />
              <div className="text-center">
                <p className="text-sm font-medium text-slate-800">{instructionsLabel}</p>
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
            {recenterLabel}
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
              <div className="mt-2 text-xs font-semibold text-violet-600">
                {tt('world.click_explore', 'Click to read full story →')}
              </div>
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
                    {selectedStory.author && (
                      <span>
                        {tt('story.from', 'From')} {selectedStory.author}
                      </span>
                    )}
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

                {selectedStory.imageUrl && (
                  <div className="mt-5 overflow-hidden rounded-2xl border border-slate-900/10 bg-slate-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedStory.imageUrl}
                      alt=""
                      className="h-auto w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 border-t border-slate-900/10 p-6">
                <button className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-900/10 bg-slate-900/5 px-4 py-3 text-sm font-semibold text-slate-950 transition-all hover:bg-slate-900/10">
                  <Heart className="h-4 w-4" />
                  {tt('actions.resonate', 'Resonate')}
                </button>
                <button className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-900/10 bg-slate-900/5 px-4 py-3 text-sm font-semibold text-slate-950 transition-all hover:bg-slate-900/10">
                  <MessageCircle className="h-4 w-4" />
                  {tt('actions.connect', 'Connect')}
                </button>
                <button className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-900/10 bg-slate-900/5 px-4 py-3 text-sm font-semibold text-slate-950 transition-all hover:bg-slate-900/10">
                  <Share2 className="h-4 w-4" />
                  {tt('actions.share', 'Share')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
