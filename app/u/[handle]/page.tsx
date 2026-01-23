// =============================================================================
// Fichier      : app/u/[handle]/page.tsx
// Auteur       : Régis KREMER (Baithz) — EchoWorld
// Version      : 1.2.2 (2026-01-23)
// Objet        : Page profil public (par handle) - profil + échos + stats (URL canonique)
// -----------------------------------------------------------------------------
// CHANGELOG
// 1.2.2 (2026-01-23)
// - [FIX] Lookup handle : ne slugifie plus avant requête DB (source of truth = DB)
// - [IMPROVED] Ajout cleanHandleForLookup + normalizeHandleForUrl (canonique URL)
// =============================================================================

import { notFound, redirect } from 'next/navigation';
import ProfileView from '@/components/profile/ProfileView';
import { getPublicProfileDataByHandle } from '@/lib/profile/getProfile';

type PageProps = {
  params: { handle: string };
};

// Doit matcher la logique serveur : on ne slugifie PAS pour requêter.
function cleanHandleForLookup(input: string): string {
  return (input ?? '').trim().replace(/^@/, '').trim();
}

// Canonical URL (slug) pour redirection uniquement
function normalizeHandleForUrl(input: string): string {
  const raw = cleanHandleForLookup(input);
  if (!raw) return '';
  return raw
    .toLowerCase()
    .replace(/\s+/g, '_')
    // IMPORTANT : on garde aussi '.' car beaucoup de handles l'utilisent
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 32);
}

export default async function PublicHandleProfilePage({ params }: PageProps) {
  const handleLookup = cleanHandleForLookup(params.handle);
  if (!handleLookup) notFound();

  const { profile, echoes, stats } = await getPublicProfileDataByHandle(handleLookup, 12);

  if (!profile) notFound();
  if (profile.public_profile_enabled === false) notFound();

  // Redirection URL canonique (normalisée) si besoin
  const canonical = normalizeHandleForUrl(profile.handle ?? '');
  const requestedCanonical = normalizeHandleForUrl(handleLookup);

  if (canonical && requestedCanonical && canonical !== requestedCanonical) {
    redirect(`/u/${canonical}`);
  }

  return <ProfileView profile={profile} echoes={echoes} stats={stats ?? undefined} />;
}
