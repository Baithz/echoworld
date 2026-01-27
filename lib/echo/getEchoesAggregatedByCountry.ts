/**
 * =============================================================================
 * Fichier      : lib/echo/getEchoesAggregatedByCountry.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.5 (2026-01-27)
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
 * 1.0.5 (2026-01-27)
 * - [FIX] findDominantEmotion: fallback "joy" si counts vides/NaN (évite crash entries[0])
 * - [FIX] Normalise total_count à la somme des émotions si total_count manquant/incohérent
 * - [IMPROVED] Tri dominantEmotion stable (tie-break alphabétique) pour rendu déterministe
 * - [KEEP] RPC compat bbox array/object + centroids statiques conservés
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

function n(v: unknown): number {
  const x = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(x) ? x : 0;
}

function calculatePercentages(counts: EmotionCounts, total: number): EmotionPercentages {
  if (total <= 0) {
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

function sumCounts(c: EmotionCounts): number {
  return c.joy + c.hope + c.love + c.resilience + c.gratitude + c.courage + c.peace + c.wonder;
}

function findDominantEmotion(counts: EmotionCounts): EmotionKeyDB {
  const entries = Object.entries(counts) as [EmotionKeyDB, number][];
  // Tri stable: desc par count, puis asc par key (déterministe)
  entries.sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]));
  const top = entries[0];
  if (!top) return 'joy';
  // si tous à 0 => fallback
  if (top[1] <= 0) return 'joy';
  return top[0];
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

    // 1) Signature préférée: bbox array
    const first = await rpc('get_echoes_aggregated_by_country', {
      bbox,
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

    if (!Array.isArray(second.data)) return [];

    const rows = second.data as RpcRow[];

    const aggregations: CountryAggregation[] = [];

    for (const row of rows) {
      const country = String(row.country ?? '').trim();
      if (!country) continue;

      if (!hasCountryCentroid(country)) {
        // silence: on ignore ceux qu’on ne sait pas placer
        continue;
      }

      const centroid = getCountryCentroid(country);
      if (!centroid) continue;

      const emotionCounts: EmotionCounts = {
        joy: n(row.emotion_joy),
        hope: n(row.emotion_hope),
        love: n(row.emotion_love),
        resilience: n(row.emotion_resilience),
        gratitude: n(row.emotion_gratitude),
        courage: n(row.emotion_courage),
        peace: n(row.emotion_peace),
        wonder: n(row.emotion_wonder),
      };

      const sum = sumCounts(emotionCounts);
      const reportedTotal = n(row.total_count);

      // total fiable: si RPC ne renvoie pas total ou renvoie 0 alors que sum>0, on prend sum
      const totalCount = reportedTotal > 0 ? reportedTotal : sum;

      // si totalCount 0 => skip (rien à afficher)
      if (totalCount <= 0) continue;

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
