/**
 * =============================================================================
 * Fichier      : components/echo/ShareModal.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-23)
 * Objet        : Modal de partage écho (lien, réseaux sociaux, fil)
 * -----------------------------------------------------------------------------
 * Description  :
 * - Modal overlay avec options de partage
 * - Copier lien
 * - Partager sur réseaux sociaux (Twitter, Facebook, WhatsApp)
 * - Partager sur son fil (à venir)
 * - Design premium cohérent
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.0.0 (2026-01-23)
 * - [NEW] Modal de partage complet
 * =============================================================================
 */

'use client';

import { useState } from 'react';
import { X, Link as LinkIcon, Share2, Check } from 'lucide-react';

type Props = {
  echoId: string;
  onClose: () => void;
};

export default function ShareModal({ echoId, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  const url = `${window.location.origin}/echo/${echoId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('Impossible de copier le lien');
    }
  };

  const handleShareTwitter = () => {
    const text = encodeURIComponent("Découvre cet écho sur EchoWorld");
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}`,
      '_blank'
    );
  };

  const handleShareFacebook = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      '_blank'
    );
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(`Découvre cet écho sur EchoWorld: ${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleShareToFeed = () => {
    // TODO: Implémenter partage sur fil
    alert('Partage sur ton fil à venir !');
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Partager cet écho</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Actions */}
        <div className="mt-6 space-y-3">
          {/* Copier lien */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-slate-300 hover:bg-slate-50"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
              {copied ? (
                <Check className="h-5 w-5 text-emerald-600" />
              ) : (
                <LinkIcon className="h-5 w-5 text-slate-700" />
              )}
            </div>
            <div className="flex-1">
              <div className="font-semibold text-slate-900">
                {copied ? 'Lien copié !' : 'Copier le lien'}
              </div>
              <div className="text-xs text-slate-500">
                Partage ce lien où tu veux
              </div>
            </div>
          </button>

          {/* Partager sur ton fil */}
          <button
            type="button"
            onClick={handleShareToFeed}
            className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-slate-300 hover:bg-slate-50"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-violet-50">
              <Share2 className="h-5 w-5 text-violet-600" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-slate-900">
                Partager sur ton fil
              </div>
              <div className="text-xs text-slate-500">
                Partage avec ta communauté EchoWorld
              </div>
            </div>
          </button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-slate-500">
                Ou partage sur
              </span>
            </div>
          </div>

          {/* Réseaux sociaux */}
          <div className="grid grid-cols-3 gap-3">
            {/* Twitter */}
            <button
              type="button"
              onClick={handleShareTwitter}
              className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:bg-slate-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50">
                <svg className="h-5 w-5 text-sky-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-slate-700">Twitter</span>
            </button>

            {/* Facebook */}
            <button
              type="button"
              onClick={handleShareFacebook}
              className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:bg-slate-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-slate-700">Facebook</span>
            </button>

            {/* WhatsApp */}
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:bg-slate-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                <svg className="h-5 w-5 text-emerald-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-slate-700">WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}