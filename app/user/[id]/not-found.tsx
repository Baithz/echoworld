// =============================================================================
// Fichier      : app/user/[id]/not-found.tsx
// Auteur       : Régis KREMER (Baithz) — EchoWorld
// Version      : 1.0.0 (2026-01-23)
// Objet        : 404 profil (id)
// =============================================================================

import Link from 'next/link';

export default function NotFoundUserProfile() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl shadow-black/5">
        <h1 className="text-xl font-extrabold text-slate-900">Profil introuvable</h1>
        <p className="mt-2 text-sm text-slate-600">
          Ce profil n’existe pas, ou n’est pas accessible publiquement.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          >
            Retour accueil
          </Link>

          <Link
            href="/explore"
            className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Explorer
          </Link>
        </div>
      </div>
    </div>
  );
}
