/**
 * =============================================================================
 * Fichier      : components/about/AboutValues.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-27)
 * Objet        : Section “Nos valeurs” — valeurs positives EchoWorld
 * -----------------------------------------------------------------------------
 * Description  :
 * - Valeurs formulées positivement (sans posture “anti X”)
 * - Grille de cards premium (responsive)
 * - SAFE : statique, cohérent identité émotionnelle EchoWorld
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.0.0 (2026-01-27)
 * - [NEW] Values grid (6 cards)
 * =============================================================================
 */

import { HeartHandshake, Shield, Sparkles, Users, MessageSquareHeart, Compass } from 'lucide-react';

const VALUES = [
  {
    title: 'Respect first',
    desc: 'Stories are human. We design for dignity and care.',
    Icon: Shield,
  },
  {
    title: 'Resonance over noise',
    desc: 'Interaction is built to stay meaningful, not overwhelming.',
    Icon: MessageSquareHeart,
  },
  {
    title: 'A world of perspectives',
    desc: 'Different places, different lives — all valid.',
    Icon: Compass,
  },
  {
    title: 'Connection',
    desc: 'Echoes help people feel less alone, even far away.',
    Icon: Users,
  },
  {
    title: 'Gentle creativity',
    desc: 'A platform that feels like a living artwork, not a dashboard.',
    Icon: Sparkles,
  },
  {
    title: 'Empathy',
    desc: 'We build tools that encourage understanding and support.',
    Icon: HeartHandshake,
  },
];

export default function AboutValues() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-900/10 bg-white/70 px-6 py-10 backdrop-blur-sm md:px-10 md:py-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(139,92,246,0.10),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_80%,rgba(16,185,129,0.08),transparent_55%)]" />
      </div>

      <div className="relative z-10">
        <h2 className="text-2xl font-bold text-slate-950 md:text-3xl">Values</h2>
        <p className="mt-3 max-w-3xl text-base text-slate-700">
          EchoWorld is built with a specific tone. These values guide product
          decisions, UX, and community expectations.
        </p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {VALUES.map(({ title, desc, Icon }) => (
            <div
              key={title}
              className="rounded-3xl border border-slate-900/10 bg-white p-6 shadow-sm transition-transform hover:scale-[1.01]"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="text-sm font-semibold text-slate-950">{title}</div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-700">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
