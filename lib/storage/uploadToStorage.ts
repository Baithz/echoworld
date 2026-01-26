/**
 * =============================================================================
 * Fichier      : lib/storage/uploadToStorage.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.1.0 (2026-01-26)
 * Objet        : Upload fichiers vers Supabase Storage (robuste + compat preview message)
 * -----------------------------------------------------------------------------
 * Description  :
 * - Upload images/fichiers vers bucket 'message-attachments'
 * - Génère URL publique (public bucket) + métadonnées normalisées
 * - Support multi-files (séquentiel, fail-fast)
 * - Validation type/taille + extension fiable + nom unique stable
 * - SAFE : conserve API uploadMessageAttachments(files, userId) + helpers isImageFile/formatFileSize
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.1.0 (2026-01-26)
 * - [IMPROVED] Nom fichier: extension déduite de file.type si possible (fallback filename)
 * - [IMPROVED] Upload: encode/sanitize filename + évite ext vide + garde mime type
 * - [KEEP] Validation type/taille + publicUrl + multi-files séquentiel inchangés
 * - [SAFE] Signature & exports conservés
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

const BUCKET = 'message-attachments';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_FILE_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

function extFromMime(mime: string): string | null {
  const m = (mime ?? '').toLowerCase().trim();
  if (!m) return null;

  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  };

  return map[m] ?? null;
}

function safeBaseName(name: string): string {
  const raw = (name ?? '').trim();
  if (!raw) return 'file';

  // Retire chemin éventuel + normalise espaces
  const base = raw.split('/').pop()?.split('\\').pop() ?? raw;
  const noExt = base.replace(/\.[^/.]+$/, '') || 'file';

  // slug minimal (ascii-safe)
  return noExt
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 60) || 'file';
}

function safeExt(file: File): string {
  const fromMime = extFromMime(file.type);
  if (fromMime) return fromMime;

  const fromName = (file.name ?? '').split('.').pop();
  const ext = (fromName ?? '').toLowerCase().trim();

  // sécurité: ext alphanum courte sinon fallback
  if (ext && /^[a-z0-9]{1,8}$/.test(ext)) return ext;
  return 'bin';
}

/**
 * Upload attachments pour messages
 */
export async function uploadMessageAttachments(files: File[], userId: string): Promise<UploadResult[]> {
  if (!userId) throw new Error("UserId manquant pour l'upload.");

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
    const randomStr = Math.random().toString(36).slice(2, 10);
    const ext = safeExt(file);
    const base = safeBaseName(file.name);
    const objectPath = `${userId}/${timestamp}-${randomStr}-${base}.${ext}`;

    // Upload vers Storage
    const { data, error } = await supabase.storage.from(BUCKET).upload(objectPath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    });

    if (error || !data?.path) {
      throw new Error(`Erreur upload "${file.name}": ${error?.message ?? 'upload failed'}`);
    }

    // Génération URL publique (bucket public)
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);

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
  return ALLOWED_IMAGE_TYPES.includes((type ?? '').toLowerCase().trim());
}

/**
 * Format taille fichier
 */
export function formatFileSize(bytes: number): string {
  const n = typeof bytes === 'number' && Number.isFinite(bytes) ? bytes : 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
