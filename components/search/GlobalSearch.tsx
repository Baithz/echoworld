// =============================================================================
// Fichier      : components/search/GlobalSearch.tsx
// Auteur       : Régis KREMER (Baithz) — EchoWorld
// Version      : 1.2.0 (2026-01-23)
// Objet        : Recherche globale dans le header (desktop inline + mobile overlay)
// ----------------------------------------------------------------------------
// Notes :
// - La route profil canonique est /u/[handle] (si handle présent)
// - Fallback profil : /user/[id] (si handle manquant)
// =============================================================================

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { useGlobalSearch } from '@/components/search/useGlobalSearch';
import type { SearchResult } from '@/lib/search/types';
import SearchResults from '@/components/search/SearchResults';

type Variant = 'desktop' | 'mobile';

type Props = {
  variant: Variant;
};

function routeForResult(r: SearchResult): string {
  if (r.type === 'user') {
    if (r.handle) return `/u/${r.handle}`;
    return `/user/${r.id}`;
  }
  if (r.type === 'echo') return `/echo/${r.id}`;
  return `/explore?topic=${encodeURIComponent(r.label)}`;
}

function normalizeQuery(q: string): { raw: string; normalized: string; isHandleHint: boolean } {
  const raw = (q ?? '').trim();
  const normalized = raw.startsWith('@') ? raw.slice(1).trim() : raw;
  return { raw, normalized, isHandleHint: raw.startsWith('@') && normalized.length > 0 };
}

export default function GlobalSearch({ variant }: Props) {
  const router = useRouter();
  const { query, setQuery, loading, bundle, hasResults } = useGlobalSearch({
    debounceMs: 220,
    limitPerSection: 5,
  });

  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const isDesktop = variant === 'desktop';

  const canShowPanel = useMemo(() => {
    const q = query.trim();
    return open && (q.length > 0 || hasResults || loading);
  }, [open, query, hasResults, loading]);

  const close = () => setOpen(false);

  const pick = (r: SearchResult) => {
    const href = routeForResult(r);
    close();
    router.push(href);
  };

  const pickOnEnter = () => {
    // Si l'utilisateur cherche explicitement un handle (@...), on privilégie la section users si possible
    const { isHandleHint } = normalizeQuery(query);
    if (isHandleHint && bundle.users.length > 0) {
      pick(bundle.users[0]);
      return;
    }
    const first = bundle.all[0];
    if (first) pick(first);
  };

  // Click-outside close (desktop popover)
  useEffect(() => {
    if (!isDesktop || !open) return;

    const onDoc = (e: MouseEvent) => {
      const el = wrapperRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) close();
    };

    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [isDesktop, open]);

  // Esc close + Enter => pick first result
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'Enter') pickOnEnter();
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, bundle.all, bundle.users, query]);

  // Focus input on open
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  // Desktop inline input (popover)
  if (isDesktop) {
    return (
      <div
        ref={wrapperRef}
        className="relative w-[320px]"
        aria-expanded={open}
        aria-controls="ew-search-panel"
      >
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 text-slate-900 backdrop-blur-md">
          <Search className="h-4 w-4 text-slate-500" />

          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            placeholder="Rechercher un écho, un sujet ou un membre…"
            aria-label="Global search"
          />

          {query.trim().length > 0 ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="inline-flex h-7 w-7 items-center justify-center rounded-xl hover:bg-white"
              aria-label="Clear search"
            >
              <X className="h-4 w-4 text-slate-500" />
            </button>
          ) : null}
        </div>

        {canShowPanel ? (
          <div
            id="ew-search-panel"
            className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-2xl shadow-black/10 backdrop-blur-xl"
            role="dialog"
            aria-label="Search results"
          >
            <SearchResults bundle={bundle} loading={loading} onPick={pick} />
          </div>
        ) : null}
      </div>
    );
  }

  // Mobile: icon -> full overlay
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white/70 text-slate-900 backdrop-blur-md transition-all hover:border-slate-300 hover:bg-white"
        aria-label="Open search"
        aria-expanded={open}
        aria-controls="ew-search-overlay"
      >
        <Search className="h-5 w-5" />
      </button>

      {open ? (
        <div
          id="ew-search-overlay"
          className="fixed inset-0 z-70 bg-white/90 backdrop-blur-xl"
          role="dialog"
          aria-label="Global search overlay"
        >
          <div className="mx-auto w-full max-w-2xl px-4 pt-6">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3">
              <Search className="h-5 w-5 text-slate-500" />

              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent text-base outline-none placeholder:text-slate-400"
                placeholder="Rechercher…"
                aria-label="Search input"
              />

              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  close();
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-slate-50"
                aria-label="Close search"
              >
                <X className="h-5 w-5 text-slate-700" />
              </button>
            </div>

            <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <SearchResults bundle={bundle} loading={loading} onPick={pick} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
