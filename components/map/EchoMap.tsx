/**
 * =============================================================================
 * Fichier      : components/map/EchoMap.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 2.4.1 (2026-01-23)
 * Objet        : Carte EchoWorld - Globe (dézoom) + Hybrid (zoom) + layers échos
 * -----------------------------------------------------------------------------
 * Description  :
 * - MapLibre client + styles swap auto :
 *   • globe (dézoom, planète)
 *   • hybrid (zoom détail : routes/bâtiments)
 * - renderWorldCopies:false (stop frise répétée)
 * - setProjection('globe') si supporté (feature-detect)
 * - Ré-injection source/layers après setStyle() (style swap)
 * - Keep : clusters / points / heat / pulse / cinema / focus / nearMe
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 2.4.1 (2026-01-23)
 * - [FIX] ESLint prefer-const (bbox) + bboxAround réutilisé (nearMe)
 * - [FIX] Gestion zoomend/off stable (handler nommé)
 * - [KEEP] swap globe/detail + réinjection layers
 * 2.4.0 (2026-01-23)
 * - [NEW] Style swap auto : globe -> hybrid
 * - [NEW] Ré-injection source/layers après setStyle()
 * =============================================================================
 */

'use client';

import maplibregl from 'maplibre-gl';
import type {
  GeoJSONSource,
  MapMouseEvent,
  MapGeoJSONFeature,
  AddLayerObject,
  MapGeoJSONFeature as MapFeature,
  CircleLayerSpecification,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useMemo, useRef } from 'react';

import { STYLE_DETAIL_URL, STYLE_GLOBE_URL, EMOTION_COLORS } from './mapStyle';
import { SOURCE_ID, CLUSTER_LAYER, CLUSTER_COUNT_LAYER, POINT_LAYER, HEAT_LAYER } from './echoLayers';
import { getEchoesForMap } from '@/lib/echo/getEchoesForMap';
import type { FeatureCollection, Point } from 'geojson';

type Filters = {
  emotion: string | null;
  since: '24h' | '7d' | null;
  nearMe: boolean;
};

type EchoFeatureProps = {
  id?: string;
  emotion?: string | null;
  cluster_id?: number;
  point_count?: number;
  [k: string]: unknown;
};

type GeoJSONSourceClusterCompat = GeoJSONSource & {
  getClusterExpansionZoom: (
    clusterId: number,
    callback: (error: unknown, zoom: number) => void
  ) => void;
};

const GLOW_LAYER_ID = 'echo-glow';

// seuil de bascule globe -> hybrid
const DETAIL_ZOOM_THRESHOLD = 5;

// nearMe bbox radius (km)
const NEAR_ME_RADIUS_KM = 40;

function sinceToDate(since: Filters['since']): Date | null {
  if (!since) return null;
  const d = new Date();
  if (since === '24h') d.setHours(d.getHours() - 24);
  if (since === '7d') d.setDate(d.getDate() - 7);
  return d;
}

function bboxAround(lng: number, lat: number, km: number): [number, number, number, number] {
  const dLat = km / 110.574;
  const dLng = km / (111.32 * Math.cos((lat * Math.PI) / 180));
  return [lng - dLng, lat - dLat, lng + dLng, lat + dLat];
}

function getIdFromFeature(f: MapGeoJSONFeature | undefined): string | null {
  if (!f) return null;
  const p = f.properties as unknown as EchoFeatureProps | undefined;
  return typeof p?.id === 'string' ? p.id : null;
}

function getClusterIdFromFeature(f: MapGeoJSONFeature | undefined): number | null {
  if (!f) return null;
  const p = f.properties as unknown as EchoFeatureProps | undefined;
  return typeof p?.cluster_id === 'number' ? p.cluster_id : null;
}

function isPointGeometry(
  f: MapFeature | undefined
): f is MapFeature & { geometry: { type: 'Point'; coordinates: [number, number] } } {
  return Boolean(f && f.geometry && (f.geometry as { type?: unknown }).type === 'Point');
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
}

