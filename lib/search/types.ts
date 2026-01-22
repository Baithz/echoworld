// =============================================================================
// Fichier      : lib/search/types.ts
// Auteur       : Régis KREMER (Baithz) — EchoWorld
// Version      : 1.0.0 (2026-01-22)
// Objet        : Types unifiés pour la recherche globale (users / echoes / topics)
// =============================================================================

export type SearchUserResult = {
  type: 'user';
  id: string;
  label: string; // display_name ou handle
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
  all: SearchResult[];
};
