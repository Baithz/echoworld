/**
 * =============================================================================
 * Fichier      : lib/echo/getEchoesForMap.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.3.1 (2026-01-24)
 * Objet        : Service GeoJSON pour carte EchoMap (RPC bbox + fallback monde)
 * -----------------------------------------------------------------------------
 * Description  :
 * - getEchoesForMap(params) => FeatureCollection<Point>
 * - RPC get_echoes_in_bbox(bbox jsonb, emotion text, since timestamptz, lim int)
 * - Normalisation bbox (antiméridien + clamp) avant RPC
 * - Fallback : si bbox vide/KO/retour vide => RPC monde (assure visibilité)
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.3.1 (2026-01-24)
 * - [FIX] Aligne réellement l'appel RPC sur la signature (bbox, emotion, since, lim)
 * - [SAFE] Fallback compat si la RPC attend encore (emotion_filter, since_ts)
 * - [KEEP] Limite + split antiméridien + dédup + filtres emotion/since + fallback monde
 * 1.3.0 (2026-01-23)
 * - [FIX] Aligne l'appel RPC sur la signature réelle (bbox jsonb) => échos visibles
 * - [IMPROVED] Fallback robuste via RPC monde (plus de select geography non-GeoJSON)
 * - [KEEP] Limite + split antiméridien + dédup + filtres emotion/since
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

// Ligne RPC (retour SQL)
type RpcEchoRow = {
  id: string;
  title?: string | null;
  emotion: string | null;
  created_at: string;
  city: string | null;
  country: string | null;
  location: Point; // JSON GeoJSON Point
};

const LIMIT = 600;

// fallback monde (même format que WORLD_BBOX dans EchoMap)
const WORLD_BBOX: [number, number, number, number] = [-179.9, -80, 179.9, 80];

function isPointGeometry(v: unknown): v is Point {
  if (!v || typeof v !== 'object') return false;
  const g = v as { type?: unknown; coordinates?: unknown };
  if (g.type !== 'Point') return false;
  if (!Array.isArray(g.coordinates) || g.coordinates.length < 2) return false;
  const [lng, lat] = g.coordinates;
  return typeof lng === 'number' && Number.isFinite(lng) && typeof lat === 'number' && Number.isFinite(lat);
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

/**
 * Normalise bbox :
 * - clamp lat/lng dans bornes WGS84
 * - gère l'antiméridien (west > east) en retournant 2 bboxes à requêter
 */
function normalizeBbox(bbox: [number, number, number, number]): Array<[number, number, number, number]> {
  let [minLng, minLat, maxLng, maxLat] = bbox;

  minLat = clamp(minLat, -85, 85);
  maxLat = clamp(maxLat, -85, 85);

  minLng = clamp(minLng, -180, 180);
  maxLng = clamp(maxLng, -180, 180);

  if (minLat > maxLat) [minLat, maxLat] = [maxLat, minLat];

  if (minLng > maxLng) {
    return [
      [minLng, minLat, 180, maxLat],
      [-180, minLat, maxLng, maxLat],
    ];
  }

  return [[minLng, minLat, maxLng, maxLat]];
}

function asError(e: unknown): Error {
  if (e instanceof Error) return e;
  const msg =
    typeof e === 'string'
      ? e
      : typeof e === 'object' && e && 'message' in e && typeof (e as { message?: unknown }).message === 'string'
        ? String((e as { message?: unknown }).message)
        : 'Unknown error';
  return new Error(msg);
}

function safeId(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

type RpcCall = (
  fn: string,
  args?: Record<string, unknown>
) => Promise<{ data: RpcEchoRow[] | null; error: unknown | null }>;

/**
 * Appel RPC aligné sur ta signature SQL:
 *   get_echoes_in_bbox(bbox jsonb, emotion text, since timestamptz, lim int)
 *
 * SAFE:
 * - tente d'abord (bbox, emotion, since, lim)
 * - fallback compat si la RPC attend encore (emotion_filter, since_ts)
 */
async function fetchViaRpc(params: {
  bbox: [number, number, number, number];
  emotion?: string;
  since?: Date;
  limit?: number;
}): Promise<RpcEchoRow[]> {
  const rpc = (supabase.rpc as unknown) as RpcCall;

  const argsOfficial = {
    bbox: params.bbox, // jsonb bbox
    emotion: params.emotion ?? null,
    since: params.since?.toISOString() ?? null,
    lim: params.limit ?? LIMIT,
  };

  const first = await rpc('get_echoes_in_bbox', argsOfficial);
  if (!first.error) return (first.data ?? []) as RpcEchoRow[];

  const argsCompat = {
    bbox: params.bbox, // jsonb bbox
    emotion_filter: params.emotion ?? null,
    since_ts: params.since?.toISOString() ?? null,
    lim: params.limit ?? LIMIT,
  };

  const second = await rpc('get_echoes_in_bbox', argsCompat);
  if (second.error) throw asError(second.error);

  return (second.data ?? []) as RpcEchoRow[];
}

async function fetchWorldFallback(params: { emotion?: string; since?: Date }): Promise<EchoMapFeatureCollection> {
  const rows = await fetchViaRpc({
    bbox: WORLD_BBOX,
    emotion: params.emotion,
    since: params.since,
    limit: LIMIT,
  });

  const seen = new Set<string>();
  const features = rows
    .filter((r) => {
      const id = safeId(r?.id);
      if (!id) return false;
      if (seen.has(id)) return false;
      seen.add(id);
      return isPointGeometry(r.location);
    })
    .map((r) =>
      toFeature({
        id: r.id,
        title: (r.title ?? null) as string | null,
        emotion: r.emotion,
        created_at: r.created_at,
        city: r.city,
        country: r.country,
        location: r.location,
      })
    );

  return { type: 'FeatureCollection', features };
}

export async function getEchoesForMap(params: {
  bbox?: [number, number, number, number];
  emotion?: string;
  since?: Date;
}): Promise<EchoMapFeatureCollection> {
  const baseFilters = { emotion: params.emotion, since: params.since };

  // Sans bbox -> fallback monde via RPC (pas de select geography)
  if (!params.bbox) {
    return await fetchWorldFallback(baseFilters);
  }

  const boxes = normalizeBbox(params.bbox);

  try {
    const collected: RpcEchoRow[] = [];
    const perBoxLimit = Math.max(1, Math.floor(LIMIT / boxes.length));

    for (const b of boxes) {
      const rows = await fetchViaRpc({
        bbox: b,
        emotion: params.emotion,
        since: params.since,
        limit: perBoxLimit,
      });
      for (const r of rows) collected.push(r);
    }

    // Dédup par id + garde uniquement les vrais Points
    const seen = new Set<string>();
    const features = collected
      .filter((r) => {
        const id = safeId(r?.id);
        if (!id) return false;
        if (seen.has(id)) return false;
        seen.add(id);
        return isPointGeometry(r.location);
      })
      .map((r) =>
        toFeature({
          id: r.id,
          title: (r.title ?? null) as string | null,
          emotion: r.emotion,
          created_at: r.created_at,
          city: r.city,
          country: r.country,
          location: r.location,
        })
      );

    // Si bbox renvoie vide (zoom monde / zone vide) -> fallback monde
    if (features.length === 0) {
      return await fetchWorldFallback(baseFilters);
    }

    return { type: 'FeatureCollection', features };
  } catch {
    // RPC KO -> fallback monde
    return await fetchWorldFallback(baseFilters);
  }
}