function createGlowLayer(): CircleLayerSpecification {
  return {
    id: GLOW_LAYER_ID,
    type: 'circle',
    source: SOURCE_ID,
    filter: ['!', ['has', 'point_count']],
    minzoom: 1,
    maxzoom: 9,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 10, 6, 26, 9, 40],
      'circle-blur': 0.8,
      'circle-opacity': 0.18,
      'circle-color': [
        'match',
        ['get', 'emotion'],
        'joy',
        EMOTION_COLORS.joy,
        'sadness',
        EMOTION_COLORS.sadness,
        'anger',
        EMOTION_COLORS.anger,
        'fear',
        EMOTION_COLORS.fear,
        'love',
        EMOTION_COLORS.love,
        'hope',
        EMOTION_COLORS.hope,
        EMOTION_COLORS.default,
      ],
    },
  };
}

type MapWithProjection = maplibregl.Map & {
  setProjection?: (p: { type: string } | string) => void;
};

export default function EchoMap({
  focusId,
  filters,
  onSelectEcho,
}: {
  focusId?: string;
  filters: Filters;
  onSelectEcho: (id: string) => void;
}) {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const indexRef = useRef<Map<string, { lng: number; lat: number }>>(new Map());
  const pulseRafRef = useRef<number | null>(null);

  const cameraTokenRef = useRef<number>(0);
  const cameraTimeoutRef = useRef<number | null>(null);
  const cinemaToRef = useRef<((center: [number, number], targetZoom: number) => void) | null>(null);

  // état courant du style
  const currentStyleRef = useRef<'globe' | 'detail'>('globe');

  // cache geoloc (nearMe)
  const nearMeRef = useRef<{ lng: number; lat: number; ts: number } | null>(null);

  const sinceDate = useMemo(() => sinceToDate(filters.since), [filters.since]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Start en globe pour dézoom “Terre”
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_GLOBE_URL,
      center: [0, 20],
      zoom: 1.8,
      pitch: 0,
      attributionControl: false,
      renderWorldCopies: false,
      minZoom: 1.2,
      maxZoom: 18,
      maxPitch: 60,
    });

    // Projection globe si supportée
    try {
      const mp = map as MapWithProjection;
      mp.setProjection?.({ type: 'globe' });
      mp.setProjection?.('globe');
    } catch {
      // ignore
    }

    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

    const cancelCamera = () => {
      cameraTokenRef.current += 1;
      if (cameraTimeoutRef.current !== null) {
        window.clearTimeout(cameraTimeoutRef.current);
        cameraTimeoutRef.current = null;
      }
      try {
        map.stop();
      } catch {
        // no-op
      }
    };

    const cinemaTo = (center: [number, number], targetZoom: number) => {
      const m = mapRef.current;
      if (!m) return;

      cancelCamera();
      const token = cameraTokenRef.current;
      const reduce = prefersReducedMotion();
      const baseZoom = Math.max(m.getZoom(), targetZoom);

      if (reduce) {
        m.easeTo({ center, zoom: baseZoom, duration: 0, bearing: 0, pitch: 0 });
        return;
      }

      m.easeTo({
        center,
        zoom: baseZoom,
        duration: 650,
        easing: (tt) => tt * (2 - tt),
        bearing: 0,
        pitch: 22,
      });

      cameraTimeoutRef.current = window.setTimeout(() => {
        if (cameraTokenRef.current !== token) return;
        const mm = mapRef.current;
        if (!mm) return;
        mm.easeTo({ pitch: 0, duration: 700, easing: (tt) => tt * (2 - tt) });
      }, 520);
    };

    cinemaToRef.current = cinemaTo;

    const stopPulse = () => {
      if (pulseRafRef.current !== null) cancelAnimationFrame(pulseRafRef.current);
      pulseRafRef.current = null;
    };

    const startPulse = () => {
      const tick = () => {
        const m = mapRef.current;
        if (!m) return;

        const z = m.getZoom();
        const t = Date.now() / 1000;

        if (z <= 4.5) {
          const opacity = 0.18 + 0.10 * (0.5 + 0.5 * Math.sin(t * 1.2));
          const intensity = 0.9 + 0.4 * (0.5 + 0.5 * Math.sin(t * 1.2));
          try {
            m.setPaintProperty('echo-heat', 'heatmap-opacity', opacity);
            m.setPaintProperty('echo-heat', 'heatmap-intensity', intensity);
          } catch {
            // layer pas encore prêt
          }
        }

        try {
          const glow = 0.5 + 0.5 * Math.sin(t * 1.15);
          m.setPaintProperty(GLOW_LAYER_ID, 'circle-opacity', 0.10 + 0.20 * glow);
          m.setPaintProperty(GLOW_LAYER_ID, 'circle-blur', 0.6 + 0.9 * glow);
        } catch {
          // layer pas encore prêt
        }

        pulseRafRef.current = requestAnimationFrame(tick);
      };

      pulseRafRef.current = requestAnimationFrame(tick);
    };

    const ensureEchoLayers = (geojson?: FeatureCollection<Point>) => {
      const m = mapRef.current;
      if (!m) return;

      const src = m.getSource(SOURCE_ID) as GeoJSONSource | undefined;

      if (!src) {
        m.addSource(SOURCE_ID, {
          type: 'geojson',
          data: (geojson ?? { type: 'FeatureCollection', features: [] }) as unknown as GeoJSON.FeatureCollection,
          cluster: true,
          clusterRadius: 50,
        });

        // ordre visuel : heat (bas) -> glow -> clusters -> points (haut)
        m.addLayer(HEAT_LAYER as unknown as AddLayerObject);
        m.addLayer(createGlowLayer() as unknown as AddLayerObject);
        m.addLayer(CLUSTER_LAYER as unknown as AddLayerObject);
        m.addLayer(CLUSTER_COUNT_LAYER as unknown as AddLayerObject);
        m.addLayer(POINT_LAYER as unknown as AddLayerObject);
      } else if (geojson) {
        src.setData(geojson as unknown as GeoJSON.FeatureCollection);
      }
    };

    const getActiveBbox = (m: maplibregl.Map): [number, number, number, number] => {
      if (filters.nearMe) {
        const cached = nearMeRef.current;
        if (cached) return bboxAround(cached.lng, cached.lat, NEAR_ME_RADIUS_KM);
      }

      const b = m.getBounds();
      return [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
    };

    const ensureNearMePosition = async (): Promise<{ lng: number; lat: number } | null> => {
      if (!filters.nearMe) return null;
      if (!navigator.geolocation) return null;

      const cached = nearMeRef.current;
      if (cached && Date.now() - cached.ts < 30_000) return { lng: cached.lng, lat: cached.lat };

      const pos = await new Promise<GeolocationPosition | null>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (p) => resolve(p),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 30_000 }
        );
      });

      if (!pos) return null;

      const lng = pos.coords.longitude;
      const lat = pos.coords.latitude;
      nearMeRef.current = { lng, lat, ts: Date.now() };
      return { lng, lat };
    };

    const fetchGeojson = async () => {
      const m = mapRef.current;
      if (!m) return null;

      // si nearMe, on tente d’obtenir position avant bbox
      const me = await ensureNearMePosition();
      if (me) {
        // micro caméra vers user (sans forcer si l’utilisateur bouge déjà)
        cinemaTo([me.lng, me.lat], Math.max(m.getZoom(), 6.5));
      }

      const bbox = getActiveBbox(m);

      const geojson = (await getEchoesForMap({
        bbox,
        emotion: filters.emotion ?? undefined,
        since: sinceDate ?? undefined,
      })) as unknown as FeatureCollection<Point>;

      indexRef.current.clear();
      for (const f of geojson.features) {
        const props = f.properties as unknown as { id?: unknown } | null;
        const id = typeof props?.id === 'string' ? props.id : undefined;
        const [lng, lat] = f.geometry.coordinates;
        if (id && Number.isFinite(lng) && Number.isFinite(lat)) {
          indexRef.current.set(id, { lng, lat });
        }
      }

      return geojson;
    };

    const applyStyleIfNeeded = async () => {
      const m = mapRef.current;
      if (!m) return;

      const z = m.getZoom();
      const want: 'globe' | 'detail' = z >= DETAIL_ZOOM_THRESHOLD ? 'detail' : 'globe';
      if (want === currentStyleRef.current) return;

      // snapshot caméra
      const center = m.getCenter();
      const zoom = m.getZoom();
      const bearing = m.getBearing();
      const pitch = m.getPitch();

      currentStyleRef.current = want;
      const nextStyle = want === 'detail' ? STYLE_DETAIL_URL : STYLE_GLOBE_URL;

      // Précharge data pour réinjection immédiate
      const geojson = await fetchGeojson();

      m.setStyle(nextStyle);

      m.once('style.load', () => {
        ensureEchoLayers(geojson ?? undefined);

        // re-apply projection globe si retour globe
        if (want === 'globe') {
          try {
            const mp = m as MapWithProjection;
            mp.setProjection?.({ type: 'globe' });
            mp.setProjection?.('globe');
          } catch {
            // ignore
          }
        }

        // restore caméra
        m.jumpTo({ center, zoom, bearing, pitch });
      });
    };

    const onZoomEnd = () => {
      void applyStyleIfNeeded();
    };

    const onLoad = async () => {
      const geojson = await fetchGeojson();
      ensureEchoLayers(geojson ?? undefined);
      startPulse();

      map.on('click', 'echo-point', (evt: MapMouseEvent) => {
        const features = map.queryRenderedFeatures(evt.point, { layers: ['echo-point'] });
        const id = getIdFromFeature(features?.[0]);
        if (!id) return;

        const p = indexRef.current.get(id);
        if (p) cinemaTo([p.lng, p.lat], Math.max(map.getZoom(), 9));
        onSelectEcho(id);
      });

      map.on('click', 'clusters', (evt: MapMouseEvent) => {
        const features = map.queryRenderedFeatures(evt.point, { layers: ['clusters'] });
        const f = features?.[0];
        const clusterId = getClusterIdFromFeature(f);
        if (clusterId === null) return;

        const src = map.getSource(SOURCE_ID) as GeoJSONSourceClusterCompat;
        src.getClusterExpansionZoom(clusterId, (err: unknown, zoomExp: number) => {
          if (err || typeof zoomExp !== 'number') return;
          if (!isPointGeometry(f)) return;
          cinemaTo(f.geometry.coordinates, zoomExp);
        });
      });

      map.on('mouseenter', 'echo-point', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'echo-point', () => {
        map.getCanvas().style.cursor = '';
      });

      map.on('zoomend', onZoomEnd);

      // focus initial
      if (focusId) {
        const p = indexRef.current.get(focusId);
        if (p) cinemaTo([p.lng, p.lat], 9);
      }
    };

    map.on('load', onLoad);

    return () => {
      stopPulse();
      cancelCamera();
      map.off('zoomend', onZoomEnd);
      map.off('load', onLoad);
      map.remove();
      mapRef.current = null;
      cinemaToRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload data on filters change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const reload = async () => {
      if (!map.isStyleLoaded()) return;

      // nearMe : rafraîchit cache (si activé)
      if (filters.nearMe) {
        // best-effort, sans bloquer si refus
        try {
          await new Promise<void>((resolve) => {
            if (!navigator.geolocation) return resolve();
            navigator.geolocation.getCurrentPosition(
              (p) => {
                nearMeRef.current = {
                  lng: p.coords.longitude,
                  lat: p.coords.latitude,
                  ts: Date.now(),
                };
                resolve();
              },
              () => resolve(),
              { enableHighAccuracy: true, timeout: 4000, maximumAge: 30_000 }
            );
          });
        } catch {
          // ignore
        }
      }

      const bbox =
        filters.nearMe && nearMeRef.current
          ? bboxAround(nearMeRef.current.lng, nearMeRef.current.lat, NEAR_ME_RADIUS_KM)
          : (() => {
              const b = map.getBounds();
              return [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()] as [number, number, number, number];
            })();

      const geojson = (await getEchoesForMap({
        bbox,
        emotion: filters.emotion ?? undefined,
        since: sinceDate ?? undefined,
      })) as unknown as FeatureCollection<Point>;

      indexRef.current.clear();
      for (const f of geojson.features) {
        const props = f.properties as unknown as { id?: unknown } | null;
        const id = typeof props?.id === 'string' ? props.id : undefined;
        const [lng, lat] = f.geometry.coordinates;
        if (id && Number.isFinite(lng) && Number.isFinite(lat)) {
          indexRef.current.set(id, { lng, lat });
        }
      }

      const src = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
      if (src) src.setData(geojson as unknown as GeoJSON.FeatureCollection);
    };

    void reload();
  }, [filters.emotion, filters.since, filters.nearMe, sinceDate]);

  // Focus update
  useEffect(() => {
    if (!focusId) return;
    const map = mapRef.current;
    if (!map) return;

    const p = indexRef.current.get(focusId);
    if (!p) return;

    cinemaToRef.current?.([p.lng, p.lat], Math.max(map.getZoom(), 9));
  }, [focusId]);

  return <div ref={containerRef} className="h-screen w-screen" />;
}
