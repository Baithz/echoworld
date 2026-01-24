/**
 * =============================================================================
 * Fichier      : components/echo/EchoItem.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.3.1 (2026-01-24)
 * Objet        : EchoItem UI (affichage + réactions + mirror + DM + commentaires) — SAFE
 * -----------------------------------------------------------------------------
 * PHASE 3 — Activer les commentaires partout (lecture + ajout)
 * - [PHASE3] Ajoute bouton “Commentaires” + badge (echo.comments_count) sans casser le contrat props
 * - [PHASE3] Ouvre CommentsModal depuis EchoItem (feed/profil/etc.)
 * - [KEEP] Réactions (officielles) + compat mapping NEW→LEGACY inchangés
 * - [KEEP] ShareModal, Mirror, Message, Media preview, expand/collapse inchangés
 * - [SAFE] Aucun `any`, best-effort si comments_count absent => 0 (pas de crash)
 *
 * PHASE 3bis — Realtime comments_count (incrément local uniquement)
 * - [PHASE3bis] Ajoute prop optionnelle onCommentInserted (signal parent)
 * - [PHASE3bis] Passe onCommentInserted à CommentsModal
 * - [PHASE3bis] Ajoute props optionnelles currentUserId/canPost pour ouvrir la modale en mode post
 * - [KEEP] Si non fourni: lecture seule, aucun impact (zéro régression)
 * =============================================================================
 */

'use client';

import { useMemo, useState } from 'react';
import { Heart, MessageCircle, Share2, Sparkles, Send } from 'lucide-react';

import type { ResonanceType } from '@/lib/echo/actions';
import { REACTIONS, type ReactionType } from '@/lib/echo/reactions';

import EchoPreview from '@/lib/echo/EchoPreview';
import ShareModal from '@/components/echo/ShareModal';
import CommentsModal from '@/components/echo/CommentsModal';

type AnyReactionType = ReactionType | ResonanceType;

type ResCounts = Record<AnyReactionType, number>;
type ResByMe = Record<AnyReactionType, boolean>;

export type EchoRow = {
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

  user_id?: string | null;

  image_urls?: string[] | null;

  comments_count?: number | null;
  mirrored?: boolean | null;
  can_dm?: boolean | null;
};

type Props = {
  echo: EchoRow;
  dateLabel: string;

  expanded: boolean;
  onToggleExpand: (id: string) => void;

  liked: boolean;
  likeCount: number;
  onLike: (id: string) => void;

  media: string[];

  resCounts: ResCounts;
  resByMe: ResByMe;
  onResonance: (echoId: string, type: AnyReactionType) => void;

  onMirror: (echoId: string, toUserId: string, message: string) => void;
  onMessage: (toUserId: string) => void;

  onOpenEcho: (id: string) => void;

  onShare: (id: string) => void;

  copied: boolean;
  busyLike: boolean;
  busyResKey: string | null;

  // PHASE 3bis — signal parent (incrément local uniquement)
  onCommentInserted?: () => void;

  // PHASE 3bis — optionnel: si fourni => modale commentable
  currentUserId?: string | null;
  canPost?: boolean;
};

function emotionLabel(emotion: string | null): { emoji: string; label: string } | null {
  if (!emotion) return null;
  const map: Record<string, { emoji: string; label: string }> = {
    joy: { emoji: '😊', label: 'Joie' },
    sadness: { emoji: '😢', label: 'Tristesse' },
    hope: { emoji: '🌱', label: 'Espoir' },
    anger: { emoji: '🔥', label: 'Colère' },
    love: { emoji: '❤️', label: 'Amour' },
    fear: { emoji: '🌧️', label: 'Peur' },
    anxiety: { emoji: '😰', label: 'Anxiété' },
    loneliness: { emoji: '😔', label: 'Solitude' },
    melancholy: { emoji: '😞', label: 'Mélancolie' },
    frustration: { emoji: '😤', label: 'Frustration' },
    pain: { emoji: '😣', label: 'Douleur' },
    emptiness: { emoji: '😶', label: 'Vide' },
    resilience: { emoji: '💪', label: 'Résilience' },
    gratitude: { emoji: '🙏', label: 'Gratitude' },
    courage: { emoji: '✨', label: 'Courage' },
  };
  return map[emotion] ?? { emoji: '✨', label: emotion };
}

const NEW_TO_LEGACY: Record<ReactionType, ResonanceType> = {
  understand: 'i_feel_you',
  support: 'i_support_you',
  reflect: 'i_reflect_with_you',
};

