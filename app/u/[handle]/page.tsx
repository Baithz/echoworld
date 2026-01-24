/**
 * =============================================================================
 * Fichier      : app/u/[handle]/page.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.6.0 (2026-01-24)
 * Objet        : Page profil public par handle (/u/baithz)
 * -----------------------------------------------------------------------------
 * CHANGELOG
 * 1.6.0 (2026-01-24)
 * - [FIX] Force-dynamic + revalidate=0 : session SSR fiable (cookies) => plus de faux "non connecté"
 * - [FIX] Suppression cache() : évite rendu statique/caché inter-users sur pages profil public
 * - [KEEP] Logique notFound inchangée + isFollowing calculé côté serveur
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
  params: { handle: string };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const handle = params.handle;
  const handleLookup = handle.startsWith('@') ? handle.slice(1) : handle;

  try {
    const { profile } = await getPublicProfileDataByHandle(handleLookup, 1);
    if (!profile) throw new Error('Profile not found');

    const displayName = profile.display_name || profile.handle || 'Utilisateur';

    return {
      title: `${displayName} (@${profile.handle}) • EchoWorld`,
      description: profile.bio || `Profil de ${displayName} sur EchoWorld.`,
    };
  } catch {
    return { title: 'Profil introuvable • EchoWorld' };
  }
}

export default async function PublicHandleProfilePage({ params }: PageProps) {
  const handle = params.handle;
  const handleLookup = handle.startsWith('@') ? handle.slice(1) : handle;

  let data;
  try {
    data = await getPublicProfileDataByHandle(handleLookup, 12);
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
