/**
 * =============================================================================
 * Fichier      : components/search/SearchResults.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.1.0 (2026-01-23)
 * Description  : Renderer résultats (users / echoes / topics) - UI premium, safe
 * -----------------------------------------------------------------------------
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.1.0 (2026-01-23)
 * - [IMPROVED] Cartes membres: avatar si dispo + fallback initiales
 * - [IMPROVED] Hover/focus states premium (accessibilité)
 * - [SAFE] Aucun changement d'API (bundle/loading/onPick) ; sections inchangées
 * =============================================================================
 */

'use client';

import { Hash, MessageSquareText, User as UserIcon } from 'lucide-react';
import type { SearchResultsBundle, SearchResult } from '@/lib/search/types';

type Props = {
  bundle: SearchResultsBundle;
  loading: boolean;
  onPick: (r: SearchResult) => void;
};

function sectionTitle(label: string) {
  return (
    <div className="px-3 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
      {label}
    </div>
  );
}

function initials(name: string) {
  const parts = (name ?? '')
    .trim()
    .split(/\s+/g)
    .filter(Boolean);

  const a = parts[0]?.[0] ?? 'U';
  const b = parts[1]?.[0] ?? '';
  return (a + b).toUpperCase();
}

function RowButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50"
    >
      {children}
    </button>
  );
}

export default function SearchResults({ bundle, loading, onPick }: Props) {
  if (loading) {
    return (
      <div className="p-3 text-xs text-slate-600">
        <div className="rounded-xl border border-slate-200 bg-white p-3">Recherche…</div>
      </div>
    );
  }

  const empty = bundle.all.length === 0;

  if (empty) {
    return (
      <div className="p-3 text-xs text-slate-600">
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-3">
          Aucun résultat.
        </div>
      </div>
    );
  }

  return (
    <div className="max-h-90 overflow-auto">
      {bundle.users.length > 0 && sectionTitle('Membres')}
      {bundle.users.map((u) => {
        const label = u.label ?? 'User';
        const sub = u.handle ? `@${u.handle}` : u.id.slice(0, 8);

        return (
          <RowButton key={`u-${u.id}`} onClick={() => onPick(u)}>
            <span className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
              {u.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-slate-700">{initials(label)}</span>
              )}
            </span>

            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-slate-900">{label}</span>
              <span className="block truncate text-xs text-slate-500">{sub}</span>
            </span>

            <span className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400">
              <UserIcon className="h-4 w-4" />
            </span>
          </RowButton>
        );
      })}

      {bundle.echoes.length > 0 && sectionTitle('Échos')}
      {bundle.echoes.map((e) => (
        <button
          key={`e-${e.id}`}
          type="button"
          onClick={() => onPick(e)}
          className="flex w-full items-start gap-3 px-3 py-2 text-left transition-colors hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50"
        >
          <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white">
            <MessageSquareText className="h-4 w-4 text-slate-700" />
          </span>

          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-slate-900">{e.label}</span>
            <span className="mt-0.5 block truncate text-xs text-slate-600">{e.preview}</span>
          </span>
        </button>
      ))}

      {bundle.topics.length > 0 && sectionTitle('Sujets')}
      {bundle.topics.map((t) => (
        <button
          key={`t-${t.id}`}
          type="button"
          onClick={() => onPick(t)}
          className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50"
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white">
            <Hash className="h-4 w-4 text-slate-700" />
          </span>

          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-slate-900">{t.label}</span>
            <span className="block truncate text-xs text-slate-500">Sujet</span>
          </span>
        </button>
      ))}

      <div className="px-3 pb-3 pt-2">
        <div className="rounded-xl border border-slate-200 bg-white p-2 text-[11px] text-slate-500">
          Astuce: Entrée ouvre le 1er résultat • Échap ferme
        </div>
      </div>
    </div>
  );
}
