// =============================================================================
// Fichier      : lib/profile/getProfile.ts
// Auteur       : Régis KREMER (Baithz) — EchoWorld
// Version      : 1.6.1 (2026-01-24)
// Objet        : Helpers serveur pour récupérer un profil + échos/stats (public)
// ----------------------------------------------------------------------------
// Description  :
// - Résolution profil par id/handle (public_profile_enabled)
// - Récupération échos publics (published + world/local)
// - Stats publiques (counts + topThemes)
// - isFollowing via table follows (RLS OK)
// ----------------------------------------------------------------------------
// CHANGELOG
// 1.6.1 (2026-01-24)
// - [FIX] getProfileByHandle: lookup tolérant sans casser le contrat (eq + ilike + fallbacks)
// - [FIX] Zéro bruit ESLint : pas de destructuring mutable (prefer-const)
// - [KEEP] Types/export/API inchangés + logs conservés
// 1.6.0 (2026-01-24)
// - [FIX] CRITIQUE: Normalisation handle cohérente avec l'index BDD lower(handle)
// - [FIX] Stratégie de lookup simplifiée (exact lowercase uniquement)
// - [IMPROVED] Logs détaillés pour debug production
// - [KEEP] Zéro régression sur types, stats, echoes, checkIfFollowing
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
  console.log(`[getProfile] ${message}`, data ?? '');
}

function logError(message: string, error?: unknown) {
  console.error(`[getProfile] ERROR: ${message}`, error ?? '');
}

/**
 * CRITICAL: Normalisation STRICTEMENT IDENTIQUE à celle utilisée lors de l'enregistrement
 * du handle en BDD (via /account ou /settings).
 *
 * Règles :
 * 1. Suppression du @ initial (si présent)
 * 2. Trim espaces début/fin
 * 3. Lowercase (pour matcher l'index unique BDD : lower(handle))
 *
 * Cette fonction doit retourner EXACTEMENT ce qui est stocké en BDD.
 * PAS de remplacement d'espaces, PAS de filtrage de caractères spéciaux ici.
 */
function normalizeHandleForLookup(input: string): string {
  return (input ?? '')
    .trim()
    .replace(/^@/, '')
    .trim()
    .toLowerCase(); // ← INDEX BDD : lower(handle)
}

/**
 * Normalisation pour URLs (/u/[handle]) - utilisée UNIQUEMENT pour l'affichage/routing.
 * Cette fonction doit être cohérente avec celle utilisée dans components/auth/*.tsx
 * lors de la création/modification du handle.
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

  // Normalisation STRICTE pour matcher l'index BDD lower(handle)
  const normalized = normalizeHandleForLookup(raw);

  // Version "telle que saisie" (sans @) pour compat handles historiques stockés avec casse
  const rawNoAt = raw.replace(/^@/, '').trim();

  log(`getProfileByHandle: lookup raw="${raw}" → normalized="${normalized}"`);

  try {
    const supabase = await createSupabaseServerClient();

    async function tryEq(value: string): Promise<ProfileRow | null> {
      const v = (value ?? '').trim();
      if (!v) return null;

      const r = await supabase
        .from('profiles')
        .select(PROFILE_SELECT)
        .eq('handle', v)
        .maybeSingle<ProfileRow>();

      if (r.error) {
        logError(`getProfileByHandle: Erreur Supabase (eq) handle="${v}"`, r.error);
        return null;
      }
      return r.data ?? null;
    }

    async function tryIlike(value: string): Promise<ProfileRow | null> {
      const v = (value ?? '').trim();
      if (!v) return null;

      // ilike sans wildcard => égalité case-insensitive
      const r = await supabase
        .from('profiles')
        .select(PROFILE_SELECT)
        .ilike('handle', v)
        .maybeSingle<ProfileRow>();

      if (r.error) {
        logError(`getProfileByHandle: Erreur Supabase (ilike) handle="${v}"`, r.error);
        return null;
      }
      return r.data ?? null;
    }

    let found: ProfileRow | null = null;

    // 1) eq(normalized) => idéal si handle stocké en lowercase (cas attendu)
    found = await tryEq(normalized);

    // 2) eq(rawNoAt) => si handle stocké avec casse (ex: "Pouete")
    if (!found && rawNoAt && rawNoAt !== normalized) {
      found = await tryEq(rawNoAt);
    }

    // 3) ilike(normalized) => match case-insensitive (handles historiques)
    if (!found) {
      found = await tryIlike(normalized);
    }

    // 4) ilike(rawNoAt) => secours
    if (!found && rawNoAt && rawNoAt !== normalized) {
      found = await tryIlike(rawNoAt);
    }

    // 5) fallback url-normalisé (underscores / filtrage) si jamais la BDD stocke ce format
    if (!found) {
      const urlNorm = normalizeHandleForUrl(rawNoAt);
      if (urlNorm && urlNorm !== normalized && urlNorm !== rawNoAt) {
        log(`getProfileByHandle: fallback urlNorm="${urlNorm}" (depuis rawNoAt="${rawNoAt}")`);
        found = await tryEq(urlNorm);
        if (!found) found = await tryIlike(urlNorm);
      }
    }

    if (!found) {
      log(`getProfileByHandle: Aucun profil trouvé (raw="${rawNoAt}", normalized="${normalized}")`);
      return null;
    }

    log(`getProfileByHandle: Profil trouvé → id=${found.id}, handle=${found.handle}`);
    return pickProfile(found);
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
