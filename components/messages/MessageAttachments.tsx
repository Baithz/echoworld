/**
 * =============================================================================
 * Fichier      : components/messages/MessageAttachments.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.1 (2026-01-26)
 * Objet        : Affichage attachments dans messages
 * -----------------------------------------------------------------------------
 * Description  :
 * - Affiche images cliquables (lightbox)
 * - Affiche fichiers non-images avec icône
 * - Grid responsive
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.0.1 (2026-01-26)
 * - [NEW] Exporte le type Attachment (pour import type côté MessageBubble)
 * - [FIX] TypeScript: champs name/size/type optionnels (compat MessageBubble fail-soft)
 * - [FIX] isImage: guard pour type undefined
 * - [FIX] Fallbacks: 'Fichier sans nom' si name undefined, 'Taille inconnue' si size undefined
 * - [FIX] Alt images: fallback si name undefined
 * -----------------------------------------------------------------------------
 * 1.0.0 (2026-01-25)
 * - [NEW] Affichage images grid
 * - [NEW] Clic image → Lightbox
 * - [NEW] Affichage fichiers non-images
 * =============================================================================
 */

'use client';

import { FileText, Download } from 'lucide-react';
import { formatFileSize } from '@/lib/storage/uploadToStorage';

export type Attachment = {
  url: string;
  name?: string;
  size?: number;
  type?: string;
};

type Props = {
  attachments: Attachment[];
  onImageClick: (url: string, allImages: string[], index: number) => void;
};

const isImage = (type?: string) => {
  if (!type) return false;
  return type.startsWith('image/');
};

export default function MessageAttachments({ attachments, onImageClick }: Props) {
  if (attachments.length === 0) return null;

  const images = attachments.filter((a) => isImage(a.type));
  const files = attachments.filter((a) => !isImage(a.type));

  return (
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
              onClick={() => onImageClick(img.url, images.map((i) => i.url), idx)}
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
                  {typeof file.size === 'number' && Number.isFinite(file.size) ? formatFileSize(file.size) : 'Taille inconnue'}
                </div>
              </div>

              <Download className="h-4 w-4 shrink-0 text-slate-400" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
