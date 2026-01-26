/**
 * =============================================================================
 * Fichier      : app/u/[handle]/page.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.6.4 (2026-01-26)
 * Objet        : Page profil public par handle (/u/baithz) — canonisation + handle aligné
 * -----------------------------------------------------------------------------
 * Description  :
 * - Normalisation handle alignée Settings/DB (a-z0-9_- ; max 24)
 * - Redirection canonique si handle brut != handle normalisé (évite 404 incohérents)
 * - Conserve : force-dynamic, revalidate=0, notFound, debug EW_DEBUG, isFollowing, rendu ProfileView
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.6.4 (2026-01-26)
 * - [FIX] Aligne safeHandle() sur la règle handle (Settings/DB) + max 24
 * - [IMPROVED] Canonical redirect /u/<handle> si l’URL n’est pas normalisée
 * - [KEEP] Force-dynamic + revalidate=0 + notFound + debug + isFollowing inchangés
 * - [SAFE] Zéro régression : mêmes exports + même structure de rendu
 * =============================================================================
 */

import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import ProfileView from '@/components/profile/ProfileView';
import { getPublicProfileDataByHandle, checkIfFollowing } from '@/lib/profile/getProfile';
import { getCurrentUserContext } from '@/lib/user/getCurrentUser';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type ParamsShape = { handle?: string };

type PageProps = {
  // Next peut fournir params comme objet OU Promise selon runtime
  params: ParamsShape | Promise<ParamsShape>;
};

function isDebugEnabled(): boolean {
  return process.env.EW_DEBUG === '1';
}

function debugLog(message: string, data?: unknown) {
  if (!isDebugEnabled()) return;
  try {
    console.log(`[u/[handle]] ${message}`, data ?? '');
  } catch {
    /* noop */
  }
}

function debugError(message: string, data?: unknown) {
  if (!isDebugEnabled()) return;
  try {
    console.error(`[u/[handle]] ERROR ${message}`, data ?? '');
  } catch {
    /* noop */
  }
}

/**
 * Handle safe + normalisé pour lookup.
 * IMPORTANT: doit matcher la règle Settings + DB:
 * - lowercase
 * - espaces => _
 * - autorise uniquement [a-z0-9_-]
 * - max 24
 */
function safeHandle(input: unknown): string {
  const raw = typeof input === 'string' ? input : '';
  const cleaned = raw.trim().replace(/^@/, '').trim();
  if (!cleaned) return '';
  return cleaned
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 24);
}

async function resolveParams(p: PageProps['params']): Promise<ParamsShape> {
  try {
    // Si c’est une Promise, on await, sinon on renvoie l’objet
    const maybePromise = p as unknown as { then?: (fn: (v: ParamsShape) => void) => void };
    if (maybePromise && typeof maybePromise.then === 'function') {
      return (await (p as Promise<ParamsShape>)) ?? {};
    }
    return (p as ParamsShape) ?? {};
  } catch (e) {
    debugError('resolveParams failed', e);
    return {};
  }
}

function shouldCanonicalRedirect(raw: string, normalized: string): boolean {
  if (!raw) return false;
  const trimmed = raw.trim().replace(/^@/, '').trim();
  if (!trimmed) return false;
  // Si la version “entrée” ne correspond pas au normalisé, on canonise
  return trimmed !== normalized;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolved = await resolveParams(params);
  const handleRaw = resolved?.handle ?? '';
  const handleLookup = safeHandle(handleRaw);

  debugLog('generateMetadata', { handleRaw, handleLookup });

  if (!handleLookup) return { title: 'Profil introuvable • EchoWorld' };

  try {
    const { profile } = await getPublicProfileDataByHandle(handleLookup, 1);
    if (!profile) throw new Error('Profile not found');

    const displayName = profile.display_name || profile.handle || 'Utilisateur';

    return {
      title: `${displayName} (@${profile.handle}) • EchoWorld`,
      description: profile.bio || `Profil de ${displayName} sur EchoWorld.`,
    };
  } catch (e) {
    debugError('generateMetadata failed', e);
    return { title: 'Profil introuvable • EchoWorld' };
  }
}

export default async function PublicHandleProfilePage({ params }: PageProps) {
  debugLog('page start (raw props)', { paramsType: typeof params });

  const resolved = await resolveParams(params);
  const handleRaw = resolved?.handle ?? '';
  const handleLookup = safeHandle(handleRaw);

  debugLog('page resolved params', { handleRaw, handleLookup });

  if (!handleLookup) {
    debugLog('page notFound: empty handle');
    notFound();
  }

  // Canonical redirect (évite incohérences / 404 si casing ou caractères non autorisés)
  if (shouldCanonicalRedirect(handleRaw, handleLookup)) {
    debugLog('canonical redirect', { from: handleRaw, to: handleLookup });
    redirect(`/u/${handleLookup}`);
  }

  let data: Awaited<ReturnType<typeof getPublicProfileDataByHandle>>;
  try {
    debugLog('fetch profile start', { handleLookup });
    data = await getPublicProfileDataByHandle(handleLookup, 12);
    debugLog('fetch profile done', { found: Boolean(data?.profile), id: data?.profile?.id ?? null });

    if (!data.profile) throw new Error('Profile not found');
  } catch (e) {
    debugError('page fetch failed', e);
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
