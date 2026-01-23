/**
 * =============================================================================
 * Fichier      : components/map/mapStyle.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.2.0 (2026-01-23)
 * Objet        : Styles MapLibre (globe + détail) + palette émotions
 * -----------------------------------------------------------------------------
 * Description  :
 * - STYLE_GLOBE_URL : rendu globe “Terre” au dézoom (projection globe côté MapLibre)
 * - STYLE_DETAIL_URL : rendu détail (routes/bâtiments) via MapTiler Hybrid
 * - Priorité : NEXT_PUBLIC_MAP_STYLE_URL (si fourni) override le style détail
 * - EMOTION_COLORS : palette utilisée par layers + glow
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.2.0 (2026-01-23)
 * - [NEW] STYLE_GLOBE_URL + STYLE_DETAIL_URL (swap auto possible)
 * - [IMPROVED] Clé MapTiler intégrée (Hybrid)
 * - [KEEP] Compat NEXT_PUBLIC_MAP_STYLE_URL (prioritaire sur détail)
 * =============================================================================
 */

export const STYLE_GLOBE_URL =
  'https://demotiles.maplibre.org/globe.json';

// NOTE: recommandé en prod = env NEXT_PUBLIC_MAPTILER_KEY.
// Ici, clé intégrée car tu n’es pas en local.
const MAPTILER_KEY = '8w5FOB1MYt3pBuhiSiVd';

export const STYLE_DETAIL_URL =
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
