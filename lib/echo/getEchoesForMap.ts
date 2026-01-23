/**
 * =============================================================================
 * Fichier      : lib/echo/getEchoesForMap.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.1.0 (2026-01-23)
 * Objet        : Service GeoJSON pour carte EchoMap (RPC bbox + fallback simple)
 * -----------------------------------------------------------------------------
 * Description  :
 * - getEchoesForMap(params) => FeatureCollection<Point>
 * - RPC get_echoes_in_bbox si bbox fourni (perf)
 * - Fallback : select direct echoes (limit 600) + filtres (emotion/since)
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.1.0 (2026-01-23)
 * - [IMPROVED] Fallback applique aussi emotion + since (cohérence RPC)
 * - [IMPROVED] order(created_at desc) + limit ajustée
 * - [CLEAN] Guards GeoJSON Point stricts + typage inchangé, zéro any
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

export async function getEchoesForMap(params: {
  bbox?: [number, number, number, number];
  emotion?: string;
  since?: Date;
}): Promise<EchoMapFeatureCollection> {
  // RPC bbox (prioritaire)
  if (params.bbox) {
    const [minLng, minLat, maxLng, maxLat] = params.bbox;

    // Contournement TS2345 : si ton client supabase n'est pas généric typé,
    // rpc() peut être typé avec args: undefined. On cast localement sans impacter le reste.
    const rpc = (supabase.rpc as unknown) as (
      fn: string,
      args?: Record<string, unknown>
    ) => Promise<{ data: RpcEchoRow[] | null; error: unknown | null }>;

    const { data, error } = await rpc('get_echoes_in_bbox', {
      min_lng: minLng,
      min_lat: minLat,
      max_lng: maxLng,
      max_lat: maxLat,
      lim: 600,
      emotion_filter: params.emotion ?? null,
      since_ts: params.since?.toISOString() ?? null,
    });

    if (error) throw error;
    const rows = data ?? [];

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
            location: r.location,
          })
        ),
    };
  }

  // fallback simple (avec filtres cohérents)
  let q = supabase
    .from('echoes')
    .select('id,title,emotion,created_at,city,country,location')
    .eq('status', 'published');

  if (params.emotion) {
    q = q.eq('emotion', params.emotion);
  }

  if (params.since) {
    q = q.gte('created_at', params.since.toISOString());
  }

  const { data, error } = await q.order('created_at', { ascending: false }).limit(600);

  if (error) throw error;

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
