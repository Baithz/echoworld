/**
 * =============================================================================
 * Fichier      : app/layout.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.4 (2026-01-21)
 * Objet        : Layout racine Next.js (App Router) + fond premium Tailwind v4
 *               + Provider global de langue (détection + persistance)
 * -----------------------------------------------------------------------------
 * Description  :
 * - Injecte globals.css
 * - Fournit un background moderne (radial + gradients + grid subtil)
 * - Base UI dark, sans dépendance externe
 * - Enveloppe l’app dans LanguageProvider pour i18n (MVP)
 *
 * Correctifs (sans régression) :
 * - [FIX] Classes Tailwind v4 "canonical" (bg-linear-to-*, bg-[...], bg-size-[...])
 * - [ADD] LanguageProvider : init lang (localStorage > navigator > 'en')
 * - [SAFE] <html lang="en"> conservé côté SSR (mise à jour côté client via provider)
 * - [SAFE] Fond en couche -z-10, n'intercepte pas les clics
 * =============================================================================
 */

import './globals.css';
import type { ReactNode } from 'react';
import { LanguageProvider } from '@/lib/i18n/LanguageProvider';

export const metadata = {
  title: 'EchoWorld',
  description: 'Your Story, Their Echo, Our World',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-white antialiased">
        {/* Background premium */}
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.10),transparent_55%)]" />

          <div className="absolute -top-24 left-1/2 h-130 w-130 -translate-x-1/2 rounded-full bg-linear-to-tr from-sky-500/25 via-violet-500/20 to-emerald-500/20 blur-3xl" />
          <div className="absolute -bottom-60 -right-40 h-130 w-130 rounded-full bg-linear-to-tr from-emerald-500/15 via-sky-500/10 to-violet-500/15 blur-3xl" />

          <div className="absolute inset-0 opacity-[0.08] bg-[linear-gradient(to_right,rgba(255,255,255,.25)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.25)_1px,transparent_1px)] bg-size-[52px_52px]" />
        </div>

        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
