/**
 * =============================================================================
 * Fichier      : components/map/ExploreFilters.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.2.0 (2026-01-23)
 * Objet        : Filtres Map /explore (émotion + période + proximité)
 * -----------------------------------------------------------------------------
 * Description  :
 * - Sélecteur d’émotions (chips)
 * - Filtre temporel (24h / 7d)
 * - Filtre géographique (nearMe) (aria-pressed)
 * - Callbacks contrôlés (no state interne)
 * - a11y renforcée (labels + état pressé + feedback SR)
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.2.0 (2026-01-23)
 * - [IMPROVED] Typage aligné Map : EmotionKey importé depuis mapStyle (évite divergences)
 * - [KEEP] Zéro changement visuel (classes identiques), zéro régression
 * =============================================================================
 */

'use client';

import React from 'react';
import type { EmotionKey } from '@/components/map/mapStyle';

const EMOTIONS = ['joy', 'sadness', 'anger', 'fear', 'love', 'hope'] as const satisfies readonly EmotionKey[];
type Emotion = (typeof EMOTIONS)[number];

const EMO_META: Record<Emotion, { label: string; icon: string }> = {
  joy: { label: 'Joie', icon: '😊' },
  sadness: { label: 'Tristesse', icon: '😔' },
  anger: { label: 'Colère', icon: '😡' },
  fear: { label: 'Peur', icon: '😨' },
  love: { label: 'Amour', icon: '❤️' },
  hope: { label: 'Espoir', icon: '✨' },
};

function chipClass(active: boolean): string {
  return [
    'px-3 py-1.5 rounded-full text-xs border transition select-none',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-0',
    active
      ? 'bg-white/15 border-white/25 text-white ring-1 ring-white/20'
      : 'bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10',
  ].join(' ');
}

function btnClass(active: boolean): string {
  return [
    'px-3 py-2 rounded-xl text-xs border transition select-none',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-0',
    active
      ? 'bg-white/15 border-white/25 text-white ring-1 ring-white/20'
      : 'bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10',
  ].join(' ');
}

export default function ExploreFilters({
  emotion,
  since,
  nearMe,
  onEmotion,
  onSince,
  onNearMe,
}: {
  emotion: Emotion | null;
  since: '24h' | '7d' | null;
  nearMe: boolean;
  onEmotion: (v: Emotion | null) => void;
  onSince: (v: '24h' | '7d' | null) => void;
  onNearMe: (v: boolean) => void;
}) {
  // Labels (accessibles) — ne changent pas le visuel
  const nearMeTitle = nearMe ? 'Autour de moi activé' : 'Autour de moi';
  const nearMeAria = nearMe ? 'Désactiver le filtre autour de moi' : 'Activer le filtre autour de moi';

  const emotionLabel = emotion ? EMO_META[emotion].label : 'Toutes';
  const sinceLabel = since === '24h' ? 'Dernières 24h' : since === '7d' ? '7 jours' : 'Aucune période';
  const geoLabel = nearMe ? 'Autour de moi' : 'Monde';

  return (
    <div className="pointer-events-auto">
      <div className="rounded-2xl border border-white/10 bg-black/25 backdrop-blur-xl shadow-xl p-3 space-y-3">
        {/* Statut SR (pas de changement visuel) */}
        <div className="sr-only" aria-live="polite">
          Filtres actifs : émotion {emotionLabel}, période {sinceLabel}, zone {geoLabel}.
        </div>

        {/* Emotion chips */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onEmotion(null)}
            className={chipClass(emotion === null)}
            aria-pressed={emotion === null}
            aria-label="Afficher toutes les émotions"
            title="Toutes"
          >
            Toutes
          </button>

          {EMOTIONS.map((e) => {
            const active = emotion === e;
            const meta = EMO_META[e];

            return (
              <button
                key={e}
                type="button"
                onClick={() => onEmotion(e)}
                className={chipClass(active)}
                aria-pressed={active}
                aria-label={`Filtrer par émotion : ${meta.label}`}
                title={meta.label}
              >
                <span className="mr-1" aria-hidden="true">
                  {meta.icon}
                </span>
                {meta.label}
              </button>
            );
          })}
        </div>

        {/* Since + Near me */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <div className="flex flex-1 gap-2">
            <button
              type="button"
              onClick={() => onSince(since === '24h' ? null : '24h')}
              className={btnClass(since === '24h')}
              aria-pressed={since === '24h'}
              aria-label="Filtrer sur les dernières 24 heures"
            >
              Dernières 24h
            </button>

            <button
              type="button"
              onClick={() => onSince(since === '7d' ? null : '7d')}
              className={btnClass(since === '7d')}
              aria-pressed={since === '7d'}
              aria-label="Filtrer sur les 7 derniers jours"
            >
              7 jours
            </button>
          </div>

          <button
            type="button"
            onClick={() => onNearMe(!nearMe)}
            className={btnClass(nearMe)}
            aria-pressed={nearMe}
            aria-label={nearMeAria}
            title={nearMeTitle}
          >
            <span aria-hidden="true">📍</span>
          </button>
        </div>
      </div>
    </div>
  );
}
