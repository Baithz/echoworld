/**
 * =============================================================================
 * Fichier      : components/messages/ImageLightbox.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-26)
 * Objet        : Lightbox image — full screen + navigation + close (Escape/overlay/croix)
 * -----------------------------------------------------------------------------
 * Description  :
 * - Affichage image full screen avec overlay noir semi-transparent
 * - Fermeture via : clic overlay, clic croix X, touche Escape
 * - Navigation images suivante/précédente (si multiple)
 * - Z-index élevé (z-[9999]) pour passer au-dessus de tout
 * - Event propagation safe (stopPropagation sur image pour éviter close intempestif)
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.0.0 (2026-01-26)
 * - [NEW] Lightbox full screen avec close handlers robustes
 * - [NEW] Navigation prev/next (si multiple images)
 * - [NEW] Keyboard support (Escape, ArrowLeft, ArrowRight)
 * - [NEW] Z-index z-[9999] pour overlay au-dessus de tout
 * =============================================================================
 */

'use client';

import { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

type Props = {
  imageUrl: string;
  allImages: string[];
  currentIndex: number;
  onClose: () => void;
  onNavigate?: (newIndex: number) => void;
};

export default function ImageLightbox({ imageUrl, allImages, currentIndex, onClose, onNavigate }: Props) {
  const hasMultiple = allImages.length > 1;
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < allImages.length - 1;

  // Keyboard navigation + Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (!onNavigate || !hasMultiple) return;

      if (e.key === 'ArrowLeft' && canGoPrev) {
        onNavigate(currentIndex - 1);
      } else if (e.key === 'ArrowRight' && canGoNext) {
        onNavigate(currentIndex + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, onNavigate, currentIndex, canGoPrev, canGoNext, hasMultiple]);

  // Prevent body scroll
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  const handlePrev = () => {
    if (onNavigate && canGoPrev) {
      onNavigate(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (onNavigate && canGoNext) {
      onNavigate(currentIndex + 1);
    }
  };

  return (
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Image lightbox"
    >
      {/* Close button (top-right) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute right-4 top-4 z-10000 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition-colors hover:bg-black/80"
        aria-label="Fermer"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Navigation prev (si multiple) */}
      {hasMultiple && canGoPrev && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
          className="absolute left-4 top-1/2 z-10000 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition-colors hover:bg-black/80"
          aria-label="Image précédente"
        >
          <ChevronLeft className="h-8 w-8" />
        </button>
      )}

      {/* Navigation next (si multiple) */}
      {hasMultiple && canGoNext && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          className="absolute right-4 top-1/2 z-10000 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition-colors hover:bg-black/80"
          aria-label="Image suivante"
        >
          <ChevronRight className="h-8 w-8" />
        </button>
      )}

      {/* Image container */}
      <div
        className="relative max-h-full max-w-full"
        onClick={(e) => {
          // Empêche la fermeture si clic sur l'image (seulement overlay)
          e.stopPropagation();
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Full size"
          className="max-h-[90vh] max-w-full rounded-lg object-contain"
          referrerPolicy="no-referrer"
        />

        {/* Counter (si multiple) */}
        {hasMultiple && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-2 text-sm font-semibold text-white backdrop-blur">
            {currentIndex + 1} / {allImages.length}
          </div>
        )}
      </div>
    </div>
  );
}