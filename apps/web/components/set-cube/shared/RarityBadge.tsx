import clsx from 'clsx';

import { RARITY_LABELS } from '@/lib/set-cube/constants';
import type { Rarity } from '@/lib/set-cube/types';

const rarityClasses: Record<Rarity, string> = {
  common: 'bg-slate-200 text-slate-700',
  uncommon: 'bg-sky-100 text-sky-800',
  rare: 'bg-amber-100 text-amber-800',
  mythic: 'bg-orange-100 text-orange-800',
};

export default function RarityBadge({ rarity }: { rarity: Rarity }) {
  return (
    <span
      className={clsx(
        'inline-block px-1.5 py-0.5 rounded text-xs font-semibold',
        rarityClasses[rarity]
      )}
    >
      {RARITY_LABELS[rarity]}
    </span>
  );
}
