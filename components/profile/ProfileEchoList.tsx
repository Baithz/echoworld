// =============================================================================
// Fichier      : components/profile/ProfileEchoList.tsx
// Auteur       : Régis KREMER (Baithz) — EchoWorld
// Version      : 1.0.0 (2026-01-23)
// Objet        : Liste UI des échos d'un profil (public) - premium
// =============================================================================

'use client';

import type { PublicEcho } from '@/lib/profile/getProfile';

type Props = {
  echoes: PublicEcho[];
};

function safePreview(text: string, max = 180): string {
  const clean = (text ?? '').trim().replace(/\s+/g, ' ');
  if (!clean) return '…';
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: '2-digit' });
}

export default function ProfileEchoList({ echoes }: Props) {
  if (!echoes || echoes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-600">
        Aucun écho public pour le moment.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {echoes.map((e) => (
        <a
          key={e.id}
          href={`/echo/${e.id}`}
          className="block rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-slate-900">{e.title ?? 'Écho'}</div>
              <div className="mt-1 text-xs text-slate-500">
                {formatDate(e.created_at) || '—'}
                {e.city || e.country ? (
                  <span className="text-slate-400"> • </span>
                ) : null}
                {e.city ? e.city : null}
                {e.city && e.country ? ', ' : null}
                {e.country ? e.country : null}
              </div>
            </div>

            <div className="shrink-0 rounded-xl border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700">
              {e.visibility}
            </div>
          </div>

          <div className="mt-3 text-sm leading-relaxed text-slate-700">
            {safePreview(e.content, 200)}
          </div>

          {(e.theme_tags?.length ?? 0) > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {e.theme_tags.slice(0, 4).map((t) => (
                <span
                  key={`${e.id}-${t}`}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700"
                >
                  {t}
                </span>
              ))}
            </div>
          ) : null}
        </a>
      ))}
    </div>
  );
}
