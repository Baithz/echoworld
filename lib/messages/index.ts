// =============================================================================
// Fichier      : lib/messages/index.ts
// Auteur       : Régis KREMER (Baithz) — EchoWorld
// Version      : 2.2.0 (2026-01-25)
// Objet        : Queries Messages + sendMessage() (optimistic UI + reply + broadcast) — LOT 1/2/2.5
// -----------------------------------------------------------------------------
// BDD (réelle) :
// - public.conversations(id, type conversation_type, title?, created_by?, echo_id?, created_at, updated_at)
// - public.conversation_members(conversation_id, user_id, role, joined_at, last_read_at, muted)
// - public.messages(id, conversation_id, sender_id, content, payload?, parent_id?, created_at, edited_at?, deleted_at?)
// - public.profiles(id, handle, display_name, avatar_url, ...)
//
// CHANGELOG
// -----------------------------------------------------------------------------
// 2.2.0 (2026-01-25)
// - [NEW] LOT 2.5 : Broadcast manuel après sendMessage() (contourne Replication indispo)
// - [KEEP] Reply: parent_id écrit dans messages.parent_id
// - [KEEP] Optimistic UI: payload.client_id conservé pour dedupe realtime
// - [KEEP] fetchConversationsForUser enrichit peer_* inchangé
// - [KEEP] fetchUnreadMessagesCount, markConversationRead inchangés
// - [KEEP] fetchSenderProfiles inchangé
// - [SAFE] Pas de `any` ajouté, fail-soft conservé
// 2.1.0 (2026-01-25)
// - [NEW] fetchUnreadCountsByConversation() : map conv_id -> count (pour badge par conv)
// =============================================================================

import { supabase } from '@/lib/supabase/client';

/* ============================================================================
 * TYPES
 * ============================================================================
 */

export type ConversationRow = {
  id: string;
  type: 'direct' | 'group' | string;
  title: string | null;
  created_by: string | null;
  echo_id: string | null;
  created_at: string;
  updated_at: string;

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
  parent_id?: string | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
};

export type SenderProfile = {
  id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

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

type PgErr = { message?: string } | null;
type PgRes<T> = { data: T | null; error: PgErr };

type Chain = {
  select: (...args: unknown[]) => Chain;
  eq: (...args: unknown[]) => Chain;
  in: (...args: unknown[]) => Chain;
  is: (...args: unknown[]) => Chain;
  order: (...args: unknown[]) => Chain;
  limit: (n: number) => Chain;
  update: (values: unknown) => Promise<PgRes<unknown>>;
  insert: (values: unknown) => Chain;
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

export async function fetchUnreadMessagesCount(userId: string): Promise<number> {
  const uid = (userId ?? '').trim();
  if (!uid) return 0;

  const mineRes = (await (table('conversation_members')
    .select('conversation_id,user_id,last_read_at')
    .eq('user_id', uid) as unknown as Promise<PgRes<unknown>>)) as PgRes<unknown>;

  if (mineRes.error) throw new Error(mineRes.error.message ?? 'Unread load error.');

  const rows = Array.isArray(mineRes.data) ? (mineRes.data as ConvMemberLite[]) : [];
  if (rows.length === 0) return 0;

  let total = 0;

  for (const r of rows) {
    const convId = String(r.conversation_id ?? '').trim();
    if (!convId) continue;

    const lastRead = asIsoOrNull(r.last_read_at);

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

export async function fetchUnreadCountsByConversation(userId: string): Promise<Record<string, number>> {
  const uid = (userId ?? '').trim();
  if (!uid) return {};

  const mineRes = (await (table('conversation_members')
    .select('conversation_id,user_id,last_read_at')
    .eq('user_id', uid) as unknown as Promise<PgRes<unknown>>)) as PgRes<unknown>;

  if (mineRes.error) throw new Error(mineRes.error.message ?? 'Unread load error.');

  const rows = Array.isArray(mineRes.data) ? (mineRes.data as ConvMemberLite[]) : [];
  if (rows.length === 0) return {};

  const out: Record<string, number> = {};

  for (const r of rows) {
    const convId = String(r.conversation_id ?? '').trim();
    if (!convId) continue;

    const lastRead = asIsoOrNull(r.last_read_at);

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
    out[convId] = Math.max(0, n);
  }

  return out;
}

export async function fetchConversationsForUser(userId: string): Promise<ConversationRow[]> {
  const uid = (userId ?? '').trim();
  if (!uid) return [];

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

  rows.sort((a, b) => {
    const ta = new Date(a.updated_at).getTime();
    const tb = new Date(b.updated_at).getTime();
    return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
  });

  const convIds = uniq(rows.filter((c) => c.type === 'direct').map((c) => c.id));
  if (convIds.length === 0) return rows;

  const memRes = (await (table('conversation_members')
    .select('conversation_id,user_id')
    .in('conversation_id', convIds) as unknown as Promise<PgRes<unknown>>)) as PgRes<unknown>;

  if (memRes.error || !Array.isArray(memRes.data)) return rows;

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

  const { data, error } = await supabase.from('conversation_members').select('*').eq('conversation_id', cid);

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

export async function fetchSenderProfiles(senderIds: string[]): Promise<Map<string, SenderProfile>> {
  const ids = uniq(senderIds);
  const map = new Map<string, SenderProfile>();

  if (ids.length === 0) return map;

  const { data, error } = await supabase.from('profiles').select('id,handle,display_name,avatar_url').in('id', ids);

  if (error || !Array.isArray(data)) return map;

  for (const p of data as SenderProfile[]) {
    const pid = String(p?.id ?? '').trim();
    if (pid) map.set(pid, p);
  }

  return map;
}

export async function sendMessage(
  conversationId: string,
  content: string,
  payload?: { client_id?: string; parent_id?: string | null; [key: string]: unknown }
): Promise<MessageRow> {
  const cid = (conversationId ?? '').trim();
  const clean = (content ?? '').trim();
  if (!cid || !clean) throw new Error('Missing conversationId or empty content.');

  const { data: u } = await supabase.auth.getUser();
  const senderId = u.user?.id ?? null;
  if (!senderId) throw new Error('Not authenticated.');

  const parentId = payload?.parent_id ?? null;

  const insertPayload: Record<string, unknown> = {
    conversation_id: cid,
    sender_id: senderId,
    content: clean,
    parent_id: parentId,
  };

  if (payload && typeof payload === 'object') {
    const clientId = typeof payload.client_id === 'string' ? payload.client_id.trim() : '';
    if (clientId) insertPayload.payload = { client_id: clientId };
  }

  const { data, error } = await supabase.from('messages').insert(insertPayload as unknown as never).select('*').single();

  if (error) throw error;

  const msg = data as unknown as MessageRow;

  // LOT 2.5 : Broadcast manuel (contourne Replication indispo)
  try {
    const { broadcastMessage } = await import('@/lib/realtime/realtime');
    await broadcastMessage({
      id: msg.id,
      conversation_id: msg.conversation_id,
      sender_id: msg.sender_id,
      content: msg.content,
      created_at: msg.created_at,
      edited_at: msg.edited_at,
      deleted_at: msg.deleted_at,
      payload: msg.payload,
    });
  } catch {
    // Fail-soft: si broadcast échoue, message quand même créé en DB
  }

  return msg;
}

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