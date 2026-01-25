// =============================================================================
// Fichier      : lib/messages/index.ts
// Auteur       : Régis KREMER (Baithz) — EchoWorld
// Version      : 2.0.0 (2026-01-25)
// Objet        : Queries Messages (conversations, messages, unread, read state) — LOT 1 optimistic UI
// -----------------------------------------------------------------------------
// BDD (réelle) :
// - public.conversations(id, type conversation_type, title?, created_by?, echo_id?, created_at, updated_at)
// - public.conversation_members(conversation_id, user_id, role, joined_at, last_read_at, muted)
// - public.messages(id, conversation_id, sender_id, content, payload?, created_at, edited_at?, deleted_at?)
// - public.profiles(id, handle, display_name, avatar_url, ...)
//
// CHANGELOG
// -----------------------------------------------------------------------------
// 2.0.0 (2026-01-25)
// - [NEW] sendMessage() supporte payload?: { client_id: string } pour optimistic UI
// - [NEW] fetchSenderProfiles(senderIds: string[]) : batch fetch profiles pour avatars + noms
// - [KEEP] fetchConversationsForUser enrichit peer_* (handle/display_name/avatar_url) inchangé
// - [KEEP] fetchUnreadMessagesCount, markConversationRead inchangés
// - [KEEP] Types ConversationRow, MessageRow inchangés
// - [SAFE] Neutralise TS "never" sans `any` explicite
// =============================================================================

import { supabase } from '@/lib/supabase/client';

/* ============================================================================
 * TYPES
 * ============================================================================
 */

export type ConversationRow = {
  id: string;
  type: 'direct' | 'group' | string; // enum conversation_type côté DB
  title: string | null;
  created_by: string | null;
  echo_id: string | null;
  created_at: string;
  updated_at: string;

  // PHASE 5 : enrichissement optionnel (si conv direct)
  peer_user_id?: string | null;
  peer_handle?: string | null;
  peer_display_name?: string | null;
  peer_avatar_url?: string | null;
};

export type ConversationMemberRow = {
  conversation_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  last_read_at: string | null;
  muted: boolean;
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  payload: unknown | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
};

