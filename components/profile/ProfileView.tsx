// =============================================================================
// Fichier      : components/profile/ProfileView.tsx
// Auteur       : Régis KREMER (Baithz) — EchoWorld
// Version      : 1.1.0 (2026-01-23)
// Objet        : Vue UI profil public (avatar, handle, bio, échos) - premium
// =============================================================================

'use client';

import { User } from 'lucide-react';
import type { PublicProfile, PublicEcho } from '@/lib/profile/getProfile';
import ProfileEchoList from '@/components/profile/ProfileEchoList';

type Props = {
  profile: PublicProfile;
  echoes?: PublicEcho[];
  stats?: {
    echoesCount?: number;
    topThemes?: string[];
    location?: { country?: string | null; city?: string | null };
  };
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

export default function ProfileView({ profile, echoes = [], stats }: Props) {
  const label = profile.display_name ?? profile.handle ?? 'User';
  const handle = profile.handle ? `@${profile.handle}` : null;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-black/5">
        <div className="flex items-start gap-4 p-6 sm:p-8">
          <div className="inline-flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-base font-extrabold text-slate-700">{initials(label)}</span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-1">
              <h1 className="truncate text-xl font-extrabold text-slate-900">{label}</h1>
              <div className="truncate text-sm text-slate-500">{handle ?? `id: ${profile.id}`}</div>
            </div>

            {profile.bio ? (
              <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                {profile.bio}
              </p>
            ) : (
              <p className="mt-4 text-sm text-slate-500">Aucune bio pour le moment.</p>
            )}

            {(stats?.echoesCount || stats?.location?.country || stats?.location?.city) ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {typeof stats.echoesCount === 'number' ? (
                  <span className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                    {stats.echoesCount} échos
                  </span>
                ) : null}
                {stats.location?.city || stats.location?.country ? (
                  <span className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                    {[stats.location.city, stats.location.country].filter(Boolean).join(', ')}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="hidden sm:flex">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500">
              <User className="h-5 w-5" />
            </span>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 text-xs text-slate-500 sm:px-8">
          Profil public
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-700">Échos</h2>
          <span className="text-xs text-slate-500">Publics (world/local) • published</span>
        </div>

        <ProfileEchoList echoes={echoes} />
      </div>
    </div>
  );
}
