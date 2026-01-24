// =============================================================================
// Fichier      : components/search/useGlobalSearch.ts
// Auteur       : Régis KREMER (Baithz) — EchoWorld
// Version      : 1.1.0 (2026-01-24)
// Objet        : Hook recherche globale (debounce + fail soft + bundle)
// -----------------------------------------------------------------------------
// CHANGELOG
// -----------------------------------------------------------------------------
// 1.1.0 (2026-01-24)
// - [FIX] CRITICAL: Suppression import searchTopics (table topics inexistante)
// - [FIX] Suppression appel searchTopics() dans Promise.all
// - [KEEP] topics[] reste dans le bundle (vide) pour compat UI
// - [KEEP] Logique debounce + requestId inchangée (zéro régression)
// =============================================================================

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { SearchResultsBundle, SearchResult, SearchTopicResult } from '@/lib/search/types';
import { searchEchoes, searchUsers } from '@/lib/search/queries';

function mergeAll(users: SearchResult[], echoes: SearchResult[], topics: SearchResult[]): SearchResult[] {
  return [...users, ...echoes, ...topics];
}

export function useGlobalSearch(opts?: { debounceMs?: number; limitPerSection?: number }) {
  const debounceMs = opts?.debounceMs ?? 220;
  const limitPerSection = opts?.limitPerSection ?? 5;

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [bundle, setBundle] = useState<SearchResultsBundle>({
    users: [],
    echoes: [],
    topics: [],
    all: [],
  });

  const requestIdRef = useRef(0);

  useEffect(() => {
    const term = query.trim();
    if (!term) {
      setLoading(false);
      setBundle({ users: [], echoes: [], topics: [], all: [] });
      return;
    }

    setLoading(true);
    const myId = ++requestIdRef.current;

    const timer = window.setTimeout(async () => {
      try {
        // Recherche parallèle (users + echoes uniquement)
        // Topics désactivés : table 'topics' inexistante en BDD
        const [users, echoes] = await Promise.all([
          searchUsers(term, limitPerSection),
          searchEchoes(term, limitPerSection),
        ]);

        // Topics vide (pour compatibilité UI)
        const topics: SearchTopicResult[] = [];

        if (requestIdRef.current !== myId) return;

        const all = mergeAll(users, echoes, topics);
        setBundle({ users, echoes, topics, all });
      } catch (err) {
        // Fail soft : ne pas crasher l'app si la recherche échoue
        console.error('[useGlobalSearch] Search error:', err);
        if (requestIdRef.current === myId) {
          setBundle({ users: [], echoes: [], topics: [], all: [] });
        }
      } finally {
        if (requestIdRef.current === myId) setLoading(false);
      }
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [query, debounceMs, limitPerSection]);

  const hasResults = useMemo(() => bundle.all.length > 0, [bundle.all.length]);

  return {
    query,
    setQuery,
    loading,
    bundle,
    hasResults,
  };
}