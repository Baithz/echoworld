// =============================================================================
// Fichier      : app/u/[handle]/page.tsx
// Auteur       : Régis KREMER (Baithz) — EchoWorld
// Version      : 1.2.1 (2026-01-23)
// Objet        : Page profil public (par handle) - profil + échos + stats (URL canonique)
// =============================================================================

import { notFound, redirect } from 'next/navigation';
import ProfileView from '@/components/profile/ProfileView';
import { getPublicProfileDataByHandle } from '@/lib/profile/getProfile';

type PageProps = {
  params: { handle: string };
};

// Doit matcher la logique front (GlobalSearch) + la logique serveur (getProfileByHandle)
function normalizeHandle(input: string): string {
  const raw = (input ?? '').trim().replace(/^@/, '').trim();
  if (!raw) return '';
  return raw
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 32);
}

export default async function PublicHandleProfilePage({ params }: PageProps) {
  const handle = normalizeHandle(params.handle);
  if (!handle) notFound();

  const { profile, echoes, stats } = await getPublicProfileDataByHandle(handle, 12);

  if (!profile) notFound();
  if (profile.public_profile_enabled === false) notFound();

  // Redirection URL canonique (normalisée) si besoin (évite boucle casing)
  const canonical = normalizeHandle(profile.handle ?? '');
  if (canonical && canonical !== handle) {
    redirect(`/u/${canonical}`);
  }

  return <ProfileView profile={profile} echoes={echoes} stats={stats ?? undefined} />;
}
