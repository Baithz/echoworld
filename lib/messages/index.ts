/**
 * =============================================================================
 * Fichier      : lib/messages/index.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.1 (2026-01-22)
 * Objet        : Queries Messages (conversations, messages, unread, read state)
 * -----------------------------------------------------------------------------
 * FIXES v1.0.1 :
 * - [FIX] Typage Supabase "never" (v_unread_counts / messages / joins) sans any
 * - [FIX] Suppression RPC mark_conversation_read (typing args) -> update direct
 * - [SAFE] Aucun changement logique métier (juste robustesse TS)
 * =============================================================================
 */

import { supabase } from '@/lib/supabase/client';

export type ConversationRow = {
  id: string;
  type: 'direct' | 'group';
  title: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ConversationMemberRow = {
  conversation_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  last_read_at: string | null;
  muted: boolean;
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  payload: unknown | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
};

type UnreadCountsRow = {
  user_id: string;
  unread_messages: number;
  unread_notifications: number;
};

type ConversationMemberWithConv = {
  conversation_id: string;
  conversations: ConversationRow | null;
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

export async function fetchUnreadMessagesCount(userId: string): Promise<number> {
  if (!userId) return 0;

  const { data, error } = await supabase
    // TS peut inférer never si v_unread_counts n'est pas dans Database types => on caste localement
    .from('v_unread_counts')
    .select('user_id, unread_messages, unread_notifications')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;

  const row = asUnreadCountsRow(data as unknown);
  return Number(row?.unread_messages ?? 0);
}

export async function fetchConversationsForUser(userId: string): Promise<ConversationRow[]> {
  if (!userId) return [];

  const { data, error } = await supabase
    .from('conversation_members')
    .select('conversation_id, conversations(*)')
    .eq('user_id', userId)
    .order('joined_at', { ascending: false });

  if (error) throw error;

  const typed = (data as unknown as ConversationMemberWithConv[]) ?? [];
  const rows: ConversationRow[] = [];

  for (const r of typed) {
    if (r && r.conversations) rows.push(r.conversations);
  }

  return rows;
}

export async function fetchConversationMembers(conversationId: string): Promise<ConversationMemberRow[]> {
  if (!conversationId) return [];

  const { data, error } = await supabase
    .from('conversation_members')
    .select('*')
    .eq('conversation_id', conversationId);

  if (error) throw error;
  return ((data as unknown) ?? []) as ConversationMemberRow[];
}

export async function fetchMessages(conversationId: string, limit = 50): Promise<MessageRow[]> {
  if (!conversationId) return [];

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return ((data as unknown) ?? []) as MessageRow[];
}

export async function sendMessage(conversationId: string, content: string): Promise<MessageRow> {
  const clean = (content ?? '').trim();
  if (!conversationId || !clean) throw new Error('Missing conversationId or empty content.');

  const { data: u } = await supabase.auth.getUser();
  const senderId = u.user?.id ?? null;
  if (!senderId) throw new Error('Not authenticated.');

  const payload: Record<string, unknown> = {
    conversation_id: conversationId,
    sender_id: senderId,
    content: clean,
  };

  const { data, error } = await supabase
    .from('messages')
    // Supabase peut typer insert en never si Database types absents => cast contrôlé
    .insert(payload as unknown as never)
    .select('*')
    .single();

  if (error) throw error;
  return data as unknown as MessageRow;
}

/**
 * Marque une conversation comme lue.
 * - Sans RPC (évite erreur TS args)
 * - RLS : update autorisé uniquement sur sa propre ligne (user_id = auth.uid()).
 */
export async function markConversationRead(conversationId: string): Promise<void> {
  if (!conversationId) return;

  const { data: u } = await supabase.auth.getUser();
  const userId = u.user?.id ?? null;
  if (!userId) throw new Error('Not authenticated.');

  const patch: Record<string, unknown> = { last_read_at: new Date().toISOString() };

  const { error } = await supabase
    .from('conversation_members')
    .update(patch as unknown as never)
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);

  if (error) throw error;
}
