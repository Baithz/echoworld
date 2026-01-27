/**
 * =============================================================================
 * Fichier      : components/profile/ProfileAvatar.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-27)
 * Objet        : Avatar UI (image / symbol / couleur / constellation) + fallback déterministe (seed) (SAFE)
 * -----------------------------------------------------------------------------
 * Description  :
 * - UI-only : aucun appel Supabase / aucune mutation BDD
 * - Rend un avatar cohérent selon :
 *   - avatar_type: image | symbol | color | constellation
 *   - avatar_url / avatar_seed
 * - Fallback déterministe :
 *   - seed = avatar_seed || profile.id || handle || display_name
 * - SAFE :
 *   - fail-soft si champs manquants
 *   - aucune dépendance externe
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.0.0 (2026-01-27)
 * - [NEW] Composant unifié d’avatar + rendu constellation deterministe
 * - [KEEP] Support image existant (avatar_url) sans régression
 * =============================================================================
 */

'use client';

import { useMemo } from 'react';
import { User } from 'lucide-react';

export type AvatarType = 'image' | 'symbol' | 'color' | 'constellation';

type Props = {
  // identité
  id?: string | null;
  handle?: string | null;
  displayName?: string | null;

  // source avatar
  avatarType?: AvatarType | null;
  avatarUrl?: string | null;
  avatarSeed?: string | null;

  // rendu
  size?: number; // px
  className?: string;
  borderClassName?: string;
  alt?: string;
};

function safeSeed(input: unknown): string {
  const s = typeof input === 'string' ? input.trim() : '';
  return s || 'seed';
}

// hash simple & déterministe (FNV-1a-ish)
function hash32(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    // h *= 16777619 (mod 2^32)
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5) >>> 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function initials(name: string): string {
  const parts = (name ?? '')
    .trim()
    .split(/\s+/g)
    .filter(Boolean);
  const a = parts[0]?.[0] ?? 'U';
  const b = parts[1]?.[0] ?? '';
  return (a + b).toUpperCase();
}

function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}

function hsl(h: number, s: number, l: number): string {
  const hh = ((h % 360) + 360) % 360;
  return `hsl(${hh} ${clamp(s, 0, 100)}% ${clamp(l, 0, 100)}%)`;
}

function seedToGradient(seed: string): { bg: string; ring: string } {
  const base = hash32(seed) % 360;
  const a = hsl(base, 70, 55);
  const b = hsl(base + 35, 75, 52);
  const c = hsl(base + 70, 80, 58);
  return {
    bg: `linear-gradient(135deg, ${a}, ${b}, ${c})`,
    ring: hsl(base + 15, 65, 45),
  };
}

function parseSeedSymbol(seed: string): string | null {
  const s = seed.trim();
  if (!s) return null;
  // si l’utilisateur a mis un emoji en seed, on le prend
  // (fail-soft : on n’essaie pas de valider strictement unicode)
  if (s.length <= 6) return s;
  // support format "symbol:✨"
  if (s.toLowerCase().startsWith('symbol:')) {
    const v = s.slice('symbol:'.length).trim();
    return v ? v.slice(0, 8) : null;
  }
  return null;
}

