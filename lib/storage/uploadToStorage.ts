/**
 * =============================================================================
 * Fichier      : lib/storage/uploadToStorage.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-25)
 * Objet        : Upload fichiers vers Supabase Storage
 * -----------------------------------------------------------------------------
 * Description  :
 * - Upload images/fichiers vers bucket 'message-attachments'
 * - Génère URL publique
 * - Support multi-files
 * - Validation type/taille
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.0.0 (2026-01-25)
 * - [NEW] uploadMessageAttachments(files, userId)
 * - [NEW] Validation type/taille
 * - [NEW] Génération URLs publiques
 * =============================================================================
 */

import { supabase } from '@/lib/supabase/client';

type UploadResult = {
  url: string;
  path: string;
  name: string;
  size: number;
  type: string;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_FILE_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

/**
 * Upload attachments pour messages
 */
export async function uploadMessageAttachments(
  files: File[],
  userId: string
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];

  for (const file of files) {
    // Validation taille
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`Fichier "${file.name}" trop volumineux (max 10MB)`);
    }

    // Validation type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      throw new Error(`Type de fichier "${file.type}" non autorisé`);
    }

    // Génération nom unique
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 10);
    const ext = file.name.split('.').pop() || 'bin';
    const fileName = `${userId}/${timestamp}-${randomStr}.${ext}`;

    // Upload vers Storage
    const { data, error } = await supabase.storage
      .from('message-attachments')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      throw new Error(`Erreur upload "${file.name}": ${error.message}`);
    }

    // Génération URL publique
    const { data: urlData } = supabase.storage
      .from('message-attachments')
      .getPublicUrl(data.path);

    results.push({
      url: urlData.publicUrl,
      path: data.path,
      name: file.name,
      size: file.size,
      type: file.type,
    });
  }

  return results;
}

/**
 * Check si fichier est une image
 */
export function isImageFile(type: string): boolean {
  return ALLOWED_IMAGE_TYPES.includes(type);
}

/**
 * Format taille fichier
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}