// =============================================================================
// Fichier      : app/user/[id]/page.tsx
// Auteur       : Régis KREMER (Baithz) — EchoWorld
// Version      : 1.2.0 (2026-01-23)
// Objet        : Page profil (fallback par id) - profil + échos + stats
// =============================================================================

import { notFound } from 'next/navigation';
import ProfileView from '@/components/profile/ProfileView';
import { getPublicProfileDataById } from '@/lib/profile/getProfile';

type PageProps = {
  params: { id: string };
};

export default async function UserProfilePage({ params }: PageProps) {
  const { profile, echoes, stats } = await getPublicProfileDataById(params.id, 12);

  if (!profile) notFound();
  if (profile.public_profile_enabled === false) notFound();

  return <ProfileView profile={profile} echoes={echoes} stats={stats ?? undefined} />;
}
