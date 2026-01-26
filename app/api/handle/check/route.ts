/**
 * =============================================================================
 * Fichier      : app/api/handle/check/route.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.1 (2026-01-26)
 * Objet        : API Handle Check — disponibilité pseudo (FAIL-SOFT, anti-régression)
 * -----------------------------------------------------------------------------
 * Description  :
 * - GET ?handle=xxx -> { available: boolean }
 * - Normalise/valide le handle côté serveur (mêmes règles strictes que Settings + lookup)
 * - Ne révèle pas d’informations autres que "disponible / non"
 * - Prefer SERVICE_ROLE_KEY si présent (unicité fiable même si profils non publics)
 * - SAFE: si erreur/RLS/env manquants -> status 200 + available:false
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.0.1 (2026-01-26)
 * - [FIX] Normalisation strictement alignée (a-z0-9_- ; espaces->_ ; max 24)
 * - [IMPROVED] Support service role (si dispo) pour vérif unicité réelle
 * - [KEEP] FAIL-SOFT 200 + available:false en cas d’erreur
 * =============================================================================
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const HANDLE_MIN = 3;
const HANDLE_MAX = 24;

const RESERVED_HANDLES = new Set([
  'admin',
  'api',
  'app',
  'auth',
  'account',
  'settings',
  'login',
  'signup',
  'register',
  'explore',
  'map',
  'u',
  'me',
  'support',
  'terms',
  'privacy',
]);

function getEnvVar(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Variable d'environnement manquante: ${key}`);
  return value;
}

/**
 * Normalisation STRICTE (doit matcher Settings + DB unique index):
 * - remove @
 * - trim
 * - lowercase
 * - espaces => _
 * - autorise uniquement [a-z0-9_-]
 * - max 24
 */
function normalizeHandleStrict(input: string): string {
  const raw = typeof input === 'string' ? input : '';
  const cleaned = raw.trim().replace(/^@/, '').trim();
  if (!cleaned) return '';
  return cleaned
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, HANDLE_MAX);
}

function validateHandle(raw: string): { ok: boolean; normalized: string } {
  const normalized = normalizeHandleStrict(raw);

  if (!normalized) return { ok: false, normalized: '' };
  if (normalized.length < HANDLE_MIN) return { ok: false, normalized };
  if (normalized.length > HANDLE_MAX) return { ok: false, normalized: normalized.slice(0, HANDLE_MAX) };
  if (RESERVED_HANDLES.has(normalized)) return { ok: false, normalized };

  return { ok: true, normalized };
}

function getSupabaseAdminOrAnon() {
  const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');

  // Prefer service role (unicité fiable même si profils non publics / RLS restrictif)
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  }

  // Fallback anon (peut être limité par RLS -> FAIL-SOFT available:false)
  const anonKey = getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  return createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
}

export async function GET(request: NextRequest) {
  try {
    const handle = request.nextUrl.searchParams.get('handle') || '';
    const v = validateHandle(handle);

    if (!v.ok) {
      return NextResponse.json({ available: false }, { status: 200 });
    }

    let supabase;
    try {
      supabase = getSupabaseAdminOrAnon();
    } catch (envError) {
      console.error('[HANDLE CHECK ENV ERROR]', envError);
      return NextResponse.json({ available: false, reason: 'env_missing' }, { status: 200 });
    }

    const { data, error } = await supabase.from('profiles').select('id').eq('handle', v.normalized).limit(1);

    if (error) {
      console.error('[HANDLE CHECK ERROR]', error);
      return NextResponse.json({ available: false }, { status: 200 });
    }

    const exists = Array.isArray(data) && data.length > 0;
    return NextResponse.json({ available: !exists }, { status: 200 });
  } catch (e) {
    console.error('[HANDLE CHECK EXCEPTION]', e);
    return NextResponse.json({ available: false }, { status: 200 });
  }
}
