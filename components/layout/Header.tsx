/**
 * =============================================================================
 * Fichier      : components/layout/Header.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.2.0 (2026-01-21)
 * Objet        : Header navigation moderne - Sticky + Glassmorphism
 * -----------------------------------------------------------------------------
 * Changelog    :
 * - [FIX] Lien Explore : /world-map -> /explore
 * - [IMPROVED] Header en pleine largeur : contenu aligné bords écran (plus centré)
 * - [IMPROVED] Thème clair par défaut (bg, borders, textes, mobile menu)
 * - [NEW] Logo EchoWorld (Image) à la place de l’icône
 * - [FIX] Lisibilité LanguageSelect sur fond transparent (avant scroll)
 * - [NEW] User menu (mode “réseau social”) : avatar + dropdown si connecté (Supabase)
 * - [IMPROVED] Mobile : zone compte en bas (login ou profil + logout)
 * =============================================================================
 */

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Menu,
  X,
  Globe2,
  Map,
  Share2,
  Info,
  User,
  ChevronDown,
  Settings,
  LogOut,
  LayoutDashboard,
} from 'lucide-react';
import { useLang } from '@/lib/i18n/LanguageProvider';
import LanguageSelect from '@/components/home/LanguageSelect';

// IMPORTANT : adapte ce chemin à TON client Supabase.
// Option A (souvent) : '@/lib/supabase/client'
// Option B : '@/lib/supabaseClient'
// Option C : '@/lib/supabase'
import { supabase } from '@/lib/supabase/client';

type SessionUser = {
  id: string;
  email?: string | null;
};

export default function Header() {
  const { t } = useLang();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Auth state
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<SessionUser | null>(null);

  // Desktop dropdown
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!mounted) return;
        const u = data.user;
        setUser(u ? { id: u.id, email: u.email } : null);
      } finally {
        if (mounted) setAuthLoading(false);
      }
    };

    load();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      const u = session?.user ?? null;
      setUser(u ? { id: u.id, email: u.email } : null);
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!userMenuRef.current) return;
      if (!userMenuRef.current.contains(e.target as Node)) setIsUserMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const navItems = useMemo(
    () => [
      { href: '/', label: t('nav.home'), icon: Globe2 },
      { href: '/explore', label: t('nav.explore'), icon: Map },
      { href: '/share', label: t('nav.share'), icon: Share2 },
      { href: '/about', label: t('nav.about'), icon: Info },
    ],
    [t]
  );

  const closeMobile = () => setIsMobileMenuOpen(false);

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setIsUserMenuOpen(false);
      setIsMobileMenuOpen(false);
    }
  };

  const emailShort = user?.email ? user.email : 'Account';

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'border-b border-slate-200 bg-white/80 shadow-lg shadow-black/5 backdrop-blur-xl'
          : 'bg-white/55'
      }`}
    >
      {/* Pleine largeur (bords écran) */}
      <div className="w-full px-6">
        <div className="flex h-20 items-center justify-between">
          {/* Brand */}
          <Link
            href="/"
            className="group flex items-center gap-3"
            onClick={closeMobile}
            aria-label="EchoWorld — Home"
          >
            <div className="relative h-11 w-11 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-transform group-hover:scale-105">
              <Image
                src="/brand/echoworld-logo.png"
                alt="EchoWorld"
                fill
                className="object-contain p-1"
                priority
              />
            </div>

            <div className="leading-tight">
              <div className="text-lg font-bold text-slate-900">EchoWorld</div>
              <div className="text-xs text-slate-500">Your Story, Our World</div>
            </div>
          </Link>

          {/* Nav desktop */}
          <nav className="hidden items-center gap-8 lg:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-center gap-2 text-sm font-medium text-slate-700 transition-colors hover:text-slate-900"
                >
                  <Icon className="h-4 w-4 opacity-60 transition-opacity group-hover:opacity-100" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-4">
            <div className="hidden lg:block">
              <LanguageSelect />
            </div>

            {/* Desktop account area */}
            <div className="hidden lg:flex items-center gap-3">
              {authLoading ? (
                <div className="h-10 w-40 animate-pulse rounded-xl border border-slate-200 bg-white/70" />
              ) : user ? (
                <div ref={userMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setIsUserMenuOpen((v) => !v)}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-900 backdrop-blur-md transition-all hover:border-slate-300 hover:bg-white"
                    aria-haspopup="menu"
                    aria-expanded={isUserMenuOpen}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white">
                      <User className="h-4 w-4" />
                    </div>
                    <span className="max-w-40 truncate">{emailShort}</span>
                    <ChevronDown className="h-4 w-4 opacity-70" />
                  </button>

                  {isUserMenuOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-xl shadow-black/10 backdrop-blur-xl"
                    >
                      <Link
                        href="/dashboard"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-900 hover:bg-slate-50"
                        role="menuitem"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        Dashboard
                      </Link>

                      <Link
                        href="/account"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-900 hover:bg-slate-50"
                        role="menuitem"
                      >
                        <User className="h-4 w-4" />
                        Mon profil
                      </Link>

                      <Link
                        href="/settings"
                        onClick={() => setIsUserMenuOpen(false)}
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
              ) : (
                <Link
                  href="/login"
                  className="items-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-900 backdrop-blur-md transition-all hover:border-slate-300 hover:bg-white lg:flex"
                >
                  <User className="h-4 w-4" />
                  {t('nav.login')}
                </Link>
              )}
            </div>

            {/* Mobile burger */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white/70 text-slate-900 backdrop-blur-md transition-colors hover:bg-white lg:hidden"
              aria-label="Toggle menu"
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-nav"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      {isMobileMenuOpen && (
        <div id="mobile-nav" className="border-t border-slate-200 bg-white/95 backdrop-blur-xl lg:hidden">
          <nav className="w-full px-6 py-6">
            <div className="space-y-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobile}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-base font-medium text-slate-900 transition-colors hover:bg-white"
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}

              <div className="border-t border-slate-200 pt-4">
                <LanguageSelect />
              </div>

              {/* Account area */}
              <div className="border-t border-slate-200 pt-4">
                {authLoading ? (
                  <div className="h-12 w-full animate-pulse rounded-xl border border-slate-200 bg-white/80" />
                ) : user ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/80 px-4 py-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white">
                        <User className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">{emailShort}</div>
                        <div className="text-xs text-slate-500">Connected</div>
                      </div>
                    </div>

                    <Link
                      href="/dashboard"
                      onClick={closeMobile}
                      className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-base font-semibold text-slate-900 hover:bg-white"
                    >
                      <LayoutDashboard className="h-5 w-5" />
                      Dashboard
                    </Link>

                    <Link
                      href="/settings"
                      onClick={closeMobile}
                      className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-base font-semibold text-slate-900 hover:bg-white"
                    >
                      <Settings className="h-5 w-5" />
                      Paramètres
                    </Link>

                    <button
                      type="button"
                      onClick={logout}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-base font-semibold text-white shadow-lg transition-transform hover:scale-[1.01]"
                    >
                      <LogOut className="h-5 w-5" />
                      Déconnexion
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    onClick={closeMobile}
                    className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-base font-semibold text-white shadow-lg transition-transform hover:scale-[1.02]"
                  >
                    <User className="h-5 w-5" />
                    {t('nav.login')}
                  </Link>
                )}
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
