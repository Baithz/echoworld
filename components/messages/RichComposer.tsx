/**
 * =============================================================================
 * Fichier      : components/messages/RichComposer.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 2.1.1 (2026-01-26)
 * Objet        : Rich Composer avec upload Supabase Storage — Fix lint + preview stable
 * -----------------------------------------------------------------------------
 * Description  :
 * - Conserve : actions au-dessus, typing callbacks, reply preview, optimistic send/retry, upload storage
 * - Fix lint : supprime import inutilisé ImageIcon
 * - Fix preview : évite les createObjectURL en render + cleanup systématique (anti-fuite mémoire)
 * - Fix input file : reset value pour pouvoir re-sélectionner le même fichier
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 2.1.1 (2026-01-26)
 * - [FIX] ESLint : supprime ImageIcon (unused-vars)
 * - [FIX] Preview : gestion des objectURLs via state + cleanup (pas de fuite)
 * - [IMPROVED] File input : reset après sélection (reselect même fichier OK)
 * - [KEEP] 2.1.0 : Upload Supabase Storage + miniatures + payload.attachments inchangés
 * =============================================================================
 */

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Send, Paperclip, Smile, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import { sendMessage } from '@/lib/messages';
import { uploadMessageAttachments, isImageFile, formatFileSize } from '@/lib/storage/uploadToStorage';
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
  onTypingStart?: () => void;
  onTypingStop?: () => void;
};

type AttachmentPreview = {
  key: string;
  file: File;
  isImage: boolean;
  previewUrl: string | null;
};

function generateClientId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function fileKey(file: File): string {
  // clé stable côté UI (pas parfaite mais suffisante pour la preview)
  return `${file.name}__${file.size}__${file.lastModified}__${file.type}`;
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
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDock = variant === 'dock';
  const canSend = Boolean(
    conversationId &&
      userId &&
      (text.trim() || attachments.length > 0) &&
      pendingSendingCount < 3 &&
      !uploading
  );

  // ✅ Previews stables (évite createObjectURL dans le render)
  const previews: AttachmentPreview[] = useMemo(() => {
    return attachments.map((file) => {
      const img = isImageFile(file.type);
      return { key: fileKey(file), file, isImage: img, previewUrl: img ? URL.createObjectURL(file) : null };
    });
  }, [attachments]);

  // ✅ Cleanup objectURLs
  useEffect(() => {
    return () => {
      for (const p of previews) {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
      }
    };
  }, [previews]);

  const handleTextChange = (value: string) => {
    setText(value);

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
    if (pendingSendingCount >= 3 || uploading) return;

    if (onTypingStop) onTypingStop();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    const clientId = generateClientId();

    // Optimistic message (sans attachments d'abord)
    const optimisticMsg: UiMessage = {
      id: '',
      conversation_id: conversationId,
      sender_id: userId,
      content: clean || '',
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

    const filesToUpload = [...attachments];
    setAttachments([]);
    setShowEmojiPicker(false);
    if (replyTo) onReplyCancel();

    try {
      // Upload attachments si présents
      let uploadedAttachments: Array<{ url: string; name: string; size: number; type: string }> = [];

      if (filesToUpload.length > 0) {
        setUploading(true);
        const results = await uploadMessageAttachments(filesToUpload, userId);
        uploadedAttachments = results.map((r) => ({
          url: r.url,
          name: r.name,
          size: r.size,
          type: r.type,
        }));
        setUploading(false);
      }

      // Payload avec attachments
      const payload: { client_id: string; parent_id?: string; attachments?: typeof uploadedAttachments } = {
        client_id: clientId,
      };
      if (replyTo?.id) payload.parent_id = replyTo.id;
      if (uploadedAttachments.length > 0) payload.attachments = uploadedAttachments;

      // Send to DB
      const dbMsg = await sendMessage(conversationId, clean || `[${uploadedAttachments.length} fichier(s)]`, payload);
      onConfirmSent(clientId, dbMsg as UiMessage);
    } catch (err) {
      setUploading(false);
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
    setAttachments((prev) => [...prev, ...files].slice(0, 5));

    // ✅ reset pour autoriser re-sélection du même fichier
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleEmojiSelect = (emojiData: { emoji: string }) => {
    setText((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  return (
    <div className="border-t border-slate-200 bg-white p-3">
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

      {/* Preview attachments */}
      {previews.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {previews.map((p, idx) => {
            const ext = p.file.name.split('.').pop();

            return (
              <div key={p.key} className="relative overflow-hidden rounded-lg border border-slate-200 bg-white">
                {p.isImage && p.previewUrl ? (
                  <div className="relative h-20 w-20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.previewUrl} alt={p.file.name} className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="flex h-20 w-20 flex-col items-center justify-center gap-1 p-2 text-xs">
                    <Paperclip className="h-5 w-5" />
                    <span className="truncate text-center text-[10px]">{ext}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(idx)}
                  className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur hover:bg-black/80"
                  aria-label="Remove"
                >
                  <X className="h-3 w-3" />
                </button>

                <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/60 to-transparent px-1 py-0.5 text-[9px] text-white">
                  {formatFileSize(p.file.size)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Actions AU-DESSUS */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
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
            disabled={uploading}
            className={`inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 ${
              isDock ? 'h-8 w-8' : 'h-9 w-9'
            }`}
            aria-label="Attach file"
          >
            <Paperclip className="h-4 w-4" />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker((v) => !v)}
              className={`inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 ${
                isDock ? 'h-8 w-8' : 'h-9 w-9'
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

        <div className={`text-slate-500 ${isDock ? 'text-[11px]' : 'text-xs'}`}>
          {uploading ? (
            <span className="font-semibold text-blue-600">Upload en cours...</span>
          ) : (
            <>
              Entrée = envoyer • Shift+Entrée = ligne
              {pendingSendingCount >= 3 && (
                <span className="ml-2 font-semibold text-orange-600">(max 3 en cours)</span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Textarea + Send button */}
      <div className="flex items-end gap-2">
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
            disabled={!conversationId || pendingSendingCount >= 3 || uploading}
            aria-label="Write a message"
          />
        </div>

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
    </div>
  );
}
