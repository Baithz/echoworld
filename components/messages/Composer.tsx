/**
 * =============================================================================
 * Fichier      : components/messages/Composer.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 2.0.1 (2026-01-25)
 * Objet        : Composer avec optimistic UI + retry + replyTo — LOT 2
 * -----------------------------------------------------------------------------
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 2.0.1 (2026-01-25)
 * - [FIX] Reply: parent_id transmis pour écriture en colonne DB (messages.parent_id)
 * - [KEEP] Optimistic + retry + max 3 sending inchangés
 * - [KEEP] UI / ReplyPreview / callbacks inchangés
 * =============================================================================
 */

'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { sendMessage } from '@/lib/messages';
import ReplyPreview from './ReplyPreview';
import type { UiMessage, SenderProfile } from './types';

type Props = {
  conversationId: string | null;
  userId: string | null;
  replyTo: UiMessage | null;
  replyToSenderProfile?: SenderProfile | null;
  onReplyCancel: () => void;
  onOptimisticSend: (message: UiMessage) => void;
  onConfirmSent: (clientId: string, dbMessage: UiMessage) => void;
  onSendFailed: (clientId: string, error: string) => void;
  pendingSendingCount: number;
  variant?: 'dock' | 'page';
};

function generateClientId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export default function Composer({
  conversationId,
  userId,
  replyTo,
  replyToSenderProfile,
  onReplyCancel,
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
    const parentId: string | null = replyTo?.id ? String(replyTo.id) : null;

    // 1) Optimistic message
    const optimisticMsg: UiMessage = {
      id: '',
      conversation_id: conversationId,
      sender_id: userId,
      content: clean,
      payload: { client_id: clientId },
      created_at: new Date().toISOString(),
      edited_at: null,
      deleted_at: null,
      parent_id: parentId,
      status: 'sending',
      client_id: clientId,
      optimistic: true,
      parentMessage: replyTo,
    };

    onOptimisticSend(optimisticMsg);
    setText('');
    if (replyTo) onReplyCancel();

    // 2) Send to DB
    try {
      const payload: { client_id: string; parent_id?: string | null } = { client_id: clientId };
      if (parentId) payload.parent_id = parentId;

      const dbMsg = await sendMessage(conversationId, clean, payload);
      onConfirmSent(clientId, dbMsg as UiMessage);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur d'envoi";
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
      {/* LOT 2 : ReplyPreview */}
      {replyTo && (
        <div className="mb-2">
          <ReplyPreview
            replyTo={replyTo}
            senderProfile={replyToSenderProfile}
            onCancel={onReplyCancel}
            variant={variant}
          />
        </div>
      )}

      <div
        className={`flex items-center gap-2 rounded-2xl border border-slate-200 bg-white ${
          isDock ? 'px-2 py-1.5' : 'px-3 py-2'
        }`}
      >
        <input
          value={text}
          onChange={(ev) => setText(ev.target.value)}
          onKeyDown={handleKeyDown}
          className={`w-full bg-transparent text-slate-900 outline-none placeholder:text-slate-400 ${
            isDock ? 'text-xs' : 'text-sm'
          }`}
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
          Envoyer
        </button>
      </div>

      <div className={`mt-1 text-slate-500 ${isDock ? 'text-[11px]' : 'text-xs'}`}>
        Entrée = envoyer • Shift+Entrée = ligne
        {pendingSendingCount >= 3 && (
          <span className="ml-2 font-semibold text-orange-600">(max 3 messages en cours)</span>
        )}
      </div>
    </div>
  );
}
