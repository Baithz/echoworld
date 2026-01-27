/**
 * =============================================================================
 * Fichier      : lib/echo/getEchoesForMap.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.3.2 (2026-01-27)
 * Objet        : Service GeoJSON pour carte EchoMap (RPC bbox + fallback monde)
 * -----------------------------------------------------------------------------
 * Description  :
 * - getEchoesForMap(params) => FeatureCollection<Point>
 * - SAFE: supporte 2 RPC signatures existantes (bbox jsonb array) OU (params séparés)
 * - Normalisation bbox (antiméridien + clamp)
 * - Fallback monde si bbox KO / vide / RPC error
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.3.2 (2026-01-27)
 * - [FIX] Aligne l’appel RPC sur les 2 signatures réelles en DB (limit_rows / params séparés)
 * - [KEEP] Dédup + split antiméridien + filtres emotion/since + fallback monde
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

type RpcEchoRow = {
  id: string;
  title?: string | null;
  emotion: string | null;
  created_at: string;
  city: string | null;
  country: string | null;
  location: Point; // GeoJSON Point
};

const LIMIT = 600;
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

function safeId(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

type RpcCall = (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;

async function fetchViaRpc(params: {
  bbox: [number, number, number, number];
  emotion?: string;
  since?: Date;
  limit?: number;
}): Promise<RpcEchoRow[]> {
  const rpc = (supabase.rpc as unknown) as RpcCall;

  // 1) Version A: get_echoes_in_bbox(bbox jsonb, emotion, since, limit_rows)
  const first = await rpc('get_echoes_in_bbox', {
    bbox: params.bbox, // array -> jsonb
    emotion: params.emotion ?? null,
    since: params.since?.toISOString() ?? null,
    limit_rows: params.limit ?? LIMIT,
  });

  if (!first.error && Array.isArray(first.data)) return first.data as RpcEchoRow[];

  // 2) Version B: get_echoes_in_bbox(min_lng, min_lat, max_lng, max_lat, lim, emotion_filter, since_ts)
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
    // remonte l’erreur pour fallback monde
    throw new Error(
      typeof second.error === 'object' && second.error && 'message' in second.error
        ? String((second.error as { message?: unknown }).message)
        : 'RPC get_echoes_in_bbox failed'
    );
  }

  return (Array.isArray(second.data) ? (second.data as RpcEchoRow[]) : []) ?? [];
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

    if (features.length === 0) return await fetchWorldFallback(baseFilters);

    return { type: 'FeatureCollection', features };
  } catch {
    return await fetchWorldFallback(baseFilters);
  }
}
