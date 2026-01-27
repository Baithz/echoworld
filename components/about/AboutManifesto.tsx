/**
 * =============================================================================
 * Fichier      : components/about/AboutManifesto.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-27)
 * Objet        : Section Manifeste — intention et définition d’EchoWorld
 * -----------------------------------------------------------------------------
 * Description  :
 * - Card premium (glass + gradients) alignée au style Home
 * - Contenu court : ce que c’est / ce que ce n’est pas
 * - SAFE : statique, aucune dépendance
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.0.0 (2026-01-27)
 * - [NEW] Manifeste (2 colonnes responsive)
 * =============================================================================
 */

import { Sparkles, ShieldCheck } from 'lucide-react';

export default function AboutManifesto() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-linear-to-br from-slate-950/50 via-violet-950/30 to-sky-950/35 px-6 py-10 backdrop-blur-sm md:px-10 md:py-12">
      {/* Accent */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(139,92,246,0.18),transparent_65%)]" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-2 text-white">
          <Sparkles className="h-5 w-5 opacity-80" />
          <h2 className="text-2xl font-bold md:text-3xl">Manifesto</h2>
        </div>

        <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-200">
          EchoWorld is built around one idea: a story can travel. When someone
          shares an echo, it doesn’t just sit in a feed — it becomes a signal
          others can feel, respond to, and carry forward.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="text-sm font-semibold text-white">What it is</div>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-200">
              <li>• A space to publish echoes: short, human stories.</li>
              <li>• A world map where echoes become visible across borders.</li>
              <li>• A place for resonance: reactions, replies, and mirrors.</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <ShieldCheck className="h-4 w-4 opacity-80" />
              What it is not
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-200">
              <li>• Not a performance stage.</li>
              <li>• Not a battlefield for attention.</li>
              <li>• Not a place to turn people into metrics.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
