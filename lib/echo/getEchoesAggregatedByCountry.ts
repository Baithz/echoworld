/**
 * =============================================================================
 * Fichier      : lib/echo/getEchoesAggregatedByCountry.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.4 (2026-01-27)
 * Objet        : Service pour récupérer les échos agrégés par pays (vue globe)
 * -----------------------------------------------------------------------------
 * Description  :
 * - Appelle la RPC get_echoes_aggregated_by_country
 * - SAFE: tente bbox array puis bbox object (compat signatures existantes)
 * - Fusionne avec centroids statiques (countryCentroids) pour l’affichage
 * - Retourne un tableau prêt pour carte (dominant emotion + %)
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.0.4 (2026-01-27)
 * - [FIX] Compat RPC bbox: essaie d’abord bbox=[minLng,minLat,maxLng,maxLat], sinon bboxJson
 * - [KEEP] API publique inchangée (params/return), centroids statiques conservés
 * =============================================================================
 */

import { supabase } from '@/lib/supabase/client';
import { getCountryCentroid, hasCountryCentroid } from '@/lib/geo/countryCentroids';
import type { EmotionKeyDB } from '@/components/map/mapStyle';

export type EmotionCounts = {
  joy: number;
  hope: number;
  love: number;
  resilience: number;
  gratitude: number;
  courage: number;
  peace: number;
  wonder: number;
};

export type EmotionPercentages = {
  joy: number;
  hope: number;
  love: number;
  resilience: number;
  gratitude: number;
  courage: number;
  peace: number;
  wonder: number;
};

export type CountryAggregation = {
  country: string;
  centroid: [number, number];
  totalCount: number;
  emotionCounts: EmotionCounts;
  emotionPercentages: EmotionPercentages;
  dominantEmotion: EmotionKeyDB;
};

type RpcRow = {
  country: string;
  total_count: number;
  emotion_joy: number;
  emotion_hope: number;
  emotion_love: number;
  emotion_resilience: number;
  emotion_gratitude: number;
  emotion_courage: number;
  emotion_peace: number;
  emotion_wonder: number;
};

function calculatePercentages(counts: EmotionCounts, total: number): EmotionPercentages {
  if (total === 0) {
    return { joy: 0, hope: 0, love: 0, resilience: 0, gratitude: 0, courage: 0, peace: 0, wonder: 0 };
  }
  return {
    joy: Math.round((counts.joy / total) * 100),
    hope: Math.round((counts.hope / total) * 100),
    love: Math.round((counts.love / total) * 100),
    resilience: Math.round((counts.resilience / total) * 100),
    gratitude: Math.round((counts.gratitude / total) * 100),
    courage: Math.round((counts.courage / total) * 100),
    peace: Math.round((counts.peace / total) * 100),
    wonder: Math.round((counts.wonder / total) * 100),
  };
}

function findDominantEmotion(counts: EmotionCounts): EmotionKeyDB {
  const entries = Object.entries(counts) as [EmotionKeyDB, number][];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

type RpcCall = (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;

export async function getEchoesAggregatedByCountry(params: {
  bbox: [number, number, number, number];
  emotion?: string;
  since?: Date;
}): Promise<CountryAggregation[]> {
  const { bbox, emotion, since } = params;

  const bboxJson = { minLng: bbox[0], minLat: bbox[1], maxLng: bbox[2], maxLat: bbox[3] };

  try {
    const rpc = (supabase.rpc as unknown) as RpcCall;

    // 1) Signature préférée: bbox array (cohérente avec get_echoes_in_bbox)
    const first = await rpc('get_echoes_aggregated_by_country', {
      bbox, // <-- array
      emotion_filter: emotion ?? null,
      since_ts: since?.toISOString() ?? null,
    });

    // 2) Compat legacy: bbox object
    const second =
      first.error != null
        ? await rpc('get_echoes_aggregated_by_country', {
            bbox: bboxJson,
            emotion_filter: emotion ?? null,
            since_ts: since?.toISOString() ?? null,
          })
        : first;

    if (second.error) {
      console.error('Error fetching country aggregations:', second.error);
      return [];
    }

    const data = second.data;
    if (!data || !Array.isArray(data)) return [];

    const rows = data as RpcRow[];

    const aggregations: CountryAggregation[] = [];
    for (const row of rows) {
      const country = row.country;

      if (!hasCountryCentroid(country)) {
        // INFO uniquement (pas warn pour éviter bruit)
        continue;
      }

      const centroid = getCountryCentroid(country);
      if (!centroid) continue;

      const totalCount = Number(row.total_count) || 0;
      const emotionCounts: EmotionCounts = {
        joy: Number(row.emotion_joy) || 0,
        hope: Number(row.emotion_hope) || 0,
        love: Number(row.emotion_love) || 0,
        resilience: Number(row.emotion_resilience) || 0,
        gratitude: Number(row.emotion_gratitude) || 0,
        courage: Number(row.emotion_courage) || 0,
        peace: Number(row.emotion_peace) || 0,
        wonder: Number(row.emotion_wonder) || 0,
      };

      const emotionPercentages = calculatePercentages(emotionCounts, totalCount);
      const dominantEmotion = findDominantEmotion(emotionCounts);

      aggregations.push({
        country,
        centroid,
        totalCount,
        emotionCounts,
        emotionPercentages,
        dominantEmotion,
      });
    }

    return aggregations;
  } catch (error) {
    console.error('Error in getEchoesAggregatedByCountry:', error);
    return [];
  }
}
