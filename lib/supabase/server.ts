/**
 * =============================================================================
 * Fichier      : lib/supabase/server.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.2 (2026-01-21)
 * Objet        : Client Supabase Server (Next.js App Router) — cookies SSR
 * -----------------------------------------------------------------------------
 * Description  :
 * - createServerClient (@supabase/ssr)
 * - cookies() async (Next) + getAll/setAll conformes aux types Supabase SSR
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.0.2 (2026-01-21)
 * - [FIX] Signature cookies SSR conforme : setAll(cookies: {name,value,options: Partial<SerializeOptions>}[])
 * - [FIX] sameSite accepte boolean|lax|strict|none (type cookie SerializeOptions)
 * - [FIX] cookies() async => await cookies()
 * - [SAFE] setAll protégé (certains contextes Next peuvent refuser set)
 * =============================================================================
 */

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { SerializeOptions } from 'cookie';

type CookieToSet = {
  name: string;
  value: string;
  options: Partial<SerializeOptions>;
};

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // Next renvoie une liste de cookies { name, value, ... }
          // Supabase SSR accepte { name, value }[]
          return cookieStore.getAll().map((c) => ({ name: c.name, value: c.value }));
        },

        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Next attend des options proches de ResponseCookie, Supabase fournit SerializeOptions.
              // Elles sont compatibles en pratique, mais pas toujours en typage => cast "unknown".
              cookieStore.set(
                name,
                value,
                options as unknown as Parameters<typeof cookieStore.set>[2]
              );
            });
          } catch {
            // Dans certains contextes (RSC), cookieStore.set peut être interdit.
          }
        },
      },
    }
  );
}
