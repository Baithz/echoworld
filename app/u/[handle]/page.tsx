/**
 * =============================================================================
 * Fichier      : app/u/[handle]/page.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.6.2 (2026-01-24)
 * Objet        : Page profil public par handle (/u/baithz)
 * -----------------------------------------------------------------------------
 * CHANGELOG
 * 1.6.2 (2026-01-24)
 * - [FIX] Normalisation URL handle (cohérente partout) : lowercase + underscores + charset safe
 * - [KEEP] Force-dynamic + revalidate=0 + notFound + isFollowing inchangés
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
  const handleLookup = safeHandle(params?.handle);
  if (!handleLookup) return { title: 'Profil introuvable • EchoWorld' };

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
  const handleLookup = safeHandle(params?.handle);
  if (!handleLookup) notFound();

  let data: Awaited<ReturnType<typeof getPublicProfileDataByHandle>>;
  try {
    data = await getPublicProfileDataByHandle(handleLookup, 12);
    if (!data.profile) throw new Error('Profile not found');
  } catch {
    notFound();
  }

  const { profile, echoes, stats } = data;

  const { user } = await getCurrentUserContext();
  const currentUserId = user?.id ?? null;

  const isFollowing = currentUserId ? await checkIfFollowing(currentUserId, profile.id) : false;

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
