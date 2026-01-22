// =============================================================================
// Fichier      : lib/for-me/feed.ts
// Auteur       : Régis KREMER (Baithz) — EchoWorld
// Version      : 1.0.0 (2026-01-22)
// Description  : Algorithme MVP "Pour moi" (résonance) — Supabase client
// Notes        : FAIL-SOFT : si table/colonne absente -> fallback propre
// =============================================================================

import { supabase } from '@/lib/supabase/client';
import type { ForMeFeed, ForMeFeedItem } from '@/lib/for-me/types';

function safeText(text: unknown, max = 180): string {
  const clean = String(text ?? '').trim().replace(/\s+/g, ' ');
  if (!clean) return '…';
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function safeTitle(v: unknown): string {
  const s = String(v ?? '').trim();
  return s || 'Echo';
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

type EchoRow = {
  id: string | number;
  title?: string | null;
  content?: string | null;
  visibility?: string | null;
  created_at?: string | null;
};

type TagRow = { tag?: unknown };
type ReactionRow = { echo_id?: unknown };

async function fetchUserInteractionEchoIds(userId: string, limit = 80): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('echo_reactions')
      .select('echo_id')
      .eq('user_id', userId)
      .in('reaction', ['like', 'mirror'])
      .limit(limit);

    if (error || !data) return [];
    return uniq(
      data
        .map((r: ReactionRow) => String(r.echo_id ?? '').trim())
        .filter((id) => id.length > 0)
    );
  } catch {
    return [];
  }
}

async function fetchTagsForEchoIds(echoIds: string[], limit = 40): Promise<string[]> {
  if (echoIds.length === 0) return [];

  try {
    const { data, error } = await supabase
      .from('echo_tags')
      .select('tag, echo_id')
      .in('echo_id', echoIds)
      .limit(Math.max(limit, 200));

    if (error || !data) return [];

    const tags = (data as Array<TagRow & { echo_id?: unknown }>)
      .map((r) => String(r.tag ?? '').trim())
      .filter(Boolean);

    return uniq(tags).slice(0, limit);
  } catch {
    return [];
  }
}

async function fetchResonantEchoesByTags(
  tags: string[],
  excludeEchoIds: string[],
  limit = 12
): Promise<Array<EchoRow & { score?: number }>> {
  if (tags.length === 0) return [];

  // MVP score : nombre de tags matchés (via table echo_tags)
  // Requête en 2 temps fail-soft:
  // 1) récupérer echo_id qui matchent tags
  // 2) récupérer les echoes correspondants
  try {
    const { data: tagHits, error: errHits } = await supabase
      .from('echo_tags')
      .select('echo_id, tag')
      .in('tag', tags)
      .limit(800);

    if (errHits || !tagHits) return [];

    const hitMap = new Map<string, number>();
    for (const h of tagHits as Array<{ echo_id?: unknown; tag?: unknown }>) {
      const id = String(h.echo_id ?? '').trim();
      if (!id) continue;
      if (excludeEchoIds.includes(id)) continue;
      hitMap.set(id, (hitMap.get(id) ?? 0) + 1);
    }

    const sorted = Array.from(hitMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    const ids = sorted.map(([id]) => id);
    if (ids.length === 0) return [];

    const { data: echoes, error: errEchoes } = await supabase
      .from('echoes')
      .select('id, title, content, visibility, created_at')
      .in('id', ids)
      .in('visibility', ['world', 'local'])
      .limit(limit);

    if (errEchoes || !echoes) return [];

    const scoreById = new Map(sorted);
    return (echoes as EchoRow[]).map((e) => ({
      ...e,
      score: scoreById.get(String(e.id)) ?? 0,
    }));
  } catch {
    return [];
  }
}

async function fetchFreshEchoes(excludeEchoIds: string[], limit = 10): Promise<EchoRow[]> {
  try {
    const q = supabase
      .from('echoes')
      .select('id, title, content, visibility, created_at')
      .in('visibility', ['world', 'local'])
      .order('created_at', { ascending: false })
      .limit(limit + excludeEchoIds.length);

    const { data, error } = await q;
    if (error || !data) return [];

    const rows = (data as EchoRow[]).filter((e) => !excludeEchoIds.includes(String(e.id)));
    return rows.slice(0, limit);
  } catch {
    return [];
  }
}

export async function getForMeFeed(userId: string): Promise<ForMeFeed> {
  // 1) interactions -> echoIds
  const interacted = await fetchUserInteractionEchoIds(userId);

  // 2) tags dérivés
  const tags = await fetchTagsForEchoIds(interacted);

  // 3) résonance : echoes match tags (exclure interacted)
  const resonantRows = await fetchResonantEchoesByTags(tags, interacted, 10);

  const resonance: ForMeFeedItem[] = resonantRows.map((e) => ({
    id: `res-${String(e.id)}`,
    kind: 'resonance',
    title: safeTitle(e.title),
    excerpt: safeText(e.content),
    meta: e.score && e.score > 1 ? `Match tags: ${e.score}` : 'Match',
    score: e.score ?? 0,
    echoId: String(e.id),
  }));

  // 4) fresh fallback
  const freshRows = await fetchFreshEchoes(interacted, 8);
  const fresh: ForMeFeedItem[] = freshRows.map((e) => ({
    id: `fresh-${String(e.id)}`,
    kind: 'fresh',
    title: safeTitle(e.title),
    excerpt: safeText(e.content),
    meta: 'Nouveau',
    echoId: String(e.id),
  }));

  // 5) topics à afficher (simple: top tags)
  const topics = tags.slice(0, 12).map((t) => ({ id: t, label: t }));

  return {
    resonance,
    fresh,
    topics,
    debug: { usedTags: tags },
  };
}
