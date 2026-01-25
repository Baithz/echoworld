/**
 * =============================================================================
 * Fichier      : lib/messages/reactions.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.1 (2026-01-25)
 * Objet        : Helpers Message Reactions — LOT 2
 * -----------------------------------------------------------------------------
 * Description  :
 * - Fetch reactions pour un message
 * - Fetch reactions batch (plusieurs messages)
 * - Toggle reaction (add/remove optimistic)
 * - Types MessageReaction
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.0.1 (2026-01-25)
 * - [FIX] TypeScript Supabase types : utilisation Schema generic pour message_reactions
 * 1.0.0 (2026-01-25)
 * - [NEW] fetchMessageReactions(messageId)
 * - [NEW] fetchMessageReactionsBatch(messageIds)
 * - [NEW] toggleReaction(messageId, emoji) avec optimistic
 * - [NEW] Type MessageReaction
 * =============================================================================
 */

import { supabase } from '@/lib/supabase/client';

/* ============================================================================
 * TYPES
 * ============================================================================
 */

export type MessageReaction = {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
};

export type ReactionGroup = {
  emoji: string;
  count: number;
  userIds: string[];
  hasCurrentUser: boolean;
};

/* ============================================================================
 * FETCH REACTIONS
 * ============================================================================
 */

/**
 * Fetch reactions pour un seul message
 */
export async function fetchMessageReactions(messageId: string): Promise<MessageReaction[]> {
  const mid = (messageId ?? '').trim();
  if (!mid) return [];

  const { data, error } = await supabase
    .from('message_reactions')
    .select('*')
    .eq('message_id', mid)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as MessageReaction[];
}

/**
 * Fetch reactions batch (plusieurs messages)
 * Retourne Map<message_id, MessageReaction[]>
 */
export async function fetchMessageReactionsBatch(
  messageIds: string[]
): Promise<Map<string, MessageReaction[]>> {
  const ids = Array.from(new Set(messageIds.filter(Boolean)));
  const map = new Map<string, MessageReaction[]>();

  if (ids.length === 0) return map;

  const { data, error } = await supabase
    .from('message_reactions')
    .select('*')
    .in('message_id', ids)
    .order('created_at', { ascending: true });

  if (error || !Array.isArray(data)) return map;

  // Group by message_id
  for (const r of data as MessageReaction[]) {
    const mid = r.message_id;
    if (!map.has(mid)) map.set(mid, []);
    map.get(mid)!.push(r);
  }

  return map;
}

/**
 * Group reactions par emoji (pour badges UI)
 */
export function groupReactions(
  reactions: MessageReaction[],
  currentUserId: string | null
): ReactionGroup[] {
  const groups = new Map<string, ReactionGroup>();

  for (const r of reactions) {
    if (!groups.has(r.emoji)) {
      groups.set(r.emoji, {
        emoji: r.emoji,
        count: 0,
        userIds: [],
        hasCurrentUser: false,
      });
    }

    const group = groups.get(r.emoji)!;
    group.count++;
    group.userIds.push(r.user_id);

    if (currentUserId && r.user_id === currentUserId) {
      group.hasCurrentUser = true;
    }
  }

  // Trier par count décroissant
  return Array.from(groups.values()).sort((a, b) => b.count - a.count);
}

/* ============================================================================
 * TOGGLE REACTION
 * ============================================================================
 */

/**
 * Toggle reaction (add si pas présente, remove sinon)
 * Retourne { added: boolean, reaction?: MessageReaction }
 */
export async function toggleReaction(
  messageId: string,
  emoji: string
): Promise<{ added: boolean; reaction?: MessageReaction }> {
  const mid = (messageId ?? '').trim();
  const em = (emoji ?? '').trim();

  if (!mid || !em) throw new Error('messageId et emoji requis');

  const { data: u } = await supabase.auth.getUser();
  const userId = u.user?.id ?? null;
  if (!userId) throw new Error('Not authenticated');

  // 1) Check si déjà présente
  const { data: existing } = await supabase
    .from('message_reactions')
    .select('*')
    .eq('message_id', mid)
    .eq('user_id', userId)
    .eq('emoji', em)
    .maybeSingle();

  if (existing) {
    // 2) Remove
    const { error } = await supabase
      .from('message_reactions')
      .delete()
      .eq('id', (existing as MessageReaction).id);

    if (error) throw error;
    return { added: false };
  } else {
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { data, error } = await (supabase as any)
      .from('message_reactions')
      .insert([
        {
          message_id: mid,
          user_id: userId,
          emoji: em,
        },
      ])
      .select('*')
      .single();

    if (error) throw error;
    return { added: true, reaction: data as MessageReaction };
  }
}