/**
 * =============================================================================
 * Fichier      : components/settings/ProfileAvatarForm.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-27)
 * Objet        : Form avatar (UI-only) — type + seed/url, preview immédiat (SAFE)
 * -----------------------------------------------------------------------------
 * Description  :
 * - UI-only : ne touche pas à Supabase / BDD
 * - Preview via ProfileAvatar
 * - Expose onCommit(patch) pour intégration (app/settings/page.tsx plus tard)
 * - FAIL-SOFT : champs optionnels, validations douces
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.0.0 (2026-01-27)
 * - [NEW] Avatar form autonome + preview + patch payload
 * =============================================================================
 */

'use client';

import { useMemo, useState } from 'react';
import ProfileAvatar, { type AvatarType } from '@/components/profile/ProfileAvatar';

type AvatarPatch = {
  avatar_type: AvatarType;
  avatar_url: string | null;
  avatar_seed: string | null;
};

type Props = {
  id?: string | null;
  handle?: string | null;
  displayName?: string | null;

  initialType?: AvatarType | null;
  initialUrl?: string | null;
  initialSeed?: string | null;

  disabled?: boolean;
  onCommit?: (patch: AvatarPatch) => void | Promise<void>;

  label?: string;
  hint?: string;
};

function cleanUrl(v: string): string {
  return (v ?? '').trim();
}

function cleanSeed(v: string): string {
  return (v ?? '').trim();
}

export default function ProfileAvatarForm({
  id = null,
  handle = null,
  displayName = null,
  initialType = null,
  initialUrl = null,
  initialSeed = null,
  disabled = false,
  onCommit,
  label = 'Avatar',
  hint = 'Choisis un style (image, symbol, couleur, constellation). Prévisualisation immédiate.',
}: Props) {
  const [type, setType] = useState<AvatarType>(initialType ?? (initialUrl ? 'image' : 'constellation'));
  const [url, setUrl] = useState<string>(initialUrl ?? '');
  const [seed, setSeed] = useState<string>(initialSeed ?? '');

  const effectiveUrl = useMemo(() => (type === 'image' ? cleanUrl(url) : ''), [type, url]);
  const effectiveSeed = useMemo(() => (type === 'image' ? '' : cleanSeed(seed)), [type, seed]);

  const canApply = useMemo(() => {
    if (disabled) return false;
    if (type === 'image') return Boolean(cleanUrl(url));
    // seed facultatif : si vide, le composant utilisera id/handle/displayName
    return true;
  }, [disabled, type, url]);

  const commit = async () => {
    if (!onCommit) return;

    const patch: AvatarPatch = {
      avatar_type: type,
      avatar_url: type === 'image' ? (cleanUrl(url) || null) : null,
      avatar_seed: type === 'image' ? null : (cleanSeed(seed) || null),
    };

    await onCommit(patch);
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-lg shadow-black/5 backdrop-blur-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
          <p className="mt-1 text-xs text-slate-500">{hint}</p>
        </div>

        <ProfileAvatar
          id={id}
          handle={handle}
          displayName={displayName}
          avatarType={type}
          avatarUrl={type === 'image' ? (effectiveUrl || null) : null}
          avatarSeed={type === 'image' ? null : (effectiveSeed || null)}
          size={72}
          borderClassName="border border-white/60"
          className="shadow-md"
        />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="text-sm font-semibold text-slate-900">Style</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as AvatarType)}
            disabled={disabled}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-300 disabled:opacity-70"
          >
            <option value="constellation">Constellation (recommandé)</option>
            <option value="symbol">Symbol (emoji)</option>
            <option value="color">Couleur</option>
            <option value="image">Image (URL)</option>
          </select>
        </div>

        {type === 'image' ? (
          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-slate-900">URL image</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
              disabled={disabled}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-300 disabled:opacity-70"
              inputMode="url"
              autoComplete="off"
            />
            <div className="mt-2 text-xs text-slate-500">
              (Phase suivante : upload + Storage. Ici c’est volontairement UI-only.)
            </div>
          </div>
        ) : (
          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-slate-900">
              Seed (facultatif)
            </label>
            <input
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              placeholder={type === 'symbol' ? 'symbol:✨ (ou juste ✨)' : type === 'color' ? 'color:#7c3aed (ou #7c3aed)' : 'n’importe quel texte'}
              disabled={disabled}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-300 disabled:opacity-70"
              inputMode="text"
              autoComplete="off"
            />
            <div className="mt-2 text-xs text-slate-500">
              Exemples : <code>symbol:🜁</code> • <code>color:#0ea5e9</code> • ou vide (fallback id/handle).
            </div>
          </div>
        )}

        <div className="md:col-span-2 flex items-center justify-end">
          <button
            type="button"
            onClick={() => void commit()}
            disabled={!canApply || !onCommit}
            className={`rounded-xl px-4 py-2 text-xs font-semibold shadow transition ${
              canApply && onCommit
                ? 'bg-slate-900 text-white hover:scale-[1.01]'
                : 'bg-slate-200 text-slate-500 cursor-not-allowed'
            }`}
          >
            Appliquer
          </button>
        </div>
      </div>
    </section>
  );
}
