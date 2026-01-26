// =============================================================================
// Fichier      : lib/profile/getProfile.ts
// Auteur       : Régis KREMER (Baithz) — EchoWorld
// Version      : 1.7.4 (2026-01-26)
// Objet        : Helpers serveur pour récupérer un profil + échos/stats (public)
// ----------------------------------------------------------------------------
// Description  :
// - Résolution profil par id/handle (public_profile_enabled)
// - Lookup handle STRICT aligné DB/Settings (a-z0-9_- ; max 24 ; lowercase)
// - Récupération échos publics (published + world/local)
// - Stats publiques (counts + topThemes)
// - isFollowing via table follows (RLS OK)
// ----------------------------------------------------------------------------
// CHANGELOG
// 1.7.4 (2026-01-26)
// - [FIX] Handle lookup: normalisation unique et stricte (match index unique profiles.handle)
// - [FIX] Supprime fallbacks ambigus (ilike sans wildcard / 32 chars / '.' autorisé) => moins de 404 incohérents
// - [KEEP] Contrat inchangé: mêmes exports/types/signatures, picks/stats/echoes inchangés
// - [SAFE] Zéro régression fonctionnelle hors correction handle
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

const EW_DEBUG = process.env.EW_DEBUG === '1';

const PROFILE_SELECT =
  'id, handle, display_name, avatar_url, bio, public_profile_enabled, banner_url, banner_pos_y' as const;

const ECHO_SELECT =
  'id, user_id, title, content, emotion, is_anonymous, country, city, language, created_at, status, visibility, emotion_tags, theme_tags, image_urls' as const;

function log(message: string, data?: unknown) {
  if (!EW_DEBUG) return;
  try {
    console.log(`[getProfile] ${message}`, data ?? '');
  } catch {
    /* noop */
  }
}

function logError(message: string, error?: unknown) {
  if (!EW_DEBUG) return;
  try {
    console.error(`[getProfile] ERROR: ${message}`, error ?? '');
  } catch {
    /* noop */
  }
}

function pickSupabaseError(err: unknown) {
  const e = err as { code?: string; message?: string; details?: string; hint?: string; status?: number };
  return {
    code: e?.code ?? null,
    status: e?.status ?? null,
    message: e?.message ?? null,
    details: e?.details ?? null,
    hint: e?.hint ?? null,
  };
}

/**
 * Normalisation STRICTE (doit matcher Settings + DB unique index):
 * - remove @
 * - trim
 * - lowercase
 * - espaces => _
 * - autorise uniquement [a-z0-9_-]
 * - max 24
 */
function normalizeHandleStrict(input: string): string {
  const raw = typeof input === 'string' ? input : '';
  const cleaned = raw.trim().replace(/^@/, '').trim();
  if (!cleaned) return '';
  return cleaned
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 24);
}

/**
 * (Compat export) Normalisation pour URLs (/u/[handle]) :
 * Alignée STRICTEMENT sur la règle handle.
 */
export function normalizeHandleForUrl(input: string): string {
  return normalizeHandleStrict(input);
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

    const r = await supabase.from('profiles').select(PROFILE_SELECT).eq('id', clean).maybeSingle<ProfileRow>();

    if (r.error) {
      logError(`getProfileById: Supabase error id=${clean}`, pickSupabaseError(r.error));
      return null;
    }
    if (!r.data) {
      log(`getProfileById: Aucun profil id=${clean}`);
      return null;
    }

    log(`getProfileById: OK id=${clean}`, { handle: r.data.handle, public: r.data.public_profile_enabled });
    return pickProfile(r.data);
  } catch (err) {
    logError(`getProfileById: Exception id=${clean}`, err);
    return null;
  }
}

