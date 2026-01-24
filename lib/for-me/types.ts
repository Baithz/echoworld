// =============================================================================
// Fichier      : lib/for-me/types.ts
// Auteur       : Régis KREMER (Baithz) — EchoWorld
// Version      : 1.1.0 (2026-01-24)
// Description  : Types "Pour moi" (feed + items)
// -----------------------------------------------------------------------------
// CHANGELOG
// 1.1.0 (2026-01-24)
// - [PHASE1] Ajout champs optionnels pour aligner le contrat Echo (media + viewer meta) sans régression
// - [KEEP] Contrat existant inchangé : title/excerpt/meta/echoId/... restent identiques
// =============================================================================

export type ForMeFeedItemKind = 'resonance' | 'fresh' | 'nearby' | 'topic';

export type ForMeViewerMeta = {
  like_count?: number;
  liked_by_me?: boolean;

  // Réactions officielles (future source: echo_reactions)
  reactions_count?: Partial<Record<'understand' | 'support' | 'reflect', number>>;
  reactions_by_me?: Partial<Record<'understand' | 'support' | 'reflect', boolean>>;

  comments_count?: number;
  mirrored_by_me?: boolean;

  // Capabilités UI
  can_dm?: boolean;
};

export type ForMeFeedItem = {
  id: string;
  kind: ForMeFeedItemKind;
  title: string;
  excerpt: string;
  meta: string;
  score?: number;
  echoId?: string;
  topic?: string;

  /**
   * Champs optionnels (Phase 1) — alignement “post écho”
   * NOTE: non utilisés par ForMeView v1.0.0 => zéro régression
   */
  created_at?: string | null;
  city?: string | null;
  country?: string | null;

  // Médias (même logique que partout: toujours tableau, même si vide)
  image_urls?: string[];

  // Métas viewer (likes / reactions / comments / mirror / canDM)
  viewer?: ForMeViewerMeta;
};

export type ForMeFeed = {
  resonance: ForMeFeedItem[];
  fresh: ForMeFeedItem[];
  topics: { id: string; label: string }[];
  debug?: {
    usedTags: string[];
  };
};
