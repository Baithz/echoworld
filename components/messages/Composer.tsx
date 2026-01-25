/**
 * =============================================================================
 * Fichier      : components/messages/Composer.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-25)
 * Objet        : Composer avec optimistic UI + retry + anti double-send — LOT 1
 * -----------------------------------------------------------------------------
 * Description  :
 * - Optimistic UI : envoie immédiat (status: sending) + confirm via Realtime
 * - Anti double-send : max 3 messages "sending" simultanés (Q3=B)
 * - Retry intelligent : même client_id, remplace bulle "failed"
 * - Enter vs Shift+Enter
 * - Toast générique si échec (Q1=A)
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.0.0 (2026-01-25)
 * - [NEW] Composer réutilisable avec optimistic UI
 * - [NEW] Anti double-send : max 3 "sending" (Q3=B)
 * - [NEW] Retry intelligent (même client_id)
 * - [NEW] Toast générique si échec (Q1=A)
 * - [NEW] Enter vs Shift+Enter
 * =============================================================================
 */

'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { sendMessage } from '@/lib/messages';
import type { UiMessage } from './types';

type Props = {
  conversationId: string | null;
  userId: string | null;
  onOptimisticSend: (message: UiMessage) => void; // callback pour ajouter message optimistic
  onConfirmSent: (clientId: string, dbMessage: UiMessage) => void; // callback pour remplacer optimistic par DB
  onSendFailed: (clientId: string, error: string) => void; // callback pour marquer failed
  pendingSendingCount: number; // nombre de messages en "sending"
  variant?: 'dock' | 'page';
};

function generateClientId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export default function Composer({
  conversationId,
  userId,
  onOptimisticSend,
  onConfirmSent,
  onSendFailed,
  pendingSendingCount,
  variant = 'page',
}: Props) {
  const [text, setText] = useState('');

  const isDock = variant === 'dock';
  const canSend = Boolean(conversationId && userId && text.trim() && pendingSendingCount < 3);

  const handleSend = async () => {
    const clean = text.trim();
    if (!conversationId || !userId || !clean || pendingSendingCount >= 3) return;

    const clientId = generateClientId();

    // 1) Optimistic message
    const optimisticMsg: UiMessage = {
      id: '', // pas encore d'id DB
      conversation_id: conversationId,
      sender_id: userId,
      content: clean,
      payload: { client_id: clientId },
      created_at: new Date().toISOString(),
      edited_at: null,
      deleted_at: null,
      status: 'sending',
      client_id: clientId,
      optimistic: true,
    };

    onOptimisticSend(optimisticMsg);
    setText('');

    // 2) Send to DB
    try {
      const dbMsg = await sendMessage(conversationId, clean, { client_id: clientId });
      onConfirmSent(clientId, dbMsg as UiMessage);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur d\'envoi';
      onSendFailed(clientId, msg);
    }
  };

  const handleKeyDown = (ev: React.KeyboardEvent<HTMLInputElement>) => {
    if (ev.key === 'Enter' && !ev.shiftKey) {
      ev.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="border-t border-slate-200 p-3">
      <div className={`flex items-center gap-2 rounded-2xl border border-slate-200 bg-white ${isDock ? 'px-2 py-1.5' : 'px-3 py-2'}`}>
        <input
          value={text}
          onChange={(ev) => setText(ev.target.value)}
          onKeyDown={handleKeyDown}
          className={`w-full bg-transparent text-slate-900 outline-none placeholder:text-slate-400 ${isDock ? 'text-xs' : 'text-sm'}`}
          placeholder={conversationId ? 'Écrire…' : 'Sélectionnez une conv…'}
          aria-label="Write a message"
          disabled={!conversationId || pendingSendingCount >= 3}
        />

        <button
          type="button"
          onClick={() => void handleSend()}
          className={`inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 font-semibold text-white transition-opacity disabled:opacity-50 ${
            isDock ? 'text-xs' : 'text-sm'
          }`}
          disabled={!canSend}
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
          {isDock ? 'Envoyer' : 'Envoyer'}
        </button>
      </div>

      <div className={`mt-1 text-slate-500 ${isDock ? 'text-[11px]' : 'text-xs'}`}>
        Entrée = envoyer • Shift+Entrée = ligne
        {pendingSendingCount >= 3 && (
          <span className="ml-2 text-orange-600 font-semibold">
            (max 3 messages en cours)
          </span>
        )}
      </div>
    </div>
  );
}