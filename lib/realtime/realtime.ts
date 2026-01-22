/**
 * =============================================================================
 * Fichier      : lib/realtime/realtime.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-22)
 * Objet        : Gestion centralisée Supabase Realtime (messages + notifications)
 * -----------------------------------------------------------------------------
 * Description  :
 * - Un seul endroit crée/maintient les channels Realtime (évite doubles subscribe)
 * - Callbacks abonnables via onMessage/onNotification
 * - initRealtime(userId) / destroyRealtime()
 *
 * Notes
 * - Les events reçus doivent respecter RLS (Supabase Realtime configuré).
 * - Filtrage notifications : user_id=eq.<userId> (badge fiable).
 * - Messages : pas de filtre multi-conversations => on reçoit les INSERT visibles RLS.
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

function ensureStartedForUser(userId: string) {
  if (currentUserId === userId && messagesChannel && notificationsChannel) return;

  // Si on change d'user (ou hot reload), on clean proprement.
  destroyRealtime();

  currentUserId = userId;

  // --------------------------------------------------------------------------
  // Messages
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
        const record = payload.new as RealtimeMessagePayload['record'];

        // Sécurité : ignore self messages pour le badge (si tu veux)
        if (!record?.id || !record?.conversation_id) return;

        messageListeners.forEach((cb) => {
          cb({ type: 'message_insert', record });
        });
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
        const record = payload.new as RealtimeNotificationPayload['record'];
        if (!record?.id || record.user_id !== userId) return;

        notificationListeners.forEach((cb) => {
          cb({ type: 'notification_insert', record });
        });
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
    if (messagesChannel) void messagesChannel.unsubscribe();
    if (notificationsChannel) void notificationsChannel.unsubscribe();
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
