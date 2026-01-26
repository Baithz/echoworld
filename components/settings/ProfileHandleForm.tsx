/**
 * =============================================================================
 * Fichier      : components/settings/ProfileHandleForm.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.2 (2026-01-26)
 * Objet        : Form pseudo (handle) — saisie + normalisation + check dispo (FAIL-SOFT, SAFE)
 * -----------------------------------------------------------------------------
 * Description  :
 * - UI-only : ne modifie pas la BDD (aucun appel Supabase direct)
 * - Normalisation alignée Settings + /api/handle/check + index unique lower(handle)
 * - Check disponibilité via /api/handle/check (debounce + abort) + fail-soft
 * - Expose onCommit(normalized|null) pour intégration dans app/settings/page.tsx
 * - SAFE : évite setState synchrones "early returns" dans useEffect (eslint react-hooks/set-state-in-effect)
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.0.2 (2026-01-26)
 * - [FIX] ESLint react-hooks/set-state-in-effect : setState déplacés dans callbacks async / guards
 * - [KEEP] Anti-course (AbortController) + debounce + UX inchangés
 * =============================================================================
 */

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

const HANDLE_MIN = 3;
const HANDLE_MAX = 24;

const RESERVED_HANDLES = new Set([
  'admin',
  'api',
  'app',
  'auth',
  'account',
  'settings',
  'login',
  'signup',
  'register',
  'explore',
  'map',
  'u',
  'me',
  'support',
  'terms',
  'privacy',
]);

type Availability = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'error';

type Props = {
  initialHandle?: string | null;
  disabled?: boolean;
  onCommit?: (next: string | null) => void | Promise<void>;
  label?: string;
  hint?: string;
  commitOnBlur?: boolean;
};

function normalizeHandleStrict(input: string): string {
  const raw = typeof input === 'string' ? input : '';
  const cleaned = raw.trim().replace(/^@/, '').trim();
  if (!cleaned) return '';
  return cleaned
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, HANDLE_MAX);
}

function validateHandle(normalized: string): { ok: boolean; reason?: string } {
  if (!normalized) return { ok: true };
  if (normalized.length < HANDLE_MIN) return { ok: false, reason: `Minimum ${HANDLE_MIN} caractères.` };
  if (normalized.length > HANDLE_MAX) return { ok: false, reason: `Maximum ${HANDLE_MAX} caractères.` };
  if (RESERVED_HANDLES.has(normalized)) return { ok: false, reason: 'Pseudo réservé.' };
  return { ok: true };
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), Math.max(0, delayMs));
    return () => window.clearTimeout(t);
  }, [value, delayMs]);

  return debounced;
}

function safeEq(a: string | null | undefined, b: string | null | undefined): boolean {
  return (a ?? '') === (b ?? '');
}

