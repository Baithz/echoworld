/**
 * =============================================================================
 * Fichier      : lib/realtime/RealtimeProvider.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.4.1 (2026-01-25)
 * Objet        : Provider global Realtime + état badges + ChatDock (open/close) — LOT 1 dedupe
 * -----------------------------------------------------------------------------
 * Description  :
 * - Se branche sur Supabase auth
 * - Fetch initial : v_unread_counts (via helpers)
 * - Realtime : incrémente badges sur INSERT messages/notifications
 * - API context : unread counts + open/close dock + open/close conversation
 *
 * Règle auto-open :
 * - Si ChatDock OUVERT : auto-switch vers la conversation du message entrant (sans ouvrir/fermer le dock)
 * - Si ChatDock FERMÉ : n'ouvre rien, badge uniquement (non intrusif)
 * - Si l'utilisateur est déjà sur la conversation active + dock ouvert : pas de bump badge
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.4.1 (2026-01-25)
 * - [FIX] TypeScript payload type : MessageConfirmCallback accept unknown payload (compatible RealtimeMessagePayload)
 * 1.4.0 (2026-01-25)
 * - [NEW] Event onMessageConfirm(callback) pour confirm optimistic (dedupe via client_id)
 * - [KEEP] Callbacks realtime stables (refs)
 * - [KEEP] Auto-open conditionnel inchangé
 * - [KEEP] API context inchangée
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

type MessageConfirmCallback = (payload: { record: { id: string; payload?: unknown } }) => void;

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

  // LOT 1 : subscribe to confirm events
  const onMessageConfirm = useCallback((callback: MessageConfirmCallback) => {
    confirmCallbacksRef.current.add(callback);
    return () => {
      confirmCallbacksRef.current.delete(callback);
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
      if (dockOpen && activeConv === convId) return;

      // Badge unread
      bumpUnreadMessages(1);

      // Auto-open NON intrusif : uniquement si le dock est déjà ouvert
      if (dockOpen) {
        setActiveConversationId(convId);
      }

      // LOT 1 : notify confirm callbacks (pour dedupe optimistic)
      confirmCallbacksRef.current.forEach((cb) => cb(p as unknown as { record: { id: string; payload?: unknown } }));
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

      onMessageConfirm,
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
    ]
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}