/**
 * =============================================================================
 * Fichier      : app/about/page.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-27)
 * Objet        : Page À propos — Manifeste + Fonctionnement + Carte + Valeurs + Vision
 * -----------------------------------------------------------------------------
 * Description  :
 * - Route publique /about, alignée au webdesign cinéma + glassmorphism
 * - Structure en sections (Hero + 6 blocs) avec padding-top compatible header sticky
 * - Contenu “humain” (pas de posture anti-algo), cohérent avec /explore (globe)
 * - SAFE : n’ajoute aucune dépendance, n’altère pas le layout global
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.0.0 (2026-01-27)
 * - [NEW] Page /about composée de sections modulaires (components/about/*)
 * - [KEEP] Background global (layout) + Header global inchangés
 * =============================================================================
 */

import AboutHero from '@/components/about/AboutHero';
import AboutManifesto from '@/components/about/AboutManifesto';
import AboutHowItWorks from '@/components/about/AboutHowItWorks';
import AboutWorldMapMeaning from '@/components/about/AboutWorldMapMeaning';
import AboutValues from '@/components/about/AboutValues';
import AboutVision from '@/components/about/AboutVision';
import AboutTransparency from '@/components/about/AboutTransparency';

export const metadata = {
  title: 'About — EchoWorld',
  description:
    'Learn what EchoWorld is, how it works, why the world map matters, and where the project is going.',
};

export default function AboutPage() {
  return (
    <main className="relative">
      {/* Hero (padding-top pour header sticky global) */}
      <section className="relative mx-auto max-w-7xl px-6 pt-32 pb-10 md:pt-36 md:pb-14">
        <AboutHero />
      </section>

      {/* Sections */}
      <section className="relative mx-auto max-w-7xl px-6 pb-10">
        <AboutManifesto />
      </section>

      <section className="relative mx-auto max-w-7xl px-6 pb-10">
        <AboutHowItWorks />
      </section>

      <section className="relative mx-auto max-w-7xl px-6 pb-10">
        <AboutWorldMapMeaning />
      </section>

      <section className="relative mx-auto max-w-7xl px-6 pb-10">
        <AboutValues />
      </section>

      <section className="relative mx-auto max-w-7xl px-6 pb-10">
        <AboutVision />
      </section>

      {/* Transparence + CTA */}
      <section className="relative mx-auto max-w-7xl px-6 pb-32 pt-6">
        <AboutTransparency />
      </section>
    </main>
  );
}
