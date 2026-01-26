/**
 * =============================================================================
 * Fichier      : app/auth/forgot-password/page.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-26)
 * Objet        : Page "Mot de passe oublié" — demande de reset par email
 * -----------------------------------------------------------------------------
 * Description  :
 * - Formulaire email + appel à /api/auth/forgot-password (server-side)
 * - Messages UX clairs (succès/erreur) + loading
 * - Conserve le style clair cohérent avec Auth (cards, arrondis, violet)
 * - SAFE: aucune dépendance au navigateur (client component dédié)
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.0.0 (2026-01-26)
 * - [NEW] Page /auth/forgot-password (email reset)
 * =============================================================================
 */

import ForgotPasswordView from '@/components/auth/ForgotPasswordView';

export default function ForgotPasswordPage() {
  return <ForgotPasswordView />;
}
