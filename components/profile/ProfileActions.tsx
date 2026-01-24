// =============================================================================
// Fichier      : components/profile/ProfileActions.tsx
// Auteur       : Régis KREMER (Baithz) — EchoWorld
// Version      : 2.1.2 (2026-01-24)
// Objet        : Actions profil public (Suivre / Message) avec messagerie intégrée
// -----------------------------------------------------------------------------
// Description  :
// - Follow/Unfollow via table follows (RLS: auth.uid() = follower_id)
// - Guard non connecté : redirection /login (clic possible même si non connecté)
// - Message : startDirectConversation + ouverture ChatDock (RealtimeProvider)
// - Refresh UI (router.refresh) après follow/unfollow pour stats serveur
// -----------------------------------------------------------------------------
// CHANGELOG
// 2.1.2 (2026-01-24)
// - [FIX] TS1225: suppression type-guard invalide sur variable de scope
// - [FIX] TS2345: utilisation d’un uid local (string) après guard
// - [KEEP] Logique follow/message identique, zéro régression
// 2.1.0 (2026-01-24)
// - [FIX] Guard non connecté: boutons cliquables + redirect /login
// - [IMPROVED] router.refresh() après follow/unfollow
// - [SAFE] Bloque follow sur soi-même (no-op)
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

export default function ProfileActions({ profileId, currentUserId, isFollowing: initialIsFollowing }: Props) {
  const router = useRouter();
  const { openConversation, openChatDock } = useRealtime();

  const isSelf = useMemo(() => {
    return Boolean(currentUserId && profileId && currentUserId === profileId);
  }, [currentUserId, profileId]);

  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loadingFollow, setLoadingFollow] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(false);

  const requireAuth = (): string | null => {
    const uid = currentUserId;
    if (!uid) {
      router.push('/login');
      return null;
    }
    return uid;
  };

  const toggleFollow = async () => {
    const uid = requireAuth();
    if (!uid) return;
    if (isSelf) return;

    setLoadingFollow(true);
    try {
      if (isFollowing) {
        const { error } = await deleteFollow(uid, profileId);
        if (error) throw error;
        setIsFollowing(false);
      } else {
        const { error } = await insertFollow(uid, profileId);
        if (error) throw error;
        setIsFollowing(true);
      }

      router.refresh();
    } catch (err) {
      console.error('Error toggling follow:', err);
      alert('Erreur lors du suivi. Réessayez.');
    } finally {
      setLoadingFollow(false);
    }
  };

  const handleMessage = async () => {
    const uid = requireAuth();
    if (!uid) return;
    if (isSelf) return;

    setLoadingMessage(true);
    try {
      const result = await startDirectConversation({
        userId: uid,
        otherUserId: profileId,
      });

      if (!result.ok) {
        throw new Error(result.error ?? 'Impossible de créer la conversation');
      }

      openConversation(result.data.conversationId);
      openChatDock();
    } catch (err) {
      console.error('Error starting conversation:', err);
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
        onClick={toggleFollow}
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
        onClick={handleMessage}
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
