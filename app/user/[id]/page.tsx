/**
 * =============================================================================
 * Fichier      : app/user/[id]/page.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.6.0 (2026-01-24)
 * Objet        : Page profil public par ID (/user/uuid)
 * -----------------------------------------------------------------------------
 * CHANGELOG
 * 1.6.0 (2026-01-24)
 * - [FIX] Force-dynamic + revalidate=0 : session SSR fiable (cookies)
 * - [FIX] Suppression cache() : évite rendu statique/caché inter-users
 * - [KEEP] notFound + isFollowing serveur conservés
 * =============================================================================
 */

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ProfileView from '@/components/profile/ProfileView';
import { getPublicProfileDataById, checkIfFollowing } from '@/lib/profile/getProfile';
import { getCurrentUserContext } from '@/lib/user/getCurrentUser';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = {
  params: { id: string };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const id = params.id;

  try {
    const { profile } = await getPublicProfileDataById(id, 1);
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
  const id = params.id;

  let data;
  try {
    data = await getPublicProfileDataById(id, 12);
    if (!data.profile) throw new Error('Profile not found');
  } catch {
    notFound();
  }

  const { profile, echoes, stats } = data;

  const { user } = await getCurrentUserContext();
  const currentUserId = user?.id ?? null;

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
