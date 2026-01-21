/**
 * =============================================================================
 * Fichier      : app/page.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 2.0.1 (2026-01-21)
 * Objet        : Page d'accueil redesign - Immersive, émotionnelle, WOW
 * -----------------------------------------------------------------------------
 * Description  :
 * - Hero poétique + introduction monde vivant
 * - Section "Monde vivant" : Globe + Pulse côte à côte
 * - Connexions humaines en bas
 * - Plus de tabs, plus de KPI froids
 * - Tout est visible, tout respire ensemble
 *
 * Correctifs (sans régression) :
 * - [FIX] Imports en chemins relatifs (évite TS2307 si alias "@/..." non résolu
 *         pour certains fichiers / cache TS / config paths)
 * =============================================================================
 */

import Hero from '../components/home/Hero';
import WorldGlobe from '../components/home/WorldGlobe';
import PulseHeart from '../components/home/PulseHeart';
import ConnectionsStrip from '../components/home/ConnectionsStrip';

export default function HomePage() {
  return (
    <main className="relative">
      {/* Hero */}
      <Hero />

      {/* Living World Section */}
      <section className="relative mx-auto max-w-7xl px-6 pb-20">
        {/* Section intro (optionnel, peut être supprimé si trop) */}
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-white md:text-4xl">
            Watch the World Breathe
          </h2>
          <p className="mt-3 text-lg text-slate-300">
            Stories pulse. Emotions resonate. Connections emerge.
          </p>
        </div>

        {/* Grid: Globe + Pulse */}
        <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
          {/* Globe (large) */}
          <div>
            <WorldGlobe />
          </div>

          {/* Pulse (sidebar) */}
          <div className="flex flex-col gap-8">
            <PulseHeart />
          </div>
        </div>
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
