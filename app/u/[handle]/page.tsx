/**
 * =============================================================================
 * Fichier      : app/u/[handle]/page.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.5.1 (2026-01-23)
 * Objet        : Page profil public par handle (/u/baithz)
 * -----------------------------------------------------------------------------
 * CHANGELOG
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
import {
  getPublicProfileDataByHandle,
  checkIfFollowing,
} from '@/lib/profile/getProfile';
import { getCurrentUserContext } from '@/lib/user/getCurrentUser';

type PageProps = {
  params: Promise<{ handle: string }>;
};

const getCachedProfile = cache(
  async (handleLookup: string, echoLimit: number) => {
    return await getPublicProfileDataByHandle(handleLookup, echoLimit);
  }
);

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params;
  const handleLookup = handle.startsWith('@') ? handle.slice(1) : handle;

  try {
    const { profile } = await getCachedProfile(handleLookup, 1);
    if (!profile) throw new Error('Profile not found');
    
    const displayName = profile.display_name || profile.handle || 'Utilisateur';

    return {
      title: `${displayName} (@${profile.handle}) • EchoWorld`,
      description: profile.bio || `Profil de ${displayName} sur EchoWorld.`,
    };
  } catch {
    return {
      title: 'Profil introuvable • EchoWorld',
    };
  }
}

export default async function PublicHandleProfilePage({ params }: PageProps) {
  const { handle } = await params;
  const handleLookup = handle.startsWith('@') ? handle.slice(1) : handle;

  let data;
  try {
    data = await getCachedProfile(handleLookup, 12);
    if (!data.profile) throw new Error('Profile not found');
  } catch {
    notFound();
  }

  const { profile, echoes, stats } = data;

  // Récupération user actuel
  const { user } = await getCurrentUserContext();
  const currentUserId = user?.id ?? null;

  // Vérification si on suit ce profil
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