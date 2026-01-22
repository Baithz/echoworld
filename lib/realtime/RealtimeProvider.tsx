/**
 * =============================================================================
 * Fichier      : lib/realtime/RealtimeProvider.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.1.0 (2026-01-22)
 * Objet        : Provider global Realtime + état badges + ChatDock (open/close)
 * -----------------------------------------------------------------------------
 * Description  :
 * - Se branche sur Supabase auth
 * - Fetch initial : v_unread_counts
 * - Realtime : incrémente badges sur INSERT messages/notifications
 * - API context : unread counts + open/close dock + open/close conversation
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.1.0 (2026-01-22)
 * - [NEW] Ajout état ChatDock (isChatDockOpen + open/close/toggle)
 * - [KEEP] Badges + activeConversationId inchangés
 * =============================================================================
 */

'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { initRealtime, destroyRealtime, onMessage, onNotification } from '@/lib/realtime/realtime';
import { fetchUnreadMessagesCount } from '@/lib/messages';
import { fetchUnreadNotificationsCount } from '@/lib/notifications';

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

  // Evite les refresh concurrents
  const refreshingRef = useRef(false);

  const refreshCounts = useCallback(async () => {
    if (!userId) {
      setUnreadMessagesCount(0);
      setUnreadNotificationsCount(0);
      return;
    }

    if (refreshingRef.current) return;
    refreshingRef.current = true;

    try {
      const [m, n] = await Promise.all([
        fetchUnreadMessagesCount(userId),
        fetchUnreadNotificationsCount(userId),
      ]);
      setUnreadMessagesCount(m);
      setUnreadNotificationsCount(n);
    } finally {
      refreshingRef.current = false;
    }
  }, [userId]);

  const bumpUnreadMessages = useCallback((delta = 1) => {
    setUnreadMessagesCount((v) => Math.max(0, v + delta));
  }, []);

  const bumpUnreadNotifications = useCallback((delta = 1) => {
    setUnreadNotificationsCount((v) => Math.max(0, v + delta));
  }, []);

  const openChatDock = useCallback(() => setIsChatDockOpen(true), []);
  const closeChatDock = useCallback(() => setIsChatDockOpen(false), []);
  const toggleChatDock = useCallback(() => setIsChatDockOpen((v) => !v), []);

  const openConversation = useCallback((conversationId: string) => {
    if (!conversationId) return;
    setActiveConversationId(conversationId);
    setIsChatDockOpen(true);
  }, []);

  const closeConversation = useCallback(() => {
    setActiveConversationId(null);
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

    boot();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // --------------------------------------------------------------------------
  // Init realtime + initial counts
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
      // Ignore messages sent by self
      if (p.record.sender_id === userId) return;

      // Badge
      bumpUnreadMessages(1);

      // Future: si message direct -> ouvrir bulle (à décider)
      // Ici: on n'auto-open pas (comportement safe)
    });

    const offNotif = onNotification((p) => {
      if (p.record.read_at == null) bumpUnreadNotifications(1);
    });

    return () => {
      offMsg();
      offNotif();
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
    ]
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}
