/**
 * =============================================================================
 * Fichier      : components/map/mapStyle.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.3.2 (2026-01-23)
 * Objet        : Styles MapLibre (globe + détail) + palette émotions
 * -----------------------------------------------------------------------------
 * Description  :
 * - STYLE_GLOBE_URL : Satellite pur (rendu Terre réaliste au dézoom)
 * - STYLE_DETAIL_URL: Hybrid (routes/labels/bâtiments au zoom)
 * - Override global : NEXT_PUBLIC_MAP_STYLE_URL (prioritaire)
 * - Overrides fins : NEXT_PUBLIC_MAP_STYLE_GLOBE_URL / NEXT_PUBLIC_MAP_STYLE_DETAIL_URL (optionnels)
 * - Clé MapTiler : NEXT_PUBLIC_MAPTILER_KEY si fournie, sinon fallback local (temporaire)
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.3.2 (2026-01-23)
 * - [CLEAN] Guards env consolidés + fallback URL safe (évite undefined/vide)
 * - [NEW] Export MAP_STYLE_ENV (debug optionnel, pas utilisé => zéro impact)
 * - [KEEP] Priorités/exports identiques (zéro régression)
 * =============================================================================
 */

const FALLBACK_MAPTILER_KEY = '8w5FOB1MYt3pBuhiSiVd';

function envStr(v: string | undefined): string | undefined {
  const s = (v ?? '').trim();
  return s.length > 0 ? s : undefined;
}

function safeUrl(u: string): string {
  // garde-fou : si jamais une URL se retrouve vide (ou "undefined"), on évite de casser MapLibre
  const s = (u ?? '').trim();
  return s.length > 0 ? s : 'about:blank';
}

// Clé via env si dispo (Next expose uniquement les NEXT_PUBLIC_*)
const MAPTILER_KEY = envStr(process.env.NEXT_PUBLIC_MAPTILER_KEY) ?? FALLBACK_MAPTILER_KEY;

// Override global (prioritaire) : force un seul style partout (comportement inchangé)
const OVERRIDE_STYLE_ALL = envStr(process.env.NEXT_PUBLIC_MAP_STYLE_URL);

// Overrides fins (optionnels) : permettent d’avoir globe/détail distincts
// sans casser l’override global.
const OVERRIDE_STYLE_GLOBE = envStr(process.env.NEXT_PUBLIC_MAP_STYLE_GLOBE_URL);
const OVERRIDE_STYLE_DETAIL = envStr(process.env.NEXT_PUBLIC_MAP_STYLE_DETAIL_URL);

// URLs MapTiler par défaut
const DEFAULT_GLOBE_URL = `https://api.maptiler.com/maps/satellite/style.json?key=${MAPTILER_KEY}`;
const DEFAULT_DETAIL_URL = `https://api.maptiler.com/maps/hybrid/style.json?key=${MAPTILER_KEY}`;

// Debug optionnel (ne change rien si non consommé)
export const MAP_STYLE_ENV = {
  MAPTILER_KEY: MAPTILER_KEY === FALLBACK_MAPTILER_KEY ? 'fallback' : 'env',
  OVERRIDE_STYLE_ALL,
  OVERRIDE_STYLE_GLOBE,
  OVERRIDE_STYLE_DETAIL,
} as const;

// Globe réaliste (vue Terre)
export const STYLE_GLOBE_URL = safeUrl(OVERRIDE_STYLE_ALL ?? OVERRIDE_STYLE_GLOBE ?? DEFAULT_GLOBE_URL);

// Détail (routes/labels/bâtiments)
export const STYLE_DETAIL_URL = safeUrl(OVERRIDE_STYLE_ALL ?? OVERRIDE_STYLE_DETAIL ?? DEFAULT_DETAIL_URL);

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
