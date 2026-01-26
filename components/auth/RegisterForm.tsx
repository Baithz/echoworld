/**
 * =============================================================================
 * Fichier      : components/auth/RegisterForm.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 2.0.0 (2026-01-26)
 * Objet        : Form Inscription via API Route + compliance (DOB + CGU)
 * -----------------------------------------------------------------------------
 * Description  :
 * - Utilise /api/auth/signup (contourne CORS, conserve le flow existant)
 * - Ajoute date de naissance + acceptation CGU obligatoire (RGPD/COPPA)
 * - Validation âge minimum (16 ans par défaut)
 * - Conserve UI/animations (lucide icons, styles, toasts, getAuthErrorMessage)
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 2.0.0 (2026-01-26)
 * - [NEW] Champ dateOfBirth (obligatoire)
 * - [NEW] Checkbox tosAccepted (obligatoire) + liens CGU/Privacy
 * - [NEW] Validation âge minimum (16)
 * - [KEEP] UI/animations/icônes + getAuthErrorMessage + endpoint /api/auth/signup
 * =============================================================================
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Lock, AlertTriangle, ArrowRight, Calendar, CheckSquare } from 'lucide-react';
import { getAuthErrorMessage } from '@/lib/supabase/client';

function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);

  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;

  return age;
}

function getMinimumAge(): number {
  return 16;
}

export default function RegisterForm({
  onSwitchToLogin,
}: {
  onSwitchToLogin?: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // NEW
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [tosAccepted, setTosAccepted] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setError(null);
    setOk(null);

    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      setError('Veuillez renseigner email et mot de passe.');
      return;
    }

    if (password.length < 8) {
      setError('Mot de passe trop court (8 caractères minimum).');
      return;
    }

    // NEW validations
    if (!dateOfBirth) {
      setError('Veuillez renseigner votre date de naissance.');
      return;
    }

    const minAge = getMinimumAge();
    const age = calculateAge(dateOfBirth);

    if (!Number.isFinite(age) || age < minAge) {
      setError(`Vous devez avoir au moins ${minAge} ans pour créer un compte.`);
      return;
    }

    if (!tosAccepted) {
      setError("Vous devez accepter les Conditions Générales d'Utilisation.");
      return;
    }

    setLoading(true);
    try {
      // Appel à la route API (pas de CORS côté serveur)
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password,
          dateOfBirth,
          tosAccepted,
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        const errorMsg = result.error || "Erreur lors de l'inscription";
        setError(getAuthErrorMessage(errorMsg));
        return;
      }

      // Succès
      setOk(
        result.message ||
          "✅ Compte créé ! Si la confirmation email est activée, vérifiez votre boîte mail pour valider l'inscription."
      );

      // Si une session est créée immédiatement (confirmation email désactivée)
      if (result.data?.session) {
        setTimeout(() => {
          window.location.replace('/');
        }, 1500);
      }
    } catch (e2) {
      console.error('[REGISTER ERROR]', e2);
      setError(
        e2 instanceof Error
          ? getAuthErrorMessage(e2)
          : "Erreur lors de l'inscription. Veuillez réessayer."
      );
    } finally {
      setLoading(false);
    }
  };

  const maxDob = new Date().toISOString().split('T')[0];

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Email */}
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-slate-900">Email</span>
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
          <Mail className="h-4 w-4 text-slate-500" />
          <input
            type="email"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            disabled={loading}
            className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-70"
          />
        </div>
      </label>

      {/* Password */}
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-slate-900">
          Mot de passe
        </span>
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
          <Lock className="h-4 w-4 text-slate-500" />
          <input
            type="password"
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            placeholder="•••••••• (8+)"
            autoComplete="new-password"
            disabled={loading}
            className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-70"
          />
        </div>
        <div className="mt-1 text-xs text-slate-500">
          8+ caractères recommandé (phrase de passe).
        </div>
      </label>

      {/* NEW: Date de naissance */}
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-slate-900">
          Date de naissance
        </span>
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
          <Calendar className="h-4 w-4 text-slate-500" />
          <input
            type="date"
            value={dateOfBirth}
            onChange={(ev) => setDateOfBirth(ev.target.value)}
            disabled={loading}
            max={maxDob}
            className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-70"
          />
        </div>
        <div className="mt-1 text-xs text-slate-500">
          Âge minimum : {getMinimumAge()} ans.
        </div>
      </label>

      {/* NEW: CGU */}
      <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 shadow-sm">
        <div className="mt-0.5">
          {tosAccepted ? (
            <CheckSquare className="h-4 w-4 text-slate-700" />
          ) : (
            <div className="h-4 w-4 rounded border border-slate-300 bg-white" />
          )}
        </div>

        <input
          type="checkbox"
          checked={tosAccepted}
          onChange={(e) => setTosAccepted(e.target.checked)}
          disabled={loading}
          className="sr-only"
        />

        <span className="text-sm text-slate-700">
          J’accepte les{' '}
          <Link href="/legal/terms" className="font-semibold text-violet-700 hover:text-violet-800">
            CGU
          </Link>{' '}
          et la{' '}
          <Link href="/legal/privacy" className="font-semibold text-violet-700 hover:text-violet-800">
            Politique de confidentialité
          </Link>
          .
        </span>
      </label>

      {/* Messages */}
      {error && (
        <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          <AlertTriangle className="mt-0.5 h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {ok && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {ok}
        </div>
      )}

      {/* CTA */}
      <button
        type="submit"
        disabled={loading}
        className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? 'Création…' : 'Créer un compte'}
        <ArrowRight className="h-4 w-4 opacity-80 transition-transform group-hover:translate-x-0.5" />
      </button>

      {/* Switch */}
      {onSwitchToLogin && (
        <div className="pt-2 text-center text-sm text-slate-600 md:hidden">
          Déjà un compte ?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="font-semibold text-violet-700 hover:text-violet-800"
          >
            Se connecter
          </button>
        </div>
      )}
    </form>
  );
}
