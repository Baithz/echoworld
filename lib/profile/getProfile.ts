// =============================================================================
// Fichier      : lib/profile/getProfile.ts
// Auteur       : Régis KREMER (Baithz) – EchoWorld
// Version      : 1.3.0 (2026-01-23)
// Objet        : Helpers serveur pour récupérer un profil + échos/stats (public)
// ----------------------------------------------------------------------------
// Règles :
// - Respecte profiles.public_profile_enabled (false => profil non accessible)
// - Échos publics : status=published + visibility in (world, local)
// - SAFE: fail-soft => null / [] / 0 AVEC LOGS
// - TS strict: aucun accès à profile sans check non-null explicite
//
// Notes:
// - La base utilise désormais profiles.public_profile_enabled (colonne) côté RLS.
// - Les helpers "bundle" évitent tout type-guard ambigu -> guards explicites.
// -----------------------------------------------------------------------------
// CHANGELOG
// 1.3.0 (2026-01-23)
// - [FIX] Ajout logs diagnostic pour identifier cause 404
// - [FIX] getProfileByHandle : normalisation cohérente avec queries.ts
// - [IMPROVED] Gestion erreurs explicite avec logging
// - [IMPROVED] Fallback handle : utilise maintenant ilike case-insensitive d'abord
// 1.2.4 (2026-01-23)
// - [FIX] getProfileByHandle : ne "slugifie" plus le handle avant lookup DB
// - [IMPROVED] Ajout cleanHandleForLookup + normalizeHandleForUrl (source of truth = DB)
// =============================================================================

import { createSupabaseServerClient } from '@/lib/supabase/server';

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// CONSTANTS
// ============================================================================

const PROFILE_SELECT =
  'id, handle, display_name, avatar_url, bio, public_profile_enabled' as const;

const ECHO_SELECT =
  'id, user_id, title, content, emotion, is_anonymous, country, city, language, created_at, status, visibility, emotion_tags, theme_tags' as const;

const DEBUG = process.env.NODE_ENV === 'development';

// ============================================================================
// HANDLE NORMALIZATION (cohérent avec queries.ts)
// ============================================================================

/**
 * Normalisation pour lookup DB (case-insensitive avec ilike)
 * On retire juste '@' + trim, pas de transformation agressive
 */
function cleanHandleForLookup(input: string): string {
  return (input ?? '').trim().replace(/^@/, '').trim();
}

/**
 * Normalisation pour URL canonique (slug safe)
 * DOIT MATCHER exactement queries.ts normalizeHandle()
 */
export function normalizeHandleForUrl(input: string): string {
  const raw = cleanHandleForLookup(input);
  if (!raw) return '';
  return raw
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9._-]/g, '') // IMPORTANT: on garde '.' pour compatibilité
    .slice(0, 32);
}

// ============================================================================
// HELPERS INTERNES
// ============================================================================

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

function log(message: string, data?: unknown) {
  if (DEBUG) {
    console.log(`[getProfile] ${message}`, data ?? '');
  }
}

function logError(message: string, error?: unknown) {
  console.error(`[getProfile] ERROR: ${message}`, error ?? '');
}

// ============================================================================
// GETTERS PUBLICS
// ============================================================================

/**
 * Récupère un profil par ID (UUID)
 * @param id UUID du profil
 * @returns PublicProfile ou null
 */
export async function getProfileById(id: string): Promise<PublicProfile | null> {
  const clean = (id ?? '').trim();
  if (!clean) {
    log('getProfileById: ID vide');
    return null;
  }

  log(`getProfileById: Recherche profil id=${clean}`);

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

    const profile = pickProfile(data);
    log(`getProfileById: Profil trouvé`, {
      id: profile.id,
      handle: profile.handle,
      public_profile_enabled: profile.public_profile_enabled,
    });

    return profile;
  } catch (err) {
    logError(`getProfileById: Exception pour id=${clean}`, err);
    return null;
  }
}

/**
 * Récupère un profil par handle
 * Stratégie de recherche :
 * 1. Lookup direct case-insensitive (ilike)
 * 2. Fallback avec handle normalisé (slug) si différent
 * 
 * @param handle Handle utilisateur (avec ou sans @)
 * @returns PublicProfile ou null
 */
