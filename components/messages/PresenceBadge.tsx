/**
 * =============================================================================
 * Fichier      : components/messages/PresenceBadge.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-25)
 * Objet        : Badge présence En ligne / Hors ligne
 * -----------------------------------------------------------------------------
 * Description  :
 * - Point vert animé (En ligne)
 * - Point gris (Hors ligne)
 * - Tooltip avec dernier vu
 * - Variant small/medium/large
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.0.0 (2026-01-25)
 * - [NEW] Badge vert/gris avec animation
 * - [NEW] Tooltip dernier vu
 * - [NEW] Variants taille
 * =============================================================================
 */

'use client';

type Props = {
  online: boolean;
  lastSeen?: string;
  size?: 'small' | 'medium' | 'large';
  showTooltip?: boolean;
};

export default function PresenceBadge({ online, lastSeen, size = 'medium', showTooltip = true }: Props) {
  const sizeClasses = {
    small: 'h-2 w-2',
    medium: 'h-2.5 w-2.5',
    large: 'h-3 w-3',
  };

  const dotSize = sizeClasses[size];
  const label = online ? 'En ligne' : lastSeen ? formatLastSeen(lastSeen) : 'Hors ligne';

  return (
    <div className="relative inline-flex" title={showTooltip ? label : undefined}>
      <span
        className={`${dotSize} rounded-full ${
          online
            ? 'bg-green-500 shadow-[0_0_0_2px_rgba(34,197,94,0.2)] animate-pulse'
            : 'bg-slate-400'
        }`}
      />
    </div>
  );
}

function formatLastSeen(lastSeen: string): string {
  const now = Date.now();
  const then = new Date(lastSeen).getTime();
  const diffMs = now - then;

  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (minutes < 1) return 'En ligne';
  if (minutes < 60) return `Vu il y a ${minutes} min`;
  if (hours < 24) return `Vu il y a ${hours}h`;
  if (days < 7) return `Vu il y a ${days}j`;
  return `Vu le ${new Date(lastSeen).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
}