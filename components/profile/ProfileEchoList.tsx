// =============================================================================
// Fichier      : components/profile/ProfileEchoList.tsx
// Auteur       : Régis KREMER (Baithz) — EchoWorld
// Version      : 2.1.1 (2026-01-24)
// Objet        : Liste UI des échos d'un profil (public) avec images et interactions
// -----------------------------------------------------------------------------
// CHANGELOG
// 2.1.1 (2026-01-24)
// - [PHASE1] Rendu média aligné “post écho” : preview grid (réduit) + EchoPreview (expanded)
// - [PHASE1] Logique expanded unifiée (toggle Lire/Réduire + clic preview images)
// - [KEEP] Design cards premium + ShareModal + réactions empathiques (compat legacy) + guards auth
// 2.1.0 (2026-01-23)
// - [NEW] Réactions empathiques officielles (understand/support/reflect) + UI cohérente
// - [NEW] Partage réel via ShareModal (suppression des actions factices)
// - [COMPAT] Mapping vers l’ancien système (resonances) sans casser le contrat actuel
// - [IMPROVED] Boutons actions: désactivation si non connecté + UX plus claire
// 2.0.0 (2026-01-23)
// - [NEW] Affichage des images (image_urls)
// - [NEW] Interactions : like, commentaire, partage
// - [NEW] Prop currentUserId pour gérer l'auth
// - [IMPROVED] Design cards premium en grid 2 colonnes
// - [IMPROVED] Preview images en grid responsive
// 1.0.0 (2026-01-23)
// - Version initiale basique
// =============================================================================

'use client';

import { useMemo, useState } from 'react';
import { Heart, MessageCircle, Share2, MapPin } from 'lucide-react';

import type { PublicEcho } from '@/lib/profile/getProfile';

import { REACTIONS, type ReactionType } from '@/lib/echo/reactions';
import EchoPreview from '@/lib/echo/EchoPreview';
import ShareModal from '@/components/echo/ShareModal';

type Props = {
  echoes: PublicEcho[];
  currentUserId?: string | null;
};

