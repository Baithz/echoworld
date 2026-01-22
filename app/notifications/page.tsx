/**
 * =============================================================================
 * Fichier      : app/notifications/page.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.1.0 (2026-01-22)
 * Objet        : Page Notifications - Liste + actions (Client + RLS)
 * -----------------------------------------------------------------------------
 * Description  :
 * - Client component: auth browser + fetch notifications via lib/notifications
 * - UI premium + loading + empty state
 * - Actions: mark read / mark all read (lib/notifications)
 * =============================================================================
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bell, Check, Filter, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationRow,
} from '@/lib/notifications';

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function NotificationsPage() {
  const [authLoading, setAuthLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyAll, setBusyAll] = useState(false);

  const unreadCount = useMemo(() => rows.filter((r) => !r.read_at).length, [rows]);

  // Auth bootstrap
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const uid = data.user?.id ?? null;
        if (!mounted) return;
        setUserId(uid);
      } finally {
        if (mounted) setAuthLoading(false);
      }
    };

    load();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      setRows([]);
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Load notifications
  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (!userId) return;
      setLoading(true);
      try {
        const data = await fetchNotifications(userId, 80);
        if (!mounted) return;
        setRows(data);
      } catch {
        if (mounted) setRows([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run();

    return () => {
      mounted = false;
    };
  }, [userId]);

  const onMarkOne = async (id: string) => {
    if (!id || busyId) return;
    setBusyId(id);
    try {
      await markNotificationRead(id);
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, read_at: new Date().toISOString() } : r)));
    } finally {
      setBusyId(null);
    }
  };

  const onMarkAll = async () => {
    if (!userId || busyAll) return;
    setBusyAll(true);
    try {
      await markAllNotificationsRead(userId);
      const now = new Date().toISOString();
      setRows((prev) => prev.map((r) => (r.read_at ? r : { ...r, read_at: now })));
    } finally {
      setBusyAll(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-6 pb-16 pt-28">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700 backdrop-blur">
            <Bell className="h-4 w-4 opacity-70" />
            Notifications
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
            Centre d’activité
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Vos alertes et événements. RLS protège l’accès.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-900 backdrop-blur transition-all hover:border-slate-300 hover:bg-white"
            aria-label="Filter"
            disabled
          >
            <Filter className="h-4 w-4" />
            Filtrer
          </button>

          <button
            type="button"
            onClick={() => void onMarkAll()}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-opacity disabled:opacity-50"
            disabled={!userId || busyAll || unreadCount === 0}
          >
            {busyAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Tout marquer comme lu
          </button>

          <Link
            href="/explore"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-900 backdrop-blur transition-all hover:border-slate-300 hover:bg-white"
          >
            Explorer
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Auth gate */}
      {authLoading ? (
        <div className="mt-10 flex items-center gap-2 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement…
        </div>
      ) : !userId ? (
        <div className="mt-10 rounded-2xl border border-slate-200 bg-white/75 p-6 text-sm text-slate-700 shadow-sm backdrop-blur">
          Vous devez être connecté pour accéder à vos notifications.
          <div className="mt-4">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Se connecter
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white/75 shadow-sm backdrop-blur">
          <div className="border-b border-slate-200 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">Dernières notifications</div>
                <div className="text-xs text-slate-500">
                  Non lues : <span className="font-bold text-slate-900">{unreadCount}</span>
                </div>
              </div>
              <div className="text-xs text-slate-500">Tri : plus récent</div>
            </div>
          </div>

          <div className="divide-y divide-slate-200">
            {loading ? (
              <div className="flex items-center gap-2 p-5 text-sm text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement des notifications…
              </div>
            ) : rows.length === 0 ? (
              <div className="p-5 text-sm text-slate-600">Aucune notification.</div>
            ) : (
              rows.map((n) => {
                const isUnread = !n.read_at;
                return (
                  <div key={n.id} className={`flex gap-4 p-5 hover:bg-white ${isUnread ? '' : 'opacity-80'}`}>
                    <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white">
                      <Bell className="h-5 w-5 text-slate-900" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="truncate text-sm font-bold text-slate-900">
                          {n.title ?? n.type ?? 'Notification'}
                        </div>
                        {isUnread ? (
                          <span className="shrink-0 rounded-full bg-rose-600 px-2 py-1 text-[11px] font-bold text-white">
                            NEW
                          </span>
                        ) : null}
                      </div>

                      {n.body ? <div className="mt-1 text-sm text-slate-600">{n.body}</div> : null}

                      <div className="mt-2 text-xs text-slate-500">{formatTime(n.created_at)}</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void onMarkOne(n.id)}
                      className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 hover:border-slate-300 disabled:opacity-50"
                      disabled={!isUnread || busyId === n.id}
                    >
                      {busyId === n.id ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" /> …
                        </span>
                      ) : (
                        'Marquer lu'
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </main>
  );
}
