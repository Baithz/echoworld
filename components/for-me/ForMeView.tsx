// =============================================================================
// Fichier      : components/for-me/ForMeView.tsx
// Auteur       : Régis KREMER (Baithz) — EchoWorld
// Version      : 1.0.0 (2026-01-22)
// Description  : Vue "Pour moi" (UI + fetch feed)
// =============================================================================

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Sparkles, Heart, Flame, Hash, Settings2, Loader2, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { getForMeFeed } from '@/lib/for-me/feed';
import type { ForMeFeed, ForMeFeedItem } from '@/lib/for-me/types';

type SessionUser = { id: string; email?: string | null };

function safeText(text: string, max = 160) {
  const clean = (text ?? '').trim().replace(/\s+/g, ' ');
  if (!clean) return '…';
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function Card({ item }: { item: ForMeFeedItem }) {
  const href = item.echoId ? `/echo/${item.echoId}` : '#';

  return (
    <Link
      href={href}
      className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white/75 shadow-sm backdrop-blur transition hover:bg-white"
      aria-label={item.title}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-extrabold text-slate-900">{item.title}</h3>
            <p className="mt-1 line-clamp-3 text-sm text-slate-600">{safeText(item.excerpt, 190)}</p>
          </div>
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-[11px] font-semibold text-slate-700">
            {item.meta}
          </span>
        </div>
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/60 shadow-sm backdrop-blur">
      <div className="p-5">
        <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200/70" />
        <div className="mt-3 space-y-2">
          <div className="h-3 w-full animate-pulse rounded bg-slate-200/60" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-slate-200/60" />
          <div className="h-3 w-4/6 animate-pulse rounded bg-slate-200/60" />
        </div>
      </div>
    </div>
  );
}

export default function ForMeView() {
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<SessionUser | null>(null);

  const [loading, setLoading] = useState(false);
  const [feed, setFeed] = useState<ForMeFeed | null>(null);

  // Auth
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!mounted) return;
        const u = data.user ?? null;
        setUser(u ? { id: u.id, email: u.email } : null);
      } finally {
        if (mounted) setAuthLoading(false);
      }
    };

    void load();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      const u = session?.user ?? null;
      setUser(u ? { id: u.id, email: u.email } : null);
      setFeed(null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Load feed
  useEffect(() => {
    if (!user?.id) return;

    let mounted = true;
    setLoading(true);

    (async () => {
      try {
        const data = await getForMeFeed(user.id);
        if (!mounted) return;
        setFeed(data);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  return (
    <main className="mx-auto w-full max-w-6xl px-6 pb-16 pt-28">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700 backdrop-blur">
            <Sparkles className="h-4 w-4 opacity-70" />
            Pour moi
          </div>

          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
            Vos échos en résonance
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Basé sur vos interactions (likes / mirrors) et les sujets associés. Ajustable dans les paramètres.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-900 backdrop-blur transition-all hover:border-slate-300 hover:bg-white"
          >
            <Settings2 className="h-4 w-4" />
            Personnaliser
          </Link>
        </div>
      </div>

      {authLoading ? (
        <div className="mt-10 flex items-center gap-2 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement…
        </div>
      ) : !user ? (
        <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white/75 shadow-sm backdrop-blur">
          <div className="p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
                <Lock className="h-6 w-6 text-slate-900" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-extrabold text-slate-900">Connexion requise</h2>
                <p className="mt-1 text-sm text-slate-600">
                  “Pour moi” est un flux personnalisé. Connectez-vous pour voir vos résonances.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Se connecter
                  </Link>
                  <Link
                    href="/explore"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-900 backdrop-blur hover:bg-white"
                  >
                    Explorer
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-10 space-y-10">
          {/* Résonance */}
          <section>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
                <Heart className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">En résonance</h2>
                <p className="text-sm text-slate-600">
                  Match sur les sujets liés à ce que tu as aimé / mirrorré.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {loading ? (
                <>
                  <SkeletonCard />
                  <SkeletonCard />
                </>
              ) : (feed?.resonance?.length ?? 0) === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-5 text-sm text-slate-600 md:col-span-2">
                  Pas assez de signaux pour calculer une résonance. Like quelques échos (ou explore des sujets).
                </div>
              ) : (
                feed!.resonance.map((i) => <Card key={i.id} item={i} />)
              )}
            </div>
          </section>

          {/* Nouveaux */}
          <section>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
                <Flame className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Nouveaux échos</h2>
                <p className="text-sm text-slate-600">Fallback quand la résonance est faible.</p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {loading ? (
                <>
                  <SkeletonCard />
                  <SkeletonCard />
                </>
              ) : (feed?.fresh?.length ?? 0) === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-5 text-sm text-slate-600 md:col-span-2">
                  Aucun nouveau contenu.
                </div>
              ) : (
                feed!.fresh.map((i) => <Card key={i.id} item={i} />)
              )}
            </div>
          </section>

          {/* Topics */}
          <section>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
                <Hash className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Sujets</h2>
                <p className="text-sm text-slate-600">Déduits de tes interactions.</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {(feed?.topics ?? []).length === 0 ? (
                <span className="text-sm text-slate-600">Aucun sujet détecté.</span>
              ) : (
                feed!.topics.map((t) => (
                  <Link
                    key={t.id}
                    href={`/explore?topic=${encodeURIComponent(t.label)}`}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700 backdrop-blur hover:bg-white"
                  >
                    #{t.label}
                  </Link>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