export async function getProfileByHandle(handle: string): Promise<PublicProfile | null> {
  const clean = cleanHandleForLookup(handle);
  if (!clean) {
    log('getProfileByHandle: Handle vide');
    return null;
  }

  log(`getProfileByHandle: Recherche handle="${clean}"`);

  try {
    const supabase = await createSupabaseServerClient();

    // 1) Lookup direct (case-insensitive avec ilike)
    // ilike sans wildcard = match exact case-insensitive
    log(`getProfileByHandle: Tentative 1 - ilike exact "${clean}"`);
    
    const first = await supabase
      .from('profiles')
      .select(PROFILE_SELECT)
      .ilike('handle', clean)
      .maybeSingle<ProfileRow>();

    if (!first.error && first.data) {
      const profile = pickProfile(first.data);
      log(`getProfileByHandle: Profil trouvé (exact match)`, {
        id: profile.id,
        handle: profile.handle,
        public_profile_enabled: profile.public_profile_enabled,
      });
      return profile;
    }

    if (first.error) {
      logError(`getProfileByHandle: Erreur tentative 1 pour handle="${clean}"`, first.error);
    } else {
      log(`getProfileByHandle: Aucun résultat tentative 1`);
    }

    // 2) Fallback : handle normalisé (slug)
    // Si l'URL a été "slugifiée" côté front, on tente la version normalisée
    const normalized = normalizeHandleForUrl(clean);
    
    if (normalized && normalized !== clean.toLowerCase()) {
      log(`getProfileByHandle: Tentative 2 - ilike normalized "${normalized}"`);
      
      const second = await supabase
        .from('profiles')
        .select(PROFILE_SELECT)
        .ilike('handle', normalized)
        .maybeSingle<ProfileRow>();

      if (!second.error && second.data) {
        const profile = pickProfile(second.data);
        log(`getProfileByHandle: Profil trouvé (normalized match)`, {
          id: profile.id,
          handle: profile.handle,
          public_profile_enabled: profile.public_profile_enabled,
        });
        return profile;
      }

      if (second.error) {
        logError(`getProfileByHandle: Erreur tentative 2 pour normalized="${normalized}"`, second.error);
      } else {
        log(`getProfileByHandle: Aucun résultat tentative 2`);
      }
    }

    log(`getProfileByHandle: Aucun profil trouvé pour handle="${clean}"`);
    return null;
  } catch (err) {
    logError(`getProfileByHandle: Exception pour handle="${clean}"`, err);
    return null;
  }
}

/**
 * Récupère les échos publics d'un utilisateur
 * Échos publics = status=published + visibility in (world, local)
 */
export async function getUserPublicEchoes(userId: string, limit = 12): Promise<PublicEcho[]> {
  const clean = (userId ?? '').trim();
  if (!clean) {
    log('getUserPublicEchoes: userId vide');
    return [];
  }

  const safeLimit = Math.max(1, Math.min(Number.isFinite(limit) ? Math.floor(limit) : 12, 50));

  log(`getUserPublicEchoes: Recherche échos pour userId=${clean}, limit=${safeLimit}`);

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

    if (error) {
      logError(`getUserPublicEchoes: Erreur pour userId=${clean}`, error);
      return [];
    }

    if (!data) {
      log(`getUserPublicEchoes: Aucun écho trouvé pour userId=${clean}`);
      return [];
    }

    const echoes = (data as unknown as EchoRow[]).map(pickEcho);
    log(`getUserPublicEchoes: ${echoes.length} échos trouvés pour userId=${clean}`);

    return echoes;
  } catch (err) {
    logError(`getUserPublicEchoes: Exception pour userId=${clean}`, err);
    return [];
  }
}

/**
 * Count réel des échos publics (non limité)
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

/**
 * Top themes (agrégation simple en mémoire)
 * On scanne un nombre raisonnable d'échos récents
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

// ============================================================================
// HELPERS "BUNDLE" (profile + echoes + stats)
// ============================================================================

export async function getPublicProfileWithEchoesById(userId: string, limit = 12): Promise<{
  profile: PublicProfile | null;
  echoes: PublicEcho[];
}> {
  const profile = await getProfileById(userId);
  if (!profile) {
    log(`getPublicProfileWithEchoesById: Profil non trouvé pour id=${userId}`);
    return { profile: null, echoes: [] };
  }
  
  if (profile.public_profile_enabled === false) {
    log(`getPublicProfileWithEchoesById: Profil non public pour id=${userId}`);
    return { profile: null, echoes: [] };
  }

  const profileId = profile.id;
  const echoes = await getUserPublicEchoes(profileId, limit);

  return { profile, echoes };
}

export async function getPublicProfileWithEchoesByHandle(handle: string, limit = 12): Promise<{
  profile: PublicProfile | null;
  echoes: PublicEcho[];
}> {
  const profile = await getProfileByHandle(handle);
  if (!profile) {
    log(`getPublicProfileWithEchoesByHandle: Profil non trouvé pour handle=${handle}`);
    return { profile: null, echoes: [] };
  }
  
  if (profile.public_profile_enabled === false) {
    log(`getPublicProfileWithEchoesByHandle: Profil non public pour handle=${handle}`);
    return { profile: null, echoes: [] };
  }

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
  if (!profile) {
    log(`getPublicProfileDataById: Profil non trouvé pour id=${userId}`);
    return { profile: null, echoes: [], stats: null };
  }
  
  if (profile.public_profile_enabled === false) {
    log(`getPublicProfileDataById: Profil non public (public_profile_enabled=false) pour id=${userId}`);
    return { profile: null, echoes: [], stats: null };
  }

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
  if (!profile) {
    log(`getPublicProfileDataByHandle: Profil non trouvé pour handle=${handle}`);
    return { profile: null, echoes: [], stats: null };
  }
  
  if (profile.public_profile_enabled === false) {
    log(`getPublicProfileDataByHandle: Profil non public (public_profile_enabled=false) pour handle=${handle}`);
    return { profile: null, echoes: [], stats: null };
  }

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