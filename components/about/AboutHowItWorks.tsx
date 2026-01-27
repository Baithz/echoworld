/**
 * =============================================================================
 * Fichier      : components/about/AboutHowItWorks.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-27)
 * Objet        : Section “Comment ça fonctionne” — Echo → Résonance → Monde
 * -----------------------------------------------------------------------------
 * Description  :
 * - 3 étapes claires sous forme de cards
 * - Utilise icônes Lucide et styles premium existants
 * - SAFE : statique, cohérent avec /explore et /share
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.0.0 (2026-01-27)
 * - [NEW] How it works (3 cards)
 * =============================================================================
 */

import Link from 'next/link';
import { MessageCircle, Heart, Map, ArrowRight } from 'lucide-react';

export default function AboutHowItWorks() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-900/10 bg-white/70 px-6 py-10 backdrop-blur-sm md:px-10 md:py-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_15%,rgba(14,165,233,0.10),transparent_55%)]" />
      </div>

      <div className="relative z-10">
        <h2 className="text-2xl font-bold text-slate-950 md:text-3xl">
          How it works
        </h2>
        <p className="mt-3 max-w-3xl text-base text-slate-700">
          A simple flow. You share. Others resonate. The world becomes readable.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-900/10 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow">
                <MessageCircle className="h-5 w-5" />
              </span>
              <div>
                <div className="text-sm font-semibold text-slate-950">1 — Share</div>
                <div className="text-sm text-slate-600">Create an echo.</div>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-700">
              Write a story, attach a feeling, choose visibility, and (optionally)
              anchor it to a place.
            </p>
            <div className="mt-5">
              <Link
                href="/share"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-900/10 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-950 backdrop-blur-sm transition-all hover:bg-white"
              >
                Open /share <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-900/10 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-600 text-white shadow">
                <Heart className="h-5 w-5" />
              </span>
              <div>
                <div className="text-sm font-semibold text-slate-950">2 — Resonate</div>
                <div className="text-sm text-slate-600">React, reply, mirror.</div>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-700">
              Others can respond with care: reactions, replies, and mirrors make
              an echo travel without turning it into noise.
            </p>
            <div className="mt-5 text-xs text-slate-500">
              (Reactions & replies are designed to stay human and meaningful.)
            </div>
          </div>

          <div className="rounded-3xl border border-slate-900/10 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-600 text-white shadow">
                <Map className="h-5 w-5" />
              </span>
              <div>
                <div className="text-sm font-semibold text-slate-950">3 — Explore</div>
                <div className="text-sm text-slate-600">See echoes across the planet.</div>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-700">
              The map isn’t decoration. It’s a way to see humanity as a living
              layer — a pulse of stories, everywhere.
            </p>
            <div className="mt-5">
              <Link
                href="/explore"
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow transition-all hover:scale-[1.01]"
              >
                Open /explore <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
