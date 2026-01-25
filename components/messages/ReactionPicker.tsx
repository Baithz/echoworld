/**
 * =============================================================================
 * Fichier      : components/messages/ReactionPicker.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.2.0 (2026-01-25)
 * Objet        : Emoji Picker pour réactions — LOT 2 Réactions (Portal anti-clipping)
 * -----------------------------------------------------------------------------
 * Description  :
 * - Wrapper autour de emoji-picker-react
 * - Popup au clic bouton "😊"
 * - Click outside → close (robuste, pointerdown capture)
 * - ESC → close
 * - Dimensions élargies (dock/page)
 * - Rendu en Portal (document.body) pour éviter le clipping par conteneur scroll/overflow
 * - Positionnement ancré sur le bouton (auto clamp viewport + flip haut/bas)
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.2.0 (2026-01-25)
 * - [FIX] Picker non rogné: rendu via createPortal dans document.body
 * - [NEW] Positionnement robuste: clamp viewport + flip si pas de place au-dessus
 * - [KEEP] API identique (onEmojiSelect, variant) + click outside + ESC + tailles
 * 1.1.0 (2026-01-25)
 * - [FIX] Stabilise l'ouverture: click outside via pointerdown + refs séparées
 * - [NEW] ESC pour fermer
 * - [UX] Picker plus large + scroll confortable (dock/page)
 * - [KEEP] API identique (onEmojiSelect, variant)
 * =============================================================================
 */

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Smile } from 'lucide-react';
import dynamic from 'next/dynamic';
import type { EmojiClickData } from 'emoji-picker-react';

// Dynamic import pour éviter SSR issues
const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

type Props = {
  onEmojiSelect: (emoji: string) => void;
  variant?: 'dock' | 'page';
};

type PickerPos = {
  top: number;
  left: number;
};

export default function ReactionPicker({ onEmojiSelect, variant = 'page' }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState<PickerPos>({ top: 0, left: 0 });

  // Refs séparées : root = bouton (et wrapper), picker = popup portal
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pickerPortalRef = useRef<HTMLDivElement>(null);

  const isDock = variant === 'dock';

  const pickerSize = useMemo(() => {
    return isDock ? { width: 360, height: 380 } : { width: 440, height: 460 };
  }, [isDock]);

  const computeAndSetPosition = () => {
    const btn = buttonRef.current;
    if (!btn) return;

    const r = btn.getBoundingClientRect();
    const margin = 8;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // On tente d'abord au-dessus du bouton
    let top = r.top - pickerSize.height - margin;
    let left = r.right - pickerSize.width;

    // Flip si pas assez de place en haut
    const minTop = margin;
    const maxTop = vh - pickerSize.height - margin;
    const minLeft = margin;
    const maxLeft = vw - pickerSize.width - margin;

    if (top < minTop) {
      top = r.bottom + margin; // en dessous
    }

    // Clamp
    top = Math.max(minTop, Math.min(top, maxTop));
    left = Math.max(minLeft, Math.min(left, maxLeft));

    setPos({ top, left });
  };

  // Open/close + position update
  useEffect(() => {
    if (!isOpen) return;

    computeAndSetPosition();

    const onResizeOrScroll = () => {
      computeAndSetPosition();
    };

    // scroll capture pour capter les scrolls des conteneurs (messages list)
    window.addEventListener('resize', onResizeOrScroll);
    window.addEventListener('scroll', onResizeOrScroll, true);

    return () => {
      window.removeEventListener('resize', onResizeOrScroll);
      window.removeEventListener('scroll', onResizeOrScroll, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, pickerSize.width, pickerSize.height]);

  // Close on outside click + ESC (robuste, sans any)
  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;

      // clic dans bouton/wrapper
      const root = rootRef.current;
      if (root && root.contains(target)) return;

      // clic dans popup portal
      const portal = pickerPortalRef.current;
      if (portal && portal.contains(target)) return;

      setIsOpen(false);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onEmojiSelect(emojiData.emoji);
    setIsOpen(false);
  };

  const portalNode =
    typeof document !== 'undefined' ? document.body : null;

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen((v) => !v);
        }}
        className={`flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 ${
          isDock ? 'h-6 w-6' : 'h-7 w-7'
        }`}
        aria-label="Ajouter une réaction"
        aria-expanded={isOpen}
      >
        <Smile className={isDock ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      </button>

      {isOpen && portalNode
        ? createPortal(
            <div
              ref={pickerPortalRef}
              className="fixed z-1000"
              style={{ top: pos.top, left: pos.left }}
            >
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  width={pickerSize.width}
                  height={pickerSize.height}
                  previewConfig={{ showPreview: false }}
                  searchPlaceHolder="Rechercher..."
                  skinTonesDisabled
                />
              </div>
            </div>,
            portalNode
          )
        : null}
    </div>
  );
}
