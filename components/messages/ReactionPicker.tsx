/**
 * =============================================================================
 * Fichier      : components/messages/ReactionPicker.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-25)
 * Objet        : Emoji Picker pour réactions — LOT 2 Réactions
 * -----------------------------------------------------------------------------
 * Description  :
 * - Wrapper autour de emoji-picker-react
 * - Popup au clic bouton "😊"
 * - Click outside → close
 * - Callback onEmojiSelect(emoji)
 * - Variant dock/page (taille picker)
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.0.0 (2026-01-25)
 * - [NEW] Composant ReactionPicker réutilisable
 * - [NEW] Integration emoji-picker-react
 * - [NEW] Click outside to close
 * - [NEW] Support variant dock/page
 * =============================================================================
 */

'use client';

import { useEffect, useRef, useState } from 'react';
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
  const pickerRef = useRef<HTMLDivElement>(null);

  const isDock = variant === 'dock';

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onEmojiSelect(emojiData.emoji);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={pickerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className={`flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 ${
          isDock ? 'h-6 w-6' : 'h-7 w-7'
        }`}
        aria-label="Ajouter une réaction"
      >
        <Smile className={isDock ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-0 z-50 mb-2">
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            width={isDock ? 280 : 320}
            height={isDock ? 320 : 400}
            previewConfig={{ showPreview: false }}
            searchPlaceHolder="Rechercher..."
            skinTonesDisabled
          />
        </div>
      )}
    </div>
  );
}