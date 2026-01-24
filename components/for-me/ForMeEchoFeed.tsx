/**
 * =============================================================================
 * Fichier      : components/for-me/ForMeEchoFeed.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.2.0 (2026-01-24)
 * Objet        : Adaptateur "Pour moi" — réutilise EchoFeed sur une liste d'IDs "curated"
 * -----------------------------------------------------------------------------
 * Description  :
 * - Prend une liste d'IDs (curatedIds) et fetch les échos correspondants
 * - Aligne la shape EchoRow attendue par components/echo/EchoFeed.tsx (media/reactions/mirror/dm/comments)
 * - FAIL-SOFT : si colonnes absentes côté DB => fallback propre (zéro crash)
 * - KEEP : EchoFeed gère déjà likes/media/reactions/comments/mirror/dm => on ne duplique rien ici
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.2.0 (2026-01-24)
 * - [FIX] Ajout handler onOpenEcho inline (client-side) pour satisfaire EchoFeed
 * - [FIX] Navigation via Next.js router (useRouter)
 * - [KEEP] Zéro régression fonctionnelle
 * 1.1.0 (2026-01-24)
 * - [FIX] Suppression onOpenEcho/onOpenConversation (props non nécessaires, EchoFeed utilise Link)
 * - [IMPROVED] Navigation via Link natif Next.js (pas de handler)
 * - [KEEP] Zéro régression fonctionnelle
 * 1.0.0 (2026-01-24)
 * - [NEW] Adaptateur curatedIds -> EchoFeed (mapping EchoRow)
 * - [SAFE] Best-effort query + normalisation (image_urls[], user_id?, comments_count?)
 * - [KEEP] Zéro régression : UI/handlers EchoFeed inchangés
 * =============================================================================
 */

'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import EchoFeed from '@/components/echo/EchoFeed';
import type { EchoRow } from '@/components/echo/EchoFeed';
import { supabase } from '@/lib/supabase/client';

type Props = {
  curatedIds: string[];
  userId: string | null;
  /**
   * Optionnel : limite de rendu (après fetch) si curatedIds est grand.
   * Default: 30
   */
  max?: number;
};

type DbEchoRow = {
  id: unknown;
  title?: unknown;
  content?: unknown;
  emotion?: unknown;
  language?: unknown;
  country?: unknown;
  city?: unknown;
  is_anonymous?: unknown;
  visibility?: unknown;
  status?: unknown;
  created_at?: unknown;
  user_id?: unknown;

  // optionnels selon schema / query
  image_urls?: unknown;
  comments_count?: unknown;
  can_dm?: unknown;
};

function uniq(arr: string[]): string[] {
  return Array.from(new Set(arr.map((x) => String(x ?? '').trim()).filter(Boolean)));
}

function normalizeImageUrls(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.map((x) => String(x ?? '').trim()).filter(Boolean);
}

function toEchoRow(r: DbEchoRow): EchoRow | null {
  const id = String(r.id ?? '').trim();
  if (!id) return null;

  const createdAt = String(r.created_at ?? '').trim();
  if (!createdAt) return null;

  const visibilityRaw = String(r.visibility ?? '').trim() as EchoRow['visibility'];
  const statusRaw = String(r.status ?? '').trim() as EchoRow['status'];

  // NOTE: EchoFeed attend "world|local|private|semi_anonymous|null" et "draft|published|archived|deleted|null"
  const visibility: EchoRow['visibility'] =
    visibilityRaw === 'world' || visibilityRaw === 'local' || visibilityRaw === 'private' || visibilityRaw === 'semi_anonymous'
      ? visibilityRaw
      : null;

  const status: EchoRow['status'] =
    statusRaw === 'draft' || statusRaw === 'published' || statusRaw === 'archived' || statusRaw === 'deleted'
      ? statusRaw
      : null;

  const commentsCount = typeof r.comments_count === 'number' ? r.comments_count : Number(r.comments_count);
  const comments_count = Number.isFinite(commentsCount) ? Math.max(0, commentsCount) : null;

  const canDm = typeof r.can_dm === 'boolean' ? r.can_dm : null;

  return {
    id,
    title: (r.title ?? null) as string | null,
    content: String(r.content ?? ''),
    emotion: (r.emotion ?? null) as string | null,
    language: (r.language ?? null) as string | null,
    country: (r.country ?? null) as string | null,
    city: (r.city ?? null) as string | null,
    is_anonymous: (typeof r.is_anonymous === 'boolean' ? r.is_anonymous : null) as boolean | null,
    visibility,
    status,
    created_at: createdAt,

    // optionnels
    user_id: typeof r.user_id === 'string' ? r.user_id : null,
    image_urls: normalizeImageUrls(r.image_urls),
    comments_count,
    can_dm: canDm,
  };
}

export default function ForMeEchoFeed({ curatedIds, userId, max = 30 }: Props) {
  const router = useRouter();
  const ids = useMemo(() => uniq(curatedIds).slice(0, Math.max(1, max)), [curatedIds, max]);

  const [loading, setLoading] = useState(false);
  const [echoes, setEchoes] = useState<EchoRow[]>([]);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (ids.length === 0) {
        setEchoes([]);
        return;
      }

      setLoading(true);
      try {
        // Best-effort query: on demande un superset de colonnes.
        // Si certaines colonnes n'existent pas dans ton schema, Supabase peut renvoyer error.
        // => FAIL-SOFT: fallback sur une query minimale.
        const columnsFull = [
          'id',
          'title',
          'content',
          'emotion',
          'language',
          'country',
          'city',
          'is_anonymous',
          'visibility',
          'status',
          'created_at',
          'user_id',
          'image_urls',
          'comments_count',
          'can_dm',
        ].join(',');

        const columnsMin = ['id', 'title', 'content', 'visibility', 'status', 'created_at', 'user_id'].join(',');

        const tryQuery = async (select: string) => {
          const { data, error } = await supabase.from('echoes').select(select).in('id', ids).limit(ids.length);
          return { data, error };
        };

        let res = await tryQuery(columnsFull);
        if (res.error) {
          res = await tryQuery(columnsMin);
        }

        if (!mounted) return;

        const rows = Array.isArray(res.data) ? (res.data as DbEchoRow[]) : [];
        const mapped = rows.map(toEchoRow).filter((x): x is EchoRow => !!x);

        // Conserver l'ordre curatedIds (si possible)
        const pos = new Map<string, number>();
        ids.forEach((id, i) => pos.set(id, i));
        mapped.sort((a, b) => (pos.get(a.id) ?? 0) - (pos.get(b.id) ?? 0));

        setEchoes(mapped);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void run();

    return () => {
      mounted = false;
    };
  }, [ids]);

  // Handler client-side pour navigation (satisfait le contrat EchoFeed)
  const handleOpenEcho = useCallback(
    (id: string) => {
      router.push(`/echo/${id}`);
    },
    [router]
  );

  return (
    <EchoFeed
      loading={loading}
      echoes={echoes}
      userId={userId}
      onOpenEcho={handleOpenEcho}
    />
  );
}