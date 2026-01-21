/**
 * =============================================================================
 * Fichier      : app/page.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.1.1 (2026-01-21)
 * Objet        : Page d'accueil (Hero + Mirror Preview)
 * -----------------------------------------------------------------------------
 * Description  :
 * - Affiche le Hero existant (inchangé)
 * - Ajoute une section "Global Mirror" (mise en page directe, sans tabs)
 * =============================================================================
 */

import Hero from '@/components/home/Hero';
import MirrorPreview from '@/components/home/MirrorPreview';

export default function HomePage() {
  return (
    <main>
      <Hero />
      <MirrorPreview />
    </main>
  );
}
