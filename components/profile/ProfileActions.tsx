// =============================================================================
// Fichier      : components/profile/ProfileActions.tsx
// Auteur       : Régis KREMER (Baithz) — EchoWorld
// Version      : 2.0.0 (2026-01-23)
// Objet        : Actions profil public (Suivre / Message) avec messagerie intégrée
// -----------------------------------------------------------------------------
// CHANGELOG
// 2.0.0 (2026-01-23)
// - [NEW] Intégration messagerie : startDirectConversation + ouverture ChatDock
// - [FIX] Suppression any : helpers typés pour follows (comme lib/messages)
// - [IMPROVED] Gestion erreurs + feedback utilisateur
// 1.0.1 (2026-01-23)
// - [FIX] Typage Supabase : utilise any pour .insert() (contourne typage strict)
// 1.0.0 (2026-01-23)
// - Version initiale
// =============================================================================

'use client';

import { useState } from 'react';
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
  return await table('follows').insert([
    { follower_id: followerId, following_id: followingId },
  ]);
}

async function deleteFollow(followerId: string, followingId: string) {
  return await table('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId);
}

export default function ProfileActions({
  profileId,
  currentUserId,
  isFollowing: initialIsFollowing,
}: Props) {
  const router = useRouter();
  const { openConversation, openChatDock } = useRealtime();
  
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loadingFollow, setLoadingFollow] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(false);

  const toggleFollow = async () => {
    if (!currentUserId) {
      router.push('/login');
      return;
    }

    setLoadingFollow(true);

    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await deleteFollow(currentUserId, profileId);
        if (error) throw error;
        setIsFollowing(false);
      } else {
        // Follow
        const { error } = await insertFollow(currentUserId, profileId);
        if (error) throw error;
        setIsFollowing(true);
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
      alert('Erreur lors du suivi. Réessayez.');
    } finally {
      setLoadingFollow(false);
    }
  };

  const handleMessage = async () => {
    if (!currentUserId) {
      router.push('/login');
      return;
    }

    setLoadingMessage(true);

    try {
      // Créer ou récupérer conversation directe
      const result = await startDirectConversation({
        userId: currentUserId,
        otherUserId: profileId,
      });

      if (!result.ok) {
        throw new Error(result.error ?? 'Impossible de créer la conversation');
      }

      // Ouvrir le ChatDock avec cette conversation
      openConversation(result.data.conversationId);
      openChatDock();
    } catch (err) {
      console.error('Error starting conversation:', err);
      alert('Erreur lors de l\'ouverture de la conversation. Réessayez.');
    } finally {
      setLoadingMessage(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Bouton Suivre */}
      <button
        type="button"
        onClick={toggleFollow}
        disabled={loadingFollow || !currentUserId}
        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
          isFollowing
            ? 'border border-slate-200 bg-white text-slate-900 hover:bg-slate-50'
            : 'bg-slate-900 text-white hover:bg-slate-800'
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {loadingFollow ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement...
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

      {/* Bouton Message */}
      <button
        type="button"
        onClick={handleMessage}
        disabled={!currentUserId || loadingMessage}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loadingMessage ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement...
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