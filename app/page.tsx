/**
 * =============================================================================
 * Fichier      : app/page.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 2.1.0 (2026-01-21)
 * Objet        : Page d'accueil redesign - Hero + Pulse côte à côte
 * -----------------------------------------------------------------------------
 * Description  :
 * - Hero + PulseHeart en grid (côte à côte)
 * - Globe pleine largeur en dessous
 * - Connexions humaines en bas
 * - Plus de tabs, plus de KPI froids
 * - Tout est visible, tout respire ensemble
 * =============================================================================
 */

import Hero from '../components/home/Hero';
import WorldGlobe from '../components/home/WorldGlobe';
import PulseHeart from '../components/home/PulseHeart';
import ConnectionsStrip from '../components/home/ConnectionsStrip';

export default function HomePage() {
  return (
    <main className="relative">
      {/* Hero + Pulse Heart - côte à côte */}
      <section className="relative mx-auto max-w-7xl px-6 pt-20 pb-20 md:pt-28 md:pb-28">
        <div className="grid gap-12 lg:grid-cols-[1fr_420px]">
          {/* Hero content (gauche) */}
          <div className="relative">
            <Hero />
          </div>

          {/* Pulse Heart (droite) - aligné verticalement au centre */}
          <div className="flex items-center lg:items-start lg:pt-16">
            <PulseHeart />
          </div>
        </div>
      </section>

      {/* Living World Section - Globe seul, pleine largeur */}
      <section className="relative mx-auto max-w-7xl px-6 pb-20">
        {/* Section intro */}
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-white md:text-4xl">
            Watch the World Breathe
          </h2>
          <p className="mt-3 text-lg text-slate-300">
            Stories pulse. Emotions resonate. Connections emerge.
          </p>
        </div>

        {/* Globe (pleine largeur) */}
        <WorldGlobe />
      </section>

      {/* Connections */}
      <ConnectionsStrip />

      {/* Optional: Footer CTA ou outro visuel */}
      <section className="relative mx-auto max-w-7xl px-6 pb-32 text-center">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-linear-to-br from-violet-950/30 via-slate-950/50 to-sky-950/30 px-8 py-16 backdrop-blur-sm md:px-16 md:py-24">
          {/* Background accent */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.15),transparent_70%)]" />
          </div>

          <div className="relative z-10">
            <h3 className="text-3xl font-bold text-white md:text-4xl">
              Ready to add your echo?
            </h3>
            <p className="mt-4 text-lg text-slate-300">
              Your story could resonate with someone, somewhere, today.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <a
                href="/share"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-semibold text-slate-950 shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl"
              >
                Share your story
              </a>

              <a
                href="/world-map"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10"
              >
                Explore deeper
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}