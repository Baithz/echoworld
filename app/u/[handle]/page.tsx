/**
 * =============================================================================
 * Fichier      : app/u/[handle]/page.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.6.0 (2026-01-24)
 * Objet        : Page profil public par handle (/u/baithz)
 * -----------------------------------------------------------------------------
 * Description  :
 * - Normalise le handle (lower) pour matcher l’index unique lower(handle)
 * - Charge profil + échos + stats via getPublicProfileDataByHandle()
 * - Expose currentUserId + isFollowing au ProfileView (actions activables)
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.6.0 (2026-01-24)
 * - [FIX] Normalisation handle (lower/trim/@) alignée avec l’index lower(handle)
 * - [FIX] Typage Next.js App Router : params non-Promise
 * - [KEEP] Cache React + comportement notFound identiques
 * 1.5.1 (2026-01-23)
 * - [FIX] Guards TypeScript : profile/stats peuvent être null après catch
 * 1.5.0 (2026-01-23)
 * - [FIX] Utilise getCurrentUserContext() (lib/user/getCurrentUser.ts)
 * =============================================================================
 */

import { notFound } from 'next/navigation';
import { cache } from 'react';
import type { Metadata } from 'next';
import ProfileView from '@/components/profile/ProfileView';
import { getPublicProfileDataByHandle, checkIfFollowing } from '@/lib/profile/getProfile';
import { getCurrentUserContext } from '@/lib/user/getCurrentUser';

type PageProps = {
  params: { handle: string };
};

// Doit matcher l’index unique: lower(handle)
function normalizeHandle(input: string): string {
  const raw = (input ?? '').trim().replace(/^@/, '').trim();
  if (!raw) return '';
  return raw
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 32);
}

const getCachedProfile = cache(async (handleLookup: string, echoLimit: number) => {
  return await getPublicProfileDataByHandle(handleLookup, echoLimit);
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const handleLookup = normalizeHandle(params.handle);

  try {
    const { profile } = await getCachedProfile(handleLookup, 1);
    if (!profile) throw new Error('Profile not found');

    const displayName = profile.display_name || profile.handle || 'Utilisateur';
    const shownHandle = profile.handle || handleLookup || 'user';

    return {
      title: `${displayName} (@${shownHandle}) • EchoWorld`,
      description: profile.bio || `Profil de ${displayName} sur EchoWorld.`,
    };
  } catch {
    return { title: 'Profil introuvable • EchoWorld' };
  }
}

export default async function PublicHandleProfilePage({ params }: PageProps) {
  const handleLookup = normalizeHandle(params.handle);
  if (!handleLookup) notFound();

  let data;
  try {
    data = await getCachedProfile(handleLookup, 12);
    if (!data.profile) throw new Error('Profile not found');
  } catch {
    notFound();
  }

  const { profile, echoes, stats } = data;

  // Récupération user actuel (viewer)
  const { user } = await getCurrentUserContext();
  const currentUserId = user?.id ?? null;

  // isFollowing fiable via table follows (RLS OK)
  const isFollowing = currentUserId
    ? await checkIfFollowing(currentUserId, profile.id)
    : false;

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
