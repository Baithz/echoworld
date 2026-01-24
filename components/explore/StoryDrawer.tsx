/**
 * =============================================================================
 * Fichier      : components/explore/StoryDrawer.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.5.2 (2026-01-24)
 * Objet        : Drawer latéral d’écho - Lecture rapide depuis la carte (cinéma)
 * -----------------------------------------------------------------------------
 * PHASE 3 — Commentaires visibles depuis le drawer
 * - [PHASE3] Affiche le compteur comments_count + CTA “Commentaires”
 * - [PHASE3] Lien direct vers /echo/[id]
 * - [FIX] next/image utilisé (suppression no-img-element)
 * - [KEEP] Focus trap / scroll lock / a11y / layout / animations
 * =============================================================================
 */

'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { EMOTION_COLORS, type EmotionKey } from '@/components/map/mapStyle';

type Story = {
  id: string;
  title: string | null;
  content: string | null;
  emotion: string | null;
  created_at: string;
  city: string | null;
  country: string | null;
  image_urls?: string[] | null;
  comments_count?: number | null;
};

function safeDate(iso: string): Date | null {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatRelativeFR(isoDate: string): string {
  const d = safeDate(isoDate);
  if (!d) return isoDate;

  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;

  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;

  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `il y a ${diffD} j`;

  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(d);
}

function clampText(s: string, max = 800): string {
  return s.length <= max ? s : `${s.slice(0, max).trimEnd()}…`;
}

function emotionColor(emotion?: string | null): string {
  if (!emotion) return EMOTION_COLORS.default;
  return EMOTION_COLORS[emotion as EmotionKey] ?? EMOTION_COLORS.default;
}

function normalizeImageUrls(input: unknown): string[] {
  return Array.isArray(input) ? input.map((x) => String(x ?? '').trim()).filter(Boolean) : [];
}

function safeCount(input: unknown): number {
  const n = typeof input === 'number' ? input : Number(input);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

export default function StoryDrawer({
  open,
  loading,
  story,
  onClose,
}: {
  open: boolean;
  loading: boolean;
  story: Story | null;
  onClose: () => void;
}) {
  const drawerRef = useRef<HTMLElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const lastActiveRef = useRef<HTMLElement | null>(null);

  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<number | null>(null);

  const title = useMemo(
    () => (loading ? 'Chargement…' : story?.title?.trim() || 'Sans titre'),
    [loading, story]
  );

  const metaLine = useMemo(() => {
    if (!story) return null;
    return [formatRelativeFR(story.created_at), [story.city, story.country].filter(Boolean).join(' • ')]
      .filter(Boolean)
      .join(' — ');
  }, [story]);

  const media = useMemo(() => normalizeImageUrls(story?.image_urls), [story?.image_urls]);
  const previewPhotos = media.slice(0, 3);
  const extraCount = Math.max(0, media.length - 3);
  const commentsCount = safeCount(story?.comments_count);

  useEffect(() => {
    if (!open) return;

    lastActiveRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    const prevPadding = document.body.style.paddingRight;

    const scrollbarW = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarW > 0) document.body.style.paddingRight = `${scrollbarW}px`;

    const t = window.setTimeout(() => closeBtnRef.current?.focus(), 60);

    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPadding;
      lastActiveRef.current?.focus?.();
    };
  }, [open]);

  const onCopyLink = async () => {
    if (!story) return;
    await navigator.clipboard.writeText(`${window.location.origin}/explore?focus=${story.id}`);
    setCopied(true);
    if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
    copiedTimer.current = window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Fermer"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/45 backdrop-blur-sm transition-opacity ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Drawer */}
      <aside
        ref={drawerRef}
        className={`fixed right-0 top-0 z-50 h-full w-full sm:w-110 bg-white/10 backdrop-blur-xl border-l border-white/15 shadow-2xl transition-transform ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <div className="text-white/90 min-w-0">
              <div className="text-xs uppercase tracking-wider text-white/60">Echo</div>
              <div className="text-sm font-semibold truncate">{title}</div>
              {!loading && metaLine && <div className="mt-1 text-xs text-white/60 truncate">{metaLine}</div>}
            </div>
            <button
              ref={closeBtnRef}
              type="button"
              onClick={onClose}
              className="rounded-xl px-3 py-2 text-white/80 hover:text-white hover:bg-white/10"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-auto px-5 py-4">
            {loading && <div className="text-white/60">Chargement…</div>}

            {!loading && story && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {story.emotion && (
                    <span
                      className="rounded-full px-3 py-1 text-xs text-white border"
                      style={{ borderColor: emotionColor(story.emotion) }}
                    >
                      {story.emotion}
                    </span>
                  )}
                  <span className="rounded-full px-3 py-1 text-xs text-white/70 border border-white/10">
                    {commentsCount} commentaire{commentsCount > 1 ? 's' : ''}
                  </span>
                </div>

                {previewPhotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {previewPhotos.map((src, idx) => (
                      <a
                        key={idx}
                        href={`/echo/${story.id}`}
                        className="relative aspect-4/3 overflow-hidden rounded-2xl border border-white/10"
                      >
                        <Image
                          src={src}
                          alt=""
                          fill
                          sizes="(max-width: 640px) 33vw, 200px"
                          className="object-cover transition-transform duration-300 hover:scale-[1.03]"
                        />
                        {idx === 2 && extraCount > 0 && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-white font-bold">
                            +{extraCount}
                          </div>
                        )}
                      </a>
                    ))}
                  </div>
                )}

                <div className="text-white/90 whitespace-pre-wrap">
                  {story.content ? clampText(story.content, 2000) : '—'}
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <a href={`/echo/${story.id}`} className="rounded-xl bg-white/15 px-4 py-2 text-sm text-white">
                    Lire →
                  </a>
                  <a
                    href={`/echo/${story.id}#reponses`}
                    className="rounded-xl bg-white/10 px-4 py-2 text-sm text-white/90"
                  >
                    Commentaires
                  </a>
                  <button
                    type="button"
                    onClick={onCopyLink}
                    className="rounded-xl bg-white/10 px-4 py-2 text-sm text-white/90"
                  >
                    {copied ? 'Lien copié' : 'Copier le lien'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
