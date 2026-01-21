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

import { Suspense } from 'react';
import Hero from '@/components/home/Hero';
import MirrorPreview from '@/components/home/MirrorPreview';

export default function HomePage() {
  return (
    <main>
      <Hero />

      {/* Required by Next.js: useSearchParams() */}
      <Suspense fallback={null}>
        <MirrorPreview />
      </Suspense>
    </main>
  );
}
