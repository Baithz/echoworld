// =============================================================================
// Fichier      : app/u/[handle]/page.tsx
// Auteur       : Régis KREMER (Baithz) — EchoWorld
// Version      : 1.2.0 (2026-01-23)
// Objet        : Page profil public (par handle) - profil + échos + stats (URL canonique)
// =============================================================================

import { notFound, redirect } from 'next/navigation';
import ProfileView from '@/components/profile/ProfileView';
import { getPublicProfileDataByHandle } from '@/lib/profile/getProfile';

type PageProps = {
  params: { handle: string };
};

export default async function PublicHandleProfilePage({ params }: PageProps) {
  const handle = (params.handle ?? '').trim().replace(/^@/, '');
  if (!handle) notFound();

  const { profile, echoes, stats } = await getPublicProfileDataByHandle(handle, 12);

  if (!profile) notFound();
  if (profile.public_profile_enabled === false) notFound();

  // Redirection URL canonique si besoin
  if (profile.handle && profile.handle !== handle) {
    redirect(`/u/${profile.handle}`);
  }

  return <ProfileView profile={profile} echoes={echoes} stats={stats ?? undefined} />;
}
