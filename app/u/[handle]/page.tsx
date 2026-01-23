// =============================================================================
// Fichier      : app/u/[handle]/page.tsx
// Auteur       : Régis KREMER (Baithz) — EchoWorld
// Version      : 1.4.0 (2026-01-23)
// Objet        : Page profil public (par handle) - AVEC bannière + actions + isFollowing
// -----------------------------------------------------------------------------
// CHANGELOG
// 1.4.0 (2026-01-23)
// - [NEW] Passe currentUserId à ProfileView
// - [NEW] Calcul isFollowing via checkIfFollowing
// - [NEW] Stats enrichies (followers/following)
// 1.3.0 (2026-01-23)
// - [FIX] Next.js 15: await params
// =============================================================================

import { notFound, redirect } from 'next/navigation';
import ProfileView from '@/components/profile/ProfileView';
import {
  getPublicProfileDataByHandle,
  checkIfFollowing,
} from '@/lib/profile/getProfile';
import { getCurrentUserContext } from '@/lib/user/getCurrentUser';

type PageProps = {
  params: Promise<{ handle: string }>;
};

function cleanHandleForLookup(input: string): string {
  return (input ?? '').trim().replace(/^@/, '').trim();
}

function normalizeHandleForUrl(input: string): string {
  const raw = cleanHandleForLookup(input);
  if (!raw) return '';
  return raw
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 32);
}

export default async function PublicHandleProfilePage({ params }: PageProps) {
  const { handle } = await params;

  const handleLookup = cleanHandleForLookup(handle);
  if (!handleLookup) notFound();

  const { profile, echoes, stats } = await getPublicProfileDataByHandle(
    handleLookup,
    12
  );

  if (!profile) notFound();
  if (profile.public_profile_enabled === false) notFound();

  // Redirection URL canonique
  const canonical = normalizeHandleForUrl(profile.handle ?? '');
  const requestedCanonical = normalizeHandleForUrl(handleLookup);

  if (canonical && requestedCanonical && canonical !== requestedCanonical) {
    redirect(`/u/${canonical}`);
  }

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