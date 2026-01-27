/**
 * =============================================================================
 * Fichier      : app/explore/page.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.2.1 (2026-01-27)
 * Objet        : Page Explore — Map plein écran + filtres + sélection d’un écho
 * -----------------------------------------------------------------------------
 * Description  :
 * - FIX Next build: wrap useSearchParams() inside a Suspense boundary (CSR bailout)
 * - KEEP: UI/structure identiques (topbar + panneau minimal + map fullscreen)
 * - KEEP: TTL monde 1h (since="1h" par défaut)
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.2.1 (2026-01-27)
 * - [FIX] Ajoute <Suspense> au-dessus du composant qui utilise useSearchParams()
 * - [KEEP] Zéro régression UI/UX, logique identique
 * =============================================================================
 */

'use client';

import dynamic from 'next/dynamic';
import { Suspense, useCallback, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type Filters = {
  emotion: string | null;
  since: '1h' | '24h' | '7d' | null;
  nearMe: boolean;
};

// Import client-only de la map (MapLibre ne doit pas être rendu SSR)
const EchoMap = dynamic(() => import('@/components/map/EchoMap'), {
  ssr: false,
  loading: () => (
    <div className="h-screen w-screen grid place-items-center">
      <div className="text-sm opacity-70">Chargement de la carte…</div>
    </div>
  ),
});

const EMOTIONS: Array<{ key: string; label: string }> = [
  { key: 'joy', label: 'Joie' },
  { key: 'hope', label: 'Espoir' },
  { key: 'love', label: 'Amour' },
  { key: 'resilience', label: 'Résilience' },
  { key: 'gratitude', label: 'Gratitude' },
  { key: 'courage', label: 'Courage' },
  { key: 'peace', label: 'Paix' },
  { key: 'wonder', label: 'Émerveillement' },
];

function safeUuid(v: string | null): string | null {
  if (!v) return null;
  const s = v.trim();
  if (s.length < 32 || s.length > 40) return null;
  return s;
}

function ExploreInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const focusFromUrl = useMemo(() => safeUuid(searchParams.get('focus')), [searchParams]);

  // Default: Monde = dernière heure (TTL perf)
  const [filters, setFilters] = useState<Filters>({ emotion: null, since: '1h', nearMe: false });

  /**
   * URL-driven selection, sans setState-in-effect.
   * pendingId sert uniquement à rendre le clic instantané
   * avant que Next ne reflète l’URL dans useSearchParams().
   */
  const [pendingId, setPendingId] = useState<string | null>(null);

  const selectedId = useMemo(() => {
    // Back/forward / liens directs: l’URL gagne toujours.
    return focusFromUrl ?? pendingId;
  }, [focusFromUrl, pendingId]);

  const updateUrlFocus = useCallback(
    (id: string | null) => {
      const current = typeof window !== 'undefined' ? window.location.search : '';
      const sp = new URLSearchParams(current);

      if (id) sp.set('focus', id);
      else sp.delete('focus');

      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname]
  );

  const onSelectEcho = useCallback(
    (id: string) => {
      setPendingId(id);
      updateUrlFocus(id);
      window.setTimeout(() => setPendingId(null), 400);
    },
    [updateUrlFocus]
  );

  const clearSelection = useCallback(() => {
    setPendingId(null);
    updateUrlFocus(null);
  }, [updateUrlFocus]);

  const geoHint = useMemo(() => {
    if (!filters.nearMe) return null;
    if (typeof window === 'undefined') return null;
    if (!('geolocation' in navigator)) return 'Géolocalisation non disponible sur ce navigateur.';
    return null;
  }, [filters.nearMe]);

  const worldTTLHint = useMemo(() => {
    if (filters.nearMe) return null;
    if (filters.since !== '1h') return null;
    return 'Vue monde limitée à la dernière heure pour préserver la performance.';
  }, [filters.nearMe, filters.since]);

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* MAP */}
      <EchoMap focusId={selectedId ?? undefined} filters={filters} onSelectEcho={onSelectEcho} />

      {/* TOP BAR (filtres) */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 p-3">
        <div className="pointer-events-auto mx-auto flex w-full max-w-4xl flex-wrap items-center gap-2 rounded-2xl bg-black/40 px-3 py-2 backdrop-blur-md">
          <div className="text-xs font-semibold opacity-90">Explorer</div>

          <div className="h-4 w-px bg-white/15" />

          {/* Emotion */}
          <label className="flex items-center gap-2 text-xs opacity-90">
            Émotion
            <select
              className="rounded-lg bg-black/40 px-2 py-1 text-xs outline-none ring-1 ring-white/10"
              value={filters.emotion ?? ''}
              onChange={(e) => setFilters((p) => ({ ...p, emotion: e.target.value ? e.target.value : null }))}
            >
              <option value="">Toutes</option>
              {EMOTIONS.map((e) => (
                <option key={e.key} value={e.key}>
                  {e.label}
                </option>
              ))}
            </select>
          </label>

          {/* Since */}
          <label className="flex items-center gap-2 text-xs opacity-90">
            Période
            <select
              className="rounded-lg bg-black/40 px-2 py-1 text-xs outline-none ring-1 ring-white/10"
              value={filters.since ?? ''}
              onChange={(e) =>
                setFilters((p) => ({
                  ...p,
                  since: (e.target.value ? (e.target.value as Filters['since']) : null) ?? null,
                }))
              }
              title="Filtre temporel côté carte (Monde conseillé: 1h)"
            >
              <option value="">Tout</option>
              <option value="1h">Dernière heure</option>
              <option value="24h">24h</option>
              <option value="7d">7 jours</option>
            </select>
          </label>

          {/* Near me */}
          <button
            type="button"
            className={`rounded-lg px-2 py-1 text-xs ring-1 ${
              filters.nearMe ? 'bg-white/20 ring-white/20' : 'bg-black/30 ring-white/10'
            }`}
            onClick={() => setFilters((p) => ({ ...p, nearMe: !p.nearMe }))}
            title="Centrer autour de moi (géoloc)"
          >
            {filters.nearMe ? '📍 Autour de moi' : '📍 Monde'}
          </button>

          <div className="ml-auto flex items-center gap-2">
            {selectedId ? (
              <button
                type="button"
                className="rounded-lg bg-black/30 px-2 py-1 text-xs ring-1 ring-white/10"
                onClick={clearSelection}
              >
                Fermer
              </button>
            ) : null}
          </div>

          {geoHint ? (
            <div className="w-full text-[11px] opacity-70">
              {geoHint} Si vous avez refusé la permission, réactivez-la dans le navigateur.
            </div>
          ) : null}

          {worldTTLHint ? <div className="w-full text-[11px] opacity-70">{worldTTLHint}</div> : null}
        </div>
      </div>

      {/* RIGHT PANEL (sélection minimale) */}
      {selectedId ? (
        <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-full max-w-md p-3">
          <div className="pointer-events-auto h-full rounded-2xl bg-black/45 p-3 backdrop-blur-md ring-1 ring-white/10">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Écho sélectionné</div>
              <button
                type="button"
                className="rounded-lg bg-black/30 px-2 py-1 text-xs ring-1 ring-white/10"
                onClick={clearSelection}
              >
                ✕
              </button>
            </div>

            <div className="mt-3 rounded-xl bg-black/30 p-3 text-xs ring-1 ring-white/10">
              <div className="opacity-75">ID</div>
              <div className="mt-1 break-all font-mono text-[11px]">{selectedId}</div>
            </div>

            <div className="mt-3 text-xs opacity-80">
              Prochaine étape: brancher ici le drawer complet (detail + media + actions) une fois la map validée.
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen grid place-items-center">
          <div className="text-sm opacity-70">Chargement…</div>
        </div>
      }
    >
      <ExploreInner />
    </Suspense>
  );
}
