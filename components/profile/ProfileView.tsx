// =============================================================================
// Fichier      : components/profile/ProfileView.tsx
// Auteur       : Régis KREMER (Baithz) — EchoWorld
// Version      : 2.4.0 (2026-01-27)
// Objet        : Vue UI profil public premium (bannière, avatar, actions, échos)
// -----------------------------------------------------------------------------
// CHANGELOG
// 2.4.0 (2026-01-27)
// - [PHASE 4] Avatar: utilise avatar_type/avatar_seed quand présents + FAIL-SOFT sans casts "unknown as"
// - [SAFE] Rendu inchangé si colonnes absentes: fallback sur avatar_url uniquement
// - [CLEAN] Supprime parsing local AvatarType devenu inutile (délégué à PublicProfile + fallbacks)
// 2.3.1 (2026-01-27)
// - [CLEAN] Suppression de la fonction initials non utilisée (ESLint no-unused-vars)
// 2.3.0 (2026-01-27)
// - [FIX] Typage AvatarType + suppression fallbackInitials (ESLint/TS OK, rendu inchangé)
// 2.2.0 (2026-01-27)
// - [REFACTOR] Avatar délégué au composant unifié ProfileAvatar (même rendu, sans régression)
// 2.1.0 (2026-01-23)
// - [FIX] Ajout pt-28 pour compenser le header fixe (évite superposition)
// 2.0.0 (2026-01-23)
// - [NEW] Ajout bannière avec banner_url + banner_pos_y (comme /account)
// - [NEW] Boutons "Suivre" et "Message" (ProfileActions)
// - [IMPROVED] Layout pleine largeur + design cohérent avec /account
// - [IMPROVED] Avatar plus grand avec border
// - [IMPROVED] Stats enrichies (followers/following)
// 1.1.0 (2026-01-23)
// - Version initiale basique
// =============================================================================

'use client';

import { User, MapPin } from 'lucide-react';
import type { PublicProfile, PublicEcho } from '@/lib/profile/getProfile';
import ProfileEchoList from '@/components/profile/ProfileEchoList';
import ProfileActions from '@/components/profile/ProfileActions';
import ProfileAvatar, { type AvatarType } from '@/components/profile/ProfileAvatar';

type Props = {
  profile: PublicProfile;
  echoes?: PublicEcho[];
  stats?: {
    echoesCount?: number;
    followersCount?: number;
    followingCount?: number;
    topThemes?: string[];
    location?: { country?: string | null; city?: string | null };
  };
  currentUserId?: string | null;
  isFollowing?: boolean;
};

function bannerObjectPosition(offsetY: number): string {
  return `center calc(50% + ${offsetY}px)`;
}

function isAvatarType(v: unknown): v is AvatarType {
  return v === 'image' || v === 'symbol' || v === 'color' || v === 'constellation';
}

