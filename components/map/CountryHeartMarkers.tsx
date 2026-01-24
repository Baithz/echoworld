/**
 * =============================================================================
 * Fichier      : components/map/CountryHeartMarkers.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.1 (2026-01-24)
 * Objet        : Affichage des cœurs d'agrégation par pays (vue globe)
 * -----------------------------------------------------------------------------
 * Description  :
 * - Affiche un cœur par pays sur le centroid
 * - Cœur coloré selon l'émotion dominante
 * - Affiche le pourcentage de l'émotion dominante
 * - Pulse animation pour attirer l'attention
 * - Click sur cœur : zoom sur le pays
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.0.1 (2026-01-24)
 * - [FIX] Remplace <img> par SVG inline (ESLint @next/next/no-img-element)
 * - [IMPROVED] Meilleure performance (pas de data URI)
 * 
 * 1.0.0 (2026-01-24)
 * - [NEW] Composant CountryHeartMarkers
 * - [NEW] Cœurs SVG colorés par émotion dominante
 * - [NEW] Pourcentage affiché sur le cœur
 * - [NEW] Pulse animation CSS
 * =============================================================================
 */

'use client';

import { useMemo } from 'react';
import type { CountryAggregation } from '@/lib/echo/getEchoesAggregatedByCountry';
import { EMOTION_COLORS, EMOTION_LABELS } from '@/components/map/mapStyle';

type Props = {
  aggregations: CountryAggregation[];
  onCountryClick: (country: string, centroid: [number, number]) => void;
};

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
  const filterId = `shadow-${country.replace(/\s+/g, '-')}`;
  
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 48 48" 
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      {/* Ombre portée */}
      <defs>
        <filter id={filterId}>
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3"/>
        </filter>
      </defs>
      
      {/* Cœur */}
      <path 
        d="M24 42 C18 38, 6 30, 6 18 C6 10, 12 6, 18 6 C20 6, 22 7, 24 10 C26 7, 28 6, 30 6 C36 6, 42 10, 42 18 C42 30, 30 38, 24 42 Z" 
        fill={color}
        stroke="white" 
        strokeWidth="2"
        filter={`url(#${filterId})`}
      />
      
      {/* Pourcentage */}
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

export default function CountryHeartMarkers({ aggregations, onCountryClick }: Props) {
  // Génère les markers pour MapLibre
  const markers = useMemo(() => {
    return aggregations.map((agg) => {
      const color = EMOTION_COLORS[agg.dominantEmotion];
      const percentage = agg.emotionPercentages[agg.dominantEmotion];
      const emotionLabel = EMOTION_LABELS[agg.dominantEmotion];

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

  return (
    <>
      {markers.map((marker) => {
        const [lng, lat] = marker.centroid;
        
        return (
          <div
            key={marker.id}
            data-country={marker.id}
            data-lng={lng}
            data-lat={lat}
            className="country-heart-marker"
            style={{
              position: 'absolute',
              cursor: 'pointer',
              transform: 'translate(-50%, -50%)',
              zIndex: 100,
            }}
            onClick={() => onCountryClick(marker.id, marker.centroid)}
            title={`${marker.id} - ${marker.emotionLabel} (${marker.totalCount} échos)`}
          >
            <div className="heart-container" style={{ position: 'relative' }}>
              {/* Cœur avec animation pulse - SVG inline */}
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  animation: 'heartbeat 2s ease-in-out infinite',
                }}
              >
                <HeartSVG 
                  color={marker.color} 
                  percentage={marker.percentage}
                  country={marker.id}
                />
              </div>
              
              {/* Badge count (optionnel) */}
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

      {/* Styles CSS inline pour l'animation */}
      <style jsx>{`
        @keyframes heartbeat {
          0%, 100% {
            transform: scale(1);
          }
          10%, 30% {
            transform: scale(1.1);
          }
          20%, 40% {
            transform: scale(1.05);
          }
        }

        .country-heart-marker:hover > .heart-container > div {
          transform: scale(1.15);
          transition: transform 0.2s ease-out;
        }
      `}</style>
    </>
  );
}