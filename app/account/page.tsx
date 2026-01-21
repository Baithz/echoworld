/**
 * =============================================================================
 * Fichier      : app/account/page.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-21)
 * Objet        : Mon espace (profil personnel) — identité + derniers échos
 * -----------------------------------------------------------------------------
 * Description  :
 * - Affiche l'identité EchoWorld (profiles)
 * - Liste des derniers échos du user (echoes) sans métriques agressives
 * - Accès rapide aux settings
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.0.0 (2026-01-21)
 * - [NEW] Page /account (profil personnel minimal)
 * - [NEW] Fetch Supabase profiles + echoes (dernier contenu)
 * - [SAFE] Guard auth + loading + erreurs lisibles
 * =============================================================================
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

type ProfileRow = {
  id: string;
  handle: string | null;
  display_name: string | null;
  bio: string | null;
  identity_mode: 'real' | 'symbolic' | 'anonymous';
  avatar_type: 'image' | 'symbol' | 'color' | 'constellation';
  avatar_url: string | null;
  avatar_seed: string | null;
  lang_primary: string;
};

type EchoRow = {
  id: string;
  title: string | null;
  content: string;
  emotion: string | null;
  language: string | null;
  country: string | null;
  city: string | null;
  is_anonymous: boolean | null;
  visibility: 'world' | 'local' | 'private' | 'semi_anonymous' | null;
  status: 'draft' | 'published' | 'archived' | 'deleted' | null;
  created_at: string;
};

function safeInitials(input: string): string {
  const clean = (input || '').trim().replace(/\s+/g, ' ');
  if (!clean) return 'EW';
  const parts = clean.split(' ');
  const a = parts[0]?.[0] ?? 'E';
  const b = parts.length > 1 ? (parts[1]?.[0] ?? '') : (parts[0]?.[1] ?? '');
  return (a + b).toUpperCase();
}

function obfuscateId(id: string): string {
  if (!id) return 'Echoer';
  return `Echoer-${id.slice(0, 4)}`;
}

function formatDateFR(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: '2-digit' });
  } catch {
    return iso;
  }
}

export default function AccountPage() {
  const router = useRouter();

  const [authLoading, setAuthLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [echoes, setEchoes] = useState<EchoRow[]>([]);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadAuth = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const u = data.user ?? null;
        if (!mounted) return;

        if (!u) {
          setUserId(null);
          setAuthLoading(false);
          router.replace('/login');
          return;
        }

        setUserId(u.id);
      } finally {
        if (mounted) setAuthLoading(false);
      }
    };

    loadAuth();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      const u = session?.user ?? null;
      setUserId(u?.id ?? null);
      if (!u) router.replace('/login');
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!userId) return;

      setLoading(true);
      setError(null);

      try {
        const [pRes, eRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
          supabase
            .from('echoes')
            .select(
              'id,title,content,emotion,language,country,city,is_anonymous,visibility,status,created_at'
            )
            .eq('user_id', userId)
            .neq('status', 'deleted')
            .order('created_at', { ascending: false })
            .limit(12),
        ]);

        if (!mounted) return;

        setProfile((pRes.data as ProfileRow | null) ?? null);
        setEchoes((eRes.data as EchoRow[]) ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur de chargement.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [userId]);

  const identity = useMemo(() => {
    if (!userId) return 'Account';
    if (profile?.identity_mode === 'anonymous') return 'Anonymous';
    if (profile?.handle) return profile.handle;
    if (profile?.display_name) return profile.display_name;
    return obfuscateId(userId);
  }, [profile, userId]);

  const avatarLabel = useMemo(() => {
    if (!userId) return 'EW';
    if (profile?.avatar_seed) return safeInitials(profile.avatar_seed);
    if (profile?.handle) return safeInitials(profile.handle);
    if (profile?.display_name) return safeInitials(profile.display_name);
    return safeInitials(obfuscateId(userId));
  }, [profile, userId]);

  if (authLoading) {
    return (
      <main className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="h-10 w-56 animate-pulse rounded-xl border border-slate-200 bg-white/70" />
        <div className="mt-6 h-40 animate-pulse rounded-3xl border border-slate-200 bg-white/70" />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Mon espace</h1>
          <p className="mt-2 text-slate-600">
            Ta présence, tes récits, et une navigation calme.
          </p>
        </div>

        <Link
          href="/settings"
          className="rounded-xl border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-white"
        >
          Paramètres
        </Link>
      </div>

      {error && (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {/* Identity card */}
      <section className="mt-10 rounded-3xl border border-slate-200 bg-white/70 p-6 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-900">
            {profile?.avatar_type === 'image' && profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="h-full w-full rounded-2xl object-cover"
              />
            ) : (
              <span className="text-sm font-bold">{avatarLabel}</span>
            )}
          </div>

          <div className="min-w-0">
            <div className="truncate text-lg font-semibold text-slate-900">{identity}</div>
            <div className="text-sm text-slate-600">
              Mode : {profile?.identity_mode ?? 'symbolic'} • Langue : {profile?.lang_primary ?? 'en'}
            </div>
          </div>
        </div>

        {profile?.bio && (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-800">
            {profile.bio}
          </div>
        )}
      </section>

      {/* Echoes */}
      <section className="mt-8">
        <div className="flex items-end justify-between gap-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Derniers échos</h2>
            <p className="mt-1 text-sm text-slate-600">
              Pas de compteurs. Juste une trace douce.
            </p>
          </div>

          <Link
            href="/share"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.01]"
          >
            Partager un écho
          </Link>
        </div>

        {loading ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="h-40 animate-pulse rounded-3xl border border-slate-200 bg-white/70" />
            <div className="h-40 animate-pulse rounded-3xl border border-slate-200 bg-white/70" />
          </div>
        ) : echoes.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-slate-200 bg-white/70 p-6 text-slate-700">
            Aucun écho pour l’instant.
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {echoes.map((e) => (
              <article
                key={e.id}
                className="rounded-3xl border border-slate-200 bg-white/70 p-6 backdrop-blur-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="truncate text-base font-bold text-slate-900">
                      {e.title?.trim() ? e.title : 'Sans titre'}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {formatDateFR(e.created_at)}
                      {e.emotion ? ` • ${e.emotion}` : ''}
                      {e.visibility ? ` • ${e.visibility}` : ''}
                      {e.is_anonymous ? ' • anonyme' : ''}
                    </div>
                  </div>

                  <Link
                    href={`/echo/${e.id}`}
                    className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50"
                  >
                    Ouvrir
                  </Link>
                </div>

                <p className="mt-4 line-clamp-4 text-sm text-slate-700">
                  {e.content}
                </p>

                <div className="mt-4 text-xs text-slate-500">
                  {e.city || e.country ? (
                    <span>
                      {e.city ? e.city : ''}
                      {e.city && e.country ? ' — ' : ''}
                      {e.country ? e.country : ''}
                    </span>
                  ) : (
                    <span>Localisation masquée</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
