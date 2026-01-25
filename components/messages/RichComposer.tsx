/**
 * =============================================================================
 * Fichier      : components/messages/RichComposer.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-25)
 * Objet        : Composer riche (Upload + Emoji + Typing) — LOT 2.6
 * -----------------------------------------------------------------------------
 * Description  :
 * - Composer avec optimistic UI + retry (LOT 1)
 * - Reply preview (LOT 2)
 * - Upload images/fichiers (LOT 2.6)
 * - Emoji picker inline (LOT 2.6)
 * - Typing indicator broadcast (LOT 2.6)
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.0.0 (2026-01-25)
 * - [NEW] LOT 2.6 : Upload button (images + files)
 * - [NEW] LOT 2.6 : Emoji picker button
 * - [NEW] LOT 2.6 : Typing indicator broadcast
 * - [KEEP] LOT 1/2 : Optimistic + retry + reply inchangés
 * =============================================================================
 */

'use client';

import { useState, useRef } from 'react';
import { Send, Paperclip, Smile } from 'lucide-react';
import dynamic from 'next/dynamic';
import { sendMessage } from '@/lib/messages';
import ReplyPreview from './ReplyPreview';
import type { UiMessage, SenderProfile } from './types';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

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

  // LOT 2.6 : Typing
  onTypingStart?: () => void;
  onTypingStop?: () => void;
};

function generateClientId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export default function RichComposer({
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
  onTypingStart,
  onTypingStop,
}: Props) {
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isDock = variant === 'dock';
  const canSend = Boolean(conversationId && userId && (text.trim() || attachments.length > 0) && pendingSendingCount < 3);

  const handleTextChange = (value: string) => {
    setText(value);

    // LOT 2.6 : Typing indicator
    if (onTypingStart && value.trim()) {
      onTypingStart();

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      typingTimeoutRef.current = setTimeout(() => {
        if (onTypingStop) onTypingStop();
      }, 2000);
    }
  };

  const handleSend = async () => {
    const clean = text.trim();
    if (!conversationId || !userId) return;
    if (!clean && attachments.length === 0) return;
    if (pendingSendingCount >= 3) return;

    // LOT 2.6 : Stop typing
    if (onTypingStop) onTypingStop();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    const clientId = generateClientId();

    // TODO LOT 2.6 : Upload attachments to Supabase Storage
    // For now, just send text

    // 1) Optimistic message
    const optimisticMsg: UiMessage = {
      id: '',
      conversation_id: conversationId,
      sender_id: userId,
      content: clean || `[${attachments.length} fichier(s)]`,
      payload: { client_id: clientId },
      created_at: new Date().toISOString(),
      edited_at: null,
      deleted_at: null,
      parent_id: replyTo?.id ?? null,
      status: 'sending',
      client_id: clientId,
      optimistic: true,
      parentMessage: replyTo,
    };

    onOptimisticSend(optimisticMsg);
    setText('');
    setAttachments([]);
    setShowEmojiPicker(false);
    if (replyTo) onReplyCancel();

    // 2) Send to DB
    try {
      const payload: { client_id: string; parent_id?: string } = { client_id: clientId };
      if (replyTo?.id) payload.parent_id = replyTo.id;

      const dbMsg = await sendMessage(conversationId, clean || `[${attachments.length} fichier(s)]`, payload);
      onConfirmSent(clientId, dbMsg as UiMessage);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur d'envoi";
      onSendFailed(clientId, msg);
    }
  };

  const handleKeyDown = (ev: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (ev.key === 'Enter' && !ev.shiftKey) {
      ev.preventDefault();
      void handleSend();
    }
  };

  const handleFileSelect = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(ev.target.files ?? []);
    setAttachments((prev) => [...prev, ...files].slice(0, 5)); // Max 5 files
  };

  const handleEmojiSelect = (emojiData: { emoji: string }) => {
    setText((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
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

      {/* LOT 2.6 : Attachments preview */}
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
            >
              <Paperclip className="h-3 w-3" />
              <span className="max-w-30 truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                className="text-slate-500 hover:text-slate-900"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Upload button */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,application/pdf,.doc,.docx"
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 ${
              isDock ? 'h-8 w-8' : 'h-10 w-10'
            }`}
            aria-label="Attach file"
          >
            <Paperclip className="h-4 w-4" />
          </button>

          {/* Emoji picker button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker((v) => !v)}
              className={`inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 ${
                isDock ? 'h-8 w-8' : 'h-10 w-10'
              }`}
              aria-label="Add emoji"
            >
              <Smile className="h-4 w-4" />
            </button>

            {showEmojiPicker && (
              <div className="absolute bottom-full left-0 z-50 mb-2">
                <EmojiPicker onEmojiClick={handleEmojiSelect} width={isDock ? 280 : 320} height={isDock ? 320 : 400} />
              </div>
            )}
          </div>
        </div>

        {/* Text input */}
        <div className="flex-1">
          <textarea
            value={text}
            onChange={(ev) => handleTextChange(ev.target.value)}
            onKeyDown={handleKeyDown}
            className={`w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none placeholder:text-slate-400 ${
              isDock ? 'text-xs' : 'text-sm'
            }`}
            placeholder={conversationId ? 'Écrire…' : 'Sélectionnez une conv…'}
            rows={isDock ? 2 : 3}
            disabled={!conversationId || pendingSendingCount >= 3}
            aria-label="Write a message"
          />
        </div>

        {/* Send button */}
        <button
          type="button"
          onClick={() => void handleSend()}
          className={`inline-flex items-center gap-2 rounded-xl bg-slate-900 font-semibold text-white transition-opacity disabled:opacity-50 ${
            isDock ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm'
          }`}
          disabled={!canSend}
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
          {!isDock && 'Envoyer'}
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