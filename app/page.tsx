/**
 * =============================================================================
 * Fichier      : app/page.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 4.1.0 (2026-01-21)
 * Objet        : Page accueil - Header + Layout moderne (sans globe sur Home)
 * -----------------------------------------------------------------------------
 * Description  :
 * - Header navigation sticky
 * - Hero compact (padding-top pour header)
 * - Hero + PulseHeart côte à côte
 * - Connexions humaines
 * - Footer CTA
 * - Le globe 3D est déplacé vers /explore
 * =============================================================================
 */

import Header from '../components/layout/Header';
import Hero from '../components/home/Hero';
import PulseHeart from '../components/home/PulseHeart';
import ConnectionsStrip from '../components/home/ConnectionsStrip';

export default function HomePage() {
  return (
    <>
      {/* Header Navigation */}
      <Header />

      <main className="relative">
        {/* Hero + Pulse Heart - côte à côte (avec padding-top pour header) */}
        <section className="relative mx-auto max-w-7xl px-6 pt-32 pb-16 md:pt-36 md:pb-20">
          <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
            {/* Hero content (gauche) */}
            <div className="relative">
              <Hero />
            </div>

            {/* Pulse Heart (droite) */}
            <div className="flex items-center lg:items-start lg:pt-12">
              <PulseHeart />
            </div>
          </div>
        </section>

        {/* Connections humaines */}
        <ConnectionsStrip />

        {/* Footer CTA */}
        <section className="relative mx-auto max-w-7xl px-6 pb-32 pt-16">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-linear-to-br from-violet-950/40 via-slate-950/60 to-sky-950/40 px-8 py-16 backdrop-blur-sm md:px-16 md:py-24">
            {/* Background accent */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.15),transparent_70%)]" />
            </div>

            <div className="relative z-10 text-center">
              <h3 className="text-3xl font-bold text-white md:text-4xl">
                Ready to add your echo?
              </h3>
              <p className="mt-4 text-lg text-slate-300">
                Your story could resonate with someone, somewhere, today.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
                <a
                  href="/share"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-semibold text-slate-950 shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-white/30"
                >
                  Share your story
                </a>

                <a
                  href="/explore"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
                >
                  Explore deeper
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
