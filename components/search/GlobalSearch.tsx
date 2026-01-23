// =============================================================================
// Fichier      : components/search/GlobalSearch.tsx
// Auteur       : Régis KREMER (Baithz) — EchoWorld
// Version      : 1.2.2 (2026-01-23)
// Objet        : Recherche globale dans le header (desktop inline + mobile overlay)
// ----------------------------------------------------------------------------
// Notes :
// - La route profil canonique est /u/[handle] (si handle présent)
// - Fallback profil : /user/[id] (si handle manquant, et id = UUID)
// - Si le résultat correspond à l'utilisateur courant => /account
//
// CHANGELOG
// 1.2.2 (2026-01-23)
// - [FIX] TS2339: suppression de l'accès à r.preview sur SearchUserResult (champ inexistant)
// - [KEEP] Routing profils : normalisation handle + anti-404 sur /user/[id]
// - [KEEP] currentUserId : si on clique sur soi-même => /account
// - [KEEP] UI identique (desktop+mobile, debounce, résultats)
// =============================================================================

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { useGlobalSearch } from '@/components/search/useGlobalSearch';
import type { SearchResult, SearchUserResult } from '@/lib/search/types';
import SearchResults from '@/components/search/SearchResults';

type Variant = 'desktop' | 'mobile';

type Props = {
  variant: Variant;
  currentUserId?: string | null; // pour router vers /account si c'est moi
};

function normalizeQuery(q: string): { raw: string; normalized: string; isHandleHint: boolean } {
  const raw = (q ?? '').trim();
  const normalized = raw.startsWith('@') ? raw.slice(1).trim() : raw;
  return { raw, normalized, isHandleHint: raw.startsWith('@') && normalized.length > 0 };
}

// Normalise un handle de manière robuste pour la route /u/[handle]
function normalizeHandle(input: string): string {
  const raw = (input ?? '').trim().replace(/^@/, '').trim();
  if (!raw) return '';
  return raw
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 32);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

// Essaie de récupérer un handle fiable à partir d'un SearchUserResult (pas de preview ici)
function safeUserHandleFromResult(r: SearchUserResult): string {
  // 1) handle direct sur le résultat
  if (r.handle) return normalizeHandle(r.handle);

  // 2) label style "@pouete"
  const label = (r.label ?? '').trim();
  if (label.startsWith('@')) return normalizeHandle(label);

  // Pas de fallback via preview : SearchUserResult ne possède pas ce champ (TS-safe)
  return '';
}

function routeForResult(r: SearchResult, currentUserId: string | null): string {
  if (r.type === 'user') {
    // Si on clique sur soi-même => Mon profil
    if (currentUserId && r.id === currentUserId) return '/account';

    // Route canonique handle si possible (et normalisée)
    const h = safeUserHandleFromResult(r);
    if (h) return `/u/${h}`;

    // Fallback par id (uniquement si id semble être un UUID)
    // (évite /user/pouete => 404)
    if (isUuid(r.id)) return `/user/${r.id}`;

    // Dernier fallback: on tente /u/<id> si id ressemble à un handle
    const idAsHandle = normalizeHandle(r.id);
    if (idAsHandle) return `/u/${idAsHandle}`;

    // Si vraiment rien n'est exploitable, on renvoie vers explore
    return '/explore';
  }

  if (r.type === 'echo') return `/echo/${r.id}`;

  // Topics
  return `/explore?topic=${encodeURIComponent(r.label)}`;
}

export default function GlobalSearch({ variant, currentUserId = null }: Props) {
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
    const href = routeForResult(r, currentUserId);
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
