/**
 * =============================================================================
 * Fichier      : app/api/handle/check/route.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-26)
 * Objet        : API Handle Check — disponibilité pseudo (FAIL-SOFT, anti-régression)
 * -----------------------------------------------------------------------------
 * Description  :
 * - GET ?handle=xxx -> { available: boolean }
 * - Normalise/valide le handle côté serveur (mêmes règles que Settings)
 * - Ne révèle pas d’informations autres que "disponible / non"
 * - SAFE: si erreur/RLS -> renvoie 200 {available:false} ou 200 {available:true}? -> ici: false
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.0.0 (2026-01-26)
 * - [NEW] Endpoint /api/handle/check (disponibilité handle)
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
  if (!value) {
    console.error(`[ENV ERROR] Variable manquante: ${key}`);
    throw new Error(`Variable d'environnement manquante: ${key}`);
  }
  return value;
}

function normalizeHandle(input: string): string {
  const cleaned = input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '');
  return cleaned.slice(0, HANDLE_MAX);
}

function validateHandle(raw: string): { ok: boolean; normalized: string } {
  const normalized = normalizeHandle(raw);

  if (!normalized) return { ok: false, normalized: '' };
  if (normalized.length < HANDLE_MIN) return { ok: false, normalized };
  if (normalized.length > HANDLE_MAX) return { ok: false, normalized: normalized.slice(0, HANDLE_MAX) };
  if (RESERVED_HANDLES.has(normalized)) return { ok: false, normalized };

  return { ok: true, normalized };
}

export async function GET(request: NextRequest) {
  try {
    let supabaseUrl: string;
    let supabaseAnonKey: string;

    try {
      supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
      supabaseAnonKey = getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    } catch (envError) {
      console.error('[ENV ERROR]', envError);
      // FAIL-SOFT : on ne bloque pas la saisie côté client
      return NextResponse.json({ available: false, reason: 'env_missing' }, { status: 200 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });

    const handle = request.nextUrl.searchParams.get('handle') || '';
    const v = validateHandle(handle);

    if (!v.ok) {
      return NextResponse.json({ available: false }, { status: 200 });
    }

    // Important:
    // - on ne doit pas dépendre de l’utilisateur connecté
    // - le but est seulement "existe déjà ?" (unicité)
    // - si RLS bloque (devrait pas : profils publics), on fail-soft => available:false
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('handle', v.normalized)
      .limit(1);

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
