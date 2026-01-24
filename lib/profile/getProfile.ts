// =============================================================================
// Fichier      : lib/profile/getProfile.ts
// Auteur       : Régis KREMER (Baithz) — EchoWorld
// Version      : 1.7.2 (2026-01-24)
// Objet        : Helpers serveur pour récupérer un profil + échos/stats (public)
// ----------------------------------------------------------------------------
// Description  :
// - Résolution profil par id/handle (public_profile_enabled)
// - Récupération échos publics (published + world/local)
// - Stats publiques (counts + topThemes)
// - isFollowing via table follows (RLS OK)
// ----------------------------------------------------------------------------
// CHANGELOG
// 1.7.2 (2026-01-24)
// - [FIX] Lookup handle robuste + sans bruit: eq(normalized) + ilike(normalized) + fallback urlNorm
// - [FIX] Plus de variables inutiles (ESLint prefer-const / unused) + pas de helpers morts (foldDiacritics)
// - [SAFE] Contrat inchangé: mêmes exports/types/signatures, picks/stats/echoes inchangés
// =============================================================================

import { createSupabaseServerClient } from '@/lib/supabase/server';

export type PublicProfile = {
  id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  public_profile_enabled: boolean | null;
  banner_url: string | null;
  banner_pos_y: number | null;
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
  image_urls: string[];
};

export type PublicProfileStats = {
  echoesCount: number;
  followersCount: number;
  followingCount: number;
  topThemes: string[];
  location: { country: string | null; city: string | null };
};

type ProfileRow = {
  id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  public_profile_enabled: boolean | null;
  banner_url: string | null;
  banner_pos_y: number | null;
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
  image_urls: string[] | null;
};

const PROFILE_SELECT =
  'id, handle, display_name, avatar_url, bio, public_profile_enabled, banner_url, banner_pos_y' as const;

const ECHO_SELECT =
  'id, user_id, title, content, emotion, is_anonymous, country, city, language, created_at, status, visibility, emotion_tags, theme_tags, image_urls' as const;

function log(message: string, data?: unknown) {
  // Best-effort: pas d’exception si console indispo
  try {
    console.log(`[getProfile] ${message}`, data ?? '');
  } catch {
    /* noop */
  }
}

function logError(message: string, error?: unknown) {
  try {
    console.error(`[getProfile] ERROR: ${message}`, error ?? '');
  } catch {
    /* noop */
  }
}

/**
 * Normalisation STRICTE "lookup" (index lower(handle)):
 * - remove @
 * - trim
 * - lowercase
 * - NE PAS filtrer d’autres caractères ici (évite mismatch si handle stocké avec ponctuation/accents)
 */
function normalizeHandleForLookup(input: string): string {
  return (input ?? '').trim().replace(/^@/, '').trim().toLowerCase();
}

/**
 * Normalisation pour URLs (/u/[handle]) :
 * - convertit espaces en _
 * - supprime tout hors [a-z0-9._-]
 * - coupe à 32
 */
export function normalizeHandleForUrl(input: string): string {
  const raw = (input ?? '').trim().replace(/^@/, '').trim();
  if (!raw) return '';
  return raw
    .toLowerCase()
    .replace(/\s+/g, '_')
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
    banner_url: row.banner_url ?? null,
    banner_pos_y: row.banner_pos_y ?? null,
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
    image_urls: Array.isArray(row.image_urls) ? row.image_urls : [],
  };
}

export async function getProfileById(id: string): Promise<PublicProfile | null> {
  const clean = (id ?? '').trim();
  if (!clean) {
    log('getProfileById: ID vide');
    return null;
  }

  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_SELECT)
      .eq('id', clean)
      .maybeSingle<ProfileRow>();

    if (error) {
      logError(`getProfileById: Erreur Supabase pour id=${clean}`, error);
      return null;
    }
    if (!data) {
      log(`getProfileById: Aucun profil trouvé pour id=${clean}`);
      return null;
    }

    return pickProfile(data);
  } catch (err) {
    logError(`getProfileById: Exception pour id=${clean}`, err);
    return null;
  }
}

