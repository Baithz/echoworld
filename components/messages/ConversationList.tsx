/**
 * =============================================================================
 * Fichier      : components/messages/ConversationList.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.3.2 (2026-01-26)
 * Objet        : Liste conversations — sélection active fiable + auto-scroll item actif (SAFE)
 * -----------------------------------------------------------------------------
 * Description  :
 * - Affiche liste conversations avec recherche, états (loading/empty) et sélection active
 * - Support peer enrichment (handle/display_name/avatar_url) pour DM
 * - Avatars cliquables vers /u/[handle] (DM uniquement)
 * - Unread : badge par conv si unreadCounts fourni (fail-soft)
 * - SAFE : pas de PresenceBadge overlay sur avatar sidebar (header gère la présence)
 * - UX : quand selectedId défini, auto-scroll l’item actif dans la liste (dock/page)
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.3.2 (2026-01-26)
 * - [FIX] Sidebar: auto-scroll vers la conversation active (selectedId) après render / filtre
 * - [KEEP] 1.3.1 : suppression PresenceBadge overlay + PresenceLine via onlineUserIds + unread/search/layout inchangés
 * - [SAFE] Aucune régression : clic avatar/profil, états, badges, sélection conservés
 * =============================================================================
 */

'use client';

import { useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Search, Loader2, Users, User as UserIcon } from 'lucide-react';
import type { ConversationRowPlus } from './types';

