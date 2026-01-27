/**
 * =============================================================================
 * Fichier      : lib/echo/getEchoesForMap.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.3.4 (2026-01-27)
 * Objet        : Service GeoJSON pour carte EchoMap (RPC bbox + fallback monde)
 * -----------------------------------------------------------------------------
 * Description  :
 * - getEchoesForMap(params) => FeatureCollection<Point>
 * - SAFE: supporte 2 RPC signatures existantes (bbox jsonb array) OU (params séparés)
 * - Normalisation bbox (antiméridien + clamp)
 * - Fallback monde si bbox KO / vide / RPC error
 * - SAFE: garde un mapping tolérant des colonnes (avec ou sans title/content)
 * - NEW: TTL monde (1h) si aucune période n’est fournie (anti 15M points)
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.3.4 (2026-01-27)
 * - [NEW] TTL monde: si bbox ≈ WORLD_BBOX et since absent => since = now - 1h (réduit charge)
 * - [KEEP] API publique inchangée (params/return), dédup + split antiméridien + fallback monde
 * =============================================================================
 */

import { supabase } from '@/lib/supabase/client';
import type { Feature, FeatureCollection, Point } from 'geojson';

export type EchoMapProps = {
  id: string;
  title: string | null;
  emotion: string | null;
  created_at: string;
  city: string | null;
  country: string | null;
};

export type EchoMapFeature = Feature<Point, EchoMapProps>;
export type EchoMapFeatureCollection = FeatureCollection<Point, EchoMapProps>;

/**
 * Les 2 RPC renvoient location en jsonb (GeoJSON Point),
 * et title est présent uniquement sur la signature "params séparés".
 */
type RpcEchoRowA = {
  id: string;
  emotion: string | null;
  created_at: string;
  city: string | null;
  country: string | null;
  location: unknown; // jsonb geojson
  title?: never;
};

type RpcEchoRowB = {
  id: string;
  title: string | null;
  emotion: string | null;
  created_at: string;
  city: string | null;
  country: string | null;
  location: unknown; // jsonb geojson
};

type RpcEchoRow = RpcEchoRowA | RpcEchoRowB;

const LIMIT = 600;
const WORLD_BBOX: [number, number, number, number] = [-179.9, -80, 179.9, 80];

// TTL monde (si since absent) : 1h
const WORLD_TTL_HOURS = 1;

function hoursAgo(h: number): Date {
  const d = new Date();
  d.setHours(d.getHours() - h);
  return d;
}

function isWorldBbox(b: [number, number, number, number]): boolean {
  // Tolérance (bbox peut être légèrement différente selon clamps / bounds)
  const [minLng, minLat, maxLng, maxLat] = b;
  return minLng <= -179 && maxLng >= 179 && minLat <= -70 && maxLat >= 70;
}

function isPointGeometry(v: unknown): v is Point {
  if (!v || typeof v !== 'object') return false;
  const g = v as { type?: unknown; coordinates?: unknown };
  if (g.type !== 'Point') return false;
  if (!Array.isArray(g.coordinates) || g.coordinates.length < 2) return false;
  const [lng, lat] = g.coordinates;
  return typeof lng === 'number' && Number.isFinite(lng) && typeof lat === 'number' && Number.isFinite(lat);
}

function normalizeLocation(v: unknown): Point | null {
  // DB renvoie jsonb: {type:"Point",coordinates:[lng,lat]}
  if (isPointGeometry(v)) return v;
  // certains clients peuvent parser jsonb différemment -> tentative soft
  if (v && typeof v === 'object') {
    const o = v as { type?: unknown; coordinates?: unknown };
    if (o.type === 'Point' && Array.isArray(o.coordinates) && o.coordinates.length >= 2) {
      const [lng, lat] = o.coordinates as unknown[];
      if (typeof lng === 'number' && Number.isFinite(lng) && typeof lat === 'number' && Number.isFinite(lat)) {
        return { type: 'Point', coordinates: [lng, lat] };
      }
    }
  }
  return null;
}

function toFeature(row: {
  id: string;
  title: string | null;
  emotion: string | null;
  created_at: string;
  city: string | null;
  country: string | null;
  location: Point;
}): EchoMapFeature {
  return {
    type: 'Feature',
    geometry: row.location,
    properties: {
      id: row.id,
      title: row.title,
      emotion: row.emotion,
      created_at: row.created_at,
      city: row.city,
      country: row.country,
    },
  };
}

