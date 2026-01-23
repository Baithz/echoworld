/**
 * =============================================================================
 * Fichier      : lib/echo/getEchoesForMap.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.2.1 (2026-01-23)
 * Objet        : Service GeoJSON pour carte EchoMap (RPC bbox + fallback simple)
 * -----------------------------------------------------------------------------
 * Description  :
 * - getEchoesForMap(params) => FeatureCollection<Point>
 * - RPC get_echoes_in_bbox si bbox fourni (perf)
 * - Normalisation bbox (antiméridien + clamp) avant RPC
 * - Fallback : select direct echoes (limit 600) + filtres (emotion/since)
 * - Fallback aussi si RPC renvoie vide (assure visibilité monde)
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.2.1 (2026-01-23)
 * - [CLEAN] Errors: normalisation error -> Error (logs/stack exploitables)
 * - [IMPROVED] Limite globale stable sur split antiméridien (évite 2x600 visibles)
 * - [IMPROVED] Fallback: resilient guards + casts minimisés (zéro any)
 * - [KEEP] Comportement identique (RPC prioritaire + fallback si vide/KO)
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
  title: string | null;
  content?: string | null;
  emotion: string | null;
  created_at: string;
  city: string | null;
  country: string | null;
  location: Point; // RPC renvoie ST_AsGeoJSON(...)::jsonb => GeoJSON Point
};

// Fallback (table echoes) - location déjà renvoyée par PostgREST en GeoJSON-like
type EchoRow = {
  id: string;
  title: string | null;
  emotion: string | null;
  created_at: string;
  city: string | null;
  country: string | null;
  location: Point | null;
};

const LIMIT = 600;

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

  // clamp latitude (évite valeurs hors [-85..85] si projection/bounds exotiques)
  minLat = clamp(minLat, -85, 85);
  maxLat = clamp(maxLat, -85, 85);

  // clamp longitude dans [-180..180]
  minLng = clamp(minLng, -180, 180);
  maxLng = clamp(maxLng, -180, 180);

  // si bbox inversée en lat (rare mais possible), swap
  if (minLat > maxLat) [minLat, maxLat] = [maxLat, minLat];

  // antiméridien : ex west=170, east=-170 => split en 2
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
  // Supabase renvoie parfois un objet { message } ou un string
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

async function fetchFallback(params: { emotion?: string; since?: Date }): Promise<EchoMapFeatureCollection> {
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
  // RPC bbox (prioritaire)
  if (params.bbox) {
    const boxes = normalizeBbox(params.bbox);

    // Contournement TS2345 : si ton client supabase n'est pas généric typé,
    // rpc() peut être typé avec args: undefined. On cast localement sans impacter le reste.
    const rpc = (supabase.rpc as unknown) as (
      fn: string,
      args?: Record<string, unknown>
    ) => Promise<{ data: RpcEchoRow[] | null; error: unknown | null }>;

    try {
      const collected: RpcEchoRow[] = [];

      // split antiméridien => on répartit la limite pour éviter 2xLIMIT visibles
      const perBoxLimit = Math.max(1, Math.floor(LIMIT / boxes.length));

      for (const [minLng, minLat, maxLng, maxLat] of boxes) {
        const { data, error } = await rpc('get_echoes_in_bbox', {
          min_lng: minLng,
          min_lat: minLat,
          max_lng: maxLng,
          max_lat: maxLat,
          lim: perBoxLimit,
          emotion_filter: params.emotion ?? null,
          since_ts: params.since?.toISOString() ?? null,
        });

        if (error) throw asError(error);
        for (const row of data ?? []) collected.push(row);
      }

      // Dédup par id (utile si split antiméridien ou chevauchement)
      const seen = new Set<string>();
      const rows = collected.filter((r) => {
        const id = safeId(r?.id);
        if (!id) return false;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });

      const features = rows
        .filter((r) => isPointGeometry(r.location))
        .map((r) =>
          toFeature({
            id: r.id,
            title: r.title,
            emotion: r.emotion,
            created_at: r.created_at,
            city: r.city,
            country: r.country,
            location: r.location,
          })
        );

      // IMPORTANT : si RPC renvoie vide (monde) => fallback pour garantir visibilité
      if (features.length === 0) {
        return await fetchFallback({ emotion: params.emotion, since: params.since });
      }

      return { type: 'FeatureCollection', features };
    } catch (e: unknown) {
      // RPC KO => fallback (mêmes filtres)
      void asError(e); // normalise sans bruit (utile si tu ajoutes un logger plus tard)
      return await fetchFallback({ emotion: params.emotion, since: params.since });
    }
  }

  // fallback simple (avec filtres cohérents)
  return await fetchFallback({ emotion: params.emotion, since: params.since });
}
