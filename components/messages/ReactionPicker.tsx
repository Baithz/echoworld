/**
 * =============================================================================
 * Fichier      : components/messages/ReactionPicker.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.1.0 (2026-01-25)
 * Objet        : Emoji Picker pour réactions — LOT 2 Réactions
 * -----------------------------------------------------------------------------
 * Description  :
 * - Wrapper autour de emoji-picker-react
 * - Popup au clic bouton "😊"
 * - Click outside → close (robuste)
 * - ESC → close
 * - Dimensions élargies (dock/page)
 * - Ne dépend pas du hover parent (évite unmount involontaire)
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.1.0 (2026-01-25)
 * - [FIX] Stabilise l'ouverture: click outside via pointerdown + refs séparées
 * - [NEW] ESC pour fermer
 * - [UX] Picker plus large + scroll confortable (dock/page)
 * - [KEEP] API identique (onEmojiSelect, variant)
 * =============================================================================
 */

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Smile } from 'lucide-react';
import dynamic from 'next/dynamic';
import type { EmojiClickData } from 'emoji-picker-react';

// Dynamic import pour éviter SSR issues
const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

type Props = {
  onEmojiSelect: (emoji: string) => void;
  variant?: 'dock' | 'page';
};

export default function ReactionPicker({ onEmojiSelect, variant = 'page' }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  // Refs séparées pour une détection "outside" plus fiable
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const isDock = variant === 'dock';

  const pickerSize = useMemo(() => {
    // Plus large que l’ancien (280/320)
    // Dock : compact mais utilisable
    // Page : plus confort
    return isDock
      ? { width: 360, height: 380 }
      : { width: 440, height: 460 };
  }, [isDock]);

  // Close on outside click (pointerdown pour éviter certains comportements hover/mousemove)
useEffect(() => {
  if (!isOpen) return;

  const onPointerDown = (e: PointerEvent) => {
    const target = e.target as Node | null;
    if (!target) return;

    const root = rootRef.current;
    if (!root) return;

    // Si clic dans le composant (bouton + picker) => ignore
    if (root.contains(target)) return;

    setIsOpen(false);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') setIsOpen(false);
  };

  // capture=true pour intercepter avant d'autres handlers
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

      {isOpen && (
        <div
          className="absolute bottom-full right-0 z-50 mb-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
          // Important: pas de dépendance à hover, reste stable tant que isOpen=true
        >
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            width={pickerSize.width}
            height={pickerSize.height}
            previewConfig={{ showPreview: false }}
            searchPlaceHolder="Rechercher..."
            skinTonesDisabled
          />
        </div>
      )}
    </div>
  );
}
