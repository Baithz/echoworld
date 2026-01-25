/**
 * =============================================================================
 * Fichier      : components/messages/types.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 2.0.0 (2026-01-25)
 * Objet        : Types partagés pour composants Messages — LOT 2 Reactions + Reply
 * -----------------------------------------------------------------------------
 * Description  :
 * - UiMessage : extension de MessageRow pour optimistic UI (status, client_id, error)
 * - SenderProfile : shape minimal pour avatars + noms cliquables
 * - ConversationRowPlus : extension de ConversationRow avec peer enrichment
 * - MessageReaction : réactions emoji sur messages (LOT 2)
 * - ReactionGroup : groupement réactions par emoji (LOT 2)
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 2.0.0 (2026-01-25)
 * - [NEW] MessageReaction type (LOT 2)
 * - [NEW] ReactionGroup type (LOT 2)
 * - [NEW] UiMessage.parent_id (répondre LOT 2)
 * - [NEW] UiMessage.reactions (réactions LOT 2)
 * - [NEW] UiMessage.parentMessage (cache parent LOT 2)
 * - [KEEP] Types LOT 1 (status, client_id, error) inchangés
 * 1.0.0 (2026-01-25)
 * - [NEW] Type UiMessage (status: sending/sent/failed, client_id, error, retryCount)
 * - [NEW] Type SenderProfile (id, handle, display_name, avatar_url)
 * - [NEW] Type ConversationRowPlus (enrichi peer_*)
 * =============================================================================
 */

import type { MessageRow, ConversationRow } from '@/lib/messages';

/* ============================================================================
 * LOT 2 — MESSAGE REACTIONS
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
 * UI MESSAGE — optimistic UI + LOT 2 extensions
 * ============================================================================
 */

export type MessageStatus = 'sending' | 'sent' | 'failed';

export type UiMessage = MessageRow & {
  // LOT 1 : Optimistic UI
  status?: MessageStatus;
  client_id?: string; // UUID généré côté client
  error?: string; // message d'erreur si failed
  retryCount?: number; // nombre de tentatives
  optimistic?: boolean; // true si pas encore confirmé par DB

  // LOT 2 : Répondre
  parent_id?: string | null; // ID du message parent (si réponse)
  parentMessage?: UiMessage | null; // Cache du message parent (évite refetch)

  // LOT 2 : Réactions
  reactions?: MessageReaction[]; // Liste des réactions sur ce message
};

/* ============================================================================
 * SENDER PROFILE — pour avatars + noms cliquables
 * ============================================================================
 */

export type SenderProfile = {
  id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

/* ============================================================================
 * CONVERSATION ROW PLUS — enrichissement peer (DM)
 * ============================================================================
 */

export type ConversationRowPlus = ConversationRow & {
  // Pour direct, "peer" (l'autre membre) — optionnel
  peer_user_id?: string | null;
  peer_handle?: string | null;
  peer_display_name?: string | null;
  peer_avatar_url?: string | null;
};