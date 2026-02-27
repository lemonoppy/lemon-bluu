import { XMarkIcon } from '@heroicons/react/24/outline';

import type { CubeCard, ScryfallCard } from '@/lib/set-cube/types';

import CardSearch from '../cube/CardSearch';
import RarityBadge from '../shared/RarityBadge';

interface Props {
  cards: CubeCard[];
  onAdd: (card: ScryfallCard) => void;
  onRemove: (cardId: string) => void;
}

export default function MysticalArchivePanel({ cards, onAdd, onRemove }: Props) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-violet-500">Mystical Archive</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Singleton bonus slot per pack — {cards.length} card{cards.length !== 1 ? 's' : ''}
          </p>
        </div>
        <CardSearch onAdd={onAdd} />
      </div>

      {cards.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
          Search for cards above to build the archive list.
        </p>
      ) : (
        <ul className="divide-y divide-border border border-border rounded-lg overflow-hidden">
          {cards.map((card) => (
            <li
              key={card.id}
              className="flex items-center justify-between gap-2 px-3 py-1.5 hover:bg-muted/40 text-sm"
            >
              <span className="text-foreground flex-1 truncate">{card.name}</span>
              <RarityBadge rarity={card.scryfallData.rarity} />
              <button
                onClick={() => onRemove(card.id)}
                className="text-muted-foreground/40 hover:text-red-500 transition-colors shrink-0"
                title="Remove from archive"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