export async function getProfileByHandle(handle: string): Promise<PublicProfile | null> {
  const raw = (handle ?? '').trim();
  if (!raw) {
    log('getProfileByHandle: Handle vide');
    return null;
  }

  const normalized = normalizeHandleForLookup(raw);
  const urlNorm = normalizeHandleForUrl(raw);

  log(`getProfileByHandle: lookup raw="${raw}" normalized="${normalized}" urlNorm="${urlNorm}"`);

  try {
    const supabase = await createSupabaseServerClient();

    // 1) EQ (rapide si handle stocké déjà en lowercase)
    const r1 = await supabase
      .from('profiles')
      .select(PROFILE_SELECT)
      .eq('handle', normalized)
      .maybeSingle<ProfileRow>();

    if (r1.error) {
      logError(`getProfileByHandle: Erreur Supabase (eq) handle="${normalized}"`, r1.error);
      return null;
    }
    if (r1.data) {
      log(`getProfileByHandle: Profil trouvé (eq) → id=${r1.data.id}, handle=${r1.data.handle}`);
      return pickProfile(r1.data);
    }

    // 2) ILIKE exact (case-insensitive, sans wildcard)
    const r2 = await supabase
      .from('profiles')
      .select(PROFILE_SELECT)
      .ilike('handle', normalized)
      .maybeSingle<ProfileRow>();

    if (r2.error) {
      logError(`getProfileByHandle: Erreur Supabase (ilike) handle="${normalized}"`, r2.error);
      return null;
    }
    if (r2.data) {
      log(`getProfileByHandle: Profil trouvé (ilike) → id=${r2.data.id}, handle=${r2.data.handle}`);
      return pickProfile(r2.data);
    }

    // 3) Fallback URL-normalized (si le handle stocké a été "nettoyé" style URL)
    if (urlNorm && urlNorm !== normalized) {
      const r3 = await supabase
        .from('profiles')
        .select(PROFILE_SELECT)
        .eq('handle', urlNorm)
        .maybeSingle<ProfileRow>();

      if (r3.error) {
        logError(`getProfileByHandle: Erreur Supabase (eq urlNorm) handle="${urlNorm}"`, r3.error);
        return null;
      }
      if (r3.data) {
        log(`getProfileByHandle: Profil trouvé (eq urlNorm) → id=${r3.data.id}, handle=${r3.data.handle}`);
        return pickProfile(r3.data);
      }

      const r4 = await supabase
        .from('profiles')
        .select(PROFILE_SELECT)
        .ilike('handle', urlNorm)
        .maybeSingle<ProfileRow>();

      if (r4.error) {
        logError(`getProfileByHandle: Erreur Supabase (ilike urlNorm) handle="${urlNorm}"`, r4.error);
        return null;
      }
      if (r4.data) {
        log(`getProfileByHandle: Profil trouvé (ilike urlNorm) → id=${r4.data.id}, handle=${r4.data.handle}`);
        return pickProfile(r4.data);
      }
    }

    log(`getProfileByHandle: Aucun profil trouvé (raw="${raw}", normalized="${normalized}", urlNorm="${urlNorm}")`);
    return null;
  } catch (err) {
    logError(`getProfileByHandle: Exception pour handle="${normalized}"`, err);
    return null;
  }
}

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

    if (error || !data) {
      if (error) logError(`getUserPublicEchoes: Erreur pour userId=${clean}`, error);
      return [];
    }

    return (data as unknown as EchoRow[]).map(pickEcho);
  } catch (err) {
    logError(`getUserPublicEchoes: Exception pour userId=${clean}`, err);
    return [];
  }
}

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

    if (error || typeof count !== 'number') {
      if (error) logError(`getUserPublicEchoesCount: Erreur pour userId=${clean}`, error);
      return 0;
    }
    return count;
  } catch (err) {
    logError(`getUserPublicEchoesCount: Exception pour userId=${clean}`, err);
    return 0;
  }
}

