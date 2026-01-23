/**
 * =============================================================================
 * Fichier      : components/map/EchoMap.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 2.3.0 (2026-01-23)
 * Objet        : Carte EchoWorld avancée - Pulse émotionnel + filtres + focus
 * -----------------------------------------------------------------------------
 * Description  :
 * - Instancie MapLibre (client)
 * - Charge les échos via getEchoesForMap (bbox, emotion, since, nearMe)
 * - Index local des points par id pour focus / zoom ciblé
 * - Heatmap "respiration" animée aux faibles zooms
 * - Glow shader-like (layer cercle blur) animé au-dessus des points
 * - Gestion clusters (expansion zoom) et points (sélection écho)
 * - Transitions caméra “cinéma” (2 phases + cancel propre) + reuse pour focus
 * - renderWorldCopies:false + projection globe si supportée (pas de frise répétée)
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 2.3.0 (2026-01-23)
 * - [NEW] Désactivation des world copies (renderWorldCopies:false)
 * - [NEW] Tentative setProjection('globe') avec feature-detect (pas de crash)
 * - [KEEP] Comportement existant (pulse, clusters, filtres, focus, nearMe)
 * 2.2.1 (2026-01-23)
 * - [FIX] Focus utilise cinemaTo() via ref (évite logique divergente)
 * - [FIX] Nettoyage timeouts caméra (pas de fuite)
 * - [KEEP] Zéro régression sur heatmap/clusters/points/focus/nearMe
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
import { MAP_STYLE_URL, EMOTION_COLORS } from './mapStyle';
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
 * Le runtime MapLibre accepte bien (clusterId, callback). On fixe le typing localement.
 */
type GeoJSONSourceClusterCompat = GeoJSONSource & {
  getClusterExpansionZoom: (
    clusterId: number,
    callback: (error: unknown, zoom: number) => void
  ) => void;
};

const GLOW_LAYER_ID = 'echo-glow';

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

  // Caméra : annulation + timeouts
  const cameraTokenRef = useRef<number>(0);
  const cameraTimeoutRef = useRef<number | null>(null);

  // Expose cinema/cancel pour autres useEffect (focus)
  const cinemaToRef = useRef<((center: [number, number], targetZoom: number) => void) | null>(null);
  const cancelCameraRef = useRef<(() => void) | null>(null);

  const sinceDate = useMemo(() => sinceToDate(filters.since), [filters.since]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center: [0, 20],
      zoom: 1.8,
      pitch: 0,
      attributionControl: false,
      renderWorldCopies: false, // stop la frise répétée du monde
    });

    // Projection globe si supportée par la version MapLibre
    type MapWithProjection = maplibregl.Map & { setProjection?: (p: { type: string } | string) => void };
    const mProj = map as MapWithProjection;
    try {
      mProj.setProjection?.({ type: 'globe' });
    } catch {
      // Ignore si non supporté
    }

    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

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

        // Heatmap pulse uniquement en zoom faible
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

        // Glow pulse (blur/opacity)
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

    cancelCameraRef.current = cancelCamera;

    /**
     * Cinéma : 2 temps
     * 1) push-in (pitch + zoom) court
     * 2) settle (pitch -> 0)
     */
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

      // Phase 1 : push-in
      m.easeTo({
        center,
        zoom: baseZoom,
        duration: 650,
        easing: (tt) => tt * (2 - tt),
        bearing: 0,
        pitch: 22,
      });

      // Phase 2 : settle
      cameraTimeoutRef.current = window.setTimeout(() => {
        if (cameraTokenRef.current !== token) return;
        const mm = mapRef.current;
        if (!mm) return;

        mm.easeTo({
          pitch: 0,
          duration: 700,
          easing: (tt) => tt * (2 - tt),
        });
      }, 520);
    };

    cinemaToRef.current = cinemaTo;

    const loadData = async () => {
      let bbox: [number, number, number, number] | undefined;

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
          cinemaTo([lng, lat], Math.max(map.getZoom(), 6.5));
        }
      }

      if (!bbox) {
        const b = map.getBounds();
        bbox = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
      }

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

      if (src) {
        src.setData(geojson as unknown as GeoJSON.FeatureCollection);
      } else {
        map.addSource(SOURCE_ID, {
          type: 'geojson',
          data: geojson as unknown as GeoJSON.FeatureCollection,
          cluster: true,
          clusterRadius: 50,
        });

        // ordre visuel : heat (bas) -> glow -> clusters -> points (haut)
        map.addLayer(HEAT_LAYER as unknown as AddLayerObject);
        map.addLayer(createGlowLayer() as unknown as AddLayerObject);
        map.addLayer(CLUSTER_LAYER as unknown as AddLayerObject);
        map.addLayer(CLUSTER_COUNT_LAYER as unknown as AddLayerObject);
        map.addLayer(POINT_LAYER as unknown as AddLayerObject);
      }

      if (focusId) {
        const p = indexRef.current.get(focusId);
        if (p) cinemaTo([p.lng, p.lat], 9);
      }
    };

    const onLoad = async () => {
      await loadData();
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

        src.getClusterExpansionZoom(clusterId, (err: unknown, zoom: number) => {
          if (err || typeof zoom !== 'number') return;
          if (!isPointGeometry(f)) return;

          cinemaTo(f.geometry.coordinates, zoom);
        });
      });

      map.on('mouseenter', 'echo-point', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'echo-point', () => {
        map.getCanvas().style.cursor = '';
      });
    };

    map.on('load', onLoad);

    return () => {
      stopPulse();
      cancelCamera();
      map.off('load', onLoad);
      map.remove();
      mapRef.current = null;

      cinemaToRef.current = null;
      cancelCameraRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload data when filters change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const reload = async () => {
      const b = map.getBounds();
      const bbox: [number, number, number, number] = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];

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

  // Focus update (réutilise cinemaTo)
  useEffect(() => {
    if (!focusId) return;

    const p = indexRef.current.get(focusId);
    if (!p) return;

    // si la map n'est pas encore prête, on laisse la logique "loadData()" gérer le focus initial
    if (!mapRef.current) return;

    cinemaToRef.current?.([p.lng, p.lat], Math.max(mapRef.current.getZoom(), 9));
  }, [focusId]);

  return <div ref={containerRef} className="h-screen w-screen" />;
}
