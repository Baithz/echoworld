/**
 * =============================================================================
 * Fichier      : components/map/echoLayers.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.2.1 (2026-01-23)
 * Objet        : Définition des layers MapLibre (clusters + points + heat)
 * -----------------------------------------------------------------------------
 * Description  :
 * - SOURCE_ID dédié aux échos
 * - CLUSTER_LAYER (cercle) + CLUSTER_COUNT_LAYER (label)
 * - POINT_LAYER avec palettes émotionnelles
 * - HEAT_LAYER pour densité globale (zoom monde)
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.2.1 (2026-01-23)
 * - [CLEAN] Helper asExpression() (évite casts répétés, typage stable MapLibre)
 * - [IMPROVED] Exports d’IDs (optionnels) pour éviter strings dupliquées (sans casse)
 * - [KEEP] Valeurs visuelles identiques + IDs/layers inchangés (zéro régression)
 * =============================================================================
 */

import type {
  CircleLayerSpecification,
  HeatmapLayerSpecification,
  SymbolLayerSpecification,
  ExpressionSpecification,
} from 'maplibre-gl';

import { EMOTION_COLORS } from './mapStyle';

export const SOURCE_ID = 'echoes';

// IDs layers (optionnels, n’impacte pas l’intégration existante)
export const LAYER_ID_CLUSTERS = 'clusters';
export const LAYER_ID_CLUSTER_COUNT = 'cluster-count';
export const LAYER_ID_POINT = 'echo-point';
export const LAYER_ID_HEAT = 'echo-heat';

// MapLibre typings varient selon versions : helper pour stabiliser ExpressionSpecification.
function asExpression(v: unknown): ExpressionSpecification {
  return v as ExpressionSpecification;
}

function buildEmotionMatchExpression(): ExpressionSpecification {
  return asExpression([
    'match',
    ['get', 'emotion'],
    'joy',
    EMOTION_COLORS.joy,
    'sadness',
    EMOTION_COLORS.sadness,
    'anger',
    EMOTION_COLORS.anger,
    'fear',
    EMOTION_COLORS.fear,
    'love',
    EMOTION_COLORS.love,
    'hope',
    EMOTION_COLORS.hope,
    EMOTION_COLORS.default,
  ]);
}

export const CLUSTER_LAYER: CircleLayerSpecification = {
  id: LAYER_ID_CLUSTERS,
  type: 'circle',
  source: SOURCE_ID,
  filter: ['has', 'point_count'],
  paint: {
    // rendu plus "premium" sans changer l'identité
    'circle-color': '#5C6BC0',
    'circle-radius': ['step', ['get', 'point_count'], 18, 10, 24, 30, 28, 60, 34],
    'circle-opacity': ['interpolate', ['linear'], ['zoom'], 1.2, 0.62, 4.5, 0.56, 8, 0.52],
    'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 1.2, 1, 6, 1.2, 10, 1.4],
    'circle-stroke-color': 'rgba(255,255,255,0.55)',
  },
};

export const CLUSTER_COUNT_LAYER: SymbolLayerSpecification = {
  id: LAYER_ID_CLUSTER_COUNT,
  type: 'symbol',
  source: SOURCE_ID,
  filter: ['has', 'point_count'],
  layout: {
    'text-field': '{point_count_abbreviated}',
    'text-size': ['interpolate', ['linear'], ['zoom'], 1.2, 12, 6, 12, 10, 13],
    'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
  },
  paint: {
    'text-color': '#fff',
    // halo = lisible sur satellite
    'text-halo-color': 'rgba(0,0,0,0.55)',
    'text-halo-width': 1.25,
    'text-halo-blur': 0.4,
  },
};

export const POINT_LAYER: CircleLayerSpecification = {
  id: LAYER_ID_POINT,
  type: 'circle',
  source: SOURCE_ID,
  filter: ['!', ['has', 'point_count']],
  paint: {
    // identique dans l'esprit, mais plus lisible "globe"
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 1.2, 4, 3, 6, 5, 7, 9, 9, 12, 10],
    'circle-color': buildEmotionMatchExpression(),
    'circle-opacity': ['interpolate', ['linear'], ['zoom'], 1.2, 0.98, 5, 0.88, 10, 0.92],
    'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 1.2, 0.6, 5, 1, 10, 1.2],
    'circle-stroke-color': 'rgba(255,255,255,0.92)',
  },
};

export const HEAT_LAYER: HeatmapLayerSpecification = {
  id: LAYER_ID_HEAT,
  type: 'heatmap',
  source: SOURCE_ID,
  // heat = monde (le maxzoom reste identique pour ne pas casser le swap + pulse)
  maxzoom: 5,
  paint: {
    // plus “organique” au monde, extinction progressive (au lieu d’un cut)
    'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 1.2, 1.25, 3.5, 1.05, 4.8, 0.85, 5, 0.0],
    'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 1.2, 74, 3.8, 52, 4.8, 36, 5, 24],
    'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 1.2, 0.62, 3.8, 0.42, 4.8, 0.28, 5, 0.0],
  },
};
