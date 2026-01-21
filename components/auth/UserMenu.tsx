'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { LogOut, Settings, User as UserIcon, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

type Props = {
  onNavigate?: () => void; // utile pour fermer menu mobile
};

export default function UserMenu({ onNavigate }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setEmail(data.user?.email ?? null);
      setLoading(false);
    };

    load();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setEmail(session?.user?.email ?? null);
    });

    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };

    document.addEventListener('mousedown', onDoc);
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      document.removeEventListener('mousedown', onDoc);
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setOpen(false);
    onNavigate?.();
    // option: window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="hidden h-10 w-32 animate-pulse rounded-xl border border-slate-200 bg-white/60 lg:block" />
    );
  }

  // Non connecté -> bouton login simple (thème clair)
  if (!email) {
    return (
      <Link
        href="/login"
        onClick={onNavigate}
        className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-900 backdrop-blur-md transition-all hover:border-slate-300 hover:bg-white lg:flex"
      >
        <UserIcon className="h-4 w-4" />
        Connexion
      </Link>
    );
  }

  // Connecté -> menu “social”
  return (
    <div ref={ref} className="relative hidden lg:block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-900 backdrop-blur-md transition hover:bg-white"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-900">
          <UserIcon className="h-4 w-4" />
        </div>
        <span className="max-w-45 truncate text-sm">{email}</span>
        <ChevronDown className="h-4 w-4 opacity-70" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-xl shadow-black/10 backdrop-blur-xl"
        >
          <Link
            href="/account"
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
            className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-900 hover:bg-slate-50"
            role="menuitem"
          >
            <UserIcon className="h-4 w-4" />
            Mon profil
          </Link>

          <Link
            href="/settings"
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
            className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-900 hover:bg-slate-50"
            role="menuitem"
          >
            <Settings className="h-4 w-4" />
            Paramètres
          </Link>

          <div className="h-px bg-slate-200" />

          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-50"
            role="menuitem"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
      )}
    </div>
  );
}
