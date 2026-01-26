/**
 * =============================================================================
 * Fichier      : components/messages/ImageLightbox.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-25)
 * Objet        : Lightbox modal pour images plein écran
 * -----------------------------------------------------------------------------
 * Description  :
 * - Modal overlay plein écran pour afficher images
 * - Navigation prev/next si plusieurs images
 * - Fermeture ESC ou clic extérieur
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.0.0 (2026-01-25)
 * - [NEW] Modal lightbox plein écran
 * - [NEW] Navigation prev/next
 * - [NEW] Fermeture ESC + clic extérieur
 * =============================================================================
 */

'use client';

import { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

type Props = {
  imageUrl: string;
  images?: string[];
  currentIndex?: number;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
};

export default function ImageLightbox({ imageUrl, images, currentIndex, onClose, onPrev, onNext }: Props) {
  useEffect(() => {
    const handleKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') onClose();
      if (ev.key === 'ArrowLeft' && onPrev) onPrev();
      if (ev.key === 'ArrowRight' && onNext) onNext();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose, onPrev, onNext]);

  const hasMultiple = images && images.length > 1;
  const showPrev = hasMultiple && onPrev && (currentIndex ?? 0) > 0;
  const showNext = hasMultiple && onNext && (currentIndex ?? 0) < images!.length - 1;

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/95 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20"
        aria-label="Close"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Prev button */}
      {showPrev && (
        <button
          type="button"
          onClick={(ev) => {
            ev.stopPropagation();
            if (onPrev) onPrev();
          }}
          className="absolute left-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20"
          aria-label="Previous image"
        >
          <ChevronLeft className="h-7 w-7" />
        </button>
      )}

      {/* Image */}
      <div
        className="relative max-h-[90vh] max-w-[90vw]"
        onClick={(ev) => ev.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Full screen"
          className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
        />

        {/* Counter */}
        {hasMultiple && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-sm text-white backdrop-blur">
            {(currentIndex ?? 0) + 1} / {images!.length}
          </div>
        )}
      </div>

      {/* Next button */}
      {showNext && (
        <button
          type="button"
          onClick={(ev) => {
            ev.stopPropagation();
            if (onNext) onNext();
          }}
          className="absolute right-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20"
          aria-label="Next image"
        >
          <ChevronRight className="h-7 w-7" />
        </button>
      )}
    </div>
  );
}