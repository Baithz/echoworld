/**
 * =============================================================================
 * Fichier      : components/map/EchoMap.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 2.5.1 (2026-01-23)
 * Objet        : Carte EchoWorld - Globe (dézoom) + Hybrid (zoom) + layers échos
 * -----------------------------------------------------------------------------
 * Description  :
 * - Stabilise la visibilité des échos au dézoom (WORLD_BBOX) pour éviter une Terre "vide"
 * - Unifie la résolution de bbox (nearMe / monde / bounds) pour init + reload filtres + swap style
 * - Corrige un risque runtime (applyStyleIfNeeded appelé avant déclaration)
 * - Garantit que les filtres utilisés lors des fetch restent "live" (refs) même après mount
 * - Conserve intégralement : clusters/points/heat/pulse/cinema/focus + swap globe/détail
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 2.5.1 (2026-01-23)
 * - [FIX] Projection globe persistante via transformStyle (MapLibre) au swap de style
 * - [NEW] Atmosphère/sky sur le style globe pour rendu “vu de l’espace”
 * - [KEEP] Aucune modification des IDs de layers / sources / interactions
 * 2.5.0 (2026-01-23)
 * - [FIX] WORLD_BBOX au dézoom (expérience monde cohérente, pas de vide)
 * - [FIX] nearMe cohérent (même logique init/reload/swap)
 * - [FIX] applyStyleIfNeeded (function hoist) + fetch filtres "live"
 * - [KEEP] Aucun changement d’IDs layers, aucune régression interactions/cinéma/pulse
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
  StyleSpecification,
  TransformStyleFunction,
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

/**
 * Typings compat runtime :
 * Certains d.ts exposent getClusterExpansionZoom(callback) au lieu de (clusterId, callback).
 */
type GeoJSONSourceClusterCompat = GeoJSONSource & {
  getClusterExpansionZoom: (clusterId: number, callback: (error: unknown, zoom: number) => void) => void;
};

const GLOW_LAYER_ID = 'echo-glow';

// Seuil de bascule (globe->detail)
const DETAIL_ZOOM_THRESHOLD = 5;

