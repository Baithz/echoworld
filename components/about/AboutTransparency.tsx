/**
 * =============================================================================
 * Fichier      : components/about/AboutTransparency.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-27)
 * Objet        : Section “Transparence & contact” + CTA final
 * -----------------------------------------------------------------------------
 * Description  :
 * - Card premium type Home-CTA, avec accent radial + boutons
 * - Présente le porteur du projet + lien contact simple
 * - SAFE : pas de dépendance, liens internes seulement
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.0.0 (2026-01-27)
 * - [NEW] Transparence & contact + CTA final /share /explore
 * =============================================================================
 */

import Link from 'next/link';
import { Mail, User, ArrowRight } from 'lucide-react';

export default function AboutTransparency() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-linear-to-br from-violet-950/35 via-slate-950/55 to-sky-950/35 px-8 py-14 backdrop-blur-sm md:px-16 md:py-20">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.16),transparent_70%)]" />
      </div>

      <div className="relative z-10">
        <h2 className="text-3xl font-bold text-white md:text-4xl">
          Transparency & contact
        </h2>

        <p className="mt-4 max-w-3xl text-lg text-slate-300">
          EchoWorld is an independent project built with care. If you want to
          report an issue, suggest an improvement, or collaborate, you can reach out.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center gap-3 text-white">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                <User className="h-5 w-5" />
              </span>
              <div className="font-semibold">Project author</div>
            </div>
            <div className="mt-3 text-sm text-slate-200">
              Régis KREMER (Baithz) — EchoWorld
            </div>
            <div className="mt-2 text-xs text-slate-400">
              Product + design + engineering
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center gap-3 text-white">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                <Mail className="h-5 w-5" />
              </span>
              <div className="font-semibold">Contact</div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-200">
              For now, contact is handled through the platform (messages) and future
              dedicated channels will be added as EchoWorld evolves.
            </p>
            <div className="mt-4">
              <Link
                href="/messages"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10"
              >
                Open messages <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
          <Link
            href="/share"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-semibold text-slate-950 shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl"
          >
            Share your story <ArrowRight className="h-5 w-5" />
          </Link>

          <Link
            href="/explore"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10"
          >
            Explore deeper <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
