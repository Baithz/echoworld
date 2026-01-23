/**
 * =============================================================================
 * Fichier      : components/map/mapStyle.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.3.0 (2026-01-23)
 * Objet        : Styles MapLibre (globe réaliste + détail) + palette émotions
 * -----------------------------------------------------------------------------
 * Description  :
 * - STYLE_GLOBE_URL : globe Terre réaliste (satellite + terrain 3D + atmosphère)
 * - STYLE_DETAIL_URL : détail zoom (routes/bâtiments) via MapTiler Hybrid
 * - Priorité : NEXT_PUBLIC_MAP_STYLE_URL override détail si fourni
 * - EMOTION_COLORS : palette pour layers + glow
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.3.0 (2026-01-23)
 * - [NEW] STYLE_GLOBE_URL = globe réaliste Esri satellite + AWS terrain (gratuit)
 * - [IMPROVED] Meilleur rendu global/dézoom sans cartoon basique
 * - [KEEP] STYLE_DETAIL_URL MapTiler Hybrid + override env
 * - [KEEP] EMOTION_COLORS et compat layers échos
 * 1.2.0 (2026-01-23)
 * - [NEW] STYLE_GLOBE_URL + STYLE_DETAIL_URL (swap auto possible)
 * - [IMPROVED] Clé MapTiler intégrée (Hybrid)
 * =============================================================================
 */
export const STYLE_GLOBE_URL =
  'https://raw.githubusercontent.com/baithz/echoworld-assets/main/styles/globe-realistic-esri-aws.json';  
  // Ou héberge ton propre JSON (recommandé en prod). Alternative inline possible si tu préfères.

const MAPTILER_KEY = '8w5FOB1MYt3pBuhiSiVd'; // NOTE: en prod → NEXT_PUBLIC_MAPTILER_KEY

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