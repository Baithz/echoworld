/**
 * =============================================================================
 * Fichier      : lib/realtime/RealtimeProvider.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.6.2 (2026-01-25)
 * Objet        : Provider global Realtime — Live messages + LOT 2 reactions broadcast
 * -----------------------------------------------------------------------------
 * Description  :
 * - Se branche sur Supabase auth
 * - Fetch initial : unread counts (via helpers)
 * - Realtime : incrémente badges sur INSERT messages/notifications
 * - Live : expose onNewMessage(callback) pour push UI des messages entrants (sans refresh)
 * - API context : unread counts + open/close dock + open/close conversation
 * - LOT 2 : Broadcast reactions (INSERT/DELETE message_reactions)
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.6.2 (2026-01-25)
 * - [FIX] Live messages : diffusion onNewMessage typée (0 any) et toujours émise pour chaque INSERT entrant
 * - [FIX] Confirm optimistic : callback typé sans cast any (payload minimal id/payload)
 * - [KEEP] Badges unread + auto-open dock + refreshCounts inchangés
 * - [KEEP] LOT 2 reactions broadcast (message_reactions) inchangé
 * - [SAFE] Aucune régression : API publique conservée
 * =============================================================================
 */

'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  initRealtime,
  destroyRealtime,
  onMessage,
  onNotification,
  type RealtimeMessagePayload,
} from '@/lib/realtime/realtime';
import { fetchUnreadMessagesCount } from '@/lib/messages';
import { fetchUnreadNotificationsCount } from '@/lib/notifications';

type MessageConfirmCallback = (payload: { record: { id: string; payload?: unknown } }) => void;

// Live incoming message callback (UI push)
export type NewMessageCallback = (payload: { record: RealtimeMessagePayload['record'] }) => void;

// LOT 2 : Reaction change callback
type ReactionChangeCallback = (payload: {
  eventType: 'INSERT' | 'DELETE';
  record: {
    id: string;
    message_id: string;
    user_id: string;
    emoji: string;
    created_at: string;
  };
}) => void;

