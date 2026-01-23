// =============================================================================
// Fichier      : lib/profile/getProfile.ts
// Auteur       : Régis KREMER (Baithz) — EchoWorld
// Version      : 1.2.4 (2026-01-23)
// Objet        : Helpers serveur pour récupérer un profil + échos/stats (public)
// ----------------------------------------------------------------------------
// Règles :
// - Respecte profiles.public_profile_enabled (false => profil non accessible)
// - Échos publics : status=published + visibility in (world, local)
// - SAFE: fail-soft => null / [] / 0
// - TS strict: aucun accès à profile sans check non-null explicite
//
// Notes:
// - La base utilise désormais profiles.public_profile_enabled (colonne) côté RLS.
// - Les helpers "bundle" évitent tout type-guard ambigu -> guards explicites.
// -----------------------------------------------------------------------------
// CHANGELOG
// 1.2.4 (2026-01-23)
// - [FIX] getProfileByHandle : ne “slugifie” plus le handle avant lookup DB
// - [IMPROVED] Ajout cleanHandleForLookup + normalizeHandleForUrl (source of truth = DB)
// 1.2.3 (2026-01-23)
// - Version précédente (profil public + echoes + stats) considérée comme stable
// =============================================================================

import { createSupabaseServerClient } from '@/lib/supabase/server';

export type PublicProfile = {
  id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  public_profile_enabled: boolean | null;
};

export type PublicEcho = {
  id: string;
  user_id: string | null;
  title: string | null;
  content: string;
  emotion: string | null;
  is_anonymous: boolean | null;
  country: string | null;
  city: string | null;
  language: string | null;
  created_at: string | null;
  status: 'draft' | 'published' | 'archived' | 'deleted' | string;
  visibility: 'world' | 'local' | 'private' | 'semi_anonymous' | string;
  emotion_tags: string[];
  theme_tags: string[];
};

export type PublicProfileStats = {
  echoesCount: number; // total réel (non limité)
  topThemes: string[]; // top tags (max N)
  location: { country: string | null; city: string | null };
};

type ProfileRow = {
  id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  public_profile_enabled: boolean | null;
};

type EchoRow = {
  id: string;
  user_id: string | null;
  title: string | null;
  content: string | null;
  emotion: string | null;
  is_anonymous: boolean | null;
  country: string | null;
  city: string | null;
  language: string | null;
  created_at: string | null;
  status: string | null;
  visibility: string | null;
  emotion_tags: string[] | null;
  theme_tags: string[] | null;
};

const PROFILE_SELECT =
  'id, handle, display_name, avatar_url, bio, public_profile_enabled' as const;

const ECHO_SELECT =
  'id, user_id, title, content, emotion, is_anonymous, country, city, language, created_at, status, visibility, emotion_tags, theme_tags' as const;

// ----------------------------------------------------------------------------
// Handle normalization (DB lookup) : on ne "slugifie" PAS pour requêter.
// On retire juste '@' + trim. La DB est la source de vérité.
// ----------------------------------------------------------------------------
function cleanHandleForLookup(input: string): string {
  return (input ?? '').trim().replace(/^@/, '').trim();
}

// Normalisation pour URL canonique (optionnel, pour redirect uniquement)
export function normalizeHandleForUrl(input: string): string {
  const raw = cleanHandleForLookup(input);
  if (!raw) return '';
  return raw
    .toLowerCase()
    .replace(/\s+/g, '_')
    // IMPORTANT: on garde aussi '.' car beaucoup de handles l'utilisent
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 32);
}

function pickProfile(row: ProfileRow): PublicProfile {
  return {
    id: String(row.id),
    handle: row.handle ?? null,
    display_name: row.display_name ?? null,
    avatar_url: row.avatar_url ?? null,
    bio: row.bio ?? null,
    public_profile_enabled: row.public_profile_enabled ?? null,
  };
}

function pickEcho(row: EchoRow): PublicEcho {
  return {
    id: String(row.id),
    user_id: row.user_id ?? null,
    title: row.title ?? null,
    content: String(row.content ?? ''),
    emotion: row.emotion ?? null,
    is_anonymous: row.is_anonymous ?? null,
    country: row.country ?? null,
    city: row.city ?? null,
    language: row.language ?? null,
    created_at: row.created_at ?? null,
    status: String(row.status ?? 'published'),
    visibility: String(row.visibility ?? 'world'),
    emotion_tags: Array.isArray(row.emotion_tags) ? row.emotion_tags : [],
    theme_tags: Array.isArray(row.theme_tags) ? row.theme_tags : [],
  };
}

export async function getProfileById(id: string): Promise<PublicProfile | null> {
  const clean = (id ?? '').trim();
  if (!clean) return null;

  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_SELECT)
      .eq('id', clean)
      .maybeSingle<ProfileRow>();

    if (error || !data) return null;
    return pickProfile(data);
  } catch {
    return null;
  }
}

