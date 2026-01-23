/**
 * =============================================================================
 * Fichier      : components/globe/GlobeView.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.3 (2026-01-23)
 * Objet        : Vue Globe réaliste (Three.js) - Points d’échos + focus (strict)
 * -----------------------------------------------------------------------------
 * Fixes :
 * - Typings react-globe.gl: accessors sont typés (obj: object) => T
 *   => cast strict vers ObjAccessor<T> / signature onPointClick complète
 * - Ref conforme aux d.ts : MutableRefObject<GlobeMethods | undefined>
 * - Rotation auto via controls().autoRotate (pas de prop autoRotate)
 * =============================================================================
 */

'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { EmotionKey } from '@/components/map/mapStyle';
import { EMOTION_COLORS } from '@/components/map/mapStyle';
import { getEchoesForMap } from '@/lib/echo/getEchoesForMap';
import type { FeatureCollection, Point as GeoPoint } from 'geojson';
import { GLOBE_TEXTURES } from './globeTextures';
import type { GlobeEchoPoint, GlobeFilters } from './globeTypes';

// Types react-globe.gl
import type { GlobeMethods, GlobeProps } from 'react-globe.gl';

// Import client-only
const GlobeDynamic = dynamic(() => import('react-globe.gl'), { ssr: false });

// Helper type: props de Globe utilisent ObjAccessor<T> = (obj: object) => T
type ObjAccessor<T> = NonNullable<GlobeProps['pointLat']> extends (obj: object) => infer R
  ? (obj: object) => Extract<R, T>
  : (obj: object) => T;

// On caste le composant dynamique pour pouvoir lui passer des props typées GlobeProps
const Globe = GlobeDynamic as unknown as React.ComponentType<GlobeProps & { ref?: React.MutableRefObject<GlobeMethods | undefined> }>;

type Props = {
  filters: GlobeFilters;
  focusId?: string;
  onSelectEcho: (id: string) => void;
};

const WORLD_BBOX: [number, number, number, number] = [-180, -85, 180, 85];

function sinceToDate(since: GlobeFilters['since']): Date | null {
  if (!since) return null;
  const d = new Date();
  if (since === '24h') d.setHours(d.getHours() - 24);
  if (since === '7d') d.setDate(d.getDate() - 7);
  return d;
}

function isEmotionKey(v: unknown): v is EmotionKey {
  return v === 'joy' || v === 'sadness' || v === 'anger' || v === 'fear' || v === 'love' || v === 'hope';
}

function emotionColor(e: EmotionKey | null | undefined): string {
  if (!e) return EMOTION_COLORS.default;
  return EMOTION_COLORS[e] ?? EMOTION_COLORS.default;
}

function asPoint(obj: object): GlobeEchoPoint | null {
  const o = obj as Partial<GlobeEchoPoint> | null;
  if (!o) return null;
  if (typeof o.id !== 'string') return null;
  if (typeof o.lat !== 'number' || typeof o.lng !== 'number') return null;
  if (!isEmotionKey(o.emotion)) return null;
  return o as GlobeEchoPoint;
}

export default function GlobeView({ filters, focusId, onSelectEcho }: Props) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);

  const [points, setPoints] = useState<GlobeEchoPoint[]>([]);
  const [loading, setLoading] = useState(false);

  const sinceDate = useMemo(() => sinceToDate(filters.since), [filters.since]);

  // Rotation auto via OrbitControls (pas en props)
  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;

    const controls = g.controls?.();
    if (!controls) return;

    const c = controls as unknown as { autoRotate?: boolean; autoRotateSpeed?: number };
    c.autoRotate = true;
    c.autoRotateSpeed = 0.35;
  }, []);

  // Load data world
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const geojson = (await getEchoesForMap({
          bbox: WORLD_BBOX,
          emotion: filters.emotion ?? undefined,
          since: sinceDate ?? undefined,
        })) as unknown as FeatureCollection<GeoPoint>;

        if (cancelled) return;

        const mapped: GlobeEchoPoint[] = geojson.features
          .map((f) => {
            const props = (f.properties ?? {}) as Record<string, unknown>;
            const id = typeof props.id === 'string' ? props.id : null;
            if (!id) return null;

            const emotionRaw = props.emotion;
            const emotion: EmotionKey = isEmotionKey(emotionRaw) ? emotionRaw : 'joy';

            const coords = f.geometry?.coordinates as unknown;
            if (!Array.isArray(coords) || coords.length < 2) return null;

            const lng = Number(coords[0]);
            const lat = Number(coords[1]);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

            return { id, lat, lng, emotion };
          })
          .filter((x): x is GlobeEchoPoint => Boolean(x));

        setPoints(mapped);
      } catch {
        if (!cancelled) setPoints([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filters.emotion, filters.since, sinceDate]);

  // Focus
  useEffect(() => {
    if (!focusId) return;
    const p = points.find((x) => x.id === focusId);
    if (!p) return;

    try {
      globeRef.current?.pointOfView?.({ lat: p.lat, lng: p.lng, altitude: 1.7 }, 650);
    } catch {
      // ignore
    }
  }, [focusId, points]);

  // Accessors typés pour satisfaire ObjAccessor<T> (obj: object) => ...
  const pointLat = useMemo<ObjAccessor<number>>(
    () => (obj: object) => {
      const p = asPoint(obj);
      return p ? p.lat : 0;
    },
    []
  );

  const pointLng = useMemo<ObjAccessor<number>>(
    () => (obj: object) => {
      const p = asPoint(obj);
      return p ? p.lng : 0;
    },
    []
  );

  const pointColor = useMemo<ObjAccessor<string>>(
    () => (obj: object) => {
      const p = asPoint(obj);
      return emotionColor(p?.emotion);
    },
    []
  );

  const onPointClick = useMemo<NonNullable<GlobeProps['onPointClick']>>(
    () => (point: object) => {
      const p = asPoint(point);
      if (p?.id) onSelectEcho(p.id);
    },
    [onSelectEcho]
  );

  return (
    <div className="absolute inset-0">
      <Globe
        ref={globeRef}
        globeImageUrl={GLOBE_TEXTURES.earthDay}
        bumpImageUrl={GLOBE_TEXTURES.earthBump}
        backgroundImageUrl={GLOBE_TEXTURES.stars}
        atmosphereColor="rgba(120,170,255,0.65)"
        atmosphereAltitude={0.15}
        animateIn={true}
        pointsData={points}
        pointLat={pointLat}
        pointLng={pointLng}
        pointColor={pointColor}
        pointAltitude={0.02}
        pointRadius={0.12}
        pointsMerge={true}
        onPointClick={onPointClick}
      />

      {loading && (
        <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-xl bg-black/35 px-3 py-2 text-xs text-white/80 border border-white/10 backdrop-blur">
          Chargement des échos…
        </div>
      )}
    </div>
  );
}
