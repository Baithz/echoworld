/**
 * =============================================================================
 * Fichier      : components/messages/TypingIndicator.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-25)
 * Objet        : Typing indicator "Alice écrit..." — LOT 2.6
 * -----------------------------------------------------------------------------
 * Description  :
 * - Affiche "X écrit..." si quelqu'un tape dans la conversation
 * - Utilise Supabase Presence (track typing state)
 * - Auto-dismiss après 3s inactivité
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.0.0 (2026-01-25)
 * - [NEW] Affichage typing indicator avec animation points
 * - [NEW] Support multi-users (max 3 affichés)
 * - [NEW] Variant dock/page
 * =============================================================================
 */

'use client';

import { useMemo } from 'react';

type TypingUser = {
  userId: string;
  displayName: string | null;
  handle: string | null;
};

type Props = {
  typingUsers: TypingUser[];
  currentUserId: string | null;
  variant?: 'dock' | 'page';
};

export default function TypingIndicator({ typingUsers, currentUserId, variant = 'page' }: Props) {
  const isDock = variant === 'dock';

  // Filter out current user (don't show "You are typing...")
  const others = useMemo(() => {
    return typingUsers.filter((u) => u.userId !== currentUserId);
  }, [typingUsers, currentUserId]);

  if (others.length === 0) return null;

  // Format names
  const names = others.slice(0, 3).map((u) => {
    if (u.displayName) return u.displayName;
    if (u.handle) return u.handle.startsWith('@') ? u.handle : `@${u.handle}`;
    return 'Quelqu\'un';
  });

  const text =
    names.length === 1
      ? `${names[0]} écrit`
      : names.length === 2
      ? `${names[0]} et ${names[1]} écrivent`
      : names.length === 3
      ? `${names[0]}, ${names[1]} et ${names[2]} écrivent`
      : `${names[0]}, ${names[1]} et ${others.length - 2} autres écrivent`;

  return (
    <div
      className={`flex items-center gap-2 text-slate-600 ${isDock ? 'px-3 py-2 text-xs' : 'px-5 py-3 text-sm'}`}
    >
      <span className="inline-flex gap-1">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '0ms' }} />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '150ms' }} />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '300ms' }} />
      </span>
      <span className="font-medium italic">{text}...</span>
    </div>
  );
}