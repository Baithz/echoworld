/**
 * =============================================================================
 * Fichier      : components/layout/Header.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.1 (2026-01-21)
 * Objet        : Header navigation moderne - Sticky + Glassmorphism
 * =============================================================================
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, Globe2, User, Heart, Map, Share2, Info } from 'lucide-react';
import { useLang } from '@/lib/i18n/LanguageProvider';
import LanguageSelect from '@/components/home/LanguageSelect';

export default function Header() {
  const { t } = useLang();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { href: '/', label: t('nav.home'), icon: Globe2 },
    { href: '/world-map', label: t('nav.explore'), icon: Map },
    { href: '/share', label: t('nav.share'), icon: Share2 },
    { href: '/about', label: t('nav.about'), icon: Info },
  ];

  const closeMobile = () => setIsMobileMenuOpen(false);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'border-b border-white/10 bg-slate-950/80 shadow-lg shadow-black/20 backdrop-blur-xl'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex h-20 items-center justify-between">
          <Link href="/" className="group flex items-center gap-3" onClick={closeMobile}>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-sky-500 shadow-lg shadow-violet-500/30 transition-transform group-hover:scale-105">
              <Heart className="h-6 w-6 fill-white text-white" />
            </div>
            <div>
              <div className="text-lg font-bold text-white">EchoWorld</div>
              <div className="text-xs text-slate-400">Your Story, Our World</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 lg:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-center gap-2 text-sm font-medium text-slate-300 transition-colors hover:text-white"
                >
                  <Icon className="h-4 w-4 opacity-60 transition-opacity group-hover:opacity-100" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-4">
            <div className="hidden lg:block">
              <LanguageSelect />
            </div>

            <Link
              href="/login"
              className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10 lg:flex"
            >
              <User className="h-4 w-4" />
              {t('nav.login')}
            </Link>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white backdrop-blur-sm transition-colors hover:bg-white/10 lg:hidden"
              aria-label="Toggle menu"
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-nav"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div id="mobile-nav" className="border-t border-white/10 bg-slate-950/95 backdrop-blur-xl lg:hidden">
          <nav className="mx-auto max-w-7xl px-6 py-6">
            <div className="space-y-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobile}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base font-medium text-white transition-colors hover:bg-white/10"
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}

              <div className="border-t border-white/10 pt-4">
                <LanguageSelect />
              </div>

              <Link
                href="/login"
                onClick={closeMobile}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-sky-500 px-4 py-3 text-base font-semibold text-white shadow-lg transition-transform hover:scale-[1.02]"
              >
                <User className="h-5 w-5" />
                {t('nav.login')}
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
