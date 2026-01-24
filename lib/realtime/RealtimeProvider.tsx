/**
 * =============================================================================
 * Fichier      : lib/realtime/RealtimeProvider.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.3.0 (2026-01-24)
 * Objet        : Provider global Realtime + état badges + ChatDock (open/close)
 * -----------------------------------------------------------------------------
 * Description  :
 * - Se branche sur Supabase auth
 * - Fetch initial : v_unread_counts (via helpers)
 * - Realtime : incrémente badges sur INSERT messages/notifications
 * - API context : unread counts + open/close dock + open/close conversation
 *
 * Règle auto-open :
 * - Si ChatDock OUVERT : auto-switch vers la conversation du message entrant (sans ouvrir/fermer le dock)
 * - Si ChatDock FERMÉ : n’ouvre rien, badge uniquement (non intrusif)
 * - Si l’utilisateur est déjà sur la conversation active + dock ouvert : pas de bump badge
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.3.0 (2026-01-24)
 * - [FIX] Callbacks realtime stables : refs pour dockOpen/activeConv/userId (évite re-subscribe & stale state)
 * - [KEEP] API context inchangée (openConversation ouvre toujours le dock)
 * - [KEEP] Badges + règles auto-open inchangés
 * 1.2.0 (2026-01-22)
 * - [NEW] Auto-open conditionnel "dock-open only" sur message entrant (non intrusif)
 * - [NEW] Anti-bump si conversation active déjà ouverte (dock ouvert)
 * =============================================================================
 */

'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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

  // Refs pour callbacks realtime (évite stale state + re-subscribe)
  const userIdRef = useRef<string | null>(null);
  const dockOpenRef = useRef<boolean>(false);
  const activeConvRef = useRef<string | null>(null);

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
      const [m, n] = await Promise.all([
        fetchUnreadMessagesCount(uid),
        fetchUnreadNotificationsCount(uid),
      ]);
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

      // Si dock ouvert + conversation déjà active => pas de bump (l’utilisateur lit déjà)
      if (dockOpen && activeConv === convId) return;

      // Badge unread
      bumpUnreadMessages(1);

      // Auto-open NON intrusif : uniquement si le dock est déjà ouvert
      if (dockOpen) {
        setActiveConversationId(convId);
      }
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