// LOT 1 : Profile minimal pour sender enrichment
export type SenderProfile = {
  id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

// Minimal profile shape (pour titrage des DM)
type ProfileRow = {
  id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type ConversationMemberWithConv = {
  conversation_id: string;
  conversations: {
    id: string;
    type: string;
    title: string | null;
    created_by: string | null;
    echo_id: string | null;
    created_at: string;
    updated_at: string;
  } | null;
};

type ConvMemberLite = {
  conversation_id: string;
  user_id: string;
  last_read_at: string | null;
};

type MsgCountRes = {
  count: number | null;
  error: { message?: string } | null;
};

/* ============================================================================
 * HELPERS — neutralise "never" Supabase sans any
 * (IMPORTANT: pas de `Function`, pas de rules ban-types)
 * ============================================================================
 */

type PgErr = { message?: string } | null;
type PgRes<T> = { data: T | null; error: PgErr };

// Builder minimal pour chains qu'on utilise
type Chain = {
  select: (...args: unknown[]) => Chain;
  eq: (...args: unknown[]) => Chain;
  in: (...args: unknown[]) => Chain;
  is: (...args: unknown[]) => Chain;
  order: (...args: unknown[]) => Chain;
  limit: (n: number) => Chain;

  // mutations
  update: (values: unknown) => Promise<PgRes<unknown>>;
  insert: (values: unknown) => Chain;

  // finals
  maybeSingle: () => Promise<PgRes<unknown>>;
  single: () => Promise<PgRes<unknown>>;
};

function table(name: string): Chain {
  return (supabase.from(name) as unknown) as Chain;
}

function uniq(arr: string[]): string[] {
  return Array.from(new Set(arr.map((s) => String(s ?? '').trim()).filter(Boolean)));
}

function asIsoOrNull(v: unknown): string | null {
  const s = typeof v === 'string' ? v.trim() : '';
  return s ? s : null;
}

/* ============================================================================
 * UNREAD — calcule les non lus (sans v_unread_counts)
 * ============================================================================
 */

export async function fetchUnreadMessagesCount(userId: string): Promise<number> {
  const uid = (userId ?? '').trim();
  if (!uid) return 0;

  // 1) Mes memberships (conv + last_read_at)
  const mineRes = (await (table('conversation_members')
    .select('conversation_id,user_id,last_read_at')
    .eq('user_id', uid) as unknown as Promise<PgRes<unknown>>)) as PgRes<unknown>;

  if (mineRes.error) throw new Error(mineRes.error.message ?? 'Unread load error.');

  const rows = Array.isArray(mineRes.data) ? (mineRes.data as ConvMemberLite[]) : [];
  if (rows.length === 0) return 0;

  // 2) N+1 (SAFE) : count messages > last_read_at et pas envoyés par moi
  let total = 0;

  for (const r of rows) {
    const convId = String(r.conversation_id ?? '').trim();
    if (!convId) continue;

    const lastRead = asIsoOrNull(r.last_read_at);

    // supabase-js v2 : select('id', { count:'exact', head:true }) renvoie { count }
    // On type sans Function.
    type CountQuery = {
      eq: (c: string, v: unknown) => CountQuery;
      is: (c: string, v: unknown) => CountQuery;
      neq: (c: string, v: unknown) => CountQuery;
      gt: (c: string, v: unknown) => Promise<MsgCountRes>;
    };

    const q = (supabase
      .from('messages')
      .select('id', { count: 'exact', head: true }) as unknown) as CountQuery;

    const base = q.eq('conversation_id', convId).is('deleted_at', null).neq('sender_id', uid);

    const res = lastRead
      ? await base.gt('created_at', lastRead)
      : await base.gt('created_at', '1970-01-01T00:00:00.000Z');

    if (res.error) continue;

    const n = typeof res.count === 'number' && Number.isFinite(res.count) ? res.count : 0;
    total += Math.max(0, n);
  }

  return total;
}

/* ============================================================================
 * CONVERSATIONS — aligné BDD + enrichissement peer pour DM
 * ============================================================================
 */

export async function fetchConversationsForUser(userId: string): Promise<ConversationRow[]> {
  const uid = (userId ?? '').trim();
  if (!uid) return [];

  // 1) membership -> conversations(*)
  const res = (await (supabase
    .from('conversation_members')
    .select('conversation_id, conversations(id,type,title,created_by,echo_id,created_at,updated_at)')
    .eq('user_id', uid)
    .order('joined_at', { ascending: false }) as unknown as Promise<PgRes<unknown>>)) as PgRes<unknown>;

  if (res.error) throw new Error(res.error.message ?? 'Conversations load error.');

  const typed = (Array.isArray(res.data) ? (res.data as unknown as ConversationMemberWithConv[]) : []) ?? [];

  const rows: ConversationRow[] = [];
  for (const r of typed) {
    if (!r?.conversations) continue;
    const c = r.conversations;

    rows.push({
      id: String(c.id),
      type: c.type,
      title: c.title ?? null,
      created_by: c.created_by ?? null,
      echo_id: c.echo_id ?? null,
      created_at: c.created_at,
      updated_at: c.updated_at,
    });
  }

  // Tri récent (updated_at desc)
  rows.sort((a, b) => {
    const ta = new Date(a.updated_at).getTime();
    const tb = new Date(b.updated_at).getTime();
    return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
  });

  // 2) Enrichissement DM : conv direct uniquement -> peer via members + profiles
  const convIds = uniq(rows.filter((c) => c.type === 'direct').map((c) => c.id));
  if (convIds.length === 0) return rows;

  // 2a) membres des conv direct (2 lignes attendues)
  const memRes = (await (table('conversation_members')
    .select('conversation_id,user_id')
    .in('conversation_id', convIds) as unknown as Promise<PgRes<unknown>>)) as PgRes<unknown>;

  if (memRes.error || !Array.isArray(memRes.data)) return rows; // fail-soft

  const memRows = memRes.data as Array<{ conversation_id?: unknown; user_id?: unknown }>;
  const peerByConv = new Map<string, string>();

  for (const m of memRows) {
    const convId = String(m.conversation_id ?? '').trim();
    const mUid = String(m.user_id ?? '').trim();
    if (!convId || !mUid) continue;
    if (mUid === uid) continue;
    if (!peerByConv.has(convId)) peerByConv.set(convId, mUid);
  }

  const peerIds = uniq(Array.from(peerByConv.values()));
  if (peerIds.length === 0) {
    return rows.map((c) => (c.type === 'direct' ? { ...c, peer_user_id: peerByConv.get(c.id) ?? null } : c));
  }

  // 2b) profiles
  const profRes = (await (supabase
    .from('profiles')
    .select('id,handle,display_name,avatar_url')
    .in('id', peerIds) as unknown as Promise<PgRes<unknown>>)) as PgRes<unknown>;

  if (profRes.error || !Array.isArray(profRes.data)) {
    return rows.map((c) => {
      if (c.type !== 'direct') return c;
      const peerId = peerByConv.get(c.id) ?? null;
      return { ...c, peer_user_id: peerId };
    });
  }

  const profById = new Map<string, ProfileRow>();
  for (const p of profRes.data as ProfileRow[]) {
    const pid = String(p?.id ?? '').trim();
    if (pid) profById.set(pid, p);
  }

  return rows.map((c) => {
    if (c.type !== 'direct') return c;

    const peerId = peerByConv.get(c.id) ?? null;
    const p = peerId ? profById.get(peerId) ?? null : null;

    return {
      ...c,
      peer_user_id: peerId,
      peer_handle: p?.handle ?? null,
      peer_display_name: p?.display_name ?? null,
      peer_avatar_url: p?.avatar_url ?? null,
    };
  });
}

export async function fetchConversationMembers(conversationId: string): Promise<ConversationMemberRow[]> {
  const cid = (conversationId ?? '').trim();
  if (!cid) return [];

  const { data, error } = await supabase
    .from('conversation_members')
    .select('*')
    .eq('conversation_id', cid);

  if (error) throw error;
  return ((data as unknown) ?? []) as ConversationMemberRow[];
}

export async function fetchMessages(conversationId: string, limit = 50): Promise<MessageRow[]> {
  const cid = (conversationId ?? '').trim();
  if (!cid) return [];

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', cid)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return ((data as unknown) ?? []) as MessageRow[];
}

/* ============================================================================
 * LOT 1 — SENDER PROFILES (batch fetch pour avatars + noms)
 * ============================================================================
 */

/**
 * Fetch profiles pour une liste de sender_id (batch).
 * Retourne Map<sender_id, SenderProfile>
 */
export async function fetchSenderProfiles(senderIds: string[]): Promise<Map<string, SenderProfile>> {
  const ids = uniq(senderIds);
  const map = new Map<string, SenderProfile>();

  if (ids.length === 0) return map;

  const { data, error } = await supabase
    .from('profiles')
    .select('id,handle,display_name,avatar_url')
    .in('id', ids);

  if (error || !Array.isArray(data)) return map;

  for (const p of data as SenderProfile[]) {
    const pid = String(p?.id ?? '').trim();
    if (pid) map.set(pid, p);
  }

  return map;
}

/* ============================================================================
 * LOT 1 — SEND MESSAGE (support optimistic UI via payload.client_id)
 * ============================================================================
 */

export async function sendMessage(
  conversationId: string,
  content: string,
  payload?: { client_id?: string; [key: string]: unknown }
): Promise<MessageRow> {
  const cid = (conversationId ?? '').trim();
  const clean = (content ?? '').trim();
  if (!cid || !clean) throw new Error('Missing conversationId or empty content.');

  const { data: u } = await supabase.auth.getUser();
  const senderId = u.user?.id ?? null;
  if (!senderId) throw new Error('Not authenticated.');

  const insertPayload: Record<string, unknown> = {
    conversation_id: cid,
    sender_id: senderId,
    content: clean,
  };

  // LOT 1 : support payload (client_id pour optimistic dedupe)
  if (payload && typeof payload === 'object') {
    insertPayload.payload = payload;
  }

  const { data, error } = await supabase
    .from('messages')
    .insert(insertPayload as unknown as never)
    .select('*')
    .single();

  if (error) throw error;
  return data as unknown as MessageRow;
}

/**
 * Marque une conversation comme lue.
 * - Update direct conversation_members.last_read_at (RLS: user_id = auth.uid())
 */
export async function markConversationRead(conversationId: string): Promise<void> {
  const cid = (conversationId ?? '').trim();
  if (!cid) return;

  const { data: u } = await supabase.auth.getUser();
  const userId = u.user?.id ?? null;
  if (!userId) throw new Error('Not authenticated.');

  const patch: Record<string, unknown> = { last_read_at: new Date().toISOString() };

  const { error } = await supabase
    .from('conversation_members')
    .update(patch as unknown as never)
    .eq('conversation_id', cid)
    .eq('user_id', userId);

  if (error) throw error;
}