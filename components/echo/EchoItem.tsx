/**
 * =============================================================================
 * Fichier      : components/echo/EchoItem.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.1.1 (2026-01-24)
 * Objet        : EchoItem UI (affichage + réactions + mirror + DM) — SAFE
 * -----------------------------------------------------------------------------
 * PHASE 1 — Unifier le “contrat Echo” (types + mapping)
 * - [FIX] Supprime la dépendance type à EchoFeed (évite couplage / régressions de types)
 * - [KEEP] Contrat props identique (EchoFeed n’a rien à changer côté props)
 * - [SAFE] Media: sécurise le calcul preview + badge +N sans supposer longueur brute
 * =============================================================================
 */

'use client';

import { useMemo, useState } from 'react';
import { Heart, MessageCircle, Share2, Sparkles, Send } from 'lucide-react';

import type { ResonanceType } from '@/lib/echo/actions';
import { REACTIONS, type ReactionType } from '@/lib/echo/reactions';

import EchoPreview from '@/lib/echo/EchoPreview';
import ShareModal from '@/components/echo/ShareModal';

type AnyReactionType = ReactionType | ResonanceType;

type ResCounts = Record<AnyReactionType, number>;
type ResByMe = Record<AnyReactionType, boolean>;

/**
 * PHASE 1 — Contrat echo local (aligné EchoFeed.EchoRow)
 * - image_urls existe côté DB, mais peut ne pas être sélectionné selon les queries (=> optionnel).
 * - On ne déduit rien ici : EchoFeed choisit déjà media final via image_urls ou fallback echo_media.
 */
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

  // Phase 1 (optionnel selon query, mais stable si présent)
  image_urls?: string[] | null;

  // Viewer meta optionnelle (Phase 3+)
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

  // Media final choisi en amont (EchoFeed)
  media: string[];

  // Compat: ces props viennent du “système resonance” actuel.
  // On garde le contrat, mais on affiche les 3 réactions officielles (REACTIONS) et on map vers les clés legacy.
  resCounts: ResCounts;
  resByMe: ResByMe;
  onResonance: (echoId: string, type: AnyReactionType) => void;

  onMirror: (echoId: string, toUserId: string, message: string) => void;
  onMessage: (toUserId: string) => void;

  onOpenEcho: (id: string) => void;

  // Gardé pour compat (ancien bouton “Partager” pouvait déclencher un copy).
  // Désormais, ShareModal gère le partage ; EchoFeed pourra être ajusté ensuite.
  onShare: (id: string) => void;

  copied: boolean;
  busyLike: boolean;
  busyResKey: string | null;
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

/**
 * Mapping “nouvelles réactions” -> “anciennes resonances”
 * (pour conserver le contrat EchoFeed actuel sans casser TypeScript / runtime)
 */
const NEW_TO_LEGACY: Record<ReactionType, ResonanceType> = {
  understand: 'i_feel_you',
  support: 'i_support_you',
  reflect: 'i_reflect_with_you',
};

function getCount(counts: ResCounts, t: ReactionType): number {
  const legacy = NEW_TO_LEGACY[t];
  return (counts[t] ?? counts[legacy] ?? 0) as number;
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

  const emo = useMemo(() => emotionLabel(echo.emotion), [echo.emotion]);

  const authorId = echo.user_id ?? '';
  const canMessage = !!authorId;

  const onSendMirror = () => {
    const msg = mirrorText.trim();
    if (!msg) return;
    props.onMirror(echo.id, authorId, msg);
    setMirrorText('');
    setMirrorOpen(false);
  };

  const media = useMemo(() => normalizeMedia(props.media), [props.media]);

  const previewPhotos = useMemo(() => {
    return media.slice(0, 3);
  }, [media]);

  const extraCount = Math.max(0, media.length - 3);

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

        {/* Réactions empathiques (officielles) — compat legacy */}
        <div className="mt-3 flex flex-wrap gap-2">
          {REACTIONS.map((r) => {
            const active = getActive(props.resByMe, r.type);
            const count = getCount(props.resCounts, r.type);

            // busyResKey: compat (EchoFeed actuel construit souvent `${echoId}:${type}`)
            // On considère “busy” si key match nouveau OU legacy.
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
    </>
  );
}
