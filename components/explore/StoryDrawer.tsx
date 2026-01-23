/**
 * =============================================================================
 * Fichier      : components/explore/StoryDrawer.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.2.1 (2026-01-23)
 * Objet        : Drawer latéral d’écho - Lecture rapide depuis la carte (cinéma)
 * -----------------------------------------------------------------------------
 * Description  :
 * - Drawer latéral animé (slide + fade + blur) + a11y robuste
 * - Backdrop cliquable + fermeture Esc
 * - Focus trap + restore focus
 * - Scroll lock body
 * - États: loading skeleton / aucun écho / contenu écho
 * - Métadonnées: émotion, date humaine, ville/pays
 * - Lien vers la page dédiée /echo/[id] + copie lien
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.2.1 (2026-01-23)
 * - [FIX] Hook useReducedMotion: initialisation via state + listen change (ESLint OK)
 * - [KEEP] Zéro régression sur focus trap / scroll lock / a11y / copy link
 * -----------------------------------------------------------------------------
 * 1.2.0 (2026-01-23)
 * - [NEW] Focus trap (Tab/Shift+Tab) + restore focus
 * - [NEW] Lock scroll body quand open
 * - [IMPROVED] a11y (aria-labelledby/desc) + prefers-reduced-motion
 * - [IMPROVED] Copier lien: fallback + gestion erreurs silencieuse
 * =============================================================================
 */

'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

type Story = {
  id: string;
  title: string | null;
  content: string | null;
  emotion: string | null;
  created_at: string;
  city: string | null;
  country: string | null;
};

function formatRelativeFR(isoDate: string): string {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;

  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;

  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;

  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `il y a ${diffD} j`;

  try {
    return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(d);
  } catch {
    return d.toLocaleDateString();
  }
}

function clampText(s: string, max = 800): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max).trimEnd()}…`;
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;

    const apply = () => setReduced(Boolean(mq.matches));
    apply();

    // compat ancienne API Safari
    const anyMq = mq as unknown as {
      addEventListener?: (t: 'change', cb: () => void) => void;
      removeEventListener?: (t: 'change', cb: () => void) => void;
      addListener?: (cb: () => void) => void;
      removeListener?: (cb: () => void) => void;
    };

    if (anyMq.addEventListener) anyMq.addEventListener('change', apply);
    else if (anyMq.addListener) anyMq.addListener(apply);

    return () => {
      if (anyMq.removeEventListener) anyMq.removeEventListener('change', apply);
      else if (anyMq.removeListener) anyMq.removeListener(apply);
    };
  }, []);

  return reduced;
}

function getFocusable(root: HTMLElement): HTMLElement[] {
  const nodes = root.querySelectorAll<HTMLElement>(
    [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',')
  );

  return Array.from(nodes).filter((el) => {
    const style = window.getComputedStyle(el);
    return style.visibility !== 'hidden' && style.display !== 'none';
  });
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // ignore
  }

  // fallback execCommand
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', 'true');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
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
  const reducedMotion = useReducedMotion();

  const drawerRef = useRef<HTMLElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  const lastActiveRef = useRef<HTMLElement | null>(null);

  const title = useMemo(() => {
    if (loading) return 'Chargement…';
    return story?.title?.trim() || 'Sans titre';
  }, [loading, story]);

  const metaLine = useMemo(() => {
    if (!story) return null;
    const loc = [story.city, story.country].filter(Boolean).join(' • ');
    const when = formatRelativeFR(story.created_at);
    return [when, loc].filter(Boolean).join(' — ');
  }, [story]);

  const titleId = useMemo(() => `story-drawer-title`, []);
  const descId = useMemo(() => `story-drawer-desc`, []);

  // Lock scroll + store last focus + autofocus close
  useEffect(() => {
    if (!open) return;

    lastActiveRef.current = document.activeElement as HTMLElement | null;

    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;

    // éviter jump scrollbar
    const scrollbarW = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarW > 0) document.body.style.paddingRight = `${scrollbarW}px`;

    const t = window.setTimeout(() => closeBtnRef.current?.focus(), reducedMotion ? 0 : 60);

    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;

      // restore focus (si encore présent)
      const el = lastActiveRef.current;
      if (el && typeof el.focus === 'function') {
        window.setTimeout(() => el.focus(), 0);
      }
    };
  }, [open, reducedMotion]);

  // Esc + Focus trap
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== 'Tab') return;

      const root = drawerRef.current;
      if (!root) return;

      const focusables = getFocusable(root);
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && (active === first || !root.contains(active))) {
        e.preventDefault();
        last.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const transitionBase = reducedMotion ? 'transition-none' : 'transition-opacity duration-300 ease-out';

  const drawerTransition = reducedMotion
    ? 'transition-none'
    : 'transition-transform duration-300 ease-out will-change-transform';

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Fermer"
        onClick={onClose}
        className={[
          'fixed inset-0 z-40 bg-black/45 backdrop-blur-sm',
          transitionBase,
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
      />

      {/* Drawer */}
      <aside
        ref={(el) => {
          drawerRef.current = el;
        }}
        className={[
          'fixed right-0 top-0 z-50 h-full w-full sm:w-110',
          'bg-white/10 backdrop-blur-xl border-l border-white/15 shadow-2xl',
          drawerTransition,
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <div className="text-white/90 min-w-0">
              <div className="text-[11px] uppercase tracking-wider text-white/60">Echo</div>
              <div id={titleId} className="text-sm font-semibold truncate">
                {title}
              </div>
              <div id={descId} className="sr-only">
                Détails de l’écho sélectionné, avec actions lire et copier le lien.
              </div>
              {!loading && story && metaLine && (
                <div className="mt-1 text-xs text-white/60 truncate">{metaLine}</div>
              )}
            </div>

            <button
              ref={closeBtnRef}
              type="button"
              onClick={onClose}
              className="rounded-xl px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 transition"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-auto px-5 py-4">
            {loading && (
              <div className="space-y-4" aria-busy="true" aria-live="polite">
                <div className="h-6 w-32 rounded-lg bg-white/10 animate-pulse" />
                <div className="h-4 w-56 rounded-lg bg-white/10 animate-pulse" />
                <div className="h-4 w-full rounded-lg bg-white/10 animate-pulse" />
                <div className="h-4 w-[92%] rounded-lg bg-white/10 animate-pulse" />
                <div className="h-4 w-[85%] rounded-lg bg-white/10 animate-pulse" />
              </div>
            )}

            {!loading && !story && <div className="text-white/70 text-sm">Aucun écho sélectionné.</div>}

            {!loading && story && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {story.emotion && (
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80 border border-white/10">
                      {story.emotion}
                    </span>
                  )}
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70 border border-white/10">
                    {new Intl.DateTimeFormat('fr-FR', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(story.created_at))}
                  </span>
                </div>

                <div className="text-white/90 leading-relaxed whitespace-pre-wrap">
                  {story.content ? clampText(story.content, 2000) : '—'}
                </div>

                <div className="pt-2 flex gap-2">
                  <a
                    href={`/echo/${story.id}`}
                    className="inline-flex items-center rounded-xl bg-white/15 hover:bg-white/20 border border-white/15 px-4 py-2 text-sm text-white transition"
                  >
                    Lire →
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      const url = `${window.location.origin}/explore?focus=${story.id}`;
                      void copyText(url);
                    }}
                    className="inline-flex items-center rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 px-4 py-2 text-sm text-white/90 transition"
                  >
                    Copier le lien
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