type Props = {
  conversations: ConversationRowPlus[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  query: string;
  onQueryChange: (q: string) => void;
  variant?: 'dock' | 'page'; // dock = compact, page = spacieux

  // counts non lus par conv (ex: fetchUnreadCountsByConversation)
  unreadCounts?: Record<string, number>;

  // Présence (fail-soft): liste d'user_id en ligne (peer_user_id).
  // NOTE: la présence du header est gérée ailleurs (ChatDock/page).
  onlineUserIds?: string[];
};

function convTitle(c: ConversationRowPlus): string {
  const t = (c.title ?? '').trim();
  if (t) return t;

  if (c.type === 'group') return 'Groupe';

  const h = (c.peer_handle ?? '').trim();
  if (h) return h.startsWith('@') ? h : `@${h}`;

  const dn = (c.peer_display_name ?? '').trim();
  if (dn) return dn;

  return 'Direct';
}

function profileHrefFromHandle(handle: string | null | undefined): string | null {
  const raw = (handle ?? '').trim().replace(/^@/, '');
  if (!raw) return null;
  return `/u/${raw}`;
}

export default function ConversationList({
  conversations,
  loading,
  selectedId,
  onSelect,
  query,
  onQueryChange,
  variant = 'page',
  unreadCounts,
  onlineUserIds,
}: Props) {
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return conversations;

    return conversations.filter((c) => {
      const title = convTitle(c).toLowerCase();
      const id = (c.id ?? '').toLowerCase();
      const handle = (c.peer_handle ?? '').toLowerCase();
      const dn = (c.peer_display_name ?? '').toLowerCase();
      return title.includes(term) || id.includes(term) || handle.includes(term) || dn.includes(term);
    });
  }, [conversations, query]);

  const onlineSet = useMemo(() => {
    const ids = Array.isArray(onlineUserIds) ? onlineUserIds : [];
    return new Set(ids.map((s) => String(s ?? '').trim()).filter(Boolean));
  }, [onlineUserIds]);

  const isDock = variant === 'dock';

  const resolveOnline = (peerUserId: string | null | undefined): boolean => {
    const pid = String(peerUserId ?? '').trim();
    if (!pid) return false;
    // Uniquement via onlineUserIds si fourni, sinon fail-soft => offline
    if (Array.isArray(onlineUserIds)) return onlineSet.has(pid);
    return false;
  };

  const PresenceLine = ({ isGroup, peerUserId }: { isGroup: boolean; peerUserId: string | null | undefined }) => {
    if (isGroup) return <span className="block truncate text-[11px] text-slate-500">Groupe</span>;

    const isOnline = resolveOnline(peerUserId);

    return (
      <span className="flex items-center gap-1.5 truncate text-[11px] text-slate-500">
        <span
          className={`inline-block h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`}
          aria-label={isOnline ? 'En ligne' : 'Hors ligne'}
        />
        {isOnline ? 'En ligne' : 'Hors ligne'}
      </span>
    );
  };

  // --------------------------------------------------------------------------
  // Auto-scroll vers la conversation active (selectedId)
  // --------------------------------------------------------------------------
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedId) return;
    if (loading) return;

    const root = listRef.current;
    if (!root) return;

    const el = root.querySelector<HTMLElement>(`[data-conv-id="${CSS.escape(selectedId)}"]`);
    if (!el) return;

    // Fail-soft: ne pas bouger si déjà visible
    const rootRect = root.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const fullyVisible = elRect.top >= rootRect.top && elRect.bottom <= rootRect.bottom;
    if (fullyVisible) return;

    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedId, loading, filtered.length, variant]);

  return (
    <div
      className={
        isDock ? '' : 'overflow-hidden rounded-2xl border border-slate-200 bg-white/75 shadow-sm backdrop-blur'
      }
    >
      {/* Search */}
      <div className={isDock ? 'p-2' : 'border-b border-slate-200 p-4'}>
        <div
          className={`flex items-center gap-2 rounded-xl border border-slate-200 bg-white ${
            isDock ? 'px-2 py-1.5' : 'px-3 py-2'
          }`}
        >
          <Search className={`text-slate-500 ${isDock ? 'h-4 w-4' : 'h-4 w-4'}`} />
          <input
            value={query}
            onChange={(ev) => onQueryChange(ev.target.value)}
            className={`w-full bg-transparent text-slate-900 outline-none placeholder:text-slate-400 ${
              isDock ? 'text-xs' : 'text-sm'
            }`}
            placeholder="Rechercher…"
            aria-label="Search conversations"
          />
        </div>
      </div>

      {/* List */}
      <div
        ref={listRef}
        className={isDock ? 'max-h-90 overflow-auto px-2 pb-2' : 'max-h-[65vh] overflow-auto p-2'}
      >
        {loading ? (
          <div className={`flex items-center gap-2 p-3 text-slate-600 ${isDock ? 'text-xs' : 'text-sm'}`}>
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement…
          </div>
        ) : filtered.length === 0 ? (
          <div
            className={`m-2 rounded-xl border border-dashed border-slate-200 bg-white/60 p-4 text-slate-600 ${
              isDock ? 'text-xs' : 'text-sm'
            }`}
          >
            Aucune conversation.
          </div>
        ) : (
          filtered.map((c) => {
            const isActive = c.id === selectedId;
            const title = convTitle(c);

            const unread = Math.max(0, Number(unreadCounts?.[c.id] ?? 0) || 0);
            const showUnread = unread > 0;

            const isGroup = c.type === 'group';
            const isDirect = !isGroup;

            const profileHref = isDirect ? profileHrefFromHandle(c.peer_handle ?? null) : null;
            const avatarUrl = isDirect ? (c.peer_avatar_url ?? null) : null;

            const Avatar = () => {
              const baseClass = isDock
                ? 'inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white overflow-hidden'
                : 'flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white overflow-hidden';

              const fallbackIcon = isGroup ? (
                <Users className={isDock ? 'h-4 w-4 text-slate-700' : 'h-5 w-5 text-slate-700'} />
              ) : (
                <UserIcon className={isDock ? 'h-4 w-4 text-slate-700' : 'h-5 w-5 text-slate-700'} />
              );

              const content = avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={title} className="h-full w-full object-cover" />
              ) : (
                fallbackIcon
              );

              if (profileHref) {
                return (
                  <Link
                    href={profileHref}
                    className={baseClass}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Voir le profil de ${title}`}
                  >
                    {content}
                  </Link>
                );
              }

              return <span className={baseClass}>{content}</span>;
            };

            if (isDock) {
              return (
                <button
                  key={c.id}
                  data-conv-id={c.id}
                  type="button"
                  onClick={() => onSelect(c.id)}
                  className={`relative mb-2 flex w-full items-center gap-2 rounded-xl border p-2 text-left transition ${
                    isActive ? 'border-slate-200 bg-white' : 'border-transparent hover:border-slate-200 hover:bg-white'
                  }`}
                  aria-label="Open conversation"
                >
                  <Avatar />

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold text-slate-900">{title}</span>
                    <PresenceLine isGroup={isGroup} peerUserId={c.peer_user_id} />
                  </span>

                  {showUnread && (
                    <span className="absolute right-2 top-2 inline-flex min-w-4.5 items-center justify-center rounded-full bg-slate-900 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </button>
              );
            }

            return (
              <button
                key={c.id}
                data-conv-id={c.id}
                type="button"
                onClick={() => onSelect(c.id)}
                className={`relative flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${
                  isActive
                    ? 'border border-slate-200 bg-white'
                    : 'border border-transparent hover:border-slate-200 hover:bg-white'
                }`}
              >
                <Avatar />

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-slate-900">{title}</div>
                  <div className="truncate text-xs text-slate-600">
                    {isGroup ? 'Groupe' : <PresenceLine isGroup={false} peerUserId={c.peer_user_id} />}
                  </div>
                </div>

                {showUnread && (
                  <span className="inline-flex min-w-5.5 items-center justify-center rounded-full bg-slate-900 px-2 py-1 text-[11px] font-extrabold text-white">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
