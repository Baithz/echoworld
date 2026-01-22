/**
 * =============================================================================
 * Fichier      : components/echo/EchoPreview.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.1 (2026-01-22)
 * Objet        : Aperçu fidèle d’un écho avant publication
 * -----------------------------------------------------------------------------
 * Fix :
 * - Remplace <img> par next/image (eslint @next/next/no-img-element)
 * - Rendu identique (grille 3 colonnes, carrés, cover)
 * =============================================================================
 */

import Image from 'next/image';

type Props = {
  content: string;
  emotion?: { emoji: string; label: string } | null;
  photos: string[];
};

export default function EchoPreview({ content, emotion, photos }: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="whitespace-pre-wrap text-sm text-slate-900">{content}</div>

      {photos.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {photos.map((src, i) => (
            <div key={`${src}-${i}`} className="relative aspect-square overflow-hidden rounded-xl">
              <Image
                src={src}
                alt=""
                fill
                sizes="33vw"
                className="object-cover"
                unoptimized
              />
            </div>
          ))}
        </div>
      )}

      {emotion && (
        <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
          <span className="text-lg">{emotion.emoji}</span>
          <span>{emotion.label}</span>
        </div>
      )}
    </div>
  );
}