// "Vue monde" : bbox globale pour éviter une Terre vide au dézoom.
// (bornes lat réduites pour éviter singularités / antimeridian extrêmes)
const WORLD_BBOX: [number, number, number, number] = [-179.9, -80, 179.9, 80];
// Seuil zoom où l’on considère qu’on est en "vue monde"
const WORLD_ZOOM_THRESHOLD = 2.8;

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

  // handlers (pour off/on propres)
  const handlersRef = useRef<{
    onPointClick?: (evt: MapMouseEvent) => void;
    onClusterClick?: (evt: MapMouseEvent) => void;
    onEnter?: () => void;
    onLeave?: () => void;
    onZoomEnd?: () => void;
  }>({});

  const sinceDate = useMemo(() => sinceToDate(filters.since), [filters.since]);

  // Refs "live" pour éviter la capture des filtres au mount
  const filtersRef = useRef<Filters>(filters);
  const sinceDateRef = useRef<Date | null>(sinceDate);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    sinceDateRef.current = sinceDate;
  }, [sinceDate]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

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

    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

    // --- Globe apply helper (doit être appelé APRES style.load)
    type MapWithProjection = maplibregl.Map & { setProjection?: (p: { type: string } | string) => void };
    const applyGlobeProjection = () => {
      const m = mapRef.current;
      if (!m) return;
      try {
        const mp = m as MapWithProjection;
        mp.setProjection?.({ type: 'globe' });
        mp.setProjection?.('globe');
      } catch {
        // ignore
      }
    };

    // --- Style transform : force projection globe + atmosphère côté style (fiable, persiste au swap)
    type StyleLike = StyleSpecification & {
      projection?: { type: string };
      sky?: Record<string, unknown>;
    };

    const transformForMode = (mode: 'globe' | 'detail'): TransformStyleFunction => {
      return (_prev, next): StyleSpecification => {
        // MapLibre attend un StyleSpecification
        if (!next || typeof next !== 'object') {
          return next as unknown as StyleSpecification;
        }

        const s = next as StyleLike;

        if (mode === 'globe') {
          // projection globe (le vrai “planète”)
          s.projection = { type: 'globe' };

          // atmosphère (rendu “vu de l’espace”)
          s.sky = {
            'sky-type': 'atmosphere',
            'sky-atmosphere-sun': [0.0, 90.0],
            'sky-atmosphere-sun-intensity': 10,
            'sky-atmosphere-color': 'rgba(135,206,235,0.55)',
            'sky-atmosphere-halo-color': 'rgba(255,255,255,0.35)',
          };
        }

        return s;
      };
    };

    const setStyleForMode = (m: maplibregl.Map, mode: 'globe' | 'detail', styleUrl: string) => {
      // setStyle avec transformStyle => globe réel + sky persistant après swap
      m.setStyle(styleUrl, { transformStyle: transformForMode(mode) });
    };

    // Force le style “globe” avec projection + sky dès le départ (évite rendu carte plate).
    setStyleForMode(map, 'globe', STYLE_GLOBE_URL);
    currentStyleRef.current = 'globe';

    const cancelCamera = () => {
      cameraTokenRef.current += 1;
      if (cameraTimeoutRef.current !== null) {
        window.clearTimeout(cameraTimeoutRef.current);
        cameraTimeoutRef.current = null;
      }
      try {
        map.stop();
      } catch {
        // ignore
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

    // --- Pulse
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
          const opacity = 0.18 + 0.1 * (0.5 + 0.5 * Math.sin(t * 1.2));
          const intensity = 0.9 + 0.4 * (0.5 + 0.5 * Math.sin(t * 1.2));
          try {
            m.setPaintProperty('echo-heat', 'heatmap-opacity', opacity);
            m.setPaintProperty('echo-heat', 'heatmap-intensity', intensity);
          } catch {
            // ignore
          }
        }

        try {
          const glow = 0.5 + 0.5 * Math.sin(t * 1.15);
          m.setPaintProperty(GLOW_LAYER_ID, 'circle-opacity', 0.1 + 0.2 * glow);
          m.setPaintProperty(GLOW_LAYER_ID, 'circle-blur', 0.6 + 0.9 * glow);
        } catch {
          // ignore
        }

        pulseRafRef.current = requestAnimationFrame(tick);
      };

      pulseRafRef.current = requestAnimationFrame(tick);
    };

    // --- Résolution bbox unifiée (nearMe / monde / bounds)
    const resolveBbox = async (): Promise<[number, number, number, number]> => {
      const m = mapRef.current;
      if (!m) return WORLD_BBOX;

      const f = filtersRef.current;

      if (f.nearMe && navigator.geolocation) {
        const pos = await new Promise<GeolocationPosition | null>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (p) => resolve(p),
            () => resolve(null),
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 30_000 }
          );
        });

        if (pos) {
          const lng = pos.coords.longitude;
          const lat = pos.coords.latitude;
          cinemaToRef.current?.([lng, lat], Math.max(m.getZoom(), 6.5));
          return bboxAround(lng, lat, 40);
        }
      }

      const z = m.getZoom();
      if (z <= WORLD_ZOOM_THRESHOLD) return WORLD_BBOX;

      const b = m.getBounds();
      return [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
    };

    // --- Data
    const fetchGeojson = async () => {
      const m = mapRef.current;
      if (!m) return null;

      const bbox = await resolveBbox();

      const geojson = (await getEchoesForMap({
        bbox,
        emotion: filtersRef.current.emotion ?? undefined,
        since: sinceDateRef.current ?? undefined,
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

    // --- Inject source/layers
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

        // ordre: heat (bas) -> glow -> clusters -> points (haut)
        m.addLayer(HEAT_LAYER as unknown as AddLayerObject);
        m.addLayer(createGlowLayer() as unknown as AddLayerObject);
        m.addLayer(CLUSTER_LAYER as unknown as AddLayerObject);
        m.addLayer(CLUSTER_COUNT_LAYER as unknown as AddLayerObject);
        m.addLayer(POINT_LAYER as unknown as AddLayerObject);
      } else if (geojson) {
        src.setData(geojson as unknown as GeoJSON.FeatureCollection);
      }
    };

    // --- Bind interactions (à rappeler après setStyle)
    const unbindInteractions = () => {
      const m = mapRef.current;
      if (!m) return;

      const h = handlersRef.current;
      if (h.onPointClick) m.off('click', 'echo-point', h.onPointClick);
      if (h.onClusterClick) m.off('click', 'clusters', h.onClusterClick);
      if (h.onEnter) m.off('mouseenter', 'echo-point', h.onEnter);
      if (h.onLeave) m.off('mouseleave', 'echo-point', h.onLeave);
      if (h.onZoomEnd) m.off('zoomend', h.onZoomEnd);
    };

    // --- Style swap (globe <-> detail)
    async function applyStyleIfNeeded() {
      const m = mapRef.current;
      if (!m) return;

      const z = m.getZoom();
      const want: 'globe' | 'detail' = z >= DETAIL_ZOOM_THRESHOLD ? 'detail' : 'globe';
      if (want === currentStyleRef.current) return;

      const center = m.getCenter();
      const zoom = m.getZoom();
      const bearing = m.getBearing();
      const pitch = m.getPitch();

      currentStyleRef.current = want;
      const nextStyle = want === 'detail' ? STYLE_DETAIL_URL : STYLE_GLOBE_URL;

      const geojson = await fetchGeojson();

      // IMPORTANT : setStyle AVEC transform => projection globe + sky persistants
      setStyleForMode(m, want, nextStyle);

      m.once('style.load', () => {
        // garde-fou (si jamais transform est ignoré par un style exotique)
        if (want === 'globe') applyGlobeProjection();

        ensureEchoLayers(geojson ?? undefined);
        bindInteractions();

        // restaure caméra
        m.jumpTo({ center, zoom, bearing, pitch });
      });
    }

    const bindInteractions = () => {
      const m = mapRef.current;
      if (!m) return;

      unbindInteractions();

      const onPointClick = (evt: MapMouseEvent) => {
        const features = m.queryRenderedFeatures(evt.point, { layers: ['echo-point'] });
        const id = getIdFromFeature(features?.[0]);
        if (!id) return;

        const p = indexRef.current.get(id);
        if (p) cinemaTo([p.lng, p.lat], Math.max(m.getZoom(), 9));
        onSelectEcho(id);
      };

      const onClusterClick = (evt: MapMouseEvent) => {
        const features = m.queryRenderedFeatures(evt.point, { layers: ['clusters'] });
        const f = features?.[0];
        const clusterId = getClusterIdFromFeature(f);
        if (clusterId === null) return;

        const src = m.getSource(SOURCE_ID) as GeoJSONSourceClusterCompat;
        src.getClusterExpansionZoom(clusterId, (err: unknown, zoom: number) => {
          if (err || typeof zoom !== 'number') return;
          if (!isPointGeometry(f)) return;
          cinemaTo(f.geometry.coordinates, zoom);
        });
      };

      const onEnter = () => {
        m.getCanvas().style.cursor = 'pointer';
      };
      const onLeave = () => {
        m.getCanvas().style.cursor = '';
      };

      const onZoomEnd = () => {
        void applyStyleIfNeeded();
      };

      handlersRef.current = { onPointClick, onClusterClick, onEnter, onLeave, onZoomEnd };

      m.on('click', 'echo-point', onPointClick);
      m.on('click', 'clusters', onClusterClick);
      m.on('mouseenter', 'echo-point', onEnter);
      m.on('mouseleave', 'echo-point', onLeave);
      m.on('zoomend', onZoomEnd);
    };

    const onLoad = async () => {
      // Sur le premier load: projection globe (satellite) au dézoom
      applyGlobeProjection();

      const geojson = await fetchGeojson();
      ensureEchoLayers(geojson ?? undefined);
      bindInteractions();
      startPulse();

      if (focusId) {
        const p = indexRef.current.get(focusId);
        if (p) cinemaTo([p.lng, p.lat], 9);
      }
    };

    map.on('load', onLoad);

    return () => {
      stopPulse();
      cancelCamera();
      try {
        unbindInteractions();
      } catch {
        // ignore
      }
      map.off('load', onLoad);
      map.remove();
      mapRef.current = null;
      cinemaToRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload data when filters change (nearMe + monde cohérents)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const reload = async () => {
      if (!map.isStyleLoaded()) return;

      const z = map.getZoom();

      let bbox: [number, number, number, number] = WORLD_BBOX;

      if (filters.nearMe && navigator.geolocation) {
        const pos = await new Promise<GeolocationPosition | null>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (p) => resolve(p),
            () => resolve(null),
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 30_000 }
          );
        });

        if (pos) {
          const lng = pos.coords.longitude;
          const lat = pos.coords.latitude;
          bbox = bboxAround(lng, lat, 40);
          cinemaToRef.current?.([lng, lat], Math.max(map.getZoom(), 6.5));
        } else {
          const b = map.getBounds();
          bbox = z <= WORLD_ZOOM_THRESHOLD ? WORLD_BBOX : [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
        }
      } else {
        const b = map.getBounds();
        bbox = z <= WORLD_ZOOM_THRESHOLD ? WORLD_BBOX : [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
      }

      const data = (await getEchoesForMap({
        bbox,
        emotion: filters.emotion ?? undefined,
        since: sinceDate ?? undefined,
      })) as unknown as FeatureCollection<Point>;

      indexRef.current.clear();
      for (const f of data.features) {
        const props = f.properties as unknown as { id?: unknown } | null;
        const id = typeof props?.id === 'string' ? props.id : undefined;
        const [lng, lat] = f.geometry.coordinates;
        if (id && Number.isFinite(lng) && Number.isFinite(lat)) indexRef.current.set(id, { lng, lat });
      }

      const src = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
      if (src) src.setData(data as unknown as GeoJSON.FeatureCollection);
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