function parseSeedColor(seed: string): string | null {
  const s = seed.trim().toLowerCase();
  // support "color:#aabbcc"
  if (s.startsWith('color:')) {
    const v = s.slice('color:'.length).trim();
    if (/^#([0-9a-f]{6}|[0-9a-f]{3})$/.test(v)) return v;
  }
  // support direct "#aabbcc"
  if (/^#([0-9a-f]{6}|[0-9a-f]{3})$/.test(s)) return s;
  return null;
}

function Constellation({ seed, size }: { seed: string; size: number }) {
  const points = useMemo(() => {
    const r = mulberry32(hash32(seed));
    const count = 9 + Math.floor(r() * 10); // 9–18
    const arr: Array<{ x: number; y: number; s: number; o: number }> = [];

    for (let i = 0; i < count; i += 1) {
      arr.push({
        x: r(),
        y: r(),
        s: 0.9 + r() * 1.6,
        o: 0.35 + r() * 0.55,
      });
    }

    // quelques liens (segments) entre points proches (visuel doux)
    const links: Array<{ a: number; b: number; o: number }> = [];
    const maxLinks = Math.min(10, Math.floor(count / 2) + 2);
    for (let i = 0; i < maxLinks; i += 1) {
      const a = Math.floor(r() * count);
      const b = Math.floor(r() * count);
      if (a === b) continue;
      links.push({ a, b, o: 0.10 + r() * 0.18 });
    }

    return { arr, links };
  }, [seed]);

  const pad = 6;
  const w = size;
  const h = size;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${w} ${h}`}
      className="block"
      aria-hidden
      focusable="false"
    >
      <defs>
        <radialGradient id="glow" cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="white" stopOpacity="0.45" />
          <stop offset="70%" stopColor="white" stopOpacity="0.08" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect x="0" y="0" width={w} height={h} fill="url(#glow)" opacity="0.9" />

      {points.links.map((lk, idx) => {
        const a = points.arr[lk.a];
        const b = points.arr[lk.b];
        if (!a || !b) return null;

        const x1 = pad + a.x * (w - pad * 2);
        const y1 = pad + a.y * (h - pad * 2);
        const x2 = pad + b.x * (w - pad * 2);
        const y2 = pad + b.y * (h - pad * 2);

        return (
          <line
            key={idx}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="white"
            strokeOpacity={lk.o}
            strokeWidth="1"
          />
        );
      })}

      {points.arr.map((p, idx) => {
        const cx = pad + p.x * (w - pad * 2);
        const cy = pad + p.y * (h - pad * 2);
        return (
          <circle key={idx} cx={cx} cy={cy} r={p.s} fill="white" fillOpacity={p.o} />
        );
      })}
    </svg>
  );
}

export default function ProfileAvatar({
  id = null,
  handle = null,
  displayName = null,
  avatarType = null,
  avatarUrl = null,
  avatarSeed = null,
  size = 128,
  className = '',
  borderClassName = 'border-4 border-white',
  alt,
}: Props) {
  const label = displayName ?? handle ?? 'User';
  const seed = safeSeed(avatarSeed || id || handle || displayName || label);
  const type: AvatarType = (avatarType as AvatarType) || (avatarUrl ? 'image' : 'constellation');

  const gradient = useMemo(() => seedToGradient(seed), [seed]);
  const bgStyle = useMemo(() => ({ backgroundImage: gradient.bg }), [gradient.bg]);

  const colorOverride = useMemo(() => parseSeedColor(seed), [seed]);
  const symbol = useMemo(() => parseSeedSymbol(seed), [seed]);

  const fallbackText = useMemo(() => initials(label), [label]);

  const inner = (() => {
    if (type === 'image' && avatarUrl) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={avatarUrl} alt={alt || `Avatar de ${label}`} className="h-full w-full object-cover" />;
    }

    if (type === 'symbol') {
      const s = symbol || '✨';
      return <span className="text-[0.95em] leading-none">{s}</span>;
    }

    if (type === 'color') {
      return (
        <div className="flex h-full w-full items-center justify-center">
          <span className="text-[0.90em] leading-none">{fallbackText}</span>
        </div>
      );
    }

    // constellation (default)
    return (
      <div className="relative h-full w-full">
        <div className="absolute inset-0">{/* fond déjà géré via bg */}</div>
        <div className="absolute inset-0 flex items-center justify-center opacity-95">
          <Constellation seed={seed} size={Math.max(24, Math.floor(size * 0.92))} />
        </div>
      </div>
    );
  })();

  const baseBg =
    type === 'color' && colorOverride
      ? { backgroundColor: colorOverride }
      : bgStyle;

  return (
    <div
      className={[
        'inline-flex items-center justify-center overflow-hidden rounded-3xl shadow-xl select-none',
        borderClassName,
        className,
      ].join(' ')}
      style={{ width: size, height: size, ...baseBg }}
      aria-label={alt || `Avatar de ${label}`}
      title={handle ? `@${handle}` : label}
    >
      <div className="flex h-full w-full items-center justify-center text-white">
        {type === 'image' && avatarUrl ? (
          inner
        ) : (
          <div className="relative flex h-full w-full items-center justify-center">
            {/* voile doux pour lisibilité */}
            <div className="absolute inset-0 bg-black/10" />
            <div className="relative flex h-full w-full items-center justify-center">
              {inner}
            </div>
          </div>
        )}
      </div>

      {/* fail-soft : si jamais rien */}
      {!inner && (
        <div className="flex h-full w-full items-center justify-center bg-slate-200 text-slate-700">
          <User className="h-6 w-6" />
        </div>
      )}
    </div>
  );
}
