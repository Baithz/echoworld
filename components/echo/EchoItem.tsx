/**
 * =============================================================================
 * Fichier      : components/echo/EchoItem.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-22)
 * Objet        : EchoItem UI (affichage + réactions + mirror + DM) — SAFE
 * -----------------------------------------------------------------------------
 * Notes
 * - Zéro dépendance à Supabase ici
 * - Contrat props unique, utilisé par EchoFeed (évite régressions “props manquantes”)
 * =============================================================================
 */

'use client';

import { useMemo, useState } from 'react';
import { Heart, MessageCircle, Share2, Sparkles, Send } from 'lucide-react';
import type { EchoRow } from '@/components/echo/EchoFeed';
import type { ResonanceType } from '@/lib/echo/actions';
import EchoPreview from '@/lib/echo/EchoPreview';

type ResCounts = Record<ResonanceType, number>;
type ResByMe = Record<ResonanceType, boolean>;

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
  onResonance: (echoId: string, type: ResonanceType) => void;

  onMirror: (echoId: string, toUserId: string, message: string) => void;
  onMessage: (toUserId: string) => void;

  onOpenEcho: (id: string) => void;
  onShare: (id: string) => void;

  copied: boolean;
  busyLike: boolean;
  busyResKey: string | null;
};

const RESONANCES: { type: ResonanceType; label: string; icon: string }[] = [
  { type: 'i_feel_you', label: 'Je te comprends', icon: '🤝' },
  { type: 'i_support_you', label: 'Je te soutiens', icon: '🫶' },
  { type: 'i_reflect_with_you', label: 'Je réfléchis avec toi', icon: '🪞' },
];

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

export default function EchoItem(props: Props) {
  const { echo } = props;

  const [mirrorOpen, setMirrorOpen] = useState(false);
  const [mirrorText, setMirrorText] = useState('');

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

  return (
    <article className="rounded-3xl border border-slate-200 bg-white/70 p-5 shadow-lg shadow-black/5 backdrop-blur-md">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-slate-500">{props.dateLabel}</div>
          <div className="mt-1 truncate text-base font-bold text-slate-900">
            {echo.title?.trim() ? echo.title : 'Écho'}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
            {echo.country ? <span className="rounded-full border border-slate-200 bg-white px-2 py-1">{echo.country}</span> : null}
            {echo.city ? <span className="rounded-full border border-slate-200 bg-white px-2 py-1">{echo.city}</span> : null}
            {echo.is_anonymous ? <span className="rounded-full border border-slate-200 bg-white px-2 py-1">anonyme</span> : null}
            {echo.visibility ? <span className="rounded-full border border-slate-200 bg-white px-2 py-1">{echo.visibility}</span> : null}
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
          <EchoPreview content={echo.content} emotion={emo} photos={props.media} />
        ) : (
          <div className="line-clamp-4 whitespace-pre-wrap text-sm text-slate-800">{echo.content}</div>
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
            onClick={() => props.onShare(echo.id)}
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
        {RESONANCES.map((r) => {
          const active = !!props.resByMe[r.type];
          const count = props.resCounts[r.type] ?? 0;
          const key = `${echo.id}:${r.type}`;
          const busy = props.busyResKey === key;

          return (
            <button
              key={r.type}
              type="button"
              onClick={() => props.onResonance(echo.id, r.type)}
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
  );
}
