/**
 * =============================================================================
 * Fichier      : lib/realtime/realtime.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.2.0 (2026-01-25)
 * Objet        : Gestion centralisée Supabase Realtime (Broadcast manuel)
 * -----------------------------------------------------------------------------
 * Description  :
 * - Utilise Broadcast Channels (pas Replication DB)
 * - Callbacks abonnables via onMessage/onNotification
 * - initRealtime(userId) / destroyRealtime()
 * - CRITICAL FIX: Replication indispo (private alpha) → Broadcast manuel
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.2.0 (2026-01-25)
 * - [FIX] CRITICAL: Replication désactivée → Broadcast manuel via channel
 * - [NEW] broadcastMessage() pour diffuser manuellement après INSERT
 * - [KEEP] onMessage/onNotification API publique inchangée (zéro régression)
 * 1.1.0 (2026-01-22)
 * - [IMPROVED] Cleanup plus strict : unsubscribe + removeChannel
 * - [IMPROVED] Guards runtime : vérifie champs minimaux avant notify
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
    void ch.unsubscribe();
  } catch {
    // noop
  }

  try {
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

  destroyRealtime();

  currentUserId = userId;

  // --------------------------------------------------------------------------
  // Messages (Broadcast manuel, pas Replication DB)
  // --------------------------------------------------------------------------
  messagesChannel = supabase
    .channel('ew-messages-broadcast')
    .on('broadcast', { event: 'message_insert' }, (payload) => {
      const rec = payload.payload as Partial<RealtimeMessagePayload['record']> | null;

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
    })
    .subscribe();

  // --------------------------------------------------------------------------
  // Notifications (Broadcast manuel)
  // --------------------------------------------------------------------------
  notificationsChannel = supabase
    .channel('ew-notifications-broadcast')
    .on('broadcast', { event: 'notification_insert' }, (payload) => {
      const rec = payload.payload as Partial<RealtimeNotificationPayload['record']> | null;

      if (!rec) return;
      if (!isNonEmptyString(rec.id)) return;
      if (!isNonEmptyString(rec.user_id)) return;
      if (rec.user_id !== userId) return; // Filtre côté client
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
    })
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

/**
 * LOT 2.5 : Broadcast manuel après INSERT (contourne Replication indispo)
 */
export async function broadcastMessage(record: RealtimeMessagePayload['record']): Promise<void> {
  if (!messagesChannel) return;

  try {
    await messagesChannel.send({
      type: 'broadcast',
      event: 'message_insert',
      payload: record,
    });
  } catch (err) {
    console.error('[Realtime] Broadcast failed:', err);
  }
}

export async function broadcastNotification(record: RealtimeNotificationPayload['record']): Promise<void> {
  if (!notificationsChannel) return;

  try {
    await notificationsChannel.send({
      type: 'broadcast',
      event: 'notification_insert',
      payload: record,
    });
  } catch (err) {
    console.error('[Realtime] Broadcast failed:', err);
  }
}