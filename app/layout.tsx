/**
 * =============================================================================
 * Fichier      : app/layout.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 2.0.1 (2026-01-21)
 * Objet        : Layout racine - Fond cinéma immersif + Provider i18n
 * -----------------------------------------------------------------------------
 * Description  :
 * - Fond premium : radial gradients + grid subtil + grain + vignette
 * - LanguageProvider global
 * - Base UI dark harmonieuse
 * - Pas d'interception clics (pointer-events-none)
 *
 * Correctifs (sans régression) :
 * - [FIX] Import provider en chemin relatif (évite alias "@/..." si non résolu)
 * - [CHORE] Conserve les tailles h/w arbitraires (warnings eslint non bloquants)
 * =============================================================================
 */

import './globals.css';
import type { ReactNode } from 'react';
import { LanguageProvider } from '../lib/i18n/LanguageProvider';

export const metadata = {
  title: 'EchoWorld — Your Story, Their Echo, Our World',
  description:
    'A living layer of humanity. Watch the planet breathe. See stories pulse across borders. Feel the heartbeat of the world.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-white antialiased">
        {/* Background cinéma (multi-couches) */}
        <div className="pointer-events-none fixed inset-0 -z-10">
          {/* Radial glow top */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.12),transparent_60%)]" />

          {/* Blobs de couleur (breathing effect) */}
          <div className="absolute -top-32 left-1/2 h-150 w-150 -translate-x-1/2 rounded-full bg-linear-to-tr from-violet-500/20 via-sky-500/15 to-emerald-500/15 blur-3xl" />
          <div className="absolute -bottom-80 -right-60 h-150 w-150 rounded-full bg-linear-to-tr from-emerald-500/12 via-sky-500/10 to-violet-500/12 blur-3xl" />
          <div className="absolute top-1/2 -left-60 h-125 w-125 rounded-full bg-linear-to-br from-sky-500/10 to-violet-500/8 blur-3xl" />

          {/* Grid subtil */}
          <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(to_right,rgba(255,255,255,.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.2)_1px,transparent_1px)] bg-size-[60px_60px]" />

          {/* Noise overlay */}
          <div className="absolute inset-0 ew-noise" />

          {/* Vignette subtile */}
          <div className="absolute inset-0 ew-vignette" />
        </div>

        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
