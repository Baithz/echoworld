/**
 * =============================================================================
 * Fichier      : components/messages/MessageAttachments.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.1.0 (2026-01-26)
 * Objet        : Affichage attachments dans messages + lightbox intégrée
 * -----------------------------------------------------------------------------
 * Description  :
 * - Affiche images cliquables (lightbox intégrée avec close robuste)
 * - Affiche fichiers non-images avec icône
 * - Grid responsive
 * - Lightbox : fermeture via Escape / clic overlay / clic croix X (handlers robustes)
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.1.0 (2026-01-26)
 * - [FIX] Lightbox intégrée directement dans le composant (self-contained)
 * - [FIX] Close handlers robustes : Escape key + clic overlay + clic croix X
 * - [FIX] Event propagation safe : stopPropagation sur image pour éviter close intempestif
 * - [NEW] Navigation prev/next dans lightbox (si multiple images)
 * - [KEEP] Grid responsive + fallbacks name/size/type conservés
 * -----------------------------------------------------------------------------
 * 1.0.1 (2026-01-26)
 * - [NEW] Exporte le type Attachment (pour import type côté MessageBubble)
 * - [FIX] TypeScript: champs name/size/type optionnels (compat MessageBubble fail-soft)
 * - [FIX] isImage: guard pour type undefined
 * - [FIX] Fallbacks: 'Fichier sans nom' si name undefined, 'Taille inconnue' si size undefined
 * - [FIX] Alt images: fallback si name undefined
 * =============================================================================
 */

'use client';

import { useState, useEffect } from 'react';
import { FileText, Download, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatFileSize } from '@/lib/storage/uploadToStorage';

export type Attachment = {
  url: string;
  name?: string;
  size?: number;
  type?: string;
};

type Props = {
  attachments: Attachment[];
};

const isImage = (type?: string) => {
  if (!type) return false;
  return type.startsWith('image/');
};

export default function MessageAttachments({ attachments }: Props) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  if (attachments.length === 0) return null;

  const images = attachments.filter((a) => isImage(a.type));
  const files = attachments.filter((a) => !isImage(a.type));

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const canGoPrev = lightboxIndex > 0;
  const canGoNext = lightboxIndex < images.length - 1;

  const handlePrev = () => {
    if (canGoPrev) setLightboxIndex((prev) => prev - 1);
  };

  const handleNext = () => {
    if (canGoNext) setLightboxIndex((prev) => prev + 1);
  };

  return (
    <>
      <div className="mt-2 space-y-2">
        {/* Images grid */}
        {images.length > 0 && (
          <div
            className={`grid gap-2 ${
              images.length === 1 ? 'grid-cols-1' : images.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'
            }`}
          >
            {images.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => openLightbox(idx)}
                className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.name || 'Image'}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
              </button>
            ))}
          </div>
        )}

        {/* Files list */}
        {files.length > 0 && (
          <div className="space-y-1">
            {files.map((file, idx) => (
              <a
                key={idx}
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition-colors hover:bg-slate-50"
              >
                <FileText className="h-5 w-5 shrink-0 text-slate-400" />

                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-slate-900">{file.name || 'Fichier sans nom'}</div>
                  <div className="text-xs text-slate-500">
                    {typeof file.size === 'number' && Number.isFinite(file.size)
                      ? formatFileSize(file.size)
                      : 'Taille inconnue'}
                  </div>
                </div>

                <Download className="h-4 w-4 shrink-0 text-slate-400" />
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && images.length > 0 && (
        <Lightbox
          imageUrl={images[lightboxIndex].url}
          imageName={images[lightboxIndex].name}
          currentIndex={lightboxIndex}
          totalImages={images.length}
          onClose={closeLightbox}
          onPrev={canGoPrev ? handlePrev : undefined}
          onNext={canGoNext ? handleNext : undefined}
        />
      )}
    </>
  );
}

// ============================================================================
// LIGHTBOX COMPONENT (internal)
// ============================================================================

type LightboxProps = {
  imageUrl: string;
  imageName?: string;
  currentIndex: number;
  totalImages: number;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
};

function Lightbox({ imageUrl, imageName, currentIndex, totalImages, onClose, onPrev, onNext }: LightboxProps) {
  // Keyboard navigation + Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'ArrowLeft' && onPrev) {
        onPrev();
      } else if (e.key === 'ArrowRight' && onNext) {
        onNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, onPrev, onNext]);

  // Prevent body scroll
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = original;
    };
  }, []);

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

      {/* Navigation prev */}
      {onPrev && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          className="absolute left-4 top-1/2 z-10000 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition-colors hover:bg-black/80"
          aria-label="Image précédente"
        >
          <ChevronLeft className="h-8 w-8" />
        </button>
      )}

      {/* Navigation next */}
      {onNext && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNext();
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
          alt={imageName || 'Full size'}
          className="max-h-[90vh] max-w-full rounded-lg object-contain"
          referrerPolicy="no-referrer"
        />

        {/* Counter (si multiple) */}
        {totalImages > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-2 text-sm font-semibold text-white backdrop-blur">
            {currentIndex + 1} / {totalImages}
          </div>
        )}
      </div>
    </div>
  );
}