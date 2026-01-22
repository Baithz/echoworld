/**
 * =============================================================================
 * Fichier      : components/search/SearchResults.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.1 (2026-01-22)
 * Description  : Renderer résultats (users / echoes / topics) - UI premium, safe
 * -----------------------------------------------------------------------------
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.0.1 (2026-01-22)
 * - [FIX] Suppression import Link inutilisé (eslint no-unused-vars)
 * - [DOC] Header normalisé (Description + Changelog)
 * =============================================================================
 */

'use client';

import { Hash, User as UserIcon, MessageSquareText } from 'lucide-react';
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
      {bundle.users.map((u) => (
        <button
          key={`u-${u.id}`}
          type="button"
          onClick={() => onPick(u)}
          className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-white"
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white">
            <UserIcon className="h-4 w-4 text-slate-700" />
          </span>

          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-slate-900">{u.label}</span>
            <span className="block truncate text-xs text-slate-500">
              {u.handle ? `@${u.handle}` : u.id.slice(0, 8)}
            </span>
          </span>
        </button>
      ))}

      {bundle.echoes.length > 0 && sectionTitle('Échos')}
      {bundle.echoes.map((e) => (
        <button
          key={`e-${e.id}`}
          type="button"
          onClick={() => onPick(e)}
          className="flex w-full items-start gap-3 px-3 py-2 text-left hover:bg-white"
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
          className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-white"
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
