/**
 * =============================================================================
 * Fichier      : app/login/page.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-21)
 * Objet        : Page Login - Tabs Connexion/Inscription (thème clair + Header)
 * =============================================================================
 */

import Header from '@/components/layout/Header';
import AuthShell from '@/components/auth/AuthShell';

export default function LoginPage() {
  return (
    <>
      <Header />
      <main className="relative">
        <AuthShell />
      </main>
    </>
  );
}
