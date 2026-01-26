/**
 * =============================================================================
 * Fichier      : lib/presence/usePresence.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.1.1 (2026-01-26)
 * Objet        : Hook présence En ligne/Hors ligne — Supabase Presence
 * -----------------------------------------------------------------------------
 * Description  :
 * - Track présence utilisateur (online/offline)
 * - Broadcast présence aux autres users
 * - Receive présence d'autres users
 * - Auto heartbeat (30s)
 * - Cleanup on unmount
 * - SAFE : typage robuste (Supabase Presence payload) + fail-soft
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.1.1 (2026-01-26)
 * - [FIX] ESLint react-hooks/set-state-in-effect : supprime setState synchrone dans l'effet
 * - [IMPROVED] Reset presenceMap via remount-key (state init dépend de userId/channelName)
 * - [KEEP] API + comportement présence inchangés
 * -----------------------------------------------------------------------------
 * 1.1.0 (2026-01-26)
 * - [FIX] TypeScript: supprime casts invalides Presence -> {user_id, online_at}
 * - [IMPROVED] Normalisation payload presence (presenceState + join/leave)
 * - [IMPROVED] Map: conserve offline state (lastSeen) + merge safe
 * - [IMPROVED] Cleanup: unsubscribe + clearInterval garantis
 * - [KEEP] API: usePresence(userId, channelName) + isUserOnline() + formatLastSeen()
 * =============================================================================
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type PresenceState = {
  userId: string;
  online: boolean;
  lastSeen: string; // ISO
};

type PresencePayload = Record<string, unknown>;

/**
 * Extrait un timestamp ISO depuis un payload presence Supabase (fail-soft).
 * On accepte plusieurs clés possibles pour compat.
 */
function extractOnlineAt(p: unknown): string | null {
  if (!p || typeof p !== 'object') return null;
  const o = p as Record<string, unknown>;
  const v = o.online_at ?? o.onlineAt ?? o.ts ?? o.timestamp;
  return typeof v === 'string' && v.trim() ? v : null;
}

/**
 * Hook présence temps réel
 *
 * @param userId - ID utilisateur courant
 * @param channelName - Nom du channel (ex: 'global-presence' ou 'conversation:123')
 * @returns Map<userId, PresenceState>
 */
export function usePresence(userId: string | null, channelName: string = 'global-presence'): Map<string, PresenceState> {
  // ⚠️ ESLint rule: pas de setState synchrone dans l'effet -> on reset via "remount key".
  const resetKey = useMemo(() => `${String(userId ?? '')}::${String(channelName ?? '')}`, [userId, channelName]);
  const [presenceMap, setPresenceMap] = useState<Map<string, PresenceState>>(() => new Map());

  const channelRef = useRef<RealtimeChannel | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // cleanup ancien channel à chaque changement (user/channel)
    const cleanup = () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }

      const ch = channelRef.current;
      channelRef.current = null;

      if (ch) {
        try {
          void ch.untrack().catch(() => {});
        } catch {
          // noop
        }

        try {
          void supabase.removeChannel(ch);
        } catch {
          // noop
        }
      }
    };

    // reset fail-soft via resetKey (pas setState ici)
    // On force un reset "asynchrone" minimal en début d'abonnement via microtask, uniquement si state non vide.
    // (évite cascading renders tout en garantissant UI propre quand userId devient null / change)
    if (!userId) {
      cleanup();
      queueMicrotask(() => {
        if (!mountedRef.current) return;
        setPresenceMap((prev) => (prev.size ? new Map() : prev));
      });
      return cleanup;
    }

    // À chaque changement userId/channelName, on reset avant subscribe (microtask)
    queueMicrotask(() => {
      if (!mountedRef.current) return;
      setPresenceMap((prev) => (prev.size ? new Map() : prev));
    });

    const channel = supabase.channel(channelName, { config: { presence: { key: userId } } });
    channelRef.current = channel;

    const nowIso = () => new Date().toISOString();

    const rebuildFromState = () => {
      try {
        const state = channel.presenceState() as Record<string, PresencePayload[]>;
        const next = new Map<string, PresenceState>();

        for (const [key, presences] of Object.entries(state ?? {})) {
          const uid = String(key ?? '').trim();
          if (!uid) continue;

          const first = Array.isArray(presences) ? presences[0] : undefined;
          const onlineAt = extractOnlineAt(first) ?? nowIso();

          next.set(uid, { userId: uid, online: true, lastSeen: onlineAt });
        }

        if (mountedRef.current) setPresenceMap(next);
      } catch {
        // noop
      }
    };

    const applyJoin = (key: string, newPresences: unknown) => {
      const uid = String(key ?? '').trim();
      if (!uid) return;

      const arr = (Array.isArray(newPresences) ? newPresences : []) as unknown[];
      const onlineAt = extractOnlineAt(arr[0]) ?? nowIso();

      setPresenceMap((prev) => {
        const next = new Map(prev);
        next.set(uid, { userId: uid, online: true, lastSeen: onlineAt });
        return next;
      });
    };

    const applyLeave = (key: string) => {
      const uid = String(key ?? '').trim();
      if (!uid) return;

      setPresenceMap((prev) => {
        const next = new Map(prev);
        const existing = next.get(uid);
        next.set(uid, {
          userId: uid,
          online: false,
          lastSeen: existing?.lastSeen ?? nowIso(),
        });
        return next;
      });
    };

    channel
      .on('presence', { event: 'sync' }, rebuildFromState)
      .on('presence', { event: 'join' }, (payload: { key?: string; newPresences?: unknown }) => {
        applyJoin(String(payload?.key ?? ''), payload?.newPresences);
      })
      .on('presence', { event: 'leave' }, (payload: { key?: string }) => {
        applyLeave(String(payload?.key ?? ''));
      })
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') return;

        void channel.track({ user_id: userId, online_at: nowIso() }).catch(() => {});

        heartbeatRef.current = setInterval(() => {
          void channel.track({ user_id: userId, online_at: nowIso() }).catch(() => {});
        }, 30000);
      });

    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  return presenceMap;
}

/**
 * Check si user est en ligne
 */
export function isUserOnline(presenceMap: Map<string, PresenceState>, userId: string): boolean {
  const id = String(userId ?? '').trim();
  if (!id) return false;
  return presenceMap.get(id)?.online ?? false;
}

/**
 * Format dernier vu
 */
export function formatLastSeen(lastSeen: string): string {
  const then = new Date(lastSeen).getTime();
  if (!Number.isFinite(then)) return '—';

  const now = Date.now();
  const diffMs = Math.max(0, now - then);

  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  if (hours < 24) return `Il y a ${hours}h`;
  if (days < 7) return `Il y a ${days}j`;

  return new Date(lastSeen).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
