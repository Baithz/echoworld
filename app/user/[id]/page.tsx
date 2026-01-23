// =============================================================================
// Fichier      : app/user/[id]/page.tsx
// Auteur       : Régis KREMER (Baithz) — EchoWorld
// Version      : 1.3.0 (2026-01-23)
// Objet        : Page profil (fallback par id) - Next.js 15 compatible
// -----------------------------------------------------------------------------
// CHANGELOG
// 1.3.0 (2026-01-23)
// - [FIX] Next.js 15: params est maintenant async (Promise)
// 1.2.0 (2026-01-23)
// - Version initiale
// =============================================================================

import { notFound } from 'next/navigation';
import ProfileView from '@/components/profile/ProfileView';
import { getPublicProfileDataById } from '@/lib/profile/getProfile';

type PageProps = {
  params: Promise<{ id: string }>;  // Next.js 15: params est async
};

export default async function UserProfilePage({ params }: PageProps) {
  // Next.js 15: await params
  const { id } = await params;
  
  const { profile, echoes, stats } = await getPublicProfileDataById(id, 12);

  if (!profile) notFound();
  if (profile.public_profile_enabled === false) notFound();

  return <ProfileView profile={profile} echoes={echoes} stats={stats ?? undefined} />;
}