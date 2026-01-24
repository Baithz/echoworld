// =============================================================================
// Fichier      : lib/for-me/feed.ts
// Auteur       : Régis KREMER (Baithz) — EchoWorld
// Version      : 1.1.0 (2026-01-24)
// Description  : Algorithme MVP "Pour moi" (résonance) — Supabase client
// Notes        : FAIL-SOFT : si table/colonne absente -> fallback propre
// -----------------------------------------------------------------------------
// CHANGELOG
// 1.1.0 (2026-01-24)
// - [ALIGN] Interactions: aligne avec la BDD réelle (echo_likes + echo_reactions + echo_mirrors + fallback legacy)
// - [ALIGN] Media: remonte image_urls via echo_media (fallback) + support colonne echoes.image_urls si dispo
// - [SAFE] Zéro régression: contrat ForMeFeed/ForMeFeedItem conservé, fallbacks robustes
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

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string');
}

function normalizeImageUrls(input: unknown): string[] {
  if (isStringArray(input)) return input.map((x) => x.trim()).filter(Boolean);
  return [];
}

type EchoRow = {
  id: string | number;
  title?: string | null;
  content?: string | null;
  visibility?: string | null;
  created_at?: string | null;

  // optionnel : selon schéma / requête
  image_urls?: unknown;
};

type TagRow = { tag?: unknown };
type ReactionRow = { echo_id?: unknown };

async function fetchLikedEchoIds(userId: string, limit = 80): Promise<string[]> {
  try {
    const { data, error } = await supabase.from('echo_likes').select('echo_id').eq('user_id', userId).limit(limit);
    if (error || !data) return [];
    return uniq(
      (data as ReactionRow[])
        .map((r) => String(r.echo_id ?? '').trim())
        .filter((id) => id.length > 0)
    );
  } catch {
    return [];
  }
}

async function fetchReactedEchoIds(userId: string, limit = 120): Promise<string[]> {
  // PHASE 2: table officielle echo_reactions(reaction_type)
  try {
    const { data, error } = await supabase.from('echo_reactions').select('echo_id').eq('user_id', userId).limit(limit);
    if (error || !data) return [];
    return uniq(
      (data as ReactionRow[])
        .map((r) => String(r.echo_id ?? '').trim())
        .filter((id) => id.length > 0)
    );
  } catch {
    return [];
  }
}

async function fetchMirroredEchoIds(userId: string, limit = 80): Promise<string[]> {
  // PHASE 5: mirror = message dans echo_mirrors (from_user_id/to_user_id/echo_id)
  try {
    const ids: string[] = [];

    const { data: sent, error: e1 } = await supabase
      .from('echo_mirrors')
      .select('echo_id')
      .eq('from_user_id', userId)
      .limit(limit);

    if (!e1 && sent) {
      ids.push(
        ...(sent as ReactionRow[])
          .map((r) => String(r.echo_id ?? '').trim())
          .filter((id) => id.length > 0)
      );
    }

    const { data: received, error: e2 } = await supabase
      .from('echo_mirrors')
      .select('echo_id')
      .eq('to_user_id', userId)
      .limit(limit);

    if (!e2 && received) {
      ids.push(
        ...(received as ReactionRow[])
          .map((r) => String(r.echo_id ?? '').trim())
          .filter((id) => id.length > 0)
      );
    }

    return uniq(ids);
  } catch {
    return [];
  }
}

async function fetchLegacyResonanceEchoIds(userId: string, limit = 80): Promise<string[]> {
  // fallback legacy si jamais des données existent encore
  try {
    const { data, error } = await supabase
      .from('echo_resonances')
      .select('echo_id')
      .eq('user_id', userId)
      .limit(limit);

    if (error || !data) return [];
    return uniq(
      (data as ReactionRow[])
        .map((r) => String(r.echo_id ?? '').trim())
        .filter((id) => id.length > 0)
    );
  } catch {
    return [];
  }
}

