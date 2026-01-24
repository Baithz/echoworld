// =============================================================================
// Fichier      : components/profile/ProfileActions.tsx
// Auteur       : Régis KREMER (Baithz) — EchoWorld
// Version      : 2.1.3 (2026-01-24)
// Objet        : Actions profil public (Suivre / Message) avec messagerie intégrée
// -----------------------------------------------------------------------------
// Description  :
// - Follow/Unfollow via table follows (RLS: auth.uid() = follower_id)
// - Guard non connecté : redirection /login (clic possible même si non connecté)
// - Message : startDirectConversation + ouverture ChatDock (RealtimeProvider)
// - Refresh UI (router.refresh) après follow/unfollow pour stats serveur
// -----------------------------------------------------------------------------
// CHANGELOG
// 2.1.3 (2026-01-24)
// - [FIX] Fallback UID côté client: si currentUserId SSR est null, récupère via supabase.auth.getUser()
// - [DEBUG] Logs ciblés pour diagnostiquer redirect /login -> / (uid null) et flow message/follow
// - [SAFE] Contrat inchangé (props/types/exports), logique follow/message identique
// =============================================================================

'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, UserMinus, MessageCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { startDirectConversation } from '@/lib/messages/startDirectConversation';
import { useRealtime } from '@/lib/realtime/RealtimeProvider';

type Props = {
  profileId: string;
  currentUserId: string | null;
  isFollowing: boolean;
};

// Helpers pour follows (évite any, comme dans lib/messages)
type PostgrestErrorLike = { message?: string } | null;
type PostgrestResultLike<T> = { data: T | null; error: PostgrestErrorLike };

type AnyQuery = PromiseLike<PostgrestResultLike<unknown>> & {
  select: (columns: string) => AnyQuery;
  eq: (column: string, value: unknown) => AnyQuery;
  in: (column: string, values: readonly unknown[]) => AnyQuery;
  insert: (values: unknown) => AnyQuery;
  delete: () => AnyQuery;
};

function table(name: string): AnyQuery {
  return supabase.from(name) as unknown as AnyQuery;
}

async function insertFollow(followerId: string, followingId: string) {
  return await table('follows').insert([{ follower_id: followerId, following_id: followingId }]);
}

async function deleteFollow(followerId: string, followingId: string) {
  return await table('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId);
}

function debugLog(message: string, data?: unknown) {
  try {
    // Debug client: activer via Vercel env NEXT_PUBLIC_EW_DEBUG=1
    if (process.env.NEXT_PUBLIC_EW_DEBUG !== '1') return;
    console.log(`[ProfileActions] ${message}`, data ?? '');
  } catch {
    /* noop */
  }
}

function debugError(message: string, err?: unknown) {
  try {
    if (process.env.NEXT_PUBLIC_EW_DEBUG !== '1') return;
    console.error(`[ProfileActions] ERROR: ${message}`, err ?? '');
  } catch {
    /* noop */
  }
}

export default function ProfileActions({ profileId, currentUserId, isFollowing: initialIsFollowing }: Props) {
  const router = useRouter();
  const { openConversation, openChatDock } = useRealtime();

  const isSelf = useMemo(() => {
    return Boolean(currentUserId && profileId && currentUserId === profileId);
  }, [currentUserId, profileId]);

  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loadingFollow, setLoadingFollow] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(false);

  /**
   * Résout l'UID de manière robuste:
   * - 1) currentUserId (SSR)
   * - 2) fallback client supabase.auth.getUser()
   * - 3) sinon redirect /login
   */
  const resolveUidOrRedirect = async (): Promise<string | null> => {
    if (currentUserId) {
      debugLog('resolveUidOrRedirect: using prop currentUserId', { currentUserId });
      return currentUserId;
    }

    try {
      debugLog('resolveUidOrRedirect: prop currentUserId is null, trying supabase.auth.getUser()', {});
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        debugError('supabase.auth.getUser error', error);
      }
      const uid = data?.user?.id ?? null;
      debugLog('resolveUidOrRedirect: getUser result', { uid, hasUser: Boolean(uid) });

      if (uid) return uid;
    } catch (err) {
      debugError('resolveUidOrRedirect: exception', err);
    }

    debugLog('resolveUidOrRedirect: no uid -> router.push(/login)', {});
    router.push('/login');
    return null;
  };

  const toggleFollow = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const uid = await resolveUidOrRedirect();
    if (!uid) return;
    if (!profileId) return;
    if (uid === profileId) return;

    debugLog('toggleFollow: start', { uid, profileId, isFollowing });

    setLoadingFollow(true);
    try {
      if (isFollowing) {
        const { error } = await deleteFollow(uid, profileId);
        if (error) throw error;
        setIsFollowing(false);
        debugLog('toggleFollow: unfollow ok', {});
      } else {
        const { error } = await insertFollow(uid, profileId);
        if (error) throw error;
        setIsFollowing(true);
        debugLog('toggleFollow: follow ok', {});
      }

      router.refresh();
    } catch (err) {
      console.error('Error toggling follow:', err);
      debugError('toggleFollow failed', err);
      alert('Erreur lors du suivi. Réessayez.');
    } finally {
      setLoadingFollow(false);
    }
  };

  const handleMessage = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const uid = await resolveUidOrRedirect();
    if (!uid) return;
    if (!profileId) return;
    if (uid === profileId) return;

    debugLog('handleMessage: start', { uid, otherUserId: profileId });

    setLoadingMessage(true);
    try {
      const result = await startDirectConversation({
        userId: uid,
        otherUserId: profileId,
      });

      debugLog('handleMessage: startDirectConversation result', result);

      if (!result.ok) {
        throw new Error(result.error ?? 'Impossible de créer la conversation');
      }

      debugLog('handleMessage: opening dock', { conversationId: result.data.conversationId });

      openConversation(result.data.conversationId);
      openChatDock();
    } catch (err) {
      console.error('Error starting conversation:', err);
      debugError('handleMessage failed', err);
      alert("Erreur lors de l'ouverture de la conversation. Réessayez.");
    } finally {
      setLoadingMessage(false);
    }
  };

  const followDisabled = loadingFollow || isSelf;
  const messageDisabled = loadingMessage || isSelf;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={(e) => void toggleFollow(e)}
        disabled={followDisabled}
        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
          isFollowing
            ? 'border border-slate-200 bg-white text-slate-900 hover:bg-slate-50'
            : 'bg-slate-900 text-white hover:bg-slate-800'
        } disabled:cursor-not-allowed disabled:opacity-50`}
        aria-disabled={followDisabled}
      >
        {loadingFollow ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement...
          </>
        ) : isSelf ? (
          <>
            <UserMinus className="h-4 w-4" />
            Vous
          </>
        ) : isFollowing ? (
          <>
            <UserMinus className="h-4 w-4" />
            Ne plus suivre
          </>
        ) : (
          <>
            <UserPlus className="h-4 w-4" />
            Suivre
          </>
        )}
      </button>

      <button
        type="button"
        onClick={(e) => void handleMessage(e)}
        disabled={messageDisabled}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        aria-disabled={messageDisabled}
      >
        {loadingMessage ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement...
          </>
        ) : isSelf ? (
          <>
            <MessageCircle className="h-4 w-4" />
            Vous
          </>
        ) : (
          <>
            <MessageCircle className="h-4 w-4" />
            Message
          </>
        )}
      </button>
    </div>
  );
}
