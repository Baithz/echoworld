/**
 * =============================================================================
 * Fichier      : components/globe/globeTypes.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0
 * Objet        : Types stricts pour GlobeView
 * =============================================================================
 */

import type { EmotionKey } from '@/components/map/mapStyle';

export type GlobeFilters = {
  emotion: EmotionKey | null;
  since: '24h' | '7d' | null;
  nearMe: boolean;
};

export type GlobeEchoPoint = {
  id: string;
  lat: number;
  lng: number;
  emotion: EmotionKey;
};
