/**
 * =============================================================================
 * Fichier      : app/user/[id]/page.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.6.0 (2026-01-24)
 * Objet        : Page profil public par ID (/user/uuid)
 * -----------------------------------------------------------------------------
 * Description  :
 * - Charge profil + échos + stats via getPublicProfileDataById()
 * - Expose currentUserId + isFollowing au ProfileView (actions activables)
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.6.0 (2026-01-24)
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
import { getPublicProfileDataById, checkIfFollowing } from '@/lib/profile/getProfile';
import { getCurrentUserContext } from '@/lib/user/getCurrentUser';

type PageProps = {
  params: { id: string };
};

const getCachedProfile = cache(async (userId: string, echoLimit: number) => {
  return await getPublicProfileDataById(userId, echoLimit);
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const id = (params.id ?? '').trim();
  if (!id) return { title: 'Profil introuvable • EchoWorld' };

  try {
    const { profile } = await getCachedProfile(id, 1);
    if (!profile) throw new Error('Profile not found');

    const displayName = profile.display_name || profile.handle || 'Utilisateur';

    return {
      title: `${displayName} • EchoWorld`,
      description: profile.bio || `Profil de ${displayName} sur EchoWorld.`,
    };
  } catch {
    return { title: 'Profil introuvable • EchoWorld' };
  }
}

export default async function PublicIdProfilePage({ params }: PageProps) {
  const id = (params.id ?? '').trim();
  if (!id) notFound();

  let data;
  try {
    data = await getCachedProfile(id, 12);
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
