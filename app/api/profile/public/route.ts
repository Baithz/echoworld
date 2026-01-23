// =============================================================================
// Fichier      : app/api/profile/public/route.ts
// Auteur       : Régis KREMER (Baithz) — EchoWorld
// Version      : 1.0.0 (2026-01-23)
// Objet        : API toggle profil public (maj profiles.public_profile_enabled)
// =============================================================================

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;

    if (!user) {
      return NextResponse.json({ ok: false, error: 'UNAUTHENTICATED' }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as { enabled?: boolean } | null;
    const enabled = Boolean(body?.enabled);

    const { error } = await supabase
      .from('profiles')
      .update({ public_profile_enabled: enabled })
      .eq('id', user.id);

    if (error) {
      return NextResponse.json({ ok: false, error: 'UPDATE_FAILED' }, { status: 400 });
    }

    return NextResponse.json({ ok: true, public_profile_enabled: enabled });
  } catch {
    return NextResponse.json({ ok: false, error: 'SERVER_ERROR' }, { status: 500 });
  }
}
