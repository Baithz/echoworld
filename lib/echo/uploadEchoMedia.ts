/**
 * =============================================================================
 * Fichier      : lib/echo/uploadEchoMedia.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.4 (2026-01-22)
 * Objet        : Upload des médias liés à un écho (photos)
 * -----------------------------------------------------------------------------
 * Fix v1.0.4 :
 * - [FIX] RLS echo_media : ajout de user_id (auth.uid) dans les rows insérées
 * - [SAFE] Récupération user via supabase.auth.getUser() (pas de dépendance externe)
 * - [SAFE] Zéro régression : même logique upload + getPublicUrl + insert echo_media
 * =============================================================================
 */

import { supabase } from '@/lib/supabase/client';

/** Row minimale attendue par echo_media */
type EchoMediaInsertRow = {
  echo_id: string;
  user_id: string; // NEW (RLS)
  url: string;
  position: number;
};

type PostgrestErrorLike = { message?: string } | null;

type EchoMediaTableLike = {
  insert: (values: EchoMediaInsertRow[]) => Promise<{ data: unknown; error: PostgrestErrorLike }>;
};

type StorageUploadResult = { error: PostgrestErrorLike };
type StoragePublicUrlResult = { data: { publicUrl: string } };

const BUCKET = 'echo-media'; // IMPORTANT : doit matcher exactement le bucket Storage Supabase
const MAX_FILES = 3;
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

function safeFileName(originalName: string): string {
  const base = originalName.split('/').pop() ?? 'file';
  const cleaned = base.replace(/[^\w.\-]+/g, '_').slice(0, 120);
  const ext = cleaned.includes('.') ? cleaned.split('.').pop() : '';
  const uuid =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`;
  return ext ? `${uuid}.${ext}` : `${uuid}_${cleaned}`;
}

function asMessage(err: unknown): string {
  if (!err) return 'Erreur inconnue.';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message || 'Erreur inconnue.';
  const e = err as { message?: unknown };
  return typeof e?.message === 'string' ? e.message : 'Erreur inconnue.';
}

export async function uploadEchoMedia(echoId: string, files: File[]): Promise<void> {
  if (!files.length) return;

  // Récup user_id (nécessaire pour policy RLS echo_media)
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) throw new Error(asMessage(authErr));
  const userId = authData.user?.id ?? null;
  if (!userId) throw new Error('Utilisateur non authentifié (user_id manquant).');

  const sliced = files.slice(0, MAX_FILES);

  for (const f of sliced) {
    if (!ALLOWED.has(f.type)) throw new Error('Format image non autorisé (jpeg/png/webp).');
    if (f.size > MAX_BYTES) throw new Error('Image trop lourde (max 5 Mo).');
  }

  const echoMediaTable = (supabase.from('echo_media') as unknown) as EchoMediaTableLike;

  const rows: EchoMediaInsertRow[] = [];
  const storage = supabase.storage.from(BUCKET);

  for (let i = 0; i < sliced.length; i++) {
    const file = sliced[i];
    const safeName = safeFileName(file.name);

    // bucket = BUCKET, path = dossier interne (sans prefix 'BUCKET/')
    const path = `${echoId}/${i}-${safeName}`;

    const up = (await storage.upload(path, file, { upsert: false })) as StorageUploadResult;

    if (up.error) {
      const msg = asMessage(up.error);
      if (msg.toLowerCase().includes('bucket') && msg.toLowerCase().includes('not found')) {
        throw new Error(
          `Bucket Storage introuvable : "${BUCKET}". Vérifie Supabase > Storage (nom exact, casse, tirets).`
        );
      }
      throw new Error(msg);
    }

    const pub = storage.getPublicUrl(path) as StoragePublicUrlResult;

    rows.push({
      echo_id: echoId,
      user_id: userId,
      url: pub.data.publicUrl,
      position: i,
    });
  }

  const { error } = await echoMediaTable.insert(rows);
  if (error) throw new Error(asMessage(error));
}
