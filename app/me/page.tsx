/**
 * =============================================================================
 * Fichier      : app/me/page.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 2.0.0 (2026-01-22)
 * Objet        : Mon espace personnel (version simple avec Header)
 * -----------------------------------------------------------------------------
 * Description  :
 * - Server Component (getCurrentUserContext côté serveur)
 * - Header navigation sticky intégré
 * - Affichage identité EchoWorld (handle, bio, mode)
 * - Pas de liste d'échos (version minimaliste)
 * - Design cohérent avec le reste de l'app
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 2.0.0 (2026-01-22)
 * - [NEW] Header navigation intégré (consistance UI)
 * - [FIX] Max-width harmonisé (max-w-6xl) + padding-top pour sticky header
 * - [IMPROVED] Design moderne : glassmorphism, transitions
 * - [KEEP] Server Component (pas de client-side interactions)
 * =============================================================================
 */

import Link from 'next/link';
import { getCurrentUserContext } from '@/lib/user/getCurrentUser';
import { redirect } from 'next/navigation';
import Header from '@/components/layout/Header';

export default async function MePage() {
  const { user, profile } = await getCurrentUserContext();
  if (!user) redirect('/login');

  // Safe initials helper
  const getInitials = (text: string | null | undefined): string => {
    const clean = (text || '').trim().replace(/\s+/g, ' ');
    if (!clean) return 'ME';
    const parts = clean.split(' ');
    const a = parts[0]?.[0] ?? 'M';
    const b = parts.length > 1 ? (parts[1]?.[0] ?? '') : (parts[0]?.[1] ?? '');
    return (a + b).toUpperCase();
  };

  const avatarInitials = getInitials(profile?.handle ?? 'ME');

  return (
    <>
      <Header />

      <main className="mx-auto w-full max-w-6xl px-6 pt-28 pb-20">
        {/* Header section */}
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Mon espace</h1>
            <p className="mt-2 text-slate-600">
              Identité calme, récits, et réglages de confidentialité.
            </p>
          </div>

          <Link
            href="/settings"
            className="rounded-xl border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-white"
          >
            Paramètres
          </Link>
        </div>

        {/* Identity card */}
        <section className="mt-10 rounded-3xl border border-slate-200 bg-white/70 p-6 backdrop-blur-md shadow-lg shadow-black/5">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-md">
              {profile?.avatar_type === 'image' && profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt="Avatar"
                  className="h-full w-full rounded-2xl object-cover"
                />
              ) : (
                <span className="text-xl font-bold">{avatarInitials}</span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-lg font-semibold text-slate-900">
                {profile?.handle ?? 'Identité sans nom'}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
                <span>
                  Mode : <span className="font-semibold">{profile?.identity_mode ?? 'symbolic'}</span>
                </span>
                <span>•</span>
                <span>
                  Langue : <span className="font-semibold">{profile?.lang_primary ?? 'en'}</span>
                </span>
              </div>
            </div>
          </div>

          {profile?.bio && (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm leading-relaxed text-slate-800">
              {profile.bio}
            </div>
          )}
        </section>

        {/* Next step: liste des derniers échos */}
        <section className="mt-10 rounded-3xl border border-slate-200 bg-white/70 p-6 backdrop-blur-md">
          <h2 className="text-xl font-bold text-slate-900">Mes derniers échos</h2>
          <p className="mt-2 text-sm text-slate-600">
            (V1) Liste simple — on branchera ensuite filtres / archive / visibilité.
          </p>

          <div className="mt-6">
            <Link
              href="/account"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.01]"
            >
              Voir la version complète
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}