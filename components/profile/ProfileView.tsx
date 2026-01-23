// =============================================================================
// Fichier      : components/profile/ProfileView.tsx
// Auteur       : Régis KREMER (Baithz) — EchoWorld
// Version      : 2.1.0 (2026-01-23)
// Objet        : Vue UI profil public premium (bannière, avatar, actions, échos)
// -----------------------------------------------------------------------------
// CHANGELOG
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

function initials(name: string) {
  const parts = (name ?? '')
    .trim()
    .split(/\s+/g)
    .filter(Boolean);
  const a = parts[0]?.[0] ?? 'U';
  const b = parts[1]?.[0] ?? '';
  return (a + b).toUpperCase();
}

function bannerObjectPosition(offsetY: number): string {
  return `center calc(50% + ${offsetY}px)`;
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
              <div className="inline-flex h-32 w-32 items-center justify-center overflow-hidden rounded-3xl border-4 border-white bg-white shadow-xl">
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt={`Avatar de ${label}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-bold text-slate-900">
                    {initials(label)}
                  </span>
                )}
              </div>
            </div>

            {/* Header identity + actions */}
            <div className="pl-0 md:pl-40">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-slate-900">{label}</h1>
                  {handle && (
                    <div className="mt-1 text-sm text-slate-500">{handle}</div>
                  )}
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
                    <span className="font-bold text-slate-900">
                      {stats.echoesCount}
                    </span>{' '}
                    <span className="text-slate-600">échos</span>
                  </div>
                )}

                {typeof stats?.followersCount === 'number' && (
                  <div>
                    <span className="font-bold text-slate-900">
                      {stats.followersCount}
                    </span>{' '}
                    <span className="text-slate-600">abonnés</span>
                  </div>
                )}

                {typeof stats?.followingCount === 'number' && (
                  <div>
                    <span className="font-bold text-slate-900">
                      {stats.followingCount}
                    </span>{' '}
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