/**
 * =============================================================================
 * Fichier      : lib/echo/getEchoesAggregatedByCountry.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.3 (2026-01-24)
 * Objet        : Service pour récupérer les échos agrégés par pays (vue globe)
 * -----------------------------------------------------------------------------
 * Description  :
 * - Appelle la RPC get_echoes_aggregated_by_country
 * - Fusionne les résultats avec les centroids statiques
 * - Retourne un tableau prêt pour affichage sur la carte
 * - Filtre les pays sans centroid connu
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.0.3 (2026-01-24)
 * - [FIX] Utilise @ts-expect-error pour RPC non typée (TS2345)
 * - [NOTE] RPC custom pas dans database.types.ts généré par Supabase
 * 
 * 1.0.2 (2026-01-24)
 * - [FIX] Typage RPC correct sans cast complexe (TS2352)
 * - [IMPROVED] Utilise approche standard Supabase avec assertion de type
 * 
 * 1.0.1 (2026-01-24)
 * - [FIX] Typage RPC strict avec cast (évite erreur TS2345)
 * - [FIX] Gestion d'erreur améliorée (return [] au lieu de throw)
 * 
 * 1.0.0 (2026-01-24)
 * - [NEW] Service d'agrégation par pays
 * - [NEW] Fusion automatique avec centroids
 * - [NEW] Calcul des pourcentages d'émotions
 * =============================================================================
 */

import { supabase } from '@/lib/supabase/client';
import { getCountryCentroid, hasCountryCentroid } from '@/lib/geo/countryCentroids';
import type { EmotionKeyDB } from '@/components/map/mapStyle';

/**
 * Compteurs d'émotions pour un pays
 */
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

/**
 * Pourcentages d'émotions (0-100)
 */
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

/**
 * Agrégation d'échos pour un pays
 */
export type CountryAggregation = {
  country: string;
  centroid: [number, number]; // [lng, lat]
  totalCount: number;
  emotionCounts: EmotionCounts;
  emotionPercentages: EmotionPercentages;
  dominantEmotion: EmotionKeyDB;
};

/**
 * Row retournée par la RPC (typage strict)
 */
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

/**
 * Calcule les pourcentages d'émotions
 */
function calculatePercentages(counts: EmotionCounts, total: number): EmotionPercentages {
  if (total === 0) {
    return {
      joy: 0,
      hope: 0,
      love: 0,
      resilience: 0,
      gratitude: 0,
      courage: 0,
      peace: 0,
      wonder: 0,
    };
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

/**
 * Trouve l'émotion dominante (max count)
 */
function findDominantEmotion(counts: EmotionCounts): EmotionKeyDB {
  const entries = Object.entries(counts) as [EmotionKeyDB, number][];
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  return sorted[0][0];
}

/**
 * Récupère les échos agrégés par pays
 */
export async function getEchoesAggregatedByCountry(params: {
  bbox: [number, number, number, number];
  emotion?: string;
  since?: Date;
}): Promise<CountryAggregation[]> {
  const { bbox, emotion, since } = params;

  // Prépare les paramètres RPC
  const bboxJson = {
    minLng: bbox[0],
    minLat: bbox[1],
    maxLng: bbox[2],
    maxLat: bbox[3],
  };

  try {
    // @ts-expect-error - RPC custom non typée dans database.types.ts
    // Cette fonction existe en DB mais n'est pas dans les types générés
    const response = await supabase.rpc('get_echoes_aggregated_by_country', {
      bbox: bboxJson,
      emotion_filter: emotion ?? null,
      since_ts: since?.toISOString() ?? null,
    });

    const { data, error } = response;

    if (error) {
      console.error('Error fetching country aggregations:', error);
      return []; // Return empty array instead of throw (plus graceful)
    }

    if (!data || !Array.isArray(data)) {
      return [];
    }

    // Assertion de type après validation
    const rows = data as unknown as RpcRow[];

    // Transforme les rows en CountryAggregation
    const aggregations: CountryAggregation[] = [];

    for (const row of rows) {
      const country = row.country;

      // Filtre les pays sans centroid
      if (!hasCountryCentroid(country)) {
        console.warn(`Country "${country}" has no centroid, skipping`);
        continue;
      }

      const centroid = getCountryCentroid(country);
      if (!centroid) continue;

      const totalCount = Number(row.total_count);

      const emotionCounts: EmotionCounts = {
        joy: Number(row.emotion_joy),
        hope: Number(row.emotion_hope),
        love: Number(row.emotion_love),
        resilience: Number(row.emotion_resilience),
        gratitude: Number(row.emotion_gratitude),
        courage: Number(row.emotion_courage),
        peace: Number(row.emotion_peace),
        wonder: Number(row.emotion_wonder),
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
    return []; // Return empty array instead of throw
  }
}