export async function getUserFollowersCount(userId: string): Promise<number> {
  const clean = (userId ?? '').trim();
  if (!clean) return 0;

  try {
    const supabase = await createSupabaseServerClient();

    const { count, error } = await supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('following_id', clean);

    if (error || typeof count !== 'number') return 0;
    return count;
  } catch {
    return 0;
  }
}

export async function getUserFollowingCount(userId: string): Promise<number> {
  const clean = (userId ?? '').trim();
  if (!clean) return 0;

  try {
    const supabase = await createSupabaseServerClient();

    const { count, error } = await supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('follower_id', clean);

    if (error || typeof count !== 'number') return 0;
    return count;
  } catch {
    return 0;
  }
}

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

export async function getPublicProfileWithEchoesById(
  userId: string,
  limit = 12
): Promise<{ profile: PublicProfile | null; echoes: PublicEcho[] }> {
  const profile = await getProfileById(userId);
  if (!profile) return { profile: null, echoes: [] };
  if (profile.public_profile_enabled === false) return { profile: null, echoes: [] };

  const echoes = await getUserPublicEchoes(profile.id, limit);
  return { profile, echoes };
}

export async function getPublicProfileWithEchoesByHandle(
  handle: string,
  limit = 12
): Promise<{ profile: PublicProfile | null; echoes: PublicEcho[] }> {
  const profile = await getProfileByHandle(handle);
  if (!profile) return { profile: null, echoes: [] };
  if (profile.public_profile_enabled === false) return { profile: null, echoes: [] };

  const echoes = await getUserPublicEchoes(profile.id, limit);
  return { profile, echoes };
}

export async function getPublicProfileDataById(
  userId: string,
  limit = 12
): Promise<{ profile: PublicProfile | null; echoes: PublicEcho[]; stats: PublicProfileStats | null }> {
  const profile = await getProfileById(userId);
  if (!profile) return { profile: null, echoes: [], stats: null };
  if (profile.public_profile_enabled === false) return { profile: null, echoes: [], stats: null };

  const profileId = profile.id;

  const [echoes, echoesCount, followersCount, followingCount, topThemes] = await Promise.all([
    getUserPublicEchoes(profileId, limit),
    getUserPublicEchoesCount(profileId),
    getUserFollowersCount(profileId),
    getUserFollowingCount(profileId),
    getUserPublicTopThemes(profileId),
  ]);

  return {
    profile,
    echoes,
    stats: {
      echoesCount,
      followersCount,
      followingCount,
      topThemes,
      location: { country: null, city: null },
    },
  };
}

export async function getPublicProfileDataByHandle(
  handle: string,
  limit = 12
): Promise<{ profile: PublicProfile | null; echoes: PublicEcho[]; stats: PublicProfileStats | null }> {
  const profile = await getProfileByHandle(handle);
  if (!profile) return { profile: null, echoes: [], stats: null };
  if (profile.public_profile_enabled === false) return { profile: null, echoes: [], stats: null };

  const profileId = profile.id;

  const [echoes, echoesCount, followersCount, followingCount, topThemes] = await Promise.all([
    getUserPublicEchoes(profileId, limit),
    getUserPublicEchoesCount(profileId),
    getUserFollowersCount(profileId),
    getUserFollowingCount(profileId),
    getUserPublicTopThemes(profileId),
  ]);

  return {
    profile,
    echoes,
    stats: {
      echoesCount,
      followersCount,
      followingCount,
      topThemes,
      location: { country: null, city: null },
    },
  };
}

export async function checkIfFollowing(currentUserId: string, targetUserId: string): Promise<boolean> {
  const a = (currentUserId ?? '').trim();
  const b = (targetUserId ?? '').trim();
  if (!a || !b) return false;

  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', a)
      .eq('following_id', b)
      .maybeSingle();

    if (error) return false;
    return data !== null;
  } catch {
    return false;
  }
}
