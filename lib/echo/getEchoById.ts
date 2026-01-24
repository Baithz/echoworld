/**
 * =============================================================================
 * Fichier      : lib/echo/getEchoById.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.1.0 (2026-01-24)
 * Objet        : Récupération détaillée d’un écho (page dédiée / drawer)
 * -----------------------------------------------------------------------------
 * Description  :
 * - Typage EchoDetail (lecture) + image_urls systématique (même si vide)
 * - Query Supabase table echoes par id
 * - Utilise maybeSingle() pour 0/1 résultat
 * - Retourne null si non trouvé
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.1.0 (2026-01-24)
 * - [PHASE1] Ajout image_urls (normalisé en tableau) pour rendu média unifié
 * - [KEEP] Champs existants inchangés (aucune régression)
 * 1.0.0 (2026-01-23)
 * - [NEW] Définition EchoDetail
 * - [NEW] getEchoById (safe, null si absent)
 * =============================================================================
 */

import { supabase } from '@/lib/supabase/client';

export type EchoDetail = {
  id: string;
  title: string | null;
  content: string | null;
  emotion: string | null;
  created_at: string;
  city: string | null;
  country: string | null;

  /**
   * Phase 1 — contrat média unifié
   * Toujours un tableau (jamais null/undefined)
   */
  image_urls: string[];
};

export async function getEchoById(id: string): Promise<EchoDetail | null> {
  type EchoRow = {
    id: string;
    title: string | null;
    content: string | null;
    emotion: string | null;
    created_at: string;
    city: string | null;
    country: string | null;
    image_urls: string[] | null;
  };

  const { data, error } = await supabase
    .from('echoes')
    .select('id,title,content,emotion,created_at,city,country,image_urls')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;

  const row = (data as EchoRow | null) ?? null;
  if (!row) return null;

  return {
    id: row.id,
    title: row.title,
    content: row.content,
    emotion: row.emotion,
    created_at: row.created_at,
    city: row.city,
    country: row.country,
    image_urls: Array.isArray(row.image_urls) ? row.image_urls.filter(Boolean) : [],
  };
}
