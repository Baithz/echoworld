/**
 * =============================================================================
 * Fichier      : lib/realtime/realtime.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.1.0 (2026-01-22)
 * Objet        : Gestion centralisée Supabase Realtime (messages + notifications)
 * -----------------------------------------------------------------------------
 * Description  :
 * - Un seul endroit crée/maintient les channels Realtime (évite doubles subscribe)
 * - Callbacks abonnables via onMessage/onNotification
 * - initRealtime(userId) / destroyRealtime()
 *
 * Improvements (v1.1.0)
 * - Cleanup plus strict : unsubscribe + removeChannel (évite channels fantômes en dev/HMR)
 * - Guards runtime : vérifie champs minimaux avant de notifier les listeners
 * - SAFE : API publique inchangée
 * =============================================================================
 */

import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';

export type RealtimeMessagePayload = {
  type: 'message_insert';
  record: {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    created_at: string;
    edited_at: string | null;
    deleted_at: string | null;
    payload: unknown | null;
  };
};

export type RealtimeNotificationPayload = {
  type: 'notification_insert';
  record: {
    id: string;
    user_id: string;
    actor_id: string | null;
    type: string;
    title: string | null;
    body: string | null;
    payload: unknown | null;
    read_at: string | null;
    created_at: string;
  };
};

type MessageListener = (payload: RealtimeMessagePayload) => void;
type NotificationListener = (payload: RealtimeNotificationPayload) => void;

let currentUserId: string | null = null;

let messagesChannel: RealtimeChannel | null = null;
let notificationsChannel: RealtimeChannel | null = null;

const messageListeners = new Set<MessageListener>();
const notificationListeners = new Set<NotificationListener>();

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function cleanupChannel(ch: RealtimeChannel | null) {
  if (!ch) return;

  try {
    // Unsubscribe (async côté SDK) — on fire-and-forget
    void ch.unsubscribe();
  } catch {
    // noop
  }

  try {
    // supabase-js v2 : removeChannel recommandé pour éviter les channels fantômes en HMR
    // On garde un guard pour compat.
    const anySb = supabase as unknown as { removeChannel?: (c: RealtimeChannel) => Promise<unknown> };
    if (typeof anySb.removeChannel === 'function') {
      void anySb.removeChannel(ch);
    }
  } catch {
    // noop
  }
}

function ensureStartedForUser(userId: string) {
  if (currentUserId === userId && messagesChannel && notificationsChannel) return;

  // Si on change d'user (ou hot reload), on clean proprement.
  destroyRealtime();

  currentUserId = userId;

  // --------------------------------------------------------------------------
  // Messages (RLS -> on reçoit uniquement ce qui est visible)
  // --------------------------------------------------------------------------
  messagesChannel = supabase
    .channel('ew-messages')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      },
      (payload) => {
        // payload.new est typé any côté SDK
        const rec = payload.new as Partial<RealtimeMessagePayload['record']> | null;

        // Guards minimaux
        if (!rec) return;
        if (!isNonEmptyString(rec.id)) return;
        if (!isNonEmptyString(rec.conversation_id)) return;
        if (!isNonEmptyString(rec.sender_id)) return;
        if (!isNonEmptyString(rec.created_at)) return;

        const record: RealtimeMessagePayload['record'] = {
          id: rec.id,
          conversation_id: rec.conversation_id,
          sender_id: rec.sender_id,
          content: typeof rec.content === 'string' ? rec.content : '',
          created_at: rec.created_at,
          edited_at: rec.edited_at ?? null,
          deleted_at: rec.deleted_at ?? null,
          payload: rec.payload ?? null,
        };

        messageListeners.forEach((cb) => cb({ type: 'message_insert', record }));
      }
    )
    .subscribe();

  // --------------------------------------------------------------------------
  // Notifications (filtrées par destinataire)
  // --------------------------------------------------------------------------
  notificationsChannel = supabase
    .channel('ew-notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const rec = payload.new as Partial<RealtimeNotificationPayload['record']> | null;

        if (!rec) return;
        if (!isNonEmptyString(rec.id)) return;
        if (!isNonEmptyString(rec.user_id)) return;
        if (rec.user_id !== userId) return;
        if (!isNonEmptyString(rec.created_at)) return;

        const record: RealtimeNotificationPayload['record'] = {
          id: rec.id,
          user_id: rec.user_id,
          actor_id: rec.actor_id ?? null,
          type: typeof rec.type === 'string' ? rec.type : 'unknown',
          title: rec.title ?? null,
          body: rec.body ?? null,
          payload: rec.payload ?? null,
          read_at: rec.read_at ?? null,
          created_at: rec.created_at,
        };

        notificationListeners.forEach((cb) => cb({ type: 'notification_insert', record }));
      }
    )
    .subscribe();
}

export function initRealtime(userId: string) {
  if (!userId) return;
  ensureStartedForUser(userId);
}

export function destroyRealtime() {
  try {
    cleanupChannel(messagesChannel);
    cleanupChannel(notificationsChannel);
  } finally {
    messagesChannel = null;
    notificationsChannel = null;
    currentUserId = null;
  }
}

export function onMessage(cb: MessageListener) {
  messageListeners.add(cb);
  return () => messageListeners.delete(cb);
}

export function onNotification(cb: NotificationListener) {
  notificationListeners.add(cb);
  return () => notificationListeners.delete(cb);
}
