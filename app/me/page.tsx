import Link from 'next/link'
import { getCurrentUserContext } from '@/lib/user/getCurrentUser'
import { redirect } from 'next/navigation'

export default async function MePage() {
  const { user, profile } = await getCurrentUserContext()
  if (!user) redirect('/login')

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Mon espace</h1>
          <p className="mt-2 text-slate-600">
            Identité calme, récits, et réglages de confidentialité.
          </p>
        </div>
        <Link
          href="/settings"
          className="rounded-xl border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-white"
        >
          Paramètres
        </Link>
      </div>

      <section className="mt-10 rounded-3xl border border-slate-200 bg-white/70 p-6 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-900">
            {/* Avatar symbolique (V1) */}
            <span className="text-xl font-bold">
              {(profile?.handle ?? 'ME').slice(0, 2).toUpperCase()}
            </span>
          </div>

          <div className="min-w-0">
            <div className="truncate text-lg font-semibold text-slate-900">
              {profile?.handle ?? 'Identité sans nom'}
            </div>
            <div className="text-sm text-slate-600">
              Mode : {profile?.identity_mode ?? 'symbolic'} • Langue : {profile?.lang_primary ?? 'en'}
            </div>
          </div>
        </div>
      </section>

      {/* Next step: liste des derniers échos */}
      <section className="mt-8">
        <h2 className="text-xl font-bold text-slate-900">Mes derniers échos</h2>
        <p className="mt-1 text-sm text-slate-600">
          (V1) Liste simple — on branchera ensuite filtres / archive / visibilité.
        </p>
      </section>
    </main>
  )
}
