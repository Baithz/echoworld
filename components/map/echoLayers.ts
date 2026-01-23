/**
 * =============================================================================
 * Fichier      : components/map/echoLayers.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.1.1 (2026-01-23)
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
 * 1.1.1 (2026-01-23)
 * - [FIX] Import palette: mapStyle (chemin réel dans components/map)
 * - [KEEP] IDs/layers inchangés (clusters / cluster-count / echo-point / echo-heat)
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

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function buildEmotionMatchExpression(): ExpressionSpecification {
  // Construction explicite (stable) pour éviter flat/Object.entries + soucis typing.
  return [
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
  ] as unknown as ExpressionSpecification;
}

// -----------------------------------------------------------------------------
// Layers
// -----------------------------------------------------------------------------

export const CLUSTER_LAYER: CircleLayerSpecification = {
  id: 'clusters',
  type: 'circle',
  source: SOURCE_ID,
  filter: ['has', 'point_count'],
  paint: {
    'circle-color': '#5C6BC0',
    'circle-radius': [
      'step',
      ['get', 'point_count'],
      18, // <= 10
      10,
      24, // <= 50
      50,
      30, // > 50
    ],
    'circle-opacity': 0.6,
  },
};

export const CLUSTER_COUNT_LAYER: SymbolLayerSpecification = {
  id: 'cluster-count',
  type: 'symbol',
  source: SOURCE_ID,
  filter: ['has', 'point_count'],
  layout: {
    'text-field': '{point_count_abbreviated}',
    'text-size': 12,
  },
  paint: {
    'text-color': '#fff',
  },
};

export const POINT_LAYER: CircleLayerSpecification = {
  id: 'echo-point',
  type: 'circle',
  source: SOURCE_ID,
  filter: ['!', ['has', 'point_count']],
  paint: {
    'circle-radius': 6,
    'circle-color': buildEmotionMatchExpression(),
    'circle-opacity': 0.85,
    'circle-stroke-width': 1,
    'circle-stroke-color': '#fff',
  },
};

export const HEAT_LAYER: HeatmapLayerSpecification = {
  id: 'echo-heat',
  type: 'heatmap',
  source: SOURCE_ID,
  maxzoom: 5,
  paint: {
    'heatmap-intensity': 1,
    'heatmap-radius': 40,
    'heatmap-opacity': 0.4,
  },
};