function getCount(counts: ResCounts, t: ReactionType): number {
  const legacy = NEW_TO_LEGACY[t];
  const v = counts[t] ?? counts[legacy] ?? 0;
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function getActive(byMe: ResByMe, t: ReactionType): boolean {
  const legacy = NEW_TO_LEGACY[t];
  return !!(byMe[t] ?? byMe[legacy]);
}

function normalizeMedia(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.map((x) => String(x ?? '').trim()).filter(Boolean);
}

export default function EchoItem(props: Props) {
  const { echo } = props;

  const [mirrorOpen, setMirrorOpen] = useState(false);
  const [mirrorText, setMirrorText] = useState('');

  const [shareOpen, setShareOpen] = useState(false);

  const [commentsOpen, setCommentsOpen] = useState(false);

  const emo = useMemo(() => emotionLabel(echo.emotion), [echo.emotion]);

  const authorId = echo.user_id ?? '';
  const canMessage = !!authorId;

  const commentsCount = useMemo(() => {
    const n = typeof echo.comments_count === 'number' ? echo.comments_count : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [echo.comments_count]);

  const onSendMirror = () => {
    const msg = mirrorText.trim();
    if (!msg) return;
    props.onMirror(echo.id, authorId, msg);
    setMirrorText('');
    setMirrorOpen(false);
  };

  const media = useMemo(() => normalizeMedia(props.media), [props.media]);
  const previewPhotos = useMemo(() => media.slice(0, 3), [media]);
  const extraCount = Math.max(0, media.length - 3);

  // PHASE 3bis — mode posting optionnel, sans casser les anciens callers
  const currentUserId = props.currentUserId ?? null;
  const canPost = typeof props.canPost === 'boolean' ? props.canPost : !!currentUserId;

  return (
    <>
      <article className="rounded-3xl border border-slate-200 bg-white/70 p-5 shadow-lg shadow-black/5 backdrop-blur-md">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-slate-500">{props.dateLabel}</div>
            <div className="mt-1 truncate text-base font-bold text-slate-900">
              {echo.title?.trim() ? echo.title : 'Écho'}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
              {echo.country ? (
                <span className="rounded-full border border-slate-200 bg-white px-2 py-1">{echo.country}</span>
              ) : null}
              {echo.city ? (
                <span className="rounded-full border border-slate-200 bg-white px-2 py-1">{echo.city}</span>
              ) : null}
              {echo.is_anonymous ? (
                <span className="rounded-full border border-slate-200 bg-white px-2 py-1">anonyme</span>
              ) : null}
              {echo.visibility ? (
                <span className="rounded-full border border-slate-200 bg-white px-2 py-1">{echo.visibility}</span>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            onClick={() => props.onToggleExpand(echo.id)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50"
          >
            {props.expanded ? 'Réduire' : 'Lire'}
          </button>
        </header>

        <div className="mt-4">
          {props.expanded ? (
            <EchoPreview content={echo.content} emotion={emo} photos={media} />
          ) : (
            <>
              <div className="line-clamp-4 whitespace-pre-wrap text-sm text-slate-800">{echo.content}</div>

              {previewPhotos.length > 0 ? (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {previewPhotos.map((src, idx) => (
                    <button
                      key={`${echo.id}:p:${idx}`}
                      type="button"
                      onClick={() => props.onToggleExpand(echo.id)}
                      className="group relative aspect-4/3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"
                      title="Ouvrir l’écho"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        loading="lazy"
                      />
                      {idx === 2 && extraCount > 0 ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-sm font-bold text-white">
                          +{extraCount}
                        </div>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => props.onLike(echo.id)}
              disabled={props.busyLike}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Heart className={`h-4 w-4 ${props.liked ? 'fill-rose-500 text-rose-500' : ''}`} />
              {props.likeCount ? props.likeCount : ''}
            </button>

            <button
              type="button"
              onClick={() => setCommentsOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
              title="Voir et ajouter des commentaires"
            >
              <MessageCircle className="h-4 w-4" />
              Commentaires
              {commentsCount > 0 ? (
                <span
                  key={commentsCount}
                  className="ml-1 rounded-full bg-slate-900 px-2 py-0.5 text-xs text-white animate-pulse-once"
                >
                  {commentsCount}
                </span>
              ) : null}
            </button>

            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            >
              <Share2 className="h-4 w-4" />
              {props.copied ? 'Copié' : 'Partager'}
            </button>

            <button
              type="button"
              onClick={() => props.onOpenEcho(echo.id)}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-lg"
            >
              Ouvrir
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMirrorOpen((v) => !v)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            >
              <Sparkles className="h-4 w-4" />
              Mirror
            </button>

            <button
              type="button"
              onClick={() => (canMessage ? props.onMessage(authorId) : null)}
              disabled={!canMessage}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <MessageCircle className="h-4 w-4" />
              Message
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {REACTIONS.map((r) => {
            const active = getActive(props.resByMe, r.type);
            const count = getCount(props.resCounts, r.type);

            const keyNew = `${echo.id}:${r.type}`;
            const keyLegacy = `${echo.id}:${NEW_TO_LEGACY[r.type]}`;
            const busy = props.busyResKey === keyNew || props.busyResKey === keyLegacy;

            return (
              <button
                key={r.type}
                type="button"
                onClick={() => props.onResonance(echo.id, NEW_TO_LEGACY[r.type])}
                disabled={busy}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                  active
                    ? 'border-slate-900 bg-slate-900 text-white shadow-lg'
                    : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-50'
                } ${busy ? 'cursor-not-allowed opacity-60' : ''}`}
                title={r.label}
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

        {mirrorOpen ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-sm font-semibold text-slate-900">Envoyer un mirror</div>
            <div className="mt-1 text-xs text-slate-600">Une réponse humaine, courte, bienveillante.</div>

            <textarea
              value={mirrorText}
              onChange={(e) => setMirrorText(e.target.value)}
              rows={3}
              maxLength={800}
              className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-300"
              placeholder="Ex: Je te lis. Je te comprends. Merci de l’avoir partagé…"
            />

            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-500">{mirrorText.length}/800</div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMirrorOpen(false);
                    setMirrorText('');
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={onSendMirror}
                  disabled={!mirrorText.trim() || !authorId}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Send className="h-4 w-4" />
                  Envoyer
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </article>

      {shareOpen ? <ShareModal echoId={echo.id} onClose={() => setShareOpen(false)} /> : null}

      {commentsOpen ? (
        <CommentsModal
          open={commentsOpen}
          echoId={echo.id}
          userId={currentUserId}
          canPost={canPost}
          initialCount={commentsCount}
          onCommentInserted={props.onCommentInserted}
          onClose={() => setCommentsOpen(false)}
        />
      ) : null}
    </>
  );
}
