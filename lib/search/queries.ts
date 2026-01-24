// =============================================================================
// Fichier      : lib/search/queries.ts
// Auteur       : Régis KREMER (Baithz) — EchoWorld
// Version      : 1.2.0 (2026-01-24)
// Objet        : Requêtes Supabase (client) pour recherche globale
// Notes        : SAFE: si table/colonne indispo -> fail soft (retourne [])
// -----------------------------------------------------------------------------
// CHANGELOG
// 1.2.0 (2026-01-24)
// - [FIX] CRITICAL: Suppression de searchTopics (table topics n'existe pas en BDD)
// - [FIX] Normalisation handle cohérente avec getProfile.ts (lowercase uniquement)
// - [IMPROVED] Stratégie de recherche utilisateurs simplifiée (exact lowercase)
// - [KEEP] searchEchoes inchangé
// =============================================================================

import { supabase } from '@/lib/supabase/client';
import type { SearchEchoResult, SearchUserResult } from '@/lib/search/types';

type ProfileSearchRow = {
  id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type EchoSearchRow = {
  id: string;
  title: string | null;
  content: string | null;
  visibility: 'world' | 'local' | 'private' | 'semi_anonymous' | string | null;
};

function safePreview(text: string, max = 120): string {
  const clean = (text ?? '').trim().replace(/\s+/g, ' ');
  if (!clean) return '…';
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

/**
 * Normalise le terme de recherche (suppression du @ initial si présent)
 */
function normalizeTerm(input: string): string {
  const t = (input ?? '').trim();
  if (!t) return '';
  // Si l'utilisateur tape "@handle", on recherche sur "handle" sans @
  return t.startsWith('@') ? t.slice(1).trim() : t;
}

/**
 * Normalise un handle pour l'URL /u/[handle]
 * Cohérent avec lib/profile/getProfile.ts
 */
function normalizeHandleForUrl(input: string | null): string | null {
  const raw = (input ?? '').trim().replace(/^@/, '').trim();
  if (!raw) return null;
  return raw
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 32);
}

function escapeOrValue(input: string): string {
  return input.trim();
}

function buildOrIlike(fields: string[], q: string): string {
  const safe = escapeOrValue(q);
  return fields.map((f) => `${f}.ilike.%${safe}%`).join(',');
}

// -----------------------------------------------------------------------------
// Recherche utilisateurs
// -----------------------------------------------------------------------------
export async function searchUsers(term: string, limit = 5): Promise<SearchUserResult[]> {
  const normalized = normalizeTerm(term);
  const q = escapeOrValue(normalized);
  if (!q) return [];

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, handle, display_name, avatar_url')
      // Filtre explicite sur profils publics uniquement
      .eq('public_profile_enabled', true)
      // OR: handle ILIKE OR display_name ILIKE
      .or(buildOrIlike(['handle', 'display_name'], q))
      .limit(limit);

    if (error || !data) return [];

    const rows = data as unknown as ProfileSearchRow[];

    // Tri local de pertinence :
    // 1) handle exact (lowercase)
    // 2) display_name exact
    // 3) handle commence par
    // 4) display_name commence par
    // 5) reste
    const qLower = q.toLowerCase();
    const score = (r: ProfileSearchRow): number => {
      const h = (r.handle ?? '').toLowerCase();
      const d = (r.display_name ?? '').toLowerCase();

      if (h === qLower && qLower) return 100;
      if (d === qLower && qLower) return 90;
      if (h.startsWith(qLower) && qLower) return 80;
      if (d.startsWith(qLower) && qLower) return 70;
      if (h.includes(qLower) && qLower) return 60;
      if (d.includes(qLower) && qLower) return 50;
      return 0;
    };

    return rows
      .slice()
      .sort((a, b) => score(b) - score(a))
      .slice(0, limit)
      .map((r) => {
        const normalizedHandle = normalizeHandleForUrl(r.handle);

        return {
          type: 'user' as const,
          id: String(r.id),
          handle: normalizedHandle,
          avatar_url: r.avatar_url ?? null,
          // Si pas de display_name, on montre @handle (si dispo) plutôt que "User"
          label: (r.display_name ??
            (normalizedHandle ? `@${normalizedHandle}` : 'User')) as string,
        };
      });
  } catch {
    return [];
  }
}

// -----------------------------------------------------------------------------
// Recherche échos
// -----------------------------------------------------------------------------
export async function searchEchoes(term: string, limit = 5): Promise<SearchEchoResult[]> {
  const q = escapeOrValue(normalizeTerm(term));
  if (!q) return [];

  try {
    const { data, error } = await supabase
      .from('echoes')
      .select('id, title, content, visibility')
      .in('visibility', ['world', 'local'])
      .or(buildOrIlike(['title', 'content'], q))
      .limit(limit);

    if (error || !data) return [];

    const rows = data as unknown as EchoSearchRow[];

    return rows.map((r) => ({
      type: 'echo' as const,
      id: String(r.id),
      label: (r.title ?? 'Echo') as string,
      preview: safePreview(r.content ?? ''),
    }));
  } catch {
    return [];
  }
}

// -----------------------------------------------------------------------------
// Recherche topics / tags
// NOTE: La table 'topics' n'existe pas dans le schéma actuel.
// Cette fonction est désactivée pour éviter les erreurs 404.
// Si vous souhaitez activer la recherche par tags, créez d'abord la table
// dans Supabase ou utilisez une vue basée sur les colonnes theme_tags/emotion_tags.
// -----------------------------------------------------------------------------
export async function searchTopics(): Promise<never[]> {
  // DÉSACTIVÉ: table topics inexistante
  // Retourne un tableau vide pour éviter l'erreur PGRST205
  return [];
}