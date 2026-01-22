/**
 * =============================================================================
 * Fichier      : lib/notifications/index.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.1 (2026-01-22)
 * Objet        : Queries Notifications (listing, unread count, mark read)
 * -----------------------------------------------------------------------------
 * FIXES v1.0.1 :
 * - [FIX] Typage Supabase "never" (v_unread_counts / update notifications) sans any
 * - [SAFE] Aucun changement logique métier (juste robustesse TS)
 * =============================================================================
 */

import { supabase } from '@/lib/supabase/client';

export type NotificationRow = {
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

type UnreadCountsRow = {
  user_id: string;
  unread_messages: number;
  unread_notifications: number;
};

function asUnreadCountsRow(input: unknown): UnreadCountsRow | null {
  if (!input || typeof input !== 'object') return null;
  const o = input as Record<string, unknown>;

  const user_id = typeof o.user_id === 'string' ? o.user_id : null;

  const unread_messages =
    typeof o.unread_messages === 'number'
      ? o.unread_messages
      : typeof o.unread_messages === 'string'
        ? Number(o.unread_messages)
        : null;

  const unread_notifications =
    typeof o.unread_notifications === 'number'
      ? o.unread_notifications
      : typeof o.unread_notifications === 'string'
        ? Number(o.unread_notifications)
        : null;

  if (!user_id || unread_messages === null || unread_notifications === null) return null;

  return { user_id, unread_messages, unread_notifications };
}

export async function fetchUnreadNotificationsCount(userId: string): Promise<number> {
  if (!userId) return 0;

  const { data, error } = await supabase
    .from('v_unread_counts')
    .select('user_id, unread_messages, unread_notifications')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;

  const row = asUnreadCountsRow(data as unknown);
  return Number(row?.unread_notifications ?? 0);
}

export async function fetchNotifications(userId: string, limit = 50): Promise<NotificationRow[]> {
  if (!userId) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return ((data as unknown) ?? []) as NotificationRow[];
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  if (!notificationId) return;

  const patch: Record<string, unknown> = { read_at: new Date().toISOString() };

  const { error } = await supabase
    .from('notifications')
    .update(patch as unknown as never)
    .eq('id', notificationId);

  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  if (!userId) return;

  const patch: Record<string, unknown> = { read_at: new Date().toISOString() };

  const { error } = await supabase
    .from('notifications')
    .update(patch as unknown as never)
    .eq('user_id', userId)
    .is('read_at', null);

  if (error) throw error;
}