function clamp(n: number, min: number, max: number): number {
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

function normalizeBbox(bbox: [number, number, number, number]): Array<[number, number, number, number]> {
  let [minLng, minLat, maxLng, maxLat] = bbox;

  minLat = clamp(minLat, -85, 85);
  maxLat = clamp(maxLat, -85, 85);

  minLng = clamp(minLng, -180, 180);
  maxLng = clamp(maxLng, -180, 180);

  if (minLat > maxLat) [minLat, maxLat] = [maxLat, minLat];

  // split anti-méridien
  if (minLng > maxLng) {
    return [
      [minLng, minLat, 180, maxLat],
      [-180, minLat, maxLng, maxLat],
    ];
  }

  return [[minLng, minLat, maxLng, maxLat]];
}

function safeId(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

function asMessage(err: unknown): string {
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message?: unknown }).message === 'string') {
    return String((err as { message?: unknown }).message);
  }
  return 'RPC get_echoes_in_bbox failed';
}

type RpcCall = (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;

async function fetchViaRpc(params: {
  bbox: [number, number, number, number];
  emotion?: string;
  since?: Date;
  limit?: number;
}): Promise<RpcEchoRow[]> {
  const rpc = (supabase.rpc as unknown) as RpcCall;

  /**
   * IMPORTANT: tu as 2 fonctions SQL avec le même nom.
   * On essaye d’abord la signature "bbox jsonb" (Version A),
   * puis fallback vers "params séparés" (Version B).
   */

  // A) get_echoes_in_bbox(bbox jsonb, emotion, since, limit_rows)
  const first = await rpc('get_echoes_in_bbox', {
    bbox: params.bbox, // array -> jsonb côté PostgREST
    emotion: params.emotion ?? null,
    since: params.since?.toISOString() ?? null,
    limit_rows: params.limit ?? LIMIT,
  });

  if (!first.error && Array.isArray(first.data)) {
    return first.data as RpcEchoRowA[];
  }

  // B) get_echoes_in_bbox(min_lng, min_lat, max_lng, max_lat, lim, emotion_filter, since_ts)
  const second = await rpc('get_echoes_in_bbox', {
    min_lng: params.bbox[0],
    min_lat: params.bbox[1],
    max_lng: params.bbox[2],
    max_lat: params.bbox[3],
    lim: params.limit ?? LIMIT,
    emotion_filter: params.emotion ?? null,
    since_ts: params.since?.toISOString() ?? null,
  });

  if (second.error) {
    throw new Error(asMessage(second.error));
  }

  if (!Array.isArray(second.data)) return [];
  return second.data as RpcEchoRowB[];
}

function rowsToFeatures(rows: RpcEchoRow[]): EchoMapFeature[] {
  const seen = new Set<string>();

  const features: EchoMapFeature[] = [];
  for (const r of rows) {
    const id = safeId((r as { id?: unknown }).id);
    if (!id) continue;
    if (seen.has(id)) continue;
    seen.add(id);

    const loc = normalizeLocation((r as { location?: unknown }).location);
    if (!loc) continue;

    const title = 'title' in r ? (r.title ?? null) : null;

    features.push(
      toFeature({
        id,
        title,
        emotion: (r as { emotion: string | null }).emotion,
        created_at: (r as { created_at: string }).created_at,
        city: (r as { city: string | null }).city,
        country: (r as { country: string | null }).country,
        location: loc,
      })
    );
  }

  return features;
}

async function fetchWorldFallback(params: { emotion?: string; since?: Date }): Promise<EchoMapFeatureCollection> {
  const effectiveSince = params.since ?? hoursAgo(WORLD_TTL_HOURS);

  const rows = await fetchViaRpc({
    bbox: WORLD_BBOX,
    emotion: params.emotion,
    since: effectiveSince,
    limit: LIMIT,
  });

  return { type: 'FeatureCollection', features: rowsToFeatures(rows) };
}

export async function getEchoesForMap(params: {
  bbox?: [number, number, number, number];
  emotion?: string;
  since?: Date;
}): Promise<EchoMapFeatureCollection> {
  // TTL monde si bbox monde + since absent
  const shouldApplyWorldTTL = Boolean(params.bbox && isWorldBbox(params.bbox) && !params.since);
  const effectiveSince = shouldApplyWorldTTL ? hoursAgo(WORLD_TTL_HOURS) : params.since;

  const baseFilters = { emotion: params.emotion, since: effectiveSince };

  if (!params.bbox) {
    // pas de bbox => monde : TTL par défaut
    return await fetchWorldFallback({ emotion: params.emotion, since: effectiveSince });
  }

  const boxes = normalizeBbox(params.bbox);

  try {
    const collected: RpcEchoRow[] = [];
    const perBoxLimit = Math.max(1, Math.floor(LIMIT / boxes.length));

    for (const b of boxes) {
      const rows = await fetchViaRpc({
        bbox: b,
        emotion: params.emotion,
        since: effectiveSince,
        limit: perBoxLimit,
      });
      for (const r of rows) collected.push(r);
    }

    const features = rowsToFeatures(collected);

    if (features.length === 0) return await fetchWorldFallback(baseFilters);
    return { type: 'FeatureCollection', features };
  } catch {
    return await fetchWorldFallback(baseFilters);
  }
}
