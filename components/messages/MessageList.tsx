/**
 * =============================================================================
 * Fichier      : components/messages/MessageList.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.3 (2026-01-25)
 * Objet        : Liste messages avec batch fetch sender profiles — LOT 1
 * -----------------------------------------------------------------------------
 * Description  :
 * - Affiche liste messages (optimistic + DB)
 * - Batch fetch sender profiles (1 query pour tous les senders visibles)
 * - Support scroll auto (ref externe)
 * - Loading + empty states
 * - Filtre soft-deleted (deleted_at)
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.0.3 (2026-01-25)
 * - [FIX] TypeScript scrollRef : accept RefObject<HTMLDivElement | null> (compatible useRef(null))
 * 1.0.2 (2026-01-25)
 * - [FIX] TypeScript scrollRef : type RefObject<HTMLDivElement> (suppression | null)
 * - [FIX] ESLint react-hooks/set-state-in-effect : suppression setState dans guard early return
 * 1.0.1 (2026-01-25)
 * - [FIX] ESLint react/no-unescaped-entities : apostrophe échappée (ligne 114)
 * - [FIX] ESLint no-unused-vars : suppression loadingProfiles (jamais utilisée)
 * 1.0.0 (2026-01-25)
 * - [NEW] Liste messages réutilisable
 * - [NEW] Batch fetch sender profiles (fetchSenderProfiles)
 * - [NEW] Support optimistic UI (UiMessage)
 * - [NEW] Scroll auto via ref externe
 * - [NEW] Loading + empty states
 * =============================================================================
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Mail } from 'lucide-react';
import { fetchSenderProfiles } from '@/lib/messages';
import MessageBubble from './MessageBubble';
import type { UiMessage, SenderProfile } from './types';

type Props = {
  messages: UiMessage[];
  loading: boolean;
  userId: string | null;
  conversationId: string | null;
  onRetry?: (message: UiMessage) => void;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  variant?: 'dock' | 'page';
};

export default function MessageList({
  messages,
  loading,
  userId,
  conversationId,
  onRetry,
  scrollRef,
  variant = 'page',
}: Props) {
  const [senderProfiles, setSenderProfiles] = useState<Map<string, SenderProfile>>(new Map());

  const isDock = variant === 'dock';

  // Filtre soft-deleted
  const visibleMessages = useMemo(() => {
    return messages.filter((m) => !(m as { deleted_at?: string | null }).deleted_at);
  }, [messages]);

  // Batch fetch sender profiles (uniquement pour messages reçus)
  useEffect(() => {
    if (!userId || visibleMessages.length === 0) {
      return;
    }

    const senderIds = Array.from(
      new Set(
        visibleMessages
          .filter((m) => m.sender_id !== userId)
          .map((m) => m.sender_id)
      )
    );

    if (senderIds.length === 0) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const profiles = await fetchSenderProfiles(senderIds);
        if (!cancelled) setSenderProfiles(profiles);
      } catch {
        if (!cancelled) setSenderProfiles(new Map());
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [visibleMessages, userId]);

  // Empty state
  if (!conversationId) {
    return (
      <div className={`flex h-full flex-col items-center justify-center text-center ${isDock ? 'p-3' : 'p-5'}`}>
        <div className={`mx-auto flex items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm ${isDock ? 'h-10 w-10' : 'h-14 w-14'}`}>
          <Mail className={`text-slate-900 ${isDock ? 'h-5 w-5' : 'h-7 w-7'}`} />
        </div>
        <h2 className={`mt-4 font-extrabold text-slate-900 ${isDock ? 'text-sm' : 'text-lg'}`}>
          {isDock ? 'Sélectionne une conv.' : 'Sélectionnez une conversation'}
        </h2>
        <p className={`mt-2 text-slate-600 ${isDock ? 'text-xs' : 'text-sm'}`}>Les messages s&apos;afficheront ici.</p>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className={`flex items-center gap-2 text-slate-600 ${isDock ? 'p-3 text-xs' : 'p-5 text-sm'}`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement des messages…
      </div>
    );
  }

  // No messages
  if (visibleMessages.length === 0) {
    return (
      <div className={`rounded-xl border border-dashed border-slate-200 bg-white/60 p-4 text-slate-600 ${isDock ? 'text-xs' : 'text-sm'}`}>
        Aucun message dans cette conversation.
      </div>
    );
  }

  return (
    <div className={isDock ? 'space-y-2' : 'space-y-3'}>
      {visibleMessages.map((m) => {
        const mine = m.sender_id === userId;
        const senderProfile = mine ? null : senderProfiles.get(m.sender_id) ?? null;

        return (
          <MessageBubble
            key={m.id || m.client_id || `${m.sender_id}-${m.created_at}`}
            message={m}
            mine={mine}
            senderProfile={senderProfile}
            onRetry={onRetry}
            variant={variant}
          />
        );
      })}

      {/* Scroll anchor */}
      {scrollRef && <div ref={scrollRef} />}
    </div>
  );
}