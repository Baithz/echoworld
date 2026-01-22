/**
 * =============================================================================
 * Fichier      : app/explore/page.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.2 (2026-01-22)
 * Objet        : Page Explore - Globe plein écran + navigation
 * -----------------------------------------------------------------------------
 * Description  :
 * - Route dédiée au globe (hors Home)
 * - Header commun (navigation)
 * - Affichage full via `WorldGlobe mode="full"`
 * - SAFE: évite double Header si app/layout.tsx rend déjà <Header />
 * - Pas de scroll parasite (hauteur viewport - header)
 * =============================================================================
 */

import WorldGlobe from '../../components/home/WorldGlobe';

// IMPORTANT:
// - Si ton app/layout.tsx rend déjà <Header />, laisse ce fichier SANS header.
// - Si ton app/layout.tsx NE rend PAS <Header />, alors ajoute-le ici.
export default function ExplorePage() {
  return (
    <main className="h-[calc(100vh-80px)] px-6 pt-20">
      <section className="mx-auto h-full w-full">
        <WorldGlobe mode="full" />
      </section>
    </main>
  );
}
