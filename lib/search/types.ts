// =============================================================================
// Fichier      : lib/search/types.ts
// Auteur       : Régis KREMER (Baithz) — EchoWorld
// Version      : 1.1.0 (2026-01-23)
// Objet        : Types unifiés pour la recherche globale (users / echoes / topics)
// ----------------------------------------------------------------------------
// Description  :
// - Contrats partagés entre:
//   • lib/search/queries.ts (mappers Supabase -> résultats)
//   • components/search/* (UI & navigation)
// - Les types restent volontaires “minimaux” pour garder la recherche rapide.
// - Toute extension doit préserver la compat ascendante (pas de breaking change).
// ----------------------------------------------------------------------------
// Notes SAFE :
// - label: valeur affichée (fallbacks gérés côté mapper)
// - preview: extrait safe (fallback '…')
// =============================================================================

export type SearchUserResult = {
  type: 'user';
  id: string;
  label: string; // display_name ou handle (fallback déjà normalisé côté queries)
  handle: string | null;
  avatar_url: string | null;
};

export type SearchEchoResult = {
  type: 'echo';
  id: string;
  label: string; // title fallback
  preview: string; // extrait content
};

export type SearchTopicResult = {
  type: 'topic';
  id: string; // tag
  label: string; // tag
};

export type SearchResult = SearchUserResult | SearchEchoResult | SearchTopicResult;

export type SearchResultsBundle = {
  users: SearchUserResult[];
  echoes: SearchEchoResult[];
  topics: SearchTopicResult[];
  all: SearchResult[]; // concat trié (utilisé pour Enter = 1er résultat)
};
