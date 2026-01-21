/**
 * =============================================================================
 * Fichier      : app/page.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.1.1 (2026-01-21)
 * Objet        : Page d'accueil (Hero + Global Mirror Preview)
 * -----------------------------------------------------------------------------
 * Description  :
 * - Affiche le Hero premium existant (inchangé)
 * - Intègre la section "Global Mirror" (MirrorPreview)
 * - Largeur étendue et cohérente avec l’UI glass
 * =============================================================================
 */

import Hero from '@/components/home/Hero';
import MirrorPreview from '@/components/home/MirrorPreview';

export default function HomePage() {
  return (
    <main className="flex flex-col">
      {/* Hero section (plein impact, inchangée) */}
      <Hero />

      {/* Global Mirror preview */}
      <section className="mx-auto w-full max-w-7xl px-6">
        <MirrorPreview />
      </section>
    </main>
  );
}
