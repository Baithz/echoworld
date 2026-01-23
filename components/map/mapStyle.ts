/**
 * =============================================================================
 * Fichier      : components/map/mapStyle.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-23)
 * Objet        : Constantes MapLibre côté composants (style + palette émotions)
 * -----------------------------------------------------------------------------
 * Description  :
 * - MAP_STYLE_URL (override via NEXT_PUBLIC_MAP_STYLE_URL)
 * - EMOTION_COLORS (palette utilisée par layers + glow)
 * =============================================================================
 */

export const MAP_STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? 'https://demotiles.maplibre.org/globe.json';

export const EMOTION_COLORS = {
  joy: '#FFD54F',
  sadness: '#64B5F6',
  anger: '#E57373',
  fear: '#9575CD',
  love: '#F06292',
  hope: '#81C784',
  default: '#90A4AE',
} as const;

export type EmotionKey = Exclude<keyof typeof EMOTION_COLORS, 'default'>;