export async function getProfileByHandle(handle: string): Promise<PublicProfile | null> {
  const clean = cleanHandleForLookup(handle);
  if (!clean) return null;

  try {
    const supabase = await createSupabaseServerClient();

    // 1) Lookup direct (case-insensitive exact) : ilike sans wildcard = "pattern exact"
    const first = await supabase
      .from('profiles')
      .select(PROFILE_SELECT)
      .ilike('handle', clean)
      .maybeSingle<ProfileRow>();

    if (!first.error && first.data) return pickProfile(first.data);

    // 2) Fallback : si l'URL a été "slugifiée" côté front, on tente la version URL-normalisée
    const alt = normalizeHandleForUrl(clean);
    if (alt && alt !== clean.toLowerCase()) {
      const second = await supabase
        .from('profiles')
        .select(PROFILE_SELECT)
        .ilike('handle', alt)
        .maybeSingle<ProfileRow>();

      if (!second.error && second.data) return pickProfile(second.data);
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Échos publics d'un profil :
 * - status = published
 * - visibility in (world, local)
 * - tri created_at desc
 */
export async function getUserPublicEchoes(userId: string, limit = 12): Promise<PublicEcho[]> {
  const clean = (userId ?? '').trim();
  if (!clean) return [];

  const safeLimit = Math.max(1, Math.min(Number.isFinite(limit) ? Math.floor(limit) : 12, 50));

  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('echoes')
      .select(ECHO_SELECT)
      .eq('user_id', clean)
      .eq('status', 'published')
      .in('visibility', ['world', 'local'])
      .order('created_at', { ascending: false })
      .limit(safeLimit);

    if (error || !data) return [];
    return (data as unknown as EchoRow[]).map(pickEcho);
  } catch {
    return [];
  }
}

/**
 * Count réel des échos publics (non limité).
 */
export async function getUserPublicEchoesCount(userId: string): Promise<number> {
  const clean = (userId ?? '').trim();
  if (!clean) return 0;

  try {
    const supabase = await createSupabaseServerClient();

    const { count, error } = await supabase
      .from('echoes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', clean)
      .eq('status', 'published')
      .in('visibility', ['world', 'local']);

    if (error || typeof count !== 'number') return 0;
    return count;
  } catch {
    return 0;
  }
}

/**
 * Top themes (agrégation simple en mémoire).
 * On scanne un nombre raisonnable d'échos récents pour éviter de charger trop.
 */
export async function getUserPublicTopThemes(
  userId: string,
  opts?: { scanLimit?: number; topN?: number }
): Promise<string[]> {
  const clean = (userId ?? '').trim();
  if (!clean) return [];

  const scanLimit = Math.max(10, Math.min(opts?.scanLimit ?? 200, 500));
  const topN = Math.max(3, Math.min(opts?.topN ?? 6, 12));

  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('echoes')
      .select('theme_tags, created_at')
      .eq('user_id', clean)
      .eq('status', 'published')
      .in('visibility', ['world', 'local'])
      .order('created_at', { ascending: false })
      .limit(scanLimit);

    if (error || !data) return [];

    const rows = data as unknown as Array<{ theme_tags: string[] | null }>;
    const freq = new Map<string, number>();

    for (const r of rows) {
      const tags = Array.isArray(r.theme_tags) ? r.theme_tags : [];
      for (const t of tags) {
        const tag = String(t ?? '').trim();
        if (!tag) continue;
        freq.set(tag, (freq.get(tag) ?? 0) + 1);
      }
    }

    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([tag]) => tag);
  } catch {
    return [];
  }
}

// -----------------------------------------------------------------------------
// Helpers “bundle”
// -----------------------------------------------------------------------------

export async function getPublicProfileWithEchoesById(userId: string, limit = 12): Promise<{
  profile: PublicProfile | null;
  echoes: PublicEcho[];
}> {
  const profile = await getProfileById(userId);
  if (!profile) return { profile: null, echoes: [] };
  if (profile.public_profile_enabled === false) return { profile: null, echoes: [] };

  const profileId = profile.id;
  const echoes = await getUserPublicEchoes(profileId, limit);

  return { profile, echoes };
}

export async function getPublicProfileWithEchoesByHandle(handle: string, limit = 12): Promise<{
  profile: PublicProfile | null;
  echoes: PublicEcho[];
}> {
  const profile = await getProfileByHandle(handle);
  if (!profile) return { profile: null, echoes: [] };
  if (profile.public_profile_enabled === false) return { profile: null, echoes: [] };

  const profileId = profile.id;
  const echoes = await getUserPublicEchoes(profileId, limit);

  return { profile, echoes };
}

export async function getPublicProfileDataById(userId: string, limit = 12): Promise<{
  profile: PublicProfile | null;
  echoes: PublicEcho[];
  stats: PublicProfileStats | null;
}> {
  const profile = await getProfileById(userId);
  if (!profile) return { profile: null, echoes: [], stats: null };
  if (profile.public_profile_enabled === false) return { profile: null, echoes: [], stats: null };

  const profileId = profile.id;

  const [echoes, echoesCount, topThemes] = await Promise.all([
    getUserPublicEchoes(profileId, limit),
    getUserPublicEchoesCount(profileId),
    getUserPublicTopThemes(profileId),
  ]);

  const stats: PublicProfileStats = {
    echoesCount,
    topThemes,
    location: { country: null, city: null },
  };

  return { profile, echoes, stats };
}

export async function getPublicProfileDataByHandle(handle: string, limit = 12): Promise<{
  profile: PublicProfile | null;
  echoes: PublicEcho[];
  stats: PublicProfileStats | null;
}> {
  const profile = await getProfileByHandle(handle);
  if (!profile) return { profile: null, echoes: [], stats: null };
  if (profile.public_profile_enabled === false) return { profile: null, echoes: [], stats: null };

  const profileId = profile.id;

  const [echoes, echoesCount, topThemes] = await Promise.all([
    getUserPublicEchoes(profileId, limit),
    getUserPublicEchoesCount(profileId),
    getUserPublicTopThemes(profileId),
  ]);

  const stats: PublicProfileStats = {
    echoesCount,
    topThemes,
    location: { country: null, city: null },
  };

  return { profile, echoes, stats };
}
