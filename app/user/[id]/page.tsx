// =============================================================================
// Fichier      : app/user/[id]/page.tsx
// Auteur       : Régis KREMER (Baithz) — EchoWorld
// Version      : 1.4.0 (2026-01-23)
// Objet        : Page profil (fallback par id) - AVEC bannière + actions + isFollowing
// -----------------------------------------------------------------------------
// CHANGELOG
// 1.4.0 (2026-01-23)
// - [NEW] Passe currentUserId à ProfileView
// - [NEW] Calcul isFollowing via checkIfFollowing
// - [NEW] Stats enrichies (followers/following)
// 1.3.0 (2026-01-23)
// - [FIX] Next.js 15: await params
// =============================================================================

import { notFound } from 'next/navigation';
import ProfileView from '@/components/profile/ProfileView';
import {
  getPublicProfileDataById,
  checkIfFollowing,
} from '@/lib/profile/getProfile';
import { getCurrentUserContext } from '@/lib/user/getCurrentUser';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function UserProfilePage({ params }: PageProps) {
  const { id } = await params;

  const { profile, echoes, stats } = await getPublicProfileDataById(id, 12);

  if (!profile) notFound();
  if (profile.public_profile_enabled === false) notFound();

  // Récupérer currentUser + vérifier si on suit ce profil
  const { user } = await getCurrentUserContext();
  const currentUserId = user?.id ?? null;

  const isFollowing = currentUserId
    ? await checkIfFollowing(currentUserId, profile.id)
    : false;

  return (
    <ProfileView
      profile={profile}
      echoes={echoes}
      stats={stats ?? undefined}
      currentUserId={currentUserId}
      isFollowing={isFollowing}
    />
  );
}