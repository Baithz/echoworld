/**
 * =============================================================================
 * Fichier      : app/u/[handle]/page.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.6.3 (2026-01-24)
 * Objet        : Page profil public par handle (/u/baithz)
 * -----------------------------------------------------------------------------
 * CHANGELOG
 * 1.6.3 (2026-01-24)
 * - [FIX] Params hardening Next 16: support params object OU Promise => plus de handle vide sur /u/[handle]
 * - [DEBUG] Logs SSR via EW_DEBUG=1 : page start + params resolved + handleLookup
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
