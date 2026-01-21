/**
 * =============================================================================
 * Fichier      : components/layout/Header.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.1.1 (2026-01-21)
 * Objet        : Header navigation moderne - Sticky + Glassmorphism
 * -----------------------------------------------------------------------------
 * Changelog    :
 * - [FIX] Lien Explore : /world-map -> /explore
 * - [IMPROVED] Header en pleine largeur : contenu aligné bords écran (plus centré)
 * - [IMPROVED] Thème clair par défaut (bg, borders, textes, mobile menu)
 * - [NEW] Logo EchoWorld (Image) à la place de l’icône
 * - [FIX] Lisibilité LanguageSelect sur fond transparent (avant scroll)
 * =============================================================================
 */

'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Menu, X, Globe2, User, Map, Share2, Info } from 'lucide-react';
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
    { href: '/explore', label: t('nav.explore'), icon: Map },
    { href: '/share', label: t('nav.share'), icon: Share2 },
    { href: '/about', label: t('nav.about'), icon: Info },
  ];

  const closeMobile = () => setIsMobileMenuOpen(false);

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

          <div className="flex items-center gap-4">
            <div className="hidden lg:block">
              {/* Le composant est désormais clair-compatible; on assure aussi le contraste du header avant scroll */}
              <LanguageSelect />
            </div>

            <Link
              href="/login"
              className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-900 backdrop-blur-md transition-all hover:border-slate-300 hover:bg-white lg:flex"
            >
              <User className="h-4 w-4" />
              {t('nav.login')}
            </Link>

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

              <Link
                href="/login"
                onClick={closeMobile}
                className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-base font-semibold text-white shadow-lg transition-transform hover:scale-[1.02]"
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
