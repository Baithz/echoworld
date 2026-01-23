/**
 * =============================================================================
 * Fichier      : components/map/mapStyle.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.2.0 (2026-01-23)
 * Objet        : Styles MapLibre (globe + détail) + palette émotions
 * -----------------------------------------------------------------------------
 * Description  :
 * - STYLE_GLOBE_URL : Satellite pur (rendu Terre réaliste au dézoom)
 * - STYLE_DETAIL_URL: Hybrid (routes/labels/bâtiments au zoom)
 * - NEXT_PUBLIC_MAP_STYLE_URL reste prioritaire si défini (override global)
 * - Clé MapTiler intégrée (temporaire) pour usage non-local
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.2.0 (2026-01-23)
 * - [NEW] STYLE_GLOBE_URL (MapTiler Satellite)
 * - [NEW] STYLE_DETAIL_URL (MapTiler Hybrid)
 * - [KEEP] Override via NEXT_PUBLIC_MAP_STYLE_URL (prioritaire)
 * =============================================================================
 */

// IMPORTANT : à terme, remettre la clé en env (NEXT_PUBLIC_MAPTILER_KEY).
const MAPTILER_KEY = '8w5FOB1MYt3pBuhiSiVd';

const OVERRIDE_STYLE = process.env.NEXT_PUBLIC_MAP_STYLE_URL;

// Globe réaliste (vue Terre)
export const STYLE_GLOBE_URL =
  OVERRIDE_STYLE ?? `https://api.maptiler.com/maps/satellite/style.json?key=${MAPTILER_KEY}`;

// Détail (routes/labels/bâtiments)
export const STYLE_DETAIL_URL =
  OVERRIDE_STYLE ?? `https://api.maptiler.com/maps/hybrid/style.json?key=${MAPTILER_KEY}`;

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
