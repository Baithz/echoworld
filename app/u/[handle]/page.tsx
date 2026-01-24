/**
 * =============================================================================
 * Fichier      : app/u/[handle]/page.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.6.3 (2026-01-24)
 * Objet        : Page profil public par handle (/u/baithz)
 * -----------------------------------------------------------------------------
 * CHANGELOG
 * 1.6.3 (2026-01-24)
 * - [DEBUG] Logs SSR gated par EW_DEBUG=1 (handle brut/normalisé + retours Supabase)
 * - [KEEP] Normalisation URL handle (lowercase + underscores + charset safe)
 * - [SAFE] Zéro régression : mêmes exports + même structure de rendu
 * =============================================================================
 */

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ProfileView from '@/components/profile/ProfileView';
import { getPublicProfileDataByHandle, checkIfFollowing } from '@/lib/profile/getProfile';
import { getCurrentUserContext } from '@/lib/user/getCurrentUser';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = {
  params: { handle?: string };
};

const EW_DEBUG = process.env.EW_DEBUG === '1';

function dlog(message: string, data?: unknown) {
  if (!EW_DEBUG) return;
  try {
    console.log(`[u/[handle]] ${message}`, data ?? '');
  } catch {
    /* noop */
  }
}

function derror(message: string, error?: unknown) {
  if (!EW_DEBUG) return;
  try {
    console.error(`[u/[handle]] ERROR: ${message}`, error ?? '');
  } catch {
    /* noop */
  }
}

/**
 * Handle safe + normalisé pour lookup.
 * Doit rester cohérent avec la règle utilisée côté UI lors de la création/modif du handle.
 */
function safeHandle(input: unknown): string {
  const raw = typeof input === 'string' ? input : '';
  const cleaned = raw.trim().replace(/^@/, '').trim();
  if (!cleaned) return '';
  return cleaned
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 32);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const handleRaw = params?.handle ?? '';
  const handleLookup = safeHandle(handleRaw);

  dlog('generateMetadata', { handleRaw, handleLookup });

  if (!handleLookup) return { title: 'Profil introuvable • EchoWorld' };

  try {
    const { profile } = await getPublicProfileDataByHandle(handleLookup, 1);

    dlog('generateMetadata result', {
      found: Boolean(profile),
      profileId: profile?.id ?? null,
      profileHandle: profile?.handle ?? null,
      publicEnabled: profile?.public_profile_enabled ?? null,
    });

    if (!profile) throw new Error('Profile not found');

    const displayName = profile.display_name || profile.handle || 'Utilisateur';

    return {
      title: `${displayName} (@${profile.handle}) • EchoWorld`,
      description: profile.bio || `Profil de ${displayName} sur EchoWorld.`,
    };
  } catch (e) {
    derror('generateMetadata failed', e);
    return { title: 'Profil introuvable • EchoWorld' };
  }
}

export default async function PublicHandleProfilePage({ params }: PageProps) {
  const handleRaw = params?.handle ?? '';
  const handleLookup = safeHandle(handleRaw);

  dlog('page start', { handleRaw, handleLookup });

  if (!handleLookup) {
    dlog('page notFound: empty handle');
    notFound();
  }

  let data: Awaited<ReturnType<typeof getPublicProfileDataByHandle>>;

  try {
    data = await getPublicProfileDataByHandle(handleLookup, 12);

    dlog('getPublicProfileDataByHandle', {
      found: Boolean(data?.profile),
      profileId: data?.profile?.id ?? null,
      profileHandle: data?.profile?.handle ?? null,
      publicEnabled: data?.profile?.public_profile_enabled ?? null,
      echoesCount: Array.isArray(data?.echoes) ? data.echoes.length : null,
      hasStats: Boolean(data?.stats),
    });

    if (!data.profile) throw new Error('Profile not found');
  } catch (e) {
    derror('page notFound: getPublicProfileDataByHandle failed', e);
    notFound();
  }

  const { profile, echoes, stats } = data;

  const { user } = await getCurrentUserContext();
  const currentUserId = user?.id ?? null;

  dlog('current user', { currentUserId });

  const isFollowing = currentUserId ? await checkIfFollowing(currentUserId, profile.id) : false;

  dlog('isFollowing', { currentUserId, targetUserId: profile.id, isFollowing });

  return (
    <ProfileView
      profile={profile}
      echoes={echoes ?? []}
      stats={stats ?? undefined}
      currentUserId={currentUserId}
      isFollowing={isFollowing}
    />
  );
}
