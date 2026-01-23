/**
 * =============================================================================
 * Fichier      : app/explore/page.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 2.2.0 (2026-01-23)
 * Objet        : Page /explore (client) - Carte EchoMap + filtres + StoryDrawer
 * -----------------------------------------------------------------------------
 * Description  :
 * - Importe EchoMap de façon robuste (default ou named export) sans "any"
 * - Gère les filtres contrôlés (émotion, période, nearMe)
 * - Gère la sélection d’un écho + chargement détail via getEchoById (safe)
 * - Ouvre un StoryDrawer latéral synchronisé avec la carte
 * - Sync de l’URL avec le paramètre ?focus=<id>
 * - Overlays atmosphère (gradients) au-dessus de la carte
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 2.2.0 (2026-01-23)
 * - [FIX] Position filtres : suppression top-21 (non standard Tailwind) => top-20 stable
 * - [IMPROVED] Si getEchoById échoue : fermeture propre (évite drawer “vide” ambigu)
 * - [KEEP] Toggle sélection, sync URL, overlays, anti-race => inchangés
 * =============================================================================
 */

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import * as EchoMapModule from '@/components/map/EchoMap';
import type { ComponentType } from 'react';
import StoryDrawer from '@/components/explore/StoryDrawer';
import ExploreFilters from '@/components/explore/ExploreFilters';
import { getEchoById, type EchoDetail } from '@/lib/echo/getEchoById';

type ExplorePageProps = {
  searchParams?: { focus?: string };
};

type Filters = {
  emotion: 'joy' | 'sadness' | 'anger' | 'fear' | 'love' | 'hope' | null;
  since: '24h' | '7d' | null;
  nearMe: boolean;
};

type EchoMapProps = {
  focusId?: string;
  filters: Filters;
  onSelectEcho: (id: string) => void;
};

type EchoMapDefaultModule = {
  default?: ComponentType<EchoMapProps>;
  EchoMap?: ComponentType<EchoMapProps>;
};

// Import robuste default/named sans any
const EchoMap =
  ((EchoMapModule as unknown as EchoMapDefaultModule).default ??
    (EchoMapModule as unknown as EchoMapDefaultModule).EchoMap) as ComponentType<EchoMapProps>;

export default function ExplorePage({ searchParams }: ExplorePageProps) {
  const initialFocus = searchParams?.focus ?? null;

  const [filters, setFilters] = useState<Filters>({
    emotion: null,
    since: null,
    nearMe: false,
  });

  const [selectedId, setSelectedId] = useState<string | null>(initialFocus);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(Boolean(initialFocus));
  const [loading, setLoading] = useState<boolean>(false);
  const [story, setStory] = useState<EchoDetail | null>(null);

  const focusId = useMemo(() => selectedId ?? undefined, [selectedId]);

  const closeDrawer = () => {
    setSelectedId(null);
    setDrawerOpen(false);
    setLoading(false);
    setStory(null);
  };

  // charge story quand selectedId change (anti-race + erreurs safe)
  useEffect(() => {
    const id = selectedId;

    if (!id) {
      setStory(null);
      setDrawerOpen(false);
      setLoading(false);
      return;
    }

    let cancelled = false;

    setDrawerOpen(true);
    setLoading(true);

    (async () => {
      try {
        const s = await getEchoById(id);
        if (cancelled) return;

        // si l’API renvoie null/undefined, on évite un drawer sans contenu
        if (!s) {
          closeDrawer();
          return;
        }

        setStory(s);
      } catch {
        if (cancelled) return;
        // en cas d’erreur, fermeture propre (au lieu de drawer vide)
        closeDrawer();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  // Sync URL ?focus=...
  useEffect(() => {
    const url = new URL(window.location.href);
    if (selectedId) url.searchParams.set('focus', selectedId);
    else url.searchParams.delete('focus');
    window.history.replaceState({}, '', url.toString());
  }, [selectedId]);

  const onSelectEcho = (id: string) => {
    // toggle : si on reclique le même point -> fermeture
    if (id && id === selectedId) {
      closeDrawer();
      return;
    }
    setSelectedId(id);
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black">
      {/* Map */}
      <EchoMap focusId={focusId} filters={filters} onSelectEcho={onSelectEcho} />

      {/* Atmosphere overlay (design) */}
      <div className="pointer-events-none absolute inset-0 z-10">
        <div className="absolute inset-0 bg-linear-to-b from-black/35 via-black/10 to-black/45" />
        <div className="absolute inset-0 mask-[radial-gradient(circle_at_50%_35%,black,transparent_70%)] bg-white/10 blur-2xl opacity-40" />
      </div>

      {/* Filters (top-left) */}
      <div className="absolute left-4 top-20 z-30">
        <ExploreFilters
          emotion={filters.emotion}
          since={filters.since}
          nearMe={filters.nearMe}
          onEmotion={(v) => setFilters((p) => ({ ...p, emotion: v }))}
          onSince={(v) => setFilters((p) => ({ ...p, since: v }))}
          onNearMe={(v) => setFilters((p) => ({ ...p, nearMe: v }))}
        />
      </div>

      {/* Drawer */}
      <StoryDrawer open={drawerOpen} loading={loading} story={story} onClose={closeDrawer} />
    </main>
  );
}
