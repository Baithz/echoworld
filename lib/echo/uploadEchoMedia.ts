/**
 * =============================================================================
 * Fichier      : lib/echo/uploadEchoMedia.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.2 (2026-01-22)
 * Objet        : Upload des médias liés à un écho (photos)
 * -----------------------------------------------------------------------------
 * Fix v1.0.2 :
 * - [FIX] Path storage sans double "echo-media/"
 * - [SAFE] Garde-fous: max 3 fichiers, types autorisés, taille max 5 Mo
 * - [SAFE] Typage strict minimal, sans any, sans never
 * =============================================================================
 */

import { supabase } from '@/lib/supabase/client';

/** Row minimale attendue par echo_media */
type EchoMediaInsertRow = {
  echo_id: string;
  url: string;
  position: number;
};

type PostgrestErrorLike = { message?: string } | null;

type EchoMediaTableLike = {
  insert: (values: EchoMediaInsertRow[]) => Promise<{ data: unknown; error: PostgrestErrorLike }>;
};

type StorageUploadResult = { error: PostgrestErrorLike };
type StoragePublicUrlResult = { data: { publicUrl: string } };

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

export async function uploadEchoMedia(echoId: string, files: File[]): Promise<void> {
  if (!files.length) return;

  const sliced = files.slice(0, MAX_FILES);

  for (const f of sliced) {
    if (!ALLOWED.has(f.type)) throw new Error('Format image non autorisé (jpeg/png/webp).');
    if (f.size > MAX_BYTES) throw new Error('Image trop lourde (max 5 Mo).');
  }

  const echoMediaTable = (supabase.from('echo_media') as unknown) as EchoMediaTableLike;

  const rows: EchoMediaInsertRow[] = [];

  for (let i = 0; i < sliced.length; i++) {
    const file = sliced[i];
    const safeName = safeFileName(file.name);

    // IMPORTANT: bucket = 'echo-media', path = dossier interne (sans prefix 'echo-media/')
    const path = `${echoId}/${i}-${safeName}`;

    const up = (await supabase.storage
      .from('echo-media')
      .upload(path, file, { upsert: false })) as StorageUploadResult;

    if (up.error) throw up.error;

    const pub = supabase.storage.from('echo-media').getPublicUrl(path) as StoragePublicUrlResult;

    rows.push({
      echo_id: echoId,
      url: pub.data.publicUrl,
      position: i,
    });
  }

  const { error } = await echoMediaTable.insert(rows);
  if (error) throw error;
}
