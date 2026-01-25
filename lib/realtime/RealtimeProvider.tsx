/**
 * =============================================================================
 * Fichier      : lib/realtime/RealtimeProvider.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.6.0 (2026-01-25)
 * Objet        : Provider global Realtime — Live messages + LOT 2 reactions broadcast
 * -----------------------------------------------------------------------------
 * Description  :
 * - Se branche sur Supabase auth
 * - Fetch initial : unread counts (via helpers)
 * - Realtime : incrémente badges sur INSERT messages/notifications
 * - Live : expose onNewMessage(callback) pour push UI des messages entrants
 * - API context : unread counts + open/close dock + open/close conversation
 * - LOT 2 : Broadcast reactions (INSERT/DELETE message_reactions)
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.6.0 (2026-01-25)
 * - [NEW] Live: onNewMessage(callback) pour diffuser les messages entrants (UI temps réel)
 * - [KEEP] Badges unread + auto-open dock + confirm optimistic inchangés
 * - [KEEP] LOT 2 reactions broadcast (message_reactions) inchangé
 * 1.5.0 (2026-01-25)
 * - [NEW] LOT 2 : Event onReactionChange(callback) pour broadcast reactions
 * - [NEW] LOT 2 : Subscribe table message_reactions (INSERT/DELETE)
 * - [KEEP] LOT 1 : onMessageConfirm + callbacks stables inchangés
 * 1.4.1 (2026-01-25)
 * - [FIX] TypeScript payload type : MessageConfirmCallback accept unknown payload
 * =============================================================================
 */

'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { initRealtime, destroyRealtime, onMessage, onNotification } from '@/lib/realtime/realtime';
import { fetchUnreadMessagesCount } from '@/lib/messages';
import { fetchUnreadNotificationsCount } from '@/lib/notifications';

type MessageConfirmCallback = (payload: { record: { id: string; payload?: unknown } }) => void;

// NEW: Live incoming message callback (UI push)
type NewMessageCallback = (payload: {
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
}) => void;

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

  // NEW : live messages (incoming)
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

  // NEW : callbacks live incoming messages
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

  // NEW : subscribe to live incoming messages (UI)
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

    const offMsg = onMessage((p) => {
      const uid = userIdRef.current;
      if (!uid) return;

      const convId = p.record.conversation_id;

      // Ignore messages sent by self
      if (p.record.sender_id === uid) return;

      const dockOpen = dockOpenRef.current;
      const activeConv = activeConvRef.current;

      // Si dock ouvert + conversation déjà active => pas de bump (l'utilisateur lit déjà)
      if (dockOpen && activeConv === convId) {
        // NEW: même si on ne bump pas, on diffuse le message pour l'UI live.
        newMessageCallbacksRef.current.forEach((cb) =>
          cb({
            record: {
              id: p.record.id,
              conversation_id: p.record.conversation_id,
              sender_id: p.record.sender_id,
              content: p.record.content,
              created_at: p.record.created_at,
              edited_at: p.record.edited_at ?? null,
              deleted_at: p.record.deleted_at ?? null,
              payload: p.record.payload ?? null,
            },
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

      // NEW : notify live message callbacks (UI can append/dedupe)
      newMessageCallbacksRef.current.forEach((cb) =>
        cb({
          record: {
            id: p.record.id,
            conversation_id: p.record.conversation_id,
            sender_id: p.record.sender_id,
            content: p.record.content,
            created_at: p.record.created_at,
            edited_at: p.record.edited_at ?? null,
            deleted_at: p.record.deleted_at ?? null,
            payload: p.record.payload ?? null,
          },
        })
      );

      // LOT 1 : notify confirm callbacks (pour dedupe optimistic)
      confirmCallbacksRef.current.forEach((cb) => cb(p as unknown as { record: { id: string; payload?: unknown } }));
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
