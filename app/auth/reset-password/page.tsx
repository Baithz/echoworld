/**
 * =============================================================================
 * Fichier      : app/auth/reset-password/page.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-26)
 * Objet        : Page "Réinitialiser le mot de passe" — formulaire nouveau mot de passe
 * -----------------------------------------------------------------------------
 * Description  :
 * - Page UI appelée depuis le lien email Supabase (redirectTo)
 * - Délègue l’UI + logique à ResetPasswordView (client component)
 * - SAFE: page minimaliste, sans logique métier côté serveur
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.0.0 (2026-01-26)
 * - [NEW] Page /auth/reset-password (UI)
 * =============================================================================
 */

import ResetPasswordView from '@/components/auth/ResetPasswordView';

export default function ResetPasswordPage() {
  return <ResetPasswordView />;
}
