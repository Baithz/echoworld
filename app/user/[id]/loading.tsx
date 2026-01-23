// =============================================================================
// Fichier      : app/user/[id]/loading.tsx
// Auteur       : Régis KREMER (Baithz) — EchoWorld
// Version      : 1.0.0 (2026-01-23)
// Objet        : Skeleton loading profil (id)
// =============================================================================

export default function LoadingUserProfile() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-black/5">
        <div className="flex items-start gap-4 p-6 sm:p-8">
          <div className="h-16 w-16 rounded-2xl border border-slate-200 bg-slate-100" />
          <div className="min-w-0 flex-1">
            <div className="h-6 w-56 rounded-lg bg-slate-100" />
            <div className="mt-2 h-4 w-40 rounded-lg bg-slate-100" />
            <div className="mt-6 space-y-2">
              <div className="h-4 w-full rounded-lg bg-slate-100" />
              <div className="h-4 w-5/6 rounded-lg bg-slate-100" />
              <div className="h-4 w-3/4 rounded-lg bg-slate-100" />
            </div>
          </div>
        </div>
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 text-xs text-slate-500 sm:px-8">
          Chargement du profil…
        </div>
      </div>
    </div>
  );
}
