// =============================================================================
// Fichier      : components/profile/ProfileEchoList.tsx
// Auteur       : Régis KREMER (Baithz) — EchoWorld
// Version      : 2.0.0 (2026-01-23)
// Objet        : Liste UI des échos d'un profil (public) avec images et interactions
// -----------------------------------------------------------------------------
// CHANGELOG
// 2.0.0 (2026-01-23)
// - [NEW] Affichage des images (image_urls)
// - [NEW] Interactions : like, commentaire, partage
// - [NEW] Prop currentUserId pour gérer l'auth
// - [IMPROVED] Design cards premium en grid 2 colonnes
// - [IMPROVED] Preview images en grid responsive
// 1.0.0 (2026-01-23)
// - Version initiale basique
// =============================================================================

'use client';

import { useState } from 'react';
import { Heart, MessageCircle, Share2, MapPin } from 'lucide-react';
import type { PublicEcho } from '@/lib/profile/getProfile';

type Props = {
  echoes: PublicEcho[];
  currentUserId?: string | null;
};

function safePreview(text: string, max = 220): string {
  const clean = (text ?? '').trim().replace(/\s+/g, ' ');
  if (!clean) return '…';
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

function EchoCard({
  echo,
  currentUserId,
}: {
  echo: PublicEcho;
  currentUserId?: string | null;
}) {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0); // TODO: fetch from DB

  const handleLike = () => {
    if (!currentUserId) {
      alert('Connecte-toi pour aimer cet écho');
      return;
    }

    // TODO: Implémenter like API
    setLiked(!liked);
    setLikesCount((prev) => (liked ? prev - 1 : prev + 1));
  };

  const handleComment = () => {
    if (!currentUserId) {
      alert('Connecte-toi pour commenter');
      return;
    }
    // TODO: Ouvrir modal commentaires
    alert('Commentaires à venir !');
  };

  const handleShare = () => {
    // TODO: Implémenter partage
    alert('Partage à venir !');
  };

  const location = [echo.city, echo.country].filter(Boolean).join(', ');
  const hasImages = Array.isArray(echo.image_urls) && echo.image_urls.length > 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:shadow-lg">
      <a href={`/echo/${echo.id}`} className="block p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-bold text-slate-900">
              {echo.title ?? 'Écho'}
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
              <span>{formatDate(echo.created_at)}</span>
              {location && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span>{location}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Badge visibility */}
          <div className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
            {echo.visibility}
          </div>
        </div>

        {/* Content preview */}
        <div className="mt-3 text-sm leading-relaxed text-slate-700">
          {safePreview(echo.content, 200)}
        </div>

        {/* Images */}
        {hasImages && (
          <div
            className={`mt-4 grid gap-2 ${
              echo.image_urls.length === 1
                ? 'grid-cols-1'
                : echo.image_urls.length === 2
                ? 'grid-cols-2'
                : 'grid-cols-2 sm:grid-cols-3'
            }`}
          >
            {echo.image_urls.slice(0, 4).map((url, idx) => (
              <div
                key={`${echo.id}-img-${idx}`}
                className="relative aspect-square overflow-hidden rounded-xl bg-slate-100"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Image ${idx + 1}`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                {/* Overlay "+N" si plus de 4 images */}
                {idx === 3 && echo.image_urls.length > 4 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <span className="text-lg font-bold text-white">
                      +{echo.image_urls.length - 4}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Theme tags */}
        {(echo.theme_tags?.length ?? 0) > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {echo.theme_tags.slice(0, 4).map((t) => (
              <span
                key={`${echo.id}-${t}`}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </a>

      {/* Actions bar */}
      <div className="border-t border-slate-100 px-5 py-3">
        <div className="flex items-center gap-6 text-sm text-slate-600">
          {/* Like */}
          <button
            type="button"
            onClick={handleLike}
            className="group flex items-center gap-2 transition-colors hover:text-rose-600"
          >
            <Heart
              className={`h-4 w-4 transition-all group-hover:scale-110 ${
                liked ? 'fill-rose-600 text-rose-600' : ''
              }`}
            />
            <span className="text-xs font-semibold">
              {likesCount > 0 ? likesCount : ''}
            </span>
          </button>

          {/* Comment */}
          <button
            type="button"
            onClick={handleComment}
            className="group flex items-center gap-2 transition-colors hover:text-blue-600"
          >
            <MessageCircle className="h-4 w-4 transition-all group-hover:scale-110" />
            <span className="text-xs font-semibold">
              {/* TODO: fetch comments count */}
            </span>
          </button>

          {/* Share */}
          <button
            type="button"
            onClick={handleShare}
            className="group flex items-center gap-2 transition-colors hover:text-emerald-600"
          >
            <Share2 className="h-4 w-4 transition-all group-hover:scale-110" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProfileEchoList({ echoes, currentUserId }: Props) {
  if (!echoes || echoes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
        Aucun écho public pour le moment.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {echoes.map((e) => (
        <EchoCard key={e.id} echo={e} currentUserId={currentUserId} />
      ))}
    </div>
  );
}