async function fetchUserInteractionEchoIds(userId: string, limit = 120): Promise<string[]> {
  // Source officielle: likes + reactions + mirrors (+ fallback legacy resonances)
  const [liked, reacted, mirrored, legacy] = await Promise.all([
    fetchLikedEchoIds(userId, Math.ceil(limit * 0.6)),
    fetchReactedEchoIds(userId, Math.ceil(limit * 0.8)),
    fetchMirroredEchoIds(userId, Math.ceil(limit * 0.6)),
    fetchLegacyResonanceEchoIds(userId, Math.ceil(limit * 0.4)),
  ]);

  return uniq([...liked, ...reacted, ...mirrored, ...legacy]).slice(0, limit);
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

async function fetchEchoMediaUrlsByEchoId(echoIds: string[]): Promise<Record<string, string[]>> {
  if (echoIds.length === 0) return {};

  try {
    const { data, error } = await supabase
      .from('echo_media')
      .select('echo_id,url,position')
      .in('echo_id', echoIds)
      .order('position', { ascending: true })
      .limit(Math.max(500, echoIds.length * 6));

    if (error || !data) return {};

    const out: Record<string, string[]> = {};
    for (const id of echoIds) out[String(id)] = [];

    for (const row of data as Array<{ echo_id?: unknown; url?: unknown }>) {
      const id = String(row.echo_id ?? '').trim();
      const url = String(row.url ?? '').trim();
      if (!id || !url) continue;
      if (!out[id]) out[id] = [];
      out[id].push(url);
    }

    return out;
  } catch {
    return {};
  }
}

async function fetchEchoRowsByIds(ids: string[], limit: number): Promise<EchoRow[]> {
  if (ids.length === 0) return [];

  // Best-effort: tenter image_urls, sinon fallback sans la colonne
  const baseCols = 'id, title, content, visibility, created_at';
  const colsWithImages = `${baseCols}, image_urls`;

  try {
    const { data, error } = await supabase.from('echoes').select(colsWithImages).in('id', ids).limit(limit);
    if (!error && data) return data as EchoRow[];
  } catch {
    // ignore
  }

  try {
    const { data, error } = await supabase.from('echoes').select(baseCols).in('id', ids).limit(limit);
    if (error || !data) return [];
    return data as EchoRow[];
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

    const echoes = await fetchEchoRowsByIds(ids, limit);
    if (!echoes.length) return [];

    // Filtre visibility “safe” (si champ absent/null, on garde fail-soft)
    const filtered = echoes.filter((e) => {
      const v = String(e.visibility ?? '').trim();
      return v === 'world' || v === 'local' || v === '';
    });

    const scoreById = new Map(sorted);
    return filtered.map((e) => ({
      ...e,
      score: scoreById.get(String(e.id)) ?? 0,
    }));
  } catch {
    return [];
  }
}

async function fetchFreshEchoes(excludeEchoIds: string[], limit = 10): Promise<EchoRow[]> {
  // Best-effort: tenter image_urls, sinon fallback sans la colonne
  const baseCols = 'id, title, content, visibility, created_at';
  const colsWithImages = `${baseCols}, image_urls`;

  try {
    const q1 = supabase
      .from('echoes')
      .select(colsWithImages)
      .in('visibility', ['world', 'local'])
      .order('created_at', { ascending: false })
      .limit(limit + excludeEchoIds.length);

    const { data, error } = await q1;
    if (!error && data) {
      const rows = (data as EchoRow[]).filter((e) => !excludeEchoIds.includes(String(e.id)));
      return rows.slice(0, limit);
    }
  } catch {
    // ignore -> fallback
  }

  try {
    const q2 = supabase
      .from('echoes')
      .select(baseCols)
      .in('visibility', ['world', 'local'])
      .order('created_at', { ascending: false })
      .limit(limit + excludeEchoIds.length);

    const { data, error } = await q2;
    if (error || !data) return [];

    const rows = (data as EchoRow[]).filter((e) => !excludeEchoIds.includes(String(e.id)));
    return rows.slice(0, limit);
  } catch {
    return [];
  }
}

export async function getForMeFeed(userId: string): Promise<ForMeFeed> {
  // 1) interactions -> echoIds (aligné DB réelle)
  const interacted = await fetchUserInteractionEchoIds(userId);

  // 2) tags dérivés
  const tags = await fetchTagsForEchoIds(interacted);

  // 3) résonance : echoes match tags (exclure interacted)
  const resonantRows = await fetchResonantEchoesByTags(tags, interacted, 10);

  // 4) fresh fallback
  const freshRows = await fetchFreshEchoes(interacted, 8);

  // 5) media fallback (echo_media) pour resonance+fresh
  const allIds = uniq([...resonantRows.map((e) => String(e.id)), ...freshRows.map((e) => String(e.id))]).filter(Boolean);
  const mediaById = await fetchEchoMediaUrlsByEchoId(allIds);

  const resonance: ForMeFeedItem[] = resonantRows.map((e) => {
    const id = String(e.id);
    const fromCol = normalizeImageUrls((e as EchoRow).image_urls);
    const fromMedia = mediaById[id] ?? [];
    const image_urls = fromCol.length > 0 ? fromCol : fromMedia;

    return {
      id: `res-${id}`,
      kind: 'resonance',
      title: safeTitle(e.title),
      excerpt: safeText(e.content),
      meta: e.score && e.score > 1 ? `Match tags: ${e.score}` : 'Match',
      score: e.score ?? 0,
      echoId: id,
      created_at: e.created_at ?? null,
      image_urls,
    };
  });

  const fresh: ForMeFeedItem[] = freshRows.map((e) => {
    const id = String(e.id);
    const fromCol = normalizeImageUrls((e as EchoRow).image_urls);
    const fromMedia = mediaById[id] ?? [];
    const image_urls = fromCol.length > 0 ? fromCol : fromMedia;

    return {
      id: `fresh-${id}`,
      kind: 'fresh',
      title: safeTitle(e.title),
      excerpt: safeText(e.content),
      meta: 'Nouveau',
      echoId: id,
      created_at: e.created_at ?? null,
      image_urls,
    };
  });

  // topics (simple: top tags)
  const topics = tags.slice(0, 12).map((t) => ({ id: t, label: t }));

  return {
    resonance,
    fresh,
    topics,
    debug: { usedTags: tags },
  };
}