export async function getProfileByHandle(handle: string): Promise<PublicProfile | null> {
  const raw = (handle ?? '').trim();
  if (!raw) {
    log('getProfileByHandle: Handle vide');
    return null;
  }

  const normalized = normalizeHandleStrict(raw);
  log('getProfileByHandle: start', { raw, normalized });

  if (!normalized) {
    log('getProfileByHandle: normalized empty => MISS', { raw });
    return null;
  }

  try {
    const supabase = await createSupabaseServerClient();

    // Lookup strict = 1 seule source de vérité (match index unique)
    const r = await supabase
      .from('profiles')
      .select(PROFILE_SELECT)
      .eq('handle', normalized)
      .maybeSingle<ProfileRow>();

    if (r.error) {
      logError('getProfileByHandle: eq(handle) error', { normalized, err: pickSupabaseError(r.error) });
      return null;
    }

    if (!r.data) {
      log('getProfileByHandle: MISS', { normalized });
      return null;
    }

    log('getProfileByHandle: HIT', { id: r.data.id, handle: r.data.handle });
    return pickProfile(r.data);
  } catch (err) {
    logError('getProfileByHandle: Exception', { raw, normalized, err });
    return null;
  }
}

export async function getUserPublicEchoes(userId: string, limit = 12): Promise<PublicEcho[]> {
  const clean = (userId ?? '').trim();
  if (!clean) return [];

  const safeLimit = Math.max(1, Math.min(Number.isFinite(limit) ? Math.floor(limit) : 12, 50));

  try {
    const supabase = await createSupabaseServerClient();

    const r = await supabase
      .from('echoes')
      .select(ECHO_SELECT)
      .eq('user_id', clean)
      .eq('status', 'published')
      .in('visibility', ['world', 'local'])
      .order('created_at', { ascending: false })
      .limit(safeLimit);

    if (r.error || !r.data) {
      if (r.error) logError('getUserPublicEchoes: error', { userId: clean, err: pickSupabaseError(r.error) });
      return [];
    }

    return (r.data as unknown as EchoRow[]).map(pickEcho);
  } catch (err) {
    logError('getUserPublicEchoes: Exception', { userId: clean, err });
    return [];
  }
}

export async function getUserPublicEchoesCount(userId: string): Promise<number> {
  const clean = (userId ?? '').trim();
  if (!clean) return 0;

  try {
    const supabase = await createSupabaseServerClient();

    const r = await supabase
      .from('echoes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', clean)
      .eq('status', 'published')
      .in('visibility', ['world', 'local']);

    if (r.error || typeof r.count !== 'number') {
      if (r.error) logError('getUserPublicEchoesCount: error', { userId: clean, err: pickSupabaseError(r.error) });
      return 0;
    }
    return r.count;
  } catch (err) {
    logError('getUserPublicEchoesCount: Exception', { userId: clean, err });
    return 0;
  }
}

export async function getUserFollowersCount(userId: string): Promise<number> {
  const clean = (userId ?? '').trim();
  if (!clean) return 0;

  try {
    const supabase = await createSupabaseServerClient();

    const r = await supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', clean);

    if (r.error || typeof r.count !== 'number') return 0;
    return r.count;
  } catch {
    return 0;
  }
}

export async function getUserFollowingCount(userId: string): Promise<number> {
  const clean = (userId ?? '').trim();
  if (!clean) return 0;

  try {
    const supabase = await createSupabaseServerClient();

    const r = await supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', clean);

    if (r.error || typeof r.count !== 'number') return 0;
    return r.count;
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

    const r = await supabase
      .from('echoes')
      .select('theme_tags, created_at')
      .eq('user_id', clean)
      .eq('status', 'published')
      .in('visibility', ['world', 'local'])
      .order('created_at', { ascending: false })
      .limit(scanLimit);

    if (r.error || !r.data) return [];

    const rows = r.data as unknown as Array<{ theme_tags: string[] | null }>;
    const freq = new Map<string, number>();

    for (const row of rows) {
      const tags = Array.isArray(row.theme_tags) ? row.theme_tags : [];
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

    const r = await supabase.from('follows').select('id').eq('follower_id', a).eq('following_id', b).maybeSingle();

    if (r.error) return false;
    return r.data !== null;
  } catch {
    return false;
  }
}
