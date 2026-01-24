/**
 * =============================================================================
 * Fichier      : components/map/EchoMap.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 3.0.0 (2026-01-24)
 * Objet        : Carte EchoWorld - Globe/Detail + Cœurs pays + Échos individuels
 * -----------------------------------------------------------------------------
 * Description  :
 * - Vue GLOBE (zoom < 5) : Affiche des cœurs par pays avec % émotions dominantes
 * - Vue DETAIL (zoom ≥ 5) : Affiche les échos individuels (clusters/points/heat)
 * - Bascule automatique et fluide entre les deux modes au zoom/dézoom
 * - Projection adaptée : globe (sphère 3D) vs mercator (carte plate)
 * - Cœurs interactifs : click → zoom sur le pays (niveau 7)
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 3.0.0 (2026-01-24)
 * - [NEW] Intégration cœurs pays en vue globe (agrégation par pays)
 * - [NEW] Bascule automatique cœurs/échos selon zoom (threshold = 5)
 * - [NEW] Markers MapLibre avec SVG cœurs colorés par émotion dominante
 * - [NEW] Animation pulse CSS sur les cœurs
 * - [NEW] Click sur cœur → cinema vers le pays (zoom 7)
 * - [KEEP] Tous les comportements v2.6.0 : projection, pulse, cinéma, filtres
 * 
 * 2.6.0 (2026-01-24)
 * - [FIX] CRITIQUE : Projection adaptée selon mode (globe='globe', detail='mercator')
 * - [FIX] Bug ligne 266 : projection était forcée 'globe' même en mode detail
 * - [IMPROVED] Retour globe au dézoom maintenant fonctionnel (projection + style sync)
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
import { getEchoesAggregatedByCountry, type CountryAggregation } from '@/lib/echo/getEchoesAggregatedByCountry';
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

// Seuil de bascule (globe->detail) ET (cœurs->échos)
const DETAIL_ZOOM_THRESHOLD = 5;

// "Vue monde" : bbox globale pour éviter une Terre vide au dézoom.
// (bornes lat réduites pour éviter singularités / antimeridian extrêmes)
const WORLD_BBOX: [number, number, number, number] = [-179.9, -80, 179.9, 80];
// Seuil zoom où l'on considère qu'on est en "vue monde"
const WORLD_ZOOM_THRESHOLD = 2.8;

// Style spec étendu pour supporter projection/fog/sky sans utiliser `any`
type StyleWithExtras = StyleSpecification & {
  projection?: { type: string } | string;
  fog?: {
    range?: [number, number];
    'horizon-blend'?: number;
    color?: string;
  };
  sky?: Record<string, unknown>;
};

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
        'hope',
        EMOTION_COLORS.hope,
        'love',
        EMOTION_COLORS.love,
        'resilience',
        EMOTION_COLORS.resilience,
        'gratitude',
        EMOTION_COLORS.gratitude,
        'courage',
        EMOTION_COLORS.courage,
        'peace',
        EMOTION_COLORS.peace,
        'wonder',
        EMOTION_COLORS.wonder,
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
  filters?: Filters; // optionnel pour SSR / prerender
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

  // Anti-race swap style (zoom rapide / style.load en retard)
  const styleSwapTokenRef = useRef<number>(0);
  const styleSwappingRef = useRef<boolean>(false);

  // handlers (pour off/on propres)
  const handlersRef = useRef<{
    onPointClick?: (evt: MapMouseEvent) => void;
    onClusterClick?: (evt: MapMouseEvent) => void;
    onEnter?: () => void;
    onLeave?: () => void;
    onZoomEndGlobal?: () => void;
  }>({});

  // Country markers (cœurs pays en vue globe)
  const countryMarkersRef = useRef<Map<string, maplibregl.Marker>>(new Map());

  // Filters "safe" pour SSR / prerender
  const safeFilters: Filters = filters ?? { emotion: null, since: null, nearMe: false };

  // Déstructuration pour que les hooks ne dépendent pas de l'objet complet (ESLint friendly)
  const { emotion, since, nearMe } = safeFilters;

  const sinceDate = useMemo(() => sinceToDate(since), [since]);

  // Refs "live" pour éviter la capture des filtres au mount
  const filtersRef = useRef<Filters>(safeFilters);
  const sinceDateRef = useRef<Date | null>(sinceDate);

  useEffect(() => {
    filtersRef.current = { emotion, since, nearMe };
  }, [emotion, since, nearMe]);

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

    // --- Globe apply helper (garde-fou si un style ignore projection)
    type MapWithProjection = maplibregl.Map & { setProjection?: (p: { type: string } | string) => void };
    const applyProjectionForMode = (mode: 'globe' | 'detail') => {
      const m = mapRef.current;
      if (!m) return;
      try {
        const mp = m as MapWithProjection;
        if (mode === 'globe') {
          mp.setProjection?.({ type: 'globe' });
          mp.setProjection?.('globe');
        } else {
          mp.setProjection?.({ type: 'mercator' });
          mp.setProjection?.('mercator');
        }
      } catch {
        // ignore
      }
    };

    // --- transformStyle strict : TransformStyleFunction -> StyleSpecification
    const transformForMode = (mode: 'globe' | 'detail'): TransformStyleFunction => {
      return (_prev: StyleSpecification | undefined, next: StyleSpecification): StyleSpecification => {
        const style: StyleWithExtras = { ...(next as StyleWithExtras) };

        // Projection adaptée selon le mode
        style.projection = { type: mode === 'globe' ? 'globe' : 'mercator' };

        if (mode === 'globe') {
          style.sky = {
            'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 7, 0],
          };

          style.light = {
            anchor: 'map',
            position: [1.5, 90, 80],
          } as unknown as StyleSpecification['light'];

          style.fog = {
            range: [0.5, 10],
            'horizon-blend': 0.1,
            color: '#000000',
          };
        } else {
          if ('sky' in style) {
            delete (style as { sky?: unknown }).sky;
          }
          style.fog = {
            range: [0.3, 8],
            'horizon-blend': 0.08,
            color: '#ffffff',
          };
        }

        return style;
      };
    };

    const setStyleForMode = (m: maplibregl.Map, mode: 'globe' | 'detail', styleUrl: string) => {
      m.setStyle(styleUrl, { transformStyle: transformForMode(mode) });
    };

    // Force le style globe injecté (projection + sky) dès le départ
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
        if (id && Number.isFinite(lng) && Number.isFinite(lat)) indexRef.current.set(id, { lng, lat });
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
    };

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

      // IMPORTANT : ne jamais écraser handlersRef.current (préserve onZoomEndGlobal)
      handlersRef.current.onPointClick = onPointClick;
      handlersRef.current.onClusterClick = onClusterClick;
      handlersRef.current.onEnter = onEnter;
      handlersRef.current.onLeave = onLeave;

      m.on('click', 'echo-point', onPointClick);
      m.on('click', 'clusters', onClusterClick);
      m.on('mouseenter', 'echo-point', onEnter);
      m.on('mouseleave', 'echo-point', onLeave);
    };

    // ========== COUNTRY HEARTS INTEGRATION (v3.0.0) ==========

    /**
     * Crée un marker MapLibre avec SVG cœur pour un pays
     */
    const createCountryMarker = (agg: CountryAggregation): maplibregl.Marker => {
      const m = mapRef.current;
      if (!m) throw new Error('Map not initialized');

      const color = EMOTION_COLORS[agg.dominantEmotion];
      const percentage = agg.emotionPercentages[agg.dominantEmotion];
      const countryId = agg.country.replace(/\s+/g, '-');
      const filterId = `shadow-${countryId}`;

      // Crée le SVG du cœur
      const svgString = `
        <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="${filterId}">
              <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
            </filter>
          </defs>
          <path 
            d="M24 42 C18 38, 6 30, 6 18 C6 10, 12 6, 18 6 C20 6, 22 7, 24 10 C26 7, 28 6, 30 6 C36 6, 42 10, 42 18 C42 30, 30 38, 24 42 Z" 
            fill="${color}" 
            stroke="white" 
            stroke-width="2"
            filter="url(#${filterId})"
          />
          <text 
            x="24" 
            y="26" 
            text-anchor="middle" 
            font-family="Arial, sans-serif" 
            font-size="12" 
            font-weight="bold" 
            fill="white"
            stroke="rgba(0,0,0,0.3)"
            stroke-width="0.5"
          >${percentage}%</text>
        </svg>
      `;

      const el = document.createElement('div');
      el.innerHTML = svgString;
      el.style.cursor = 'pointer';
      el.className = 'country-heart-marker';
      el.style.animation = 'heartbeat 2s ease-in-out infinite';

      const [lng, lat] = agg.centroid;

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(m);

      // Click handler : zoom sur le pays
      el.addEventListener('click', () => {
        cinemaTo(agg.centroid, 7); // Zoom niveau 7 = vue pays
      });

      return marker;
    };

    /**
     * Clear tous les markers pays
     */
    const clearCountryMarkers = () => {
      const markers = countryMarkersRef.current;
      markers.forEach((marker) => marker.remove());
      markers.clear();
    };

    /**
     * Refresh les markers pays selon le zoom actuel
     */
    const refreshCountryMarkers = async () => {
      const m = mapRef.current;
      if (!m) return;

      const z = m.getZoom();

      // Vue globe (zoom < 5) : afficher les cœurs
      if (z < DETAIL_ZOOM_THRESHOLD) {
        try {
          const bbox = await resolveBbox();
          const aggregations = await getEchoesAggregatedByCountry({
            bbox,
            emotion: filtersRef.current.emotion ?? undefined,
            since: sinceDateRef.current ?? undefined,
          });

          // Clear les anciens markers
          clearCountryMarkers();

          // Crée les nouveaux markers
          aggregations.forEach((agg) => {
            try {
              const marker = createCountryMarker(agg);
              countryMarkersRef.current.set(agg.country, marker);
            } catch (err) {
              console.error(`Failed to create marker for ${agg.country}:`, err);
            }
          });
        } catch (error) {
          console.error('Error refreshing country markers:', error);
        }
      } else {
        // Vue detail (zoom ≥ 5) : masquer les cœurs
        clearCountryMarkers();
      }
    };

    // ========== FIN COUNTRY HEARTS INTEGRATION ==========

    // --- Style swap (globe <-> detail) (ANTI-RACE + retour globe garanti)
    const applyStyleIfNeeded = async () => {
      const m = mapRef.current;
      if (!m) return;

      const z = m.getZoom();
      const want: 'globe' | 'detail' = z >= DETAIL_ZOOM_THRESHOLD ? 'detail' : 'globe';

      // Si déjà dans le bon mode, rien à faire
      if (want === currentStyleRef.current) return;

      // swap en cours => on attend la fin (évite blocage / race)
      if (styleSwappingRef.current) return;

      styleSwappingRef.current = true;
      const token = ++styleSwapTokenRef.current;

      const center = m.getCenter();
      const zoom = m.getZoom();
      const bearing = m.getBearing();
      const pitch = m.getPitch();

      currentStyleRef.current = want;
      const nextStyle = want === 'detail' ? STYLE_DETAIL_URL : STYLE_GLOBE_URL;

      const geojson = await fetchGeojson();

      setStyleForMode(m, want, nextStyle);

      m.once('style.load', () => {
        if (styleSwapTokenRef.current !== token) return;

        applyProjectionForMode(want);

        ensureEchoLayers(geojson ?? undefined);
        bindInteractions();

        // restaure caméra
        m.jumpTo({ center, zoom, bearing, pitch });

        styleSwappingRef.current = false;
      });

      // garde-fou si style.load ne vient pas (rare)
      window.setTimeout(() => {
        if (styleSwapTokenRef.current === token) styleSwappingRef.current = false;
      }, 2500);
    };

    // Handler global zoomend (attach 1 fois)
    const onZoomEndGlobal = () => {
      void applyStyleIfNeeded();
      // v3.0.0 : Refresh les markers selon le zoom
      void refreshCountryMarkers();
    };
    handlersRef.current.onZoomEndGlobal = onZoomEndGlobal;
    map.on('zoomend', onZoomEndGlobal);
    const zoomEndHandler = onZoomEndGlobal;

    const onLoad = async () => {
      applyProjectionForMode('globe');

      const geojson = await fetchGeojson();
      ensureEchoLayers(geojson ?? undefined);
      bindInteractions();
      startPulse();

      // v3.0.0 : Charge les cœurs pays si zoom < 5
      await refreshCountryMarkers();

      if (focusId) {
        const p = indexRef.current.get(focusId);
        if (p) cinemaTo([p.lng, p.lat], 9);
      }
    };

    map.on('load', onLoad);

    // Injecte les styles CSS pour l'animation heartbeat
    const style = document.createElement('style');
    style.textContent = `
      @keyframes heartbeat {
        0%, 100% { transform: scale(1); }
        10%, 30% { transform: scale(1.1); }
        20%, 40% { transform: scale(1.05); }
      }
      .country-heart-marker:hover {
        transform: scale(1.15);
        transition: transform 0.2s ease-out;
      }
    `;
    document.head.appendChild(style);

    return () => {
      stopPulse();
      cancelCamera();

      try {
        unbindInteractions();
      } catch {
        // ignore
      }

      // v3.0.0 : Clear les markers pays
      clearCountryMarkers();

      map.off('load', onLoad);

      try {
        map.off('zoomend', zoomEndHandler);
      } catch {
        // ignore
      }

      // Retire les styles CSS
      if (style.parentNode) {
        document.head.removeChild(style);
      }

      map.remove();
      mapRef.current = null;
      cinemaToRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload data when filters changent (nearMe + monde cohérents)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const reload = async () => {
      if (!map.isStyleLoaded()) return;

      const z = map.getZoom();
      let bbox: [number, number, number, number] = WORLD_BBOX;

      if (nearMe && navigator.geolocation) {
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
        emotion: emotion ?? undefined,
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

      // v3.0.0 : Refresh les cœurs pays aussi
      const refreshMarkers = async () => {
        const m = mapRef.current;
        if (!m) return;

        const currentZoom = m.getZoom();

        if (currentZoom < DETAIL_ZOOM_THRESHOLD) {
          try {
            const aggregations = await getEchoesAggregatedByCountry({
              bbox,
              emotion: emotion ?? undefined,
              since: sinceDate ?? undefined,
            });

            // Clear + recreate
            const markers = countryMarkersRef.current;
            markers.forEach((marker) => marker.remove());
            markers.clear();

            aggregations.forEach((agg) => {
              try {
                const color = EMOTION_COLORS[agg.dominantEmotion];
                const percentage = agg.emotionPercentages[agg.dominantEmotion];
                const countryId = agg.country.replace(/\s+/g, '-');
                const filterId = `shadow-${countryId}`;

                const svgString = `
                  <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <filter id="${filterId}">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
                      </filter>
                    </defs>
                    <path 
                      d="M24 42 C18 38, 6 30, 6 18 C6 10, 12 6, 18 6 C20 6, 22 7, 24 10 C26 7, 28 6, 30 6 C36 6, 42 10, 42 18 C42 30, 30 38, 24 42 Z" 
                      fill="${color}" 
                      stroke="white" 
                      stroke-width="2"
                      filter="url(#${filterId})"
                    />
                    <text 
                      x="24" 
                      y="26" 
                      text-anchor="middle" 
                      font-family="Arial, sans-serif" 
                      font-size="12" 
                      font-weight="bold" 
                      fill="white"
                      stroke="rgba(0,0,0,0.3)"
                      stroke-width="0.5"
                    >${percentage}%</text>
                  </svg>
                `;

                const el = document.createElement('div');
                el.innerHTML = svgString;
                el.style.cursor = 'pointer';
                el.className = 'country-heart-marker';
                el.style.animation = 'heartbeat 2s ease-in-out infinite';

                const [lng, lat] = agg.centroid;

                const marker = new maplibregl.Marker({ element: el })
                  .setLngLat([lng, lat])
                  .addTo(m);

                el.addEventListener('click', () => {
                  cinemaToRef.current?.(agg.centroid, 7);
                });

                markers.set(agg.country, marker);
              } catch (err) {
                console.error(`Failed to create marker for ${agg.country}:`, err);
              }
            });
          } catch (error) {
            console.error('Error refreshing country markers:', error);
          }
        }
      };

      await refreshMarkers();
    };

    void reload();
  }, [emotion, since, nearMe, sinceDate]);

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