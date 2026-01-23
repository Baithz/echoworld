/**
 * =============================================================================
 * Fichier      : components/map/mapStyle.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.1.1 (2026-01-23)
 * Objet        : Constantes MapLibre côté composants (style + palette émotions)
 * -----------------------------------------------------------------------------
 * Description  :
 * - MAP_STYLE_URL (override via NEXT_PUBLIC_MAP_STYLE_URL)
 * - Fallback MapTiler Hybrid (clé intégrée) pour un rendu “Terre” + routes/bâtiments
 * - EMOTION_COLORS (palette utilisée par layers + glow)
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.1.1 (2026-01-23)
 * - [IMPROVED] Clé MapTiler intégrée (fallback Hybrid)
 * - [KEEP] Compat NEXT_PUBLIC_MAP_STYLE_URL (prioritaire)
 * =============================================================================
 */

const MAPTILER_KEY = '8w5FOB1MYt3pBuhiSiVd';

export const MAP_STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ??
  `https://api.maptiler.com/maps/hybrid/style.json?key=${MAPTILER_KEY}`;

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
