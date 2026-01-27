/**
 * =============================================================================
 * Fichier      : components/map/CountryHeartMarkers.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.2.0 (2026-01-27)
 * Objet        : Cœurs d'agrégation pays (vue monde) + % + heartbeat + pulse line
 * -----------------------------------------------------------------------------
 * Description  :
 * - Cœur SVG inline (ombre + stroke) coloré par émotion dominante
 * - Pourcentage dominant affiché dans le cœur
 * - Heartbeat (animation) + hover
 * - Ligne ECG animée sous le cœur (pulse line)
 * - Click : callback (zoom vers centroid)
 * - KEEP: Props / data-* / title / badge count, aucune régression
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.2.0 (2026-01-27)
 * - [FIX] filterId SVG stable + safe (hash) pour éviter collisions / caractères invalides
 * - [FIX] Component-ready-for-Marker: wrapper unique (pas de position absolute inutile)
 * - [IMPROVED] A11y: role/button + aria-label + keydown (Enter/Space)
 * - [IMPROVED] Perf: markers memoïzés avec deps strictes + clamp % [0..100]
 * - [KEEP] Rendu cœur + % + click + badge count + ECG + heartbeat, zéro régression
 *
 * 1.1.0 (2026-01-27)
 * - [NEW] Ajoute une ligne ECG animée sous le cœur (pulse line)
 * - [IMPROVED] DOM marker-ready (centrage stable + hover ciblé)
 * - [KEEP] Rendu cœur + % + click + badge count, zéro régression
 * =============================================================================
 */

'use client';

import { useMemo, useCallback } from 'react';
import type { CountryAggregation } from '@/lib/echo/getEchoesAggregatedByCountry';
import { EMOTION_COLORS, EMOTION_LABELS } from '@/components/map/mapStyle';

type Props = {
  aggregations: CountryAggregation[];
  onCountryClick: (country: string, centroid: [number, number]) => void;
};

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

// hash simple et stable (évite d’injecter le nom du pays dans un id SVG)
function hashId(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // positif + base36
  return `h${(h >>> 0).toString(36)}`;
}

/**
 * Composant SVG de cœur (inline, pas de data URI)
 */
function HeartSVG({
  color,
  percentage,
  size = 48,
  country,
}: {
  color: string;
  percentage: number;
  size?: number;
  country: string;
}) {
  const filterId = useMemo(() => `shadow-${hashId(country)}`, [country]);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <filter id={filterId}>
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" />
        </filter>
      </defs>

      <path
        d="M24 42 C18 38, 6 30, 6 18 C6 10, 12 6, 18 6 C20 6, 22 7, 24 10 C26 7, 28 6, 30 6 C36 6, 42 10, 42 18 C42 30, 30 38, 24 42 Z"
        fill={color}
        stroke="white"
        strokeWidth="2"
        filter={`url(#${filterId})`}
      />

      <text
        x="24"
        y="26"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="12"
        fontWeight="bold"
        fill="white"
        stroke="rgba(0,0,0,0.3)"
        strokeWidth="0.5"
      >
        {percentage}%
      </text>
    </svg>
  );
}

/**
 * Ligne ECG (pulse line) sous le cœur
 */
function ECGLine() {
  return (
    <svg
      className="ecg-line"
      width="64"
      height="18"
      viewBox="0 0 64 18"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      <polyline
        points="0,10 10,10 14,4 18,16 22,2 26,10 34,10 40,10 44,6 48,14 52,8 56,10 64,10"
        fill="none"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function CountryHeartMarkers({ aggregations, onCountryClick }: Props) {
  // Map -> render stable
  const markers = useMemo(() => {
    return aggregations.map((agg) => {
      const dominant = agg.dominantEmotion;
      const color = EMOTION_COLORS[dominant];
      const pctRaw = agg.emotionPercentages[dominant];
      const percentage = clampInt(pctRaw, 0, 100);
      const emotionLabel = EMOTION_LABELS[dominant];

      return {
        id: agg.country,
        centroid: agg.centroid,
        color,
        percentage,
        emotionLabel,
        totalCount: agg.totalCount,
      };
    });
  }, [aggregations]);

  const handleKeyDown = useCallback(
    (country: string, centroid: [number, number]) => (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onCountryClick(country, centroid);
      }
    },
    [onCountryClick]
  );

  return (
    <>
      {markers.map((marker) => {
        const [lng, lat] = marker.centroid;

        const title = `${marker.id} - ${marker.emotionLabel} (${marker.totalCount} échos)`;
        const aria = `Ouvrir ${marker.id}, ${marker.emotionLabel}, ${marker.percentage} pour cent, ${marker.totalCount} échos`;

        return (
          <div
            key={marker.id}
            data-country={marker.id}
            data-lng={lng}
            data-lat={lat}
            className="country-heart-marker"
            role="button"
            tabIndex={0}
            aria-label={aria}
            title={title}
            onClick={() => onCountryClick(marker.id, marker.centroid)}
            onKeyDown={handleKeyDown(marker.id, marker.centroid)}
            style={{
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <div
              className="heart-container"
              style={{
                position: 'relative',
                display: 'grid',
                justifyItems: 'center',
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div
                className="heart-anim"
                style={{
                  width: '48px',
                  height: '48px',
                  animation: 'heartbeat 2s ease-in-out infinite',
                  willChange: 'transform',
                }}
              >
                <HeartSVG color={marker.color} percentage={marker.percentage} country={marker.id} />
              </div>

              <div style={{ marginTop: '2px', opacity: 0.95 }}>
                <ECGLine />
              </div>

              {marker.totalCount > 99 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    background: '#EF5350',
                    color: 'white',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  }}
                >
                  {marker.totalCount > 999 ? '999+' : marker.totalCount}
                </div>
              )}
            </div>
          </div>
        );
      })}

      <style jsx>{`
        @keyframes heartbeat {
          0%,
          100% {
            transform: scale(1);
          }
          10%,
          30% {
            transform: scale(1.1);
          }
          20%,
          40% {
            transform: scale(1.05);
          }
        }

        @keyframes ecg {
          0% {
            transform: translateX(-10px);
            opacity: 0.35;
          }
          30% {
            opacity: 1;
          }
          100% {
            transform: translateX(10px);
            opacity: 0.35;
          }
        }

        .ecg-line {
          animation: ecg 1.6s ease-in-out infinite;
          filter: drop-shadow(0 2px 6px rgba(255, 255, 255, 0.25));
          will-change: transform, opacity;
        }

        .country-heart-marker:hover .heart-anim {
          transform: scale(1.12);
          transition: transform 0.2s ease-out;
        }

        .country-heart-marker:focus-visible .heart-anim {
          outline: 2px solid rgba(255, 255, 255, 0.6);
          outline-offset: 4px;
          border-radius: 999px;
        }
      `}</style>
    </>
  );
}