function safePreview(text: string, max = 220): string {
  const clean = (text ?? '').trim().replace(/\s+/g, ' ');
  if (!clean) return '…';
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

/**
 * Compat UI : ici on ne veut pas dépendre de Supabase.
 * - Les compteurs/états seront branchés plus tard via feed/actions (EchoFeed).
 * - On prépare l’UI + mapping réaction -> legacy key, sans régression.
 */
type LegacyResonanceType = 'i_feel_you' | 'i_support_you' | 'i_reflect_with_you';
const NEW_TO_LEGACY: Record<ReactionType, LegacyResonanceType> = {
  understand: 'i_feel_you',
  support: 'i_support_you',
  reflect: 'i_reflect_with_you',
};

function emotionLabel(emotion: string | null): { emoji: string; label: string } | null {
  if (!emotion) return null;
  const map: Record<string, { emoji: string; label: string }> = {
    joy: { emoji: '😊', label: 'Joie' },
    hope: { emoji: '🌱', label: 'Espoir' },
    love: { emoji: '❤️', label: 'Amour' },
    resilience: { emoji: '💪', label: 'Résilience' },
    gratitude: { emoji: '🙏', label: 'Gratitude' },
    courage: { emoji: '✨', label: 'Courage' },
    peace: { emoji: '🕊️', label: 'Paix' },
    wonder: { emoji: '🌌', label: 'Émerveillement' },
  };
  return map[emotion] ?? { emoji: '✨', label: emotion };
}

function EchoCard({
  echo,
  currentUserId,
}: {
  echo: PublicEcho;
  currentUserId?: string | null;
}) {
  const [expanded, setExpanded] = useState(false);

  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0); // TODO: fetch from DB

  const [shareOpen, setShareOpen] = useState(false);

  // UI-only (à brancher plus tard sur un meta fetch)
  const [reactByMe, setReactByMe] = useState<Record<LegacyResonanceType, boolean>>({
    i_feel_you: false,
    i_support_you: false,
    i_reflect_with_you: false,
  });
  const [reactCounts, setReactCounts] = useState<Record<LegacyResonanceType, number>>({
    i_feel_you: 0,
    i_support_you: 0,
    i_reflect_with_you: 0,
  });
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const location = useMemo(() => [echo.city, echo.country].filter(Boolean).join(', '), [echo.city, echo.country]);

  const media = useMemo(() => {
    const list = Array.isArray(echo.image_urls) ? echo.image_urls.filter(Boolean) : [];
    return list;
  }, [echo.image_urls]);

  const previewPhotos = useMemo(() => media.slice(0, 3), [media]);

  const emo = useMemo(() => emotionLabel((echo as unknown as { emotion?: string | null }).emotion ?? null), [echo]);

  const requireAuth = (msg: string): boolean => {
    if (currentUserId) return true;
    alert(msg);
    return false;
  };

  const handleLike = () => {
    if (!requireAuth('Connecte-toi pour aimer cet écho')) return;

    // TODO: Implémenter like API
    setLiked((v) => !v);
    setLikesCount((prev) => (liked ? Math.max(0, prev - 1) : prev + 1));
  };

  const handleComment = () => {
    if (!requireAuth('Connecte-toi pour commenter')) return;
    // TODO: Ouvrir modal commentaires (Phase 3)
    alert('Commentaires à venir !');
  };

  const handleReaction = async (type: ReactionType) => {
    if (!requireAuth('Connecte-toi pour réagir')) return;

    const legacy = NEW_TO_LEGACY[type];
    const key = `${echo.id}:${legacy}`;
    setBusyKey(key);

    // TODO: Brancher toggleReaction + fetchReactionsMeta sur la même logique que EchoFeed
    // Pour l’instant: UI optimistic, sans dépendance réseau.
    setReactByMe((prev) => {
      const next = !prev[legacy];
      return { ...prev, [legacy]: next };
    });

    setReactCounts((prev) => {
      const active = reactByMe[legacy];
      const nextCount = active ? Math.max(0, (prev[legacy] ?? 0) - 1) : (prev[legacy] ?? 0) + 1;
      return { ...prev, [legacy]: nextCount };
    });

    setBusyKey(null);
  };

  const toggleExpanded = () => setExpanded((v) => !v);

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:shadow-lg">
        {/* Header + contenu */}
        <div className="block p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-base font-bold text-slate-900">{echo.title ?? 'Écho'}</div>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                <span>{formatDate(echo.created_at)}</span>
                {location && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{location}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Badge visibility */}
              <div className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                {echo.visibility}
              </div>

              {/* Toggle expanded (Phase 1) */}
              <button
                type="button"
                onClick={toggleExpanded}
                className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50"
              >
                {expanded ? 'Réduire' : 'Lire'}
              </button>
            </div>
          </div>

          {/* Body : alignement EchoPreview / preview grid */}
          <div className="mt-4">
            {expanded ? (
              <EchoPreview
                content={echo.content}
                emotion={emo}
                photos={media}
              />
            ) : (
              <>
                <div className="text-sm leading-relaxed text-slate-700">{safePreview(echo.content, 200)}</div>

                {previewPhotos.length > 0 ? (
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {previewPhotos.map((url, idx) => (
                      <button
                        key={`${echo.id}-p-${idx}`}
                        type="button"
                        onClick={toggleExpanded}
                        className="group relative aspect-4/3 overflow-hidden rounded-xl bg-slate-100"
                        title="Ouvrir l’écho"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                          loading="lazy"
                        />
                        {idx === 2 && media.length > 3 ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/55">
                            <span className="text-sm font-bold text-white">+{media.length - 3}</span>
                          </div>
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </>
            )}
          </div>

          {/* Theme tags */}
          {(echo.theme_tags?.length ?? 0) > 0 && !expanded && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {echo.theme_tags.slice(0, 4).map((t) => (
                <span
                  key={`${echo.id}-${t}`}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Lien (conservé) */}
          <div className="mt-4">
            <a
              href={`/echo/${echo.id}`}
              className="inline-flex items-center rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-lg"
            >
              Ouvrir →
            </a>
          </div>
        </div>

        {/* Réactions empathiques */}
        <div className="px-5 pb-3">
          <div className="flex flex-wrap gap-2">
            {REACTIONS.map((r) => {
              const legacy = NEW_TO_LEGACY[r.type];
              const active = !!reactByMe[legacy];
              const count = reactCounts[legacy] ?? 0;
              const busy = busyKey === `${echo.id}:${legacy}`;

              return (
                <button
                  key={r.type}
                  type="button"
                  onClick={() => void handleReaction(r.type)}
                  disabled={busy || !currentUserId}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                    active
                      ? 'border-slate-900 bg-slate-900 text-white shadow-lg'
                      : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-50'
                  } ${(busy || !currentUserId) ? 'cursor-not-allowed opacity-60' : ''}`}
                  title={currentUserId ? r.label : 'Connecte-toi pour réagir'}
                >
                  <span className="text-sm">{r.icon}</span>
                  <span className="hidden sm:inline">{r.label}</span>
                  <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] text-slate-700 sm:bg-white/20 sm:text-inherit">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions bar */}
        <div className="border-t border-slate-100 px-5 py-3">
          <div className="flex items-center gap-6 text-sm text-slate-600">
            {/* Like */}
            <button
              type="button"
              onClick={handleLike}
              disabled={!currentUserId}
              className="group flex items-center gap-2 transition-colors hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
              title={currentUserId ? 'Aimer' : 'Connecte-toi pour aimer'}
            >
              <Heart
                className={`h-4 w-4 transition-all group-hover:scale-110 ${liked ? 'fill-rose-600 text-rose-600' : ''}`}
              />
              <span className="text-xs font-semibold">{likesCount > 0 ? likesCount : ''}</span>
            </button>

            {/* Comment */}
            <button
              type="button"
              onClick={handleComment}
              disabled={!currentUserId}
              className="group flex items-center gap-2 transition-colors hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
              title={currentUserId ? 'Commenter' : 'Connecte-toi pour commenter'}
            >
              <MessageCircle className="h-4 w-4 transition-all group-hover:scale-110" />
              <span className="text-xs font-semibold">{/* TODO: comments count Phase 3 */}</span>
            </button>

            {/* Share */}
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="group flex items-center gap-2 transition-colors hover:text-emerald-600"
              title="Partager"
            >
              <Share2 className="h-4 w-4 transition-all group-hover:scale-110" />
            </button>
          </div>
        </div>
      </div>

      {shareOpen ? <ShareModal echoId={echo.id} onClose={() => setShareOpen(false)} /> : null}
    </>
  );
}

export default function ProfileEchoList({ echoes, currentUserId }: Props) {
  if (!echoes || echoes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
        Aucun écho public pour le moment.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {echoes.map((e) => (
        <EchoCard key={e.id} echo={e} currentUserId={currentUserId} />
      ))}
    </div>
  );
}