export default function ProfileView({
  profile,
  echoes = [],
  stats,
  currentUserId = null,
  isFollowing = false,
}: Props) {
  const label = profile.display_name ?? profile.handle ?? 'User';
  const handle = profile.handle ? `@${profile.handle}` : null;
  const isOwnProfile = currentUserId && currentUserId === profile.id;

  const bannerPosY = Number.isFinite(Number(profile.banner_pos_y))
    ? Number(profile.banner_pos_y)
    : 0;

  const location = [stats?.location?.city, stats?.location?.country]
    .filter(Boolean)
    .join(', ');

  // ---------------------------------------------------------------------------
  // Avatar (Phase 4) — FAIL-SOFT :
  // - si PublicProfile ne contient pas encore avatar_type/avatar_seed => undefined/null
  // - fallback: si avatar_url existe => image, sinon constellation (ProfileAvatar gère les fallbacks)
  // ---------------------------------------------------------------------------
  const avatarType: AvatarType | null =
    isAvatarType((profile as unknown as { avatar_type?: unknown }).avatar_type)
      ? ((profile as unknown as { avatar_type?: AvatarType }).avatar_type ?? null)
      : profile.avatar_url
        ? 'image'
        : null;

  const avatarSeed: string | null =
    typeof (profile as unknown as { avatar_seed?: unknown }).avatar_seed === 'string'
      ? ((profile as unknown as { avatar_seed?: string }).avatar_seed ?? null)
      : null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 pt-28">
      {/* Card principale */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-black/5">
        {/* Bannière */}
        <div className="relative h-64 w-full overflow-hidden bg-linear-to-br from-violet-500/20 via-sky-500/15 to-emerald-500/10">
          {profile.banner_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.banner_url}
              alt="Bannière"
              className="h-full w-full object-cover"
              style={{ objectPosition: bannerObjectPosition(bannerPosY) }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <div className="text-sm font-semibold text-slate-400">
                {isOwnProfile ? 'Ajoute une bannière dans ton profil' : ''}
              </div>
            </div>
          )}
        </div>

        {/* Conteneur glass (comme /account) */}
        <div className="relative -mt-16 rounded-3xl border border-white/30 bg-white/35 px-6 pb-6 backdrop-blur-md shadow-lg shadow-black/5">
          <div className="px-6 pb-6 pt-20">
            {/* Avatar */}
            <div className="absolute left-6 top-0 -translate-y-1/2">
              <ProfileAvatar
                id={profile.id}
                handle={profile.handle ?? null}
                displayName={profile.display_name ?? null}
                avatarType={avatarType}
                avatarUrl={profile.avatar_url ?? null}
                avatarSeed={avatarSeed}
                size={128}
                className="bg-white"
                borderClassName="border-4 border-white"
                alt={`Avatar de ${label}`}
              />
            </div>

            {/* Header identity + actions */}
            <div className="pl-0 md:pl-40">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-slate-900">{label}</h1>
                  {handle && <div className="mt-1 text-sm text-slate-500">{handle}</div>}
                </div>

                {/* Actions (Suivre / Message) */}
                {!isOwnProfile && (
                  <ProfileActions
                    profileId={profile.id}
                    currentUserId={currentUserId}
                    isFollowing={isFollowing}
                  />
                )}
              </div>

              {/* Bio */}
              {profile.bio && (
                <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                  {profile.bio}
                </p>
              )}

              {/* Localisation */}
              {location && (
                <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                  <MapPin className="h-4 w-4" />
                  <span>{location}</span>
                </div>
              )}

              {/* Stats */}
              <div className="mt-5 flex flex-wrap gap-4 text-sm">
                {typeof stats?.echoesCount === 'number' && (
                  <div>
                    <span className="font-bold text-slate-900">{stats.echoesCount}</span>{' '}
                    <span className="text-slate-600">échos</span>
                  </div>
                )}

                {typeof stats?.followersCount === 'number' && (
                  <div>
                    <span className="font-bold text-slate-900">{stats.followersCount}</span>{' '}
                    <span className="text-slate-600">abonnés</span>
                  </div>
                )}

                {typeof stats?.followingCount === 'number' && (
                  <div>
                    <span className="font-bold text-slate-900">{stats.followingCount}</span>{' '}
                    <span className="text-slate-600">abonnements</span>
                  </div>
                )}
              </div>

              {/* Top thèmes */}
              {stats?.topThemes && stats.topThemes.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {stats.topThemes.map((theme) => (
                    <span
                      key={theme}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700"
                    >
                      {theme}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer "Profil public" */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 text-xs text-slate-500 sm:px-8">
          <div className="flex items-center gap-2">
            <User className="h-3 w-3" />
            <span>Profil public</span>
          </div>
        </div>
      </div>

      {/* Échos */}
      <div className="mt-8">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-700">
            Échos
          </h2>
          <span className="text-xs text-slate-500">
            Publics (world/local) • published
          </span>
        </div>

        <ProfileEchoList echoes={echoes} currentUserId={currentUserId} />
      </div>
    </div>
  );
}
