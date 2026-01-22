/**
 * =============================================================================
 * Fichier      : components/echo/EchoItem.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.1.0 (2026-01-22)
 * Objet        : Item flux écho — carte premium + expand inline animé + actions.
 * =============================================================================
 */

'use client';

import { Heart, Share2, ChevronDown, ChevronUp, ExternalLink, MapPin } from 'lucide-react';
import type { EchoRow } from './EchoFeed';

function formatDateFR(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: '2-digit' });
  } catch {
    return iso;
  }
}

function visibilityLabel(v: EchoRow['visibility']): string {
  if (!v) return '—';
  if (v === 'semi_anonymous') return 'semi-anonyme';
  return v;
}

export default function EchoItem({
  echo,
  expanded,
  liked,
  likeCount,
  copied,
  likeBusy,
  onToggleExpand,
  onLike,
  onShare,
  onOpen,
}: {
  echo: EchoRow;
  expanded: boolean;
  liked: boolean;
  likeCount: number;
  copied: boolean;
  likeBusy: boolean;
  onToggleExpand: () => void;
  onLike: () => void;
  onShare: () => void;
  onOpen: () => void;
}) {
  const title = echo.title?.trim() ? echo.title : 'Sans titre';

  return (
    <article className="group overflow-hidden rounded-3xl border border-slate-200 bg-white/70 backdrop-blur-md transition-all hover:border-slate-300 hover:shadow-lg shadow-black/5">
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-bold text-slate-900 group-hover:text-violet-600">{title}</div>

            <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
              <span>{formatDateFR(echo.created_at)}</span>

              {echo.emotion ? (
                <>
                  <span>•</span>
                  <span className="font-medium">{echo.emotion}</span>
                </>
              ) : null}

              {echo.visibility ? (
                <>
                  <span>•</span>
                  <span className="capitalize">{visibilityLabel(echo.visibility)}</span>
                </>
              ) : null}

              {echo.is_anonymous ? (
                <>
                  <span>•</span>
                  <span className="text-slate-400">anonyme</span>
                </>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            onClick={onOpen}
            className="shrink-0 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 transition-all hover:border-slate-300 hover:shadow-md"
            title="Ouvrir la page"
          >
            <ExternalLink className="h-4 w-4" />
            Ouvrir
          </button>
        </div>

        <p className={`mt-4 text-sm leading-relaxed text-slate-700 ${expanded ? '' : 'line-clamp-4'}`}>{echo.content}</p>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onToggleExpand}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.01] hover:bg-slate-800 active:scale-[0.99]"
              title={expanded ? 'Réduire' : 'Lire ici'}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {expanded ? 'Réduire' : 'Lire ici'}
            </button>

            <button
              type="button"
              onClick={onLike}
              disabled={likeBusy}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-transform hover:scale-[1.01] hover:bg-slate-50 active:scale-[0.99] disabled:opacity-60"
              title="J’aime"
            >
              <Heart className={`h-4 w-4 ${liked ? 'fill-rose-500 text-rose-500' : ''}`} />
              {likeCount > 0 ? <span className="tabular-nums">{likeCount}</span> : null}
              J’aime
            </button>

            <button
              type="button"
              onClick={onShare}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-transform hover:scale-[1.01] hover:bg-slate-50 active:scale-[0.99]"
              title="Partager"
            >
              <Share2 className="h-4 w-4" />
              {copied ? 'Copié' : 'Partager'}
            </button>
          </div>

          <div className="text-xs text-slate-500">
            {echo.city || echo.country ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {echo.city ? echo.city : ''}
                {echo.city && echo.country ? ' — ' : ''}
                {echo.country ? echo.country : ''}
              </span>
            ) : (
              <span className="text-slate-400">Localisation masquée</span>
            )}
          </div>
        </div>

        {/* Expand animé (grid trick) */}
        <div
          className={`mt-5 grid transition-all duration-300 ease-out ${
            expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/70 p-5 text-sm leading-relaxed text-slate-800">
            {echo.content}
          </div>
        </div>
      </div>
    </article>
  );
}
