/**
 * =============================================================================
 * Fichier      : components/about/AboutHero.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-27)
 * Objet        : Hero /about — “Ce que nous partageons résonne”
 * -----------------------------------------------------------------------------
 * Description  :
 * - Hero premium aligné Home (grid 1fr/400px)
 * - Card droite : piliers + micro-CTA (sans globe)
 * - Utilise les styles glass/gradients/radial déjà en place
 * - SAFE : aucune dépendance, contenu statique
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.0.0 (2026-01-27)
 * - [NEW] Hero About (titre + sous-texte + carte “piliers”)
 * =============================================================================
 */

import Link from 'next/link';
import { Heart, Map, MessageCircle, Sparkles } from 'lucide-react';

export default function AboutHero() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
      {/* Col gauche */}
      <div className="relative">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-900 backdrop-blur-sm">
          <Sparkles className="h-4 w-4 opacity-70" />
          About EchoWorld
        </div>

        <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-950 md:text-5xl">
          EchoWorld —{' '}
          <span className="bg-linear-to-r from-violet-700 via-sky-700 to-emerald-700 bg-clip-text text-transparent">
            What we share can resonate
          </span>
        </h1>

        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-700">
          EchoWorld is a living layer of humanity. People share stories — “echoes”
          — and those stories become signals: seen on profiles, felt in feeds, and
          anchored on a world map.
        </p>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/share"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-7 py-4 text-base font-semibold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-slate-950/20"
          >
            <Heart className="h-5 w-5" />
            Share an echo
          </Link>

          <Link
            href="/explore"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-900/10 bg-white/70 px-7 py-4 text-base font-semibold text-slate-950 backdrop-blur-sm transition-all hover:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          >
            <Map className="h-5 w-5" />
            Explore the world
          </Link>
        </div>

        <p className="mt-6 text-sm text-slate-500">
          No jargon. Just stories, places, and resonance.
        </p>
      </div>

      {/* Col droite (card premium) */}
      <div className="relative flex items-start lg:pt-4">
        <div className="relative w-full overflow-hidden rounded-3xl border border-white/10 bg-linear-to-br from-violet-950/25 via-slate-950/35 to-sky-950/25 p-6 backdrop-blur-sm">
          {/* Accent */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,0.18),transparent_65%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(14,165,233,0.14),transparent_60%)]" />
          </div>

          <div className="relative z-10">
            <h2 className="text-lg font-bold text-white">Three pillars</h2>
            <p className="mt-1 text-sm text-slate-300">
              A simple loop that keeps EchoWorld clear and human.
            </p>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white">
                    <MessageCircle className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="font-semibold text-white">Echo</div>
                    <div className="text-sm text-slate-300">
                      A story you choose to share.
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white">
                    <Heart className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="font-semibold text-white">Resonance</div>
                    <div className="text-sm text-slate-300">
                      People react, reply, or mirror — thoughtfully.
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white">
                    <Map className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="font-semibold text-white">World</div>
                    <div className="text-sm text-slate-300">
                      The map turns stories into a shared geography.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-slate-200">
                Want the full experience?
              </div>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/explore"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10"
                >
                  <Map className="h-4 w-4" />
                  Open /explore
                </Link>

                <Link
                  href="/messages"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 shadow transition-all hover:scale-[1.01]"
                >
                  <MessageCircle className="h-4 w-4" />
                  Open messages
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
