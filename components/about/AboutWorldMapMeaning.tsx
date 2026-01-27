/**
 * =============================================================================
 * Fichier      : components/about/AboutWorldMapMeaning.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-27)
 * Objet        : Section “La carte du monde” — sens de l’ancrage géographique
 * -----------------------------------------------------------------------------
 * Description  :
 * - Explique l’intention : carte = lecture du monde par les histoires
 * - Mise en page 2 colonnes : texte + mini “cards” symboliques
 * - SAFE : pas de globe ici (globe = /explore), juste le sens
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.0.0 (2026-01-27)
 * - [NEW] World map meaning (2 colonnes)
 * =============================================================================
 */

import { MapPin, Globe2, Waves } from 'lucide-react';

export default function AboutWorldMapMeaning() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-linear-to-br from-emerald-950/20 via-slate-950/35 to-violet-950/25 px-6 py-10 backdrop-blur-sm md:px-10 md:py-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_70%,rgba(16,185,129,0.14),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(139,92,246,0.14),transparent_60%)]" />
      </div>

      <div className="relative z-10 grid gap-8 lg:grid-cols-2 lg:items-start">
        <div>
          <div className="flex items-center gap-2 text-white">
            <Globe2 className="h-5 w-5 opacity-80" />
            <h2 className="text-2xl font-bold md:text-3xl">The world map</h2>
          </div>

          <p className="mt-4 text-base leading-relaxed text-slate-200">
            EchoWorld uses geography as meaning, not precision. A place gives a
            story a context — a skyline, a climate, a culture, a distance. The
            map helps you feel that stories happen somewhere, not “in the void”.
          </p>

          <p className="mt-4 text-sm leading-relaxed text-slate-300">
            The globe experience lives in <span className="font-semibold text-white">/explore</span>.
            This page explains why it exists.
          </p>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center gap-3 text-white">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                <MapPin className="h-5 w-5" />
              </span>
              <div className="font-semibold">Anchoring</div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-200">
              A location is a frame. It gives the echo a “where” — even when the
              story itself is universal.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center gap-3 text-white">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                <Waves className="h-5 w-5" />
              </span>
              <div className="font-semibold">Resonance</div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-200">
              When echoes appear on the map, the planet feels alive: a readable
              pulse of stories, across borders.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center gap-3 text-white">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                <Globe2 className="h-5 w-5" />
              </span>
              <div className="font-semibold">Perspective</div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-200">
              The map turns a feed into a world: it helps you see distances,
              density, silence, and presence.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
