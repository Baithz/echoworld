/**
 * =============================================================================
 * Fichier      : components/messages/types.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-25)
 * Objet        : Types partagés pour composants Messages — LOT 1 optimistic UI
 * -----------------------------------------------------------------------------
 * Description  :
 * - UiMessage : extension de MessageRow pour optimistic UI (status, client_id, error)
 * - SenderProfile : shape minimal pour avatars + noms cliquables
 * - ConversationRowPlus : extension de ConversationRow avec peer enrichment
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.0.0 (2026-01-25)
 * - [NEW] Type UiMessage (status: sending/sent/failed, client_id, error, retryCount)
 * - [NEW] Type SenderProfile (id, handle, display_name, avatar_url)
 * - [NEW] Type ConversationRowPlus (enrichi peer_*)
 * =============================================================================
 */

import type { MessageRow, ConversationRow } from '@/lib/messages';

/* ============================================================================
 * UI MESSAGE — optimistic UI
 * ============================================================================
 */

export type MessageStatus = 'sending' | 'sent' | 'failed';

export type UiMessage = MessageRow & {
  // Optimistic UI
  status?: MessageStatus;
  client_id?: string; // UUID généré côté client
  error?: string; // message d'erreur si failed
  retryCount?: number; // nombre de tentatives
  optimistic?: boolean; // true si pas encore confirmé par DB
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