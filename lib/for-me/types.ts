// =============================================================================
// Fichier      : lib/for-me/types.ts
// Auteur       : Régis KREMER (Baithz) — EchoWorld
// Version      : 1.0.0 (2026-01-22)
// Description  : Types "Pour moi" (feed + items)
// =============================================================================

export type ForMeFeedItemKind = 'resonance' | 'fresh' | 'nearby' | 'topic';

export type ForMeFeedItem = {
  id: string;
  kind: ForMeFeedItemKind;
  title: string;
  excerpt: string;
  meta: string;
  score?: number;
  echoId?: string;
  topic?: string;
};

export type ForMeFeed = {
  resonance: ForMeFeedItem[];
  fresh: ForMeFeedItem[];
  topics: { id: string; label: string }[];
  debug?: {
    usedTags: string[];
  };
};
