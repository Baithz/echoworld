/**
 * =============================================================================
 * Fichier      : app/for-me/page.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.1.1 (2026-01-24)
 * Description  : Route /for-me — page "Pour moi" (shell)
 * -----------------------------------------------------------------------------
 * Description  :
 * - Rend ForMeView (cards + topics) + intègre le flux EchoFeed via ForMeEchoFeed (curated ids)
 * - Zéro régression : ForMeView reste la surface principale, on ajoute uniquement un bloc "Curated"
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.1.1 (2026-01-24)
 * - [FIX] Supprime le passage de handlers (onOpenEcho) depuis un Server Component
 * - [KEEP] ForMeView inchangé + ForMeEchoFeed reste optionnel (curatedIds=[])
 * =============================================================================
 */

import ForMeView from '@/components/for-me/ForMeView';
import ForMeEchoFeed from '@/components/for-me/ForMeEchoFeed';

export default function ForMePage() {
  // NOTE: curatedIds volontairement vide ici.
  // L’intégration finale consiste à passer ici une liste d’ids (ex: depuis searchParams, cookies,
  // ou une source server). ForMeEchoFeed ne casse rien si vide.
  return (
    <>
      <ForMeView />

      {/* Curated EchoFeed (optionnel, n’affiche rien si curatedIds=[]) */}
      <div className="mx-auto w-full max-w-6xl px-6 pb-16">
        <ForMeEchoFeed curatedIds={[]} userId={null} />
      </div>
    </>
  );
}