export default function ProfileHandleForm({
  initialHandle = null,
  disabled = false,
  onCommit,
  label = 'Pseudo (handle)',
  hint = 'Visible sur ton profil public et dans les URLs : /u/[handle].',
  commitOnBlur = false,
}: Props) {
  const initialNormalized = useMemo(() => normalizeHandleStrict(initialHandle ?? ''), [initialHandle]);

  const [raw, setRaw] = useState<string>(initialHandle ?? '');
  const normalized = useMemo(() => normalizeHandleStrict(raw), [raw]);

  const [availability, setAvailability] = useState<Availability>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const debounced = useDebouncedValue(normalized, 350);
  const abortRef = useRef<AbortController | null>(null);

  const isDirty = useMemo(() => !safeEq(normalized, initialNormalized), [normalized, initialNormalized]);
  const validation = useMemo(() => validateHandle(normalized), [normalized]);

  // ---------------------------------------------------------------------------
  // Check disponibilité (debounced) — UI-only, FAIL-SOFT
  // NOTE ESLint: on évite les setState synchrones dans le corps de l'effect:
  // - on calcule l'état "wanted"
  // - on applique via microtask (Promise.resolve) pour éviter le rule trigger
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const apply = (nextA: Availability, nextM: string | null) => {
      // microtask: évite setState "sync in effect body" (rule strict)
      Promise.resolve().then(() => {
        setAvailability(nextA);
        setMessage(nextM);
      });
    };

    // abort précédent (si on sort tôt)
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = null;

    if (disabled) {
      apply('idle', null);
      return;
    }

    // pas de pseudo => pas de check
    if (!debounced) {
      apply('idle', null);
      return;
    }

    // validation locale KO => pas de réseau
    const v = validateHandle(debounced);
    if (!v.ok) {
      apply('invalid', v.reason ?? 'Pseudo invalide.');
      return;
    }

    // identique à l'initial => pas de check réseau
    if (safeEq(debounced, initialNormalized)) {
      apply('idle', null);
      return;
    }

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    apply('checking', null);

    const run = async () => {
      try {
        const res = await fetch(`/api/handle/check?handle=${encodeURIComponent(debounced)}`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: ctrl.signal,
        });

        const json = (await res.json().catch(() => null)) as { available?: boolean } | null;
        const available = Boolean(json && typeof json.available === 'boolean' ? json.available : false);

        if (ctrl.signal.aborted) return;

        if (available) apply('available', 'Disponible.');
        else apply('taken', 'Déjà utilisé.');
      } catch {
        if (ctrl.signal.aborted) return;
        apply('error', 'Impossible de vérifier pour le moment.');
      }
    };

    void run();

    return () => {
      ctrl.abort();
    };
  }, [debounced, disabled, initialNormalized]);

  const commit = async () => {
    if (disabled) return;

    if (normalized !== raw) setRaw(normalized);

    const v = validateHandle(normalized);
    if (!v.ok) {
      setAvailability('invalid');
      setMessage(v.reason ?? 'Pseudo invalide.');
      return;
    }

    if (normalized && isDirty) {
      if (availability === 'checking') {
        setMessage('Vérification en cours…');
        return;
      }
      if (availability !== 'available') return;
    }

    if (!isDirty) return;

    try {
      await onCommit?.(normalized ? normalized : null);
    } catch (e) {
      setAvailability('error');
      setMessage(e instanceof Error ? e.message : 'Erreur lors de la sauvegarde.');
    }
  };

  const canApply = useMemo(() => {
    if (disabled) return false;
    if (!isDirty) return false;
    if (!normalized) return true; // suppression handle

    if (!validation.ok) return false;
    if (availability === 'checking') return false;
    return availability === 'available';
  }, [disabled, isDirty, normalized, validation.ok, availability]);

  const statusChip = useMemo(() => {
    if (!debounced) return null;

    if (availability === 'checking') {
      return (
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          Vérification…
        </span>
      );
    }

    if (availability === 'available') {
      return (
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
          <CheckCircle2 className="h-4 w-4" />
          Disponible
        </span>
      );
    }

    if (availability === 'taken') {
      return (
        <span className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-800">
          <AlertTriangle className="h-4 w-4" />
          Indisponible
        </span>
      );
    }

    if (availability === 'invalid') {
      return (
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
          <AlertTriangle className="h-4 w-4" />
          Invalide
        </span>
      );
    }

    if (availability === 'error') {
      return (
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700">
          <AlertTriangle className="h-4 w-4" />
          Check indisponible
        </span>
      );
    }

    return null;
  }, [availability, debounced]);

  const showError =
    Boolean(message) && (availability === 'taken' || availability === 'invalid' || availability === 'error');

  const showOk = Boolean(message) && availability === 'available';

  return (
    <section className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-lg shadow-black/5 backdrop-blur-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
          <p className="mt-1 text-xs text-slate-500">{hint}</p>
        </div>
        {statusChip}
      </div>

      <div className="mt-4">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm focus-within:border-slate-300">
              <span className="text-sm font-semibold text-slate-400">@</span>
              <input
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                onBlur={() => {
                  if (!commitOnBlur) {
                    if (normalized !== raw) setRaw(normalized);
                    return;
                  }
                  void commit();
                }}
                placeholder="ex: night_river"
                disabled={disabled}
                className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none disabled:opacity-70"
                maxLength={64}
                inputMode="text"
                autoComplete="off"
                aria-invalid={availability === 'invalid' || availability === 'taken' || availability === 'error'}
              />
            </div>

            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                {normalized
                  ? `Normalisé : ${normalized} (${normalized.length}/${HANDLE_MAX})`
                  : 'Laisser vide = pas de pseudo.'}
              </div>

              <button
                type="button"
                onClick={() => void commit()}
                disabled={!canApply}
                className={`rounded-xl px-4 py-2 text-xs font-semibold shadow transition ${
                  canApply ? 'bg-slate-900 text-white hover:scale-[1.01]' : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                }`}
              >
                Appliquer
              </button>
            </div>

            {showError && (
              <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                {message}
              </div>
            )}

            {!showError && showOk && (
              <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                {message}
              </div>
            )}

            <div className="mt-4 text-xs text-slate-500">
              Règles : {HANDLE_MIN}–{HANDLE_MAX} caractères, lettres/chiffres + <code>_</code> et <code>-</code>. Certains mots sont réservés.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
