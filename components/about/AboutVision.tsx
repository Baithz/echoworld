/**
 * =============================================================================
 * Fichier      : components/about/AboutVision.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-27)
 * Objet        : Section “Vision & avenir” — direction produit EchoWorld
 * -----------------------------------------------------------------------------
 * Description  :
 * - Vision formulée concrètement : carte vivante, résonances, confiance, évolution
 * - Mise en page 2 colonnes avec “roadmap bullets”
 * - SAFE : statique, pas de dépendance, cohérent /explore + chat
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.0.0 (2026-01-27)
 * - [NEW] Vision & avenir (roadmap narrative)
 * =============================================================================
 */

import { Rocket, Map, MessageCircle, BadgeCheck } from 'lucide-react';

export default function AboutVision() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-linear-to-br from-sky-950/25 via-slate-950/35 to-violet-950/25 px-6 py-10 backdrop-blur-sm md:px-10 md:py-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_25%,rgba(14,165,233,0.16),transparent_60%)]" />
      </div>

      <div className="relative z-10 grid gap-8 lg:grid-cols-2">
        <div>
          <div className="flex items-center gap-2 text-white">
            <Rocket className="h-5 w-5 opacity-80" />
            <h2 className="text-2xl font-bold md:text-3xl">Vision & future</h2>
          </div>

          <p className="mt-4 text-base leading-relaxed text-slate-200">
            EchoWorld aims to become a calm place on the internet — where stories
            connect people across distance, and the planet feels like a shared,
            breathing archive of humanity.
          </p>

          <p className="mt-4 text-sm leading-relaxed text-slate-300">
            The goal is not “more content”. The goal is better resonance.
          </p>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center gap-3 text-white">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                <Map className="h-5 w-5" />
              </span>
              <div className="font-semibold">A living map</div>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-slate-200">
              <li>• Better visual language for echoes on the globe.</li>
              <li>• Stronger “pulse” cues where stories accumulate.</li>
              <li>• Smooth transitions between world and local views.</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center gap-3 text-white">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                <MessageCircle className="h-5 w-5" />
              </span>
              <div className="font-semibold">Human conversations</div>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-slate-200">
              <li>• Better presence signals (online/offline).</li>
              <li>• Clean threads: reply, reactions, attachments.</li>
              <li>• Safer DM flows and clearer intent.</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center gap-3 text-white">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                <BadgeCheck className="h-5 w-5" />
              </span>
              <div className="font-semibold">Trust & clarity</div>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-slate-200">
              <li>• Better reporting & moderation ergonomics.</li>
              <li>• Stronger profile identity controls.</li>
              <li>• Clearer onboarding to explain the “echo” concept.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
