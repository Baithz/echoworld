/**
 * =============================================================================
 * Fichier      : app/explore/page.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.1 (2026-01-21)
 * Objet        : Page Explore - Globe plein écran + navigation
 * -----------------------------------------------------------------------------
 * Description  :
 * - Route dédiée au globe (hors Home)
 * - Header commun (navigation)
 * - Affichage full via `WorldGlobe mode="full"` (hauteur calc(100vh - header))
 * - Pas de scroll parasite (min-h + padding aligné header)
 * =============================================================================
 */

import Header from '../../components/layout/Header';
import WorldGlobe from '../../components/home/WorldGlobe';

export default function ExplorePage() {
  return (
    <>
      <Header />

      <main className="min-h-screen pt-20 px-6">
        <section className="mx-auto w-full">
          <WorldGlobe mode="full" />
        </section>
      </main>
    </>
  );
}
