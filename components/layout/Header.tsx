/**
 * =============================================================================
 * Fichier      : components/layout/Header.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.5.0 (2026-01-22)
 * Objet        : Header navigation moderne - Sticky + Glassmorphism (sans dropdown)
 * -----------------------------------------------------------------------------
 * Description  :
 * - Desktop: Messages ouvre ChatDock (toggleChatDock) si user, sinon /login
 * - Desktop: Ajout recherche globale (membres / échos / sujets) inline dans le header
 * - Mobile: conserve navigation vers /messages et /notifications + bouton recherche (overlay)
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.5.0 (2026-01-22)
 * - [NEW] GlobalSearch desktop (inline) + mobile (overlay) dans le header
 * - [KEEP] Comportement Messages desktop (dock si connecté, /login sinon)
 * - [KEEP] Badges, identité, notifications page, mobile inchangé
 * - [SAFE] Aucun changement de styles du header existant (insertion only)
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
  Settings,
  LogOut,
  LayoutDashboard,
  Mail,
  Bell,
} from 'lucide-react';
import { useLang } from '@/lib/i18n/LanguageProvider';
import LanguageSelect from '@/components/home/LanguageSelect';
import GlobalSearch from '@/components/search/GlobalSearch';
import { supabase } from '@/lib/supabase/client';
import { useRealtime } from '@/lib/realtime/RealtimeProvider';

type SessionUser = {
  id: string;
  email?: string | null;
};

type ProfileRow = {
  id: string;
  handle: string | null;
  display_name: string | null;
  identity_mode: 'real' | 'symbolic' | 'anonymous';
  avatar_type: 'image' | 'symbol' | 'color' | 'constellation';
  avatar_url: string | null;
  avatar_seed: string | null;
  lang_primary: string;
};

type UserSettingsRow = {
  user_id: string;
  public_profile_enabled: boolean;
  default_echo_visibility: 'world' | 'local' | 'private' | 'semi_anonymous';
  default_anonymous: boolean;
  allow_responses: boolean;
  allow_mirrors: boolean;
  notifications_soft: boolean;
  theme: 'system' | 'light' | 'dark';
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

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  const label = count > 99 ? '99+' : String(count);

  return (
    <span
      className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[11px] font-bold leading-none text-white shadow"
      aria-label={`${label} unread`}
    >
      {label}
    </span>
  );
}

export default function Header() {
  const { t } = useLang();

  // Realtime (badges + chatdock)
  const {
    unreadMessagesCount,
    unreadNotificationsCount,
    toggleChatDock,
    isChatDockOpen,
  } = useRealtime();

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Auth state
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<SessionUser | null>(null);

  // EchoWorld identity
  const [profileLoading, setProfileLoading] = useState(false);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [settings, setSettings] = useState<UserSettingsRow | null>(null);

  // Cache léger (évite refetch inutile si header remonte)
  const cacheRef = useRef<{
    userId: string;
    profile: ProfileRow | null;
    settings: UserSettingsRow | null;
  } | null>(null);

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

    void load();

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

  // Charge profiles + user_settings dès que user présent
  useEffect(() => {
    let mounted = true;

    const loadIdentity = async (userId: string) => {
      if (cacheRef.current?.userId === userId) {
        setProfile(cacheRef.current.profile);
        setSettings(cacheRef.current.settings);
        return;
      }

      setProfileLoading(true);
      try {
        const [pRes, sRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
          supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle(),
        ]);

        if (!mounted) return;

        const nextProfile = (pRes.data as ProfileRow | null) ?? null;
        const nextSettings = (sRes.data as UserSettingsRow | null) ?? null;

        setProfile(nextProfile);
        setSettings(nextSettings);

        cacheRef.current = { userId, profile: nextProfile, settings: nextSettings };
      } finally {
        if (mounted) setProfileLoading(false);
      }
    };

    if (!user?.id) {
      setProfile(null);
      setSettings(null);
      cacheRef.current = null;
      return;
    }

    void loadIdentity(user.id);

    return () => {
      mounted = false;
    };
  }, [user?.id]);

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
      cacheRef.current = null;
      setProfile(null);
      setSettings(null);
      setIsMobileMenuOpen(false);
    }
  };

  const displayIdentity = (() => {
    if (!user?.id) return 'Account';
    if (profile?.identity_mode === 'anonymous') return 'Anonymous';
    if (profile?.handle) return profile.handle;
    if (profile?.display_name) return profile.display_name;
    return obfuscateId(user.id);
  })();

  const avatarLabel = (() => {
    if (!user?.id) return 'EW';
    if (profile?.avatar_seed) return safeInitials(profile.avatar_seed);
    if (profile?.handle) return safeInitials(profile.handle);
    if (profile?.display_name) return safeInitials(profile.display_name);
    return safeInitials(obfuscateId(user.id));
  })();

  const themePref: UserSettingsRow['theme'] = settings?.theme ?? 'system';
  const softNotifLabel = settings?.notifications_soft ? 'on' : 'off';

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'border-b border-slate-200 bg-white/80 shadow-lg shadow-black/5 backdrop-blur-xl'
          : 'bg-white/55'
      }`}
    >
      <div className="w-full px-6">
        <div className="flex h-20 items-center justify-between gap-4">
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

          {/* Desktop nav + search */}
          <nav className="hidden items-center gap-6 lg:flex">
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

            {/* NEW: Global search (desktop inline) */}
            <GlobalSearch variant="desktop" />
          </nav>

          <div className="flex items-center gap-4">
            <div className="hidden lg:block">
              <LanguageSelect />
            </div>

            {/* NEW: Mobile search button (overlay) */}
            <div className="lg:hidden">
              <GlobalSearch variant="mobile" />
            </div>

            <div className="hidden lg:flex items-center gap-2">
              {/* Messages -> ouvre le ChatDock (si connecté) */}
              {authLoading ? (
                <div className="h-10 w-10 animate-pulse rounded-xl border border-slate-200 bg-white/70" />
              ) : user ? (
                <button
                  type="button"
                  onClick={() => toggleChatDock()}
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white/70 text-slate-900 backdrop-blur-md transition-all hover:border-slate-300 hover:bg-white"
                  aria-label={`Messages. Unread: ${unreadMessagesCount}.`}
                  aria-controls="ew-chatdock"
                  aria-expanded={isChatDockOpen}
                >
                  <Mail className="h-5 w-5" />
                  <Badge count={unreadMessagesCount} />
                </button>
              ) : (
                <Link
                  href="/login"
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white/70 text-slate-900 backdrop-blur-md transition-all hover:border-slate-300 hover:bg-white"
                  aria-label="Login to view messages"
                >
                  <Mail className="h-5 w-5" />
                </Link>
              )}

              {/* Notifications (reste page) */}
              <Link
                href="/notifications"
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white/70 text-slate-900 backdrop-blur-md transition-all hover:border-slate-300 hover:bg-white"
                aria-label={`Notifications. Unread: ${unreadNotificationsCount}.`}
              >
                <Bell className="h-5 w-5" />
                <Badge count={unreadNotificationsCount} />
              </Link>

              {authLoading ? (
                <div className="h-10 w-24 animate-pulse rounded-xl border border-slate-200 bg-white/70" />
              ) : user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-900 backdrop-blur-md transition-all hover:border-slate-300 hover:bg-white"
                    aria-label="Dashboard"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Link>

                  <Link
                    href="/account"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-900 backdrop-blur-md transition-all hover:border-slate-300 hover:bg-white"
                    aria-label={`Profile. ${displayIdentity}. Theme: ${themePref}. Soft notifications: ${softNotifLabel}.`}
                    data-theme-pref={themePref}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white">
                      {profile?.avatar_type === 'image' && profile.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={profile.avatar_url}
                          alt="Avatar"
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-bold text-slate-900">{avatarLabel}</span>
                      )}
                    </span>

                    <span className="max-w-40 truncate">
                      {profileLoading ? 'Loading…' : displayIdentity}
                    </span>
                  </Link>

                  <Link
                    href="/settings"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white/70 text-slate-900 backdrop-blur-md transition-all hover:border-slate-300 hover:bg-white"
                    aria-label="Settings"
                  >
                    <Settings className="h-5 w-5" />
                  </Link>

                  <button
                    type="button"
                    onClick={logout}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-700 transition-colors hover:bg-rose-100"
                    aria-label="Logout"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-900 backdrop-blur-md transition-all hover:border-slate-300 hover:bg-white"
                >
                  <User className="h-4 w-4" />
                  {t('nav.login')}
                </Link>
              )}
            </div>

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

      {/* Mobile nav (inchangé: liens vers pages) */}
      {isMobileMenuOpen && (
        <div
          id="mobile-nav"
          className="border-t border-slate-200 bg-white/95 backdrop-blur-xl lg:hidden"
        >
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

              <div className="border-t border-slate-200 pt-4 space-y-3">
                <Link
                  href="/messages"
                  onClick={closeMobile}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-base font-medium text-slate-900 hover:bg-white"
                  aria-label={`Messages. Unread: ${unreadMessagesCount}.`}
                >
                  <span className="flex items-center gap-3">
                    <Mail className="h-5 w-5" />
                    Messages
                  </span>
                  {unreadMessagesCount > 0 ? (
                    <span className="rounded-full bg-rose-600 px-2 py-1 text-xs font-bold text-white">
                      {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                    </span>
                  ) : null}
                </Link>

                <Link
                  href="/notifications"
                  onClick={closeMobile}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-base font-medium text-slate-900 hover:bg-white"
                  aria-label={`Notifications. Unread: ${unreadNotificationsCount}.`}
                >
                  <span className="flex items-center gap-3">
                    <Bell className="h-5 w-5" />
                    Notifications
                  </span>
                  {unreadNotificationsCount > 0 ? (
                    <span className="rounded-full bg-rose-600 px-2 py-1 text-xs font-bold text-white">
                      {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                    </span>
                  ) : null}
                </Link>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <LanguageSelect />
              </div>

              <div className="border-t border-slate-200 pt-4">
                {authLoading ? (
                  <div className="h-12 w-full animate-pulse rounded-xl border border-slate-200 bg-white/80" />
                ) : user ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/80 px-4 py-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white">
                        {profile?.avatar_type === 'image' && profile.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={profile.avatar_url}
                            alt="Avatar"
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-bold text-slate-900">{avatarLabel}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">
                          {profileLoading ? 'Loading…' : displayIdentity}
                        </div>
                        <div className="text-xs text-slate-500">
                          Connected • Theme: {themePref} • Soft notif: {softNotifLabel}
                        </div>
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