type RealtimeContextValue = {
  userId: string | null;

  unreadMessagesCount: number;
  unreadNotificationsCount: number;

  refreshCounts: () => Promise<void>;

  // ChatDock
  isChatDockOpen: boolean;
  openChatDock: () => void;
  closeChatDock: () => void;
  toggleChatDock: () => void;

  // Conversation (pour ouvrir direct un chat)
  activeConversationId: string | null;
  openConversation: (conversationId: string) => void;
  closeConversation: () => void;

  // Helpers (optionnels)
  bumpUnreadMessages: (delta?: number) => void;
  bumpUnreadNotifications: (delta?: number) => void;

  // LOT 1 : confirm optimistic
  onMessageConfirm: (callback: MessageConfirmCallback) => () => void;

  // Live messages (incoming)
  onNewMessage: (callback: NewMessageCallback) => () => void;

  // LOT 2 : reactions broadcast
  onReactionChange: (callback: ReactionChangeCallback) => () => void;
};

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function useRealtime() {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error('useRealtime must be used within <RealtimeProvider>.');
  return ctx;
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);

  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  const [isChatDockOpen, setIsChatDockOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Refs pour callbacks realtime (évite stale state + re-subscribe)
  const userIdRef = useRef<string | null>(null);
  const dockOpenRef = useRef<boolean>(false);
  const activeConvRef = useRef<string | null>(null);

  // LOT 1 : callbacks confirm optimistic
  const confirmCallbacksRef = useRef<Set<MessageConfirmCallback>>(new Set());

  // Live : callbacks incoming messages
  const newMessageCallbacksRef = useRef<Set<NewMessageCallback>>(new Set());

  // LOT 2 : callbacks reactions
  const reactionCallbacksRef = useRef<Set<ReactionChangeCallback>>(new Set());

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    dockOpenRef.current = isChatDockOpen;
  }, [isChatDockOpen]);

  useEffect(() => {
    activeConvRef.current = activeConversationId;
  }, [activeConversationId]);

  // Evite les refresh concurrents
  const refreshingRef = useRef(false);

  const refreshCounts = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid) {
      setUnreadMessagesCount(0);
      setUnreadNotificationsCount(0);
      return;
    }

    if (refreshingRef.current) return;
    refreshingRef.current = true;

    try {
      const [m, n] = await Promise.all([fetchUnreadMessagesCount(uid), fetchUnreadNotificationsCount(uid)]);
      setUnreadMessagesCount(m);
      setUnreadNotificationsCount(n);
    } finally {
      refreshingRef.current = false;
    }
  }, []);

  const bumpUnreadMessages = useCallback((delta = 1) => {
    setUnreadMessagesCount((v) => Math.max(0, v + delta));
  }, []);

  const bumpUnreadNotifications = useCallback((delta = 1) => {
    setUnreadNotificationsCount((v) => Math.max(0, v + delta));
  }, []);

  const openChatDock = useCallback(() => setIsChatDockOpen(true), []);
  const closeChatDock = useCallback(() => setIsChatDockOpen(false), []);
  const toggleChatDock = useCallback(() => setIsChatDockOpen((v) => !v), []);

  // API "forte" : ouvre la conversation ET le dock
  const openConversation = useCallback((conversationId: string) => {
    if (!conversationId) return;
    setActiveConversationId(conversationId);
    setIsChatDockOpen(true);
  }, []);

  const closeConversation = useCallback(() => {
    setActiveConversationId(null);
  }, []);

  // LOT 1 : subscribe to confirm events
  const onMessageConfirm = useCallback((callback: MessageConfirmCallback) => {
    confirmCallbacksRef.current.add(callback);
    return () => {
      confirmCallbacksRef.current.delete(callback);
    };
  }, []);

  // Live : subscribe incoming messages
  const onNewMessage = useCallback((callback: NewMessageCallback) => {
    newMessageCallbacksRef.current.add(callback);
    return () => {
      newMessageCallbacksRef.current.delete(callback);
    };
  }, []);

  // LOT 2 : subscribe to reaction changes
  const onReactionChange = useCallback((callback: ReactionChangeCallback) => {
    reactionCallbacksRef.current.add(callback);
    return () => {
      reactionCallbacksRef.current.delete(callback);
    };
  }, []);

  // --------------------------------------------------------------------------
  // Auth bootstrap
  // --------------------------------------------------------------------------
  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setUserId(data.user?.id ?? null);
    };

    void boot();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // --------------------------------------------------------------------------
  // Init realtime + initial counts (callbacks stables)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!userId) {
      destroyRealtime();
      setUnreadMessagesCount(0);
      setUnreadNotificationsCount(0);
      setActiveConversationId(null);
      setIsChatDockOpen(false);
      return;
    }

    initRealtime(userId);
    void refreshCounts();

    const offMsg = onMessage((p: RealtimeMessagePayload) => {
      const uid = userIdRef.current;
      if (!uid) return;

      // Ignore messages sent by self
      if (p.record.sender_id === uid) return;

      const convId = p.record.conversation_id;

      // 1) LIVE : toujours diffuser à l'UI (dock ouvert OU fermé)
      newMessageCallbacksRef.current.forEach((cb) => cb({ record: p.record }));

      const dockOpen = dockOpenRef.current;
      const activeConv = activeConvRef.current;

      // 2) Badges : si dock ouvert + conv active => pas de bump (l'utilisateur lit déjà)
      if (dockOpen && activeConv === convId) {
        // LOT 1 : confirm callbacks (dédoublonnage optimistic) — payload minimal typé
        confirmCallbacksRef.current.forEach((cb) =>
          cb({
            record: { id: p.record.id, payload: p.record.payload ?? undefined },
          })
        );
        return;
      }

      // Badge unread
      bumpUnreadMessages(1);

      // Auto-open NON intrusif : uniquement si le dock est déjà ouvert
      if (dockOpen) {
        setActiveConversationId(convId);
      }

      // LOT 1 : confirm callbacks (dédoublonnage optimistic) — payload minimal typé
      confirmCallbacksRef.current.forEach((cb) =>
        cb({
          record: { id: p.record.id, payload: p.record.payload ?? undefined },
        })
      );
    });

    const offNotif = onNotification((p) => {
      if (p.record.read_at == null) bumpUnreadNotifications(1);
    });

    // LOT 2 : Subscribe message_reactions (INSERT/DELETE)
    const reactionChannel = supabase
      .channel('message_reactions_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_reactions',
        },
        (payload) => {
          reactionCallbacksRef.current.forEach((cb) =>
            cb({
              eventType: 'INSERT',
              record: payload.new as {
                id: string;
                message_id: string;
                user_id: string;
                emoji: string;
                created_at: string;
              },
            })
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'message_reactions',
        },
        (payload) => {
          reactionCallbacksRef.current.forEach((cb) =>
            cb({
              eventType: 'DELETE',
              record: payload.old as {
                id: string;
                message_id: string;
                user_id: string;
                emoji: string;
                created_at: string;
              },
            })
          );
        }
      )
      .subscribe();

    return () => {
      offMsg();
      offNotif();
      void reactionChannel.unsubscribe();
    };
  }, [userId, refreshCounts, bumpUnreadMessages, bumpUnreadNotifications]);

  const value = useMemo<RealtimeContextValue>(
    () => ({
      userId,

      unreadMessagesCount,
      unreadNotificationsCount,

      refreshCounts,

      isChatDockOpen,
      openChatDock,
      closeChatDock,
      toggleChatDock,

      activeConversationId,
      openConversation,
      closeConversation,

      bumpUnreadMessages,
      bumpUnreadNotifications,

      onMessageConfirm,
      onNewMessage,
      onReactionChange,
    }),
    [
      userId,
      unreadMessagesCount,
      unreadNotificationsCount,
      refreshCounts,
      isChatDockOpen,
      openChatDock,
      closeChatDock,
      toggleChatDock,
      activeConversationId,
      openConversation,
      closeConversation,
      bumpUnreadMessages,
      bumpUnreadNotifications,
      onMessageConfirm,
      onNewMessage,
      onReactionChange,
    ]
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}
