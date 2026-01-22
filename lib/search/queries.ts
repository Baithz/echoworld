// =============================================================================
// Fichier      : lib/search/queries.ts
// Auteur       : Régis KREMER (Baithz) — EchoWorld
// Version      : 1.0.1 (2026-01-22)
// Objet        : Requêtes Supabase (client) pour recherche globale
// Notes        : SAFE: si table/colonne indispo -> fail soft (retourne [])
// =============================================================================

import { supabase } from '@/lib/supabase/client';
import type { SearchEchoResult, SearchTopicResult, SearchUserResult } from '@/lib/search/types';

type ProfileSearchRow = {
  id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  public_profile_enabled: boolean | null;
};

type EchoSearchRow = {
  id: string;
  title: string | null;
  content: string | null;
  visibility: 'world' | 'local' | 'private' | 'semi_anonymous' | string | null;
};

type EchoTagRow = { tag: string | null };
type TopicRow = { name: string | null };

function safePreview(text: string, max = 120): string {
  const clean = (text ?? '').trim().replace(/\s+/g, ' ');
  if (!clean) return '…';
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function escapeOrValue(input: string): string {
  // Supabase .or() attend une string ; on évite les virgules/parenthèses accidentelles
  // (on garde simple : trim, pas d’échappement exotique ici).
  return input.trim();
}

export async function searchUsers(term: string, limit = 5): Promise<SearchUserResult[]> {
  const q = escapeOrValue(term);
  if (!q) return [];

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, handle, display_name, avatar_url, public_profile_enabled')
      .eq('public_profile_enabled', true)
      // OR: handle ILIKE OR display_name ILIKE
      .or(`handle.ilike.%${q}%,display_name.ilike.%${q}%`)
      .limit(limit);

    if (error || !data) return [];

    const rows = data as unknown as ProfileSearchRow[];

    return rows.map((r) => ({
      type: 'user' as const,
      id: String(r.id),
      handle: r.handle ?? null,
      avatar_url: r.avatar_url ?? null,
      label: (r.display_name ?? r.handle ?? 'User') as string,
    }));
  } catch {
    return [];
  }
}

export async function searchEchoes(term: string, limit = 5): Promise<SearchEchoResult[]> {
  const q = escapeOrValue(term);
  if (!q) return [];

  // Table/colonnes supposées: echoes(id, title, content, visibility)
  // Visibilité: world/local uniquement pour la recherche globale (safe).
  try {
    const { data, error } = await supabase
      .from('echoes')
      .select('id, title, content, visibility')
      .in('visibility', ['world', 'local'])
      .or(`title.ilike.%${q}%,content.ilike.%${q}%`)
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

export async function searchTopics(term: string, limit = 5): Promise<SearchTopicResult[]> {
  const q = escapeOrValue(term);
  if (!q) return [];

  // Option A: table "echo_tags" (tag)
  // Option B: view/table "topics" (name)
  // => on tente echo_tags puis fallback topics, fail-soft.
  try {
    const { data, error } = await supabase
      .from('echo_tags')
      .select('tag')
      .ilike('tag', `%${q}%`)
      .limit(limit);

    if (!error && data) {
      const rows = data as unknown as EchoTagRow[];
      const uniq = new Set<string>();

      rows.forEach((r) => {
        const t = String(r.tag ?? '').trim();
        if (t) uniq.add(t);
      });

      return Array.from(uniq)
        .slice(0, limit)
        .map((t) => ({ type: 'topic' as const, id: t, label: t }));
    }
  } catch {
    // ignore
  }

  try {
    const { data, error } = await supabase
      .from('topics')
      .select('name')
      .ilike('name', `%${q}%`)
      .limit(limit);

    if (error || !data) return [];

    const rows = data as unknown as TopicRow[];
    const uniq = new Set<string>();

    rows.forEach((r) => {
      const t = String(r.name ?? '').trim();
      if (t) uniq.add(t);
    });

    return Array.from(uniq)
      .slice(0, limit)
      .map((t) => ({ type: 'topic' as const, id: t, label: t }));
  } catch {
    return [];
  }
}
