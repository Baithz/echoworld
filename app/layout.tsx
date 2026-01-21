/**
 * =============================================================================
 * Fichier      : app/layout.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 2.2.0 (2026-01-21)
 * Objet        : Layout racine - Fond cinéma immersif + Provider i18n
 * -----------------------------------------------------------------------------
 * Description  :
 * - Fond premium : radial gradients + grid subtil + grain + vignette
 * - LanguageProvider global
 * - Thème clair par défaut (le switch clair/sombre viendra via settings user)
 * - Pas d'interception clics (pointer-events-none)
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 2.2.0 (2026-01-21)
 * - [KEEP] Structure et styles inchangés (sans régression)
 * - [CHORE] Changelog standardisé (prépare intégration settings thème)
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
      <body className="min-h-screen bg-slate-50 text-slate-950 antialiased">
        {/* Background cinéma (multi-couches) */}
        <div className="pointer-events-none fixed inset-0 -z-10">
          {/* Radial glow top */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.10),transparent_62%)]" />

          {/* Blobs de couleur (breathing effect) */}
          <div className="absolute -top-32 left-1/2 h-150 w-150 -translate-x-1/2 rounded-full bg-linear-to-tr from-violet-500/16 via-sky-500/12 to-emerald-500/10 blur-3xl" />
          <div className="absolute -bottom-80 -right-60 h-150 w-150 rounded-full bg-linear-to-tr from-emerald-500/10 via-sky-500/10 to-violet-500/10 blur-3xl" />
          <div className="absolute top-1/2 -left-60 h-125 w-125 rounded-full bg-linear-to-br from-sky-500/10 to-violet-500/8 blur-3xl" />

          {/* Grid subtil (adapté clair) */}
          <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(to_right,rgba(0,0,0,.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,.12)_1px,transparent_1px)] bg-size-[60px_60px]" />

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
