/**
 * =============================================================================
 * Fichier      : lib/echo/getEchoesForMap.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.3.0 (2026-01-23)
 * Objet        : Service GeoJSON pour carte EchoMap (RPC bbox + fallback robuste)
 * -----------------------------------------------------------------------------
 * Description  :
 * - getEchoesForMap(params) => FeatureCollection<Point>
 * - RPC public.get_echoes_in_bbox(bbox jsonb, emotion text, since timestamptz, limit_rows int)
 * - Normalisation bbox (antiméridien + clamp) avant RPC
 * - Fallback : RPC "WORLD_BBOX" si bbox absent / RPC renvoie vide / bbox KO
 * - Ultime fallback : select direct echoes (best-effort) (si RPC indisponible)
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.3.0 (2026-01-23)
 * - [FIX] Alignement strict sur la nouvelle RPC get_echoes_in_bbox(bbox jsonb, emotion, since, limit_rows)
 * - [FIX] location geography désormais toujours renvoyée en GeoJSON via RPC (plus de dépendance PostgREST)
 * - [IMPROVED] Fallback robuste : WORLD_BBOX via RPC (garantit des points visibles)
 * - [KEEP] Normalisation bbox + split antiméridien + dédup + zéro any
 * =============================================================================
 */

import { supabase } from '@/lib/supabase/client';
import type { Feature, FeatureCollection, Point } from 'geojson';

export type EchoMapProps = {
  id: string;
  title: string | null; // non renvoyé par RPC -> null ici (détails via getEchoById)
  emotion: string | null;
  created_at: string;
  city: string | null;
  country: string | null;
};

export type EchoMapFeature = Feature<Point, EchoMapProps>;
export type EchoMapFeatureCollection = FeatureCollection<Point, EchoMapProps>;

// RPC (retour SQL)
type RpcEchoRow = {
  id: string;
  emotion: string | null;
  created_at: string;
  city: string | null;
  country: string | null;
  location: unknown; // ST_AsGeoJSON(...)::jsonb => objet GeoJSON (à valider)
};

// Ultime fallback PostgREST (best-effort)
type EchoRow = {
  id: string;
  title: string | null;
  emotion: string | null;
  created_at: string;
  city: string | null;
  country: string | null;
  location: unknown | null;
};

const LIMIT = 600;

// "Vue monde" (fallback) : bornes sûres pour éviter singularités
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

async function rpcFetch(params: {
  bbox: [number, number, number, number];
  emotion?: string;
  since?: Date;
  limit: number;
}): Promise<RpcEchoRow[]> {
  const boxes = normalizeBbox(params.bbox);

  // Supabase client non typé => cast local strict
  const rpc = (supabase.rpc as unknown) as (
    fn: string,
    args?: Record<string, unknown>
  ) => Promise<{ data: RpcEchoRow[] | null; error: unknown | null }>;

  const collected: RpcEchoRow[] = [];
  const perBoxLimit = Math.max(1, Math.floor(params.limit / boxes.length));

  for (const [minLng, minLat, maxLng, maxLat] of boxes) {
    const bboxJson = [minLng, minLat, maxLng, maxLat];

    const { data, error } = await rpc('get_echoes_in_bbox', {
      bbox: bboxJson,
      emotion: params.emotion ?? null,
      since: params.since ? params.since.toISOString() : null,
      limit_rows: perBoxLimit,
    });

    if (error) throw asError(error);
    for (const row of data ?? []) collected.push(row);
  }

  // Dédup par id (antiméridien / chevauchement)
  const seen = new Set<string>();
  return collected.filter((r) => {
    const id = safeId(r?.id);
    if (!id) return false;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

async function fetchFallbackViaRpc(params: { emotion?: string; since?: Date }): Promise<EchoMapFeatureCollection> {
  const rows = await rpcFetch({ bbox: WORLD_BBOX, emotion: params.emotion, since: params.since, limit: LIMIT });

  const features = rows
    .filter((r) => isPointGeometry(r.location))
    .map((r) =>
      toFeature({
        id: r.id,
        title: null,
        emotion: r.emotion,
        created_at: r.created_at,
        city: r.city,
        country: r.country,
        location: r.location as Point,
      })
    );

  return { type: 'FeatureCollection', features };
}

/**
 * Ultime fallback PostgREST (best-effort)
 * NOTE: geography peut ne PAS être renvoyé en GeoJSON => features potentiellement vides.
 * Utilisé uniquement si RPC indisponible.
 */
async function fetchFallbackPostgrest(params: { emotion?: string; since?: Date }): Promise<EchoMapFeatureCollection> {
  let q = supabase
    .from('echoes')
    .select('id,title,emotion,created_at,city,country,location')
    .eq('status', 'published');

  if (params.emotion) q = q.eq('emotion', params.emotion);
  if (params.since) q = q.gte('created_at', params.since.toISOString());

  const { data, error } = await q.order('created_at', { ascending: false }).limit(LIMIT);
  if (error) throw asError(error);

  const rows = (data ?? []) as unknown as EchoRow[];

  return {
    type: 'FeatureCollection',
    features: rows
      .filter((r) => isPointGeometry(r.location))
      .map((r) =>
        toFeature({
          id: r.id,
          title: r.title,
          emotion: r.emotion,
          created_at: r.created_at,
          city: r.city,
          country: r.country,
          location: r.location as Point,
        })
      ),
  };
}

export async function getEchoesForMap(params: {
  bbox?: [number, number, number, number];
  emotion?: string;
  since?: Date;
}): Promise<EchoMapFeatureCollection> {
  // 1) RPC bbox (prioritaire)
  if (params.bbox) {
    try {
      const rows = await rpcFetch({ bbox: params.bbox, emotion: params.emotion, since: params.since, limit: LIMIT });

      const features = rows
        .filter((r) => isPointGeometry(r.location))
        .map((r) =>
          toFeature({
            id: r.id,
            title: null,
            emotion: r.emotion,
            created_at: r.created_at,
            city: r.city,
            country: r.country,
            location: r.location as Point,
          })
        );

      // 2) Si RPC bbox renvoie vide => fallback WORLD via RPC (garantit visibilité)
      if (features.length === 0) {
        return await fetchFallbackViaRpc({ emotion: params.emotion, since: params.since });
      }

      return { type: 'FeatureCollection', features };
    } catch {
      // 3) RPC bbox KO => fallback WORLD via RPC
      try {
        return await fetchFallbackViaRpc({ emotion: params.emotion, since: params.since });
      } catch {
        // 4) RPC indisponible => dernier recours PostgREST
        return await fetchFallbackPostgrest({ emotion: params.emotion, since: params.since });
      }
    }
  }

  // Pas de bbox : fallback WORLD via RPC
  try {
    return await fetchFallbackViaRpc({ emotion: params.emotion, since: params.since });
  } catch {
    // dernier recours PostgREST
    return await fetchFallbackPostgrest({ emotion: params.emotion, since: params.since });
  }
}
