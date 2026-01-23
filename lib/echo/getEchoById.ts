/**
 * =============================================================================
 * Fichier      : lib/echo/getEchoById.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-23)
 * Objet        : Récupération détaillée d’un écho (page dédiée / drawer)
 * -----------------------------------------------------------------------------
 * Description  :
 * - Typage EchoDetail (lecture)
 * - Query Supabase table echoes par id
 * - Utilise maybeSingle() pour 0/1 résultat
 * - Retourne null si non trouvé
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
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
};

export async function getEchoById(id: string): Promise<EchoDetail | null> {
  const { data, error } = await supabase
    .from('echoes')
    .select('id,title,content,emotion,created_at,city,country')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as EchoDetail | null;
}
