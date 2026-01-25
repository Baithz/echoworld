/**
 * =============================================================================
 * Fichier      : lib/messages/useTyping.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-25)
 * Objet        : Hook typing indicator (Supabase Presence) — LOT 2.6
 * -----------------------------------------------------------------------------
 * Description  :
 * - Track qui tape dans une conversation via Supabase Presence
 * - Broadcast "typing" state avec auto-expire 3s
 * - Return typingUsers[] pour affichage UI
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.0.0 (2026-01-25)
 * - [NEW] useTyping(conversationId, userId, displayName, handle)
 * - [NEW] startTyping() / stopTyping()
 * - [NEW] Auto-cleanup après 3s inactivité
 * =============================================================================
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

type TypingUser = {
  userId: string;
  displayName: string | null;
  handle: string | null;
};

type PresenceState = {
  [key: string]: Array<{
    user_id: string;
    display_name?: string | null;
    handle?: string | null;
    typing_at: number;
  }>;
};

export function useTyping(
  conversationId: string | null,
  userId: string | null,
  displayName: string | null,
  handle: string | null
) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup typing state
  const clearTypingTimeout = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, []);

  // Start typing (broadcast)
  const startTyping = useCallback(() => {
    if (!channelRef.current || !userId) return;

    clearTypingTimeout();

    // Broadcast typing state
    void channelRef.current.track({
      user_id: userId,
      display_name: displayName,
      handle,
      typing_at: Date.now(),
    });

    // Auto-stop after 3s
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [userId, displayName, handle, clearTypingTimeout]);

  // Stop typing (untrack)
  const stopTyping = useCallback(() => {
    if (!channelRef.current) return;

    clearTypingTimeout();

    void channelRef.current.untrack();
  }, [clearTypingTimeout]);

  // Setup presence channel
  useEffect(() => {
    if (!conversationId || !userId) {
      setTypingUsers([]);
      return;
    }

    const channel = supabase.channel(`typing:${conversationId}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as PresenceState;

        const users: TypingUser[] = [];
        const now = Date.now();

        for (const key in state) {
          const presences = state[key];
          if (!Array.isArray(presences)) continue;

          for (const p of presences) {
            const uid = String(p.user_id ?? '').trim();
            if (!uid || uid === userId) continue;

            // Filter out stale typing (>5s ago)
            const typingAt = typeof p.typing_at === 'number' ? p.typing_at : 0;
            if (now - typingAt > 5000) continue;

            users.push({
              userId: uid,
              displayName: p.display_name ?? null,
              handle: p.handle ?? null,
            });
          }
        }

        setTypingUsers(users);
      })
      .subscribe();

    return () => {
      clearTypingTimeout();
      void channel.untrack();
      void channel.unsubscribe();
      channelRef.current = null;
    };
  }, [conversationId, userId, clearTypingTimeout]);

  return {
    typingUsers,
    startTyping,
    stopTyping,
  };
}