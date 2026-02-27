import { PlusCircleIcon } from '@heroicons/react/24/outline';

import { getCardColors, getCardManaCost } from '@/lib/set-cube/scryfall';
import type { Rarity, ScryfallCard } from '@/lib/set-cube/types';

import CardArtPopover from '../cube/CardArtPopover';
import ColorPips from '../shared/ColorPips';
import ManaCost from '../shared/ManaCost';
import RarityBadge from '../shared/RarityBadge';

interface Props {
  card: ScryfallCard;
  alreadyInCube: boolean;
  onAdd: (card: ScryfallCard) => void;
}

export default function SetCardRow({ card, alreadyInCube, onAdd }: Props) {
  const manaCost = getCardManaCost(card);
  const colors = getCardColors(card);

  return (
    <tr className="hover:bg-muted/40 transition-colors">
      <td className="px-4 py-2">
        <CardArtPopover card={card}>
          <a
            href={card.scryfall_uri}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:text-accent font-medium transition-colors"
          >
            {card.name}
          </a>
        </CardArtPopover>
      </td>
      <td className="px-4 py-2">
        <ManaCost cost={manaCost} />
      </td>
      <td className="px-4 py-2 text-muted-foreground text-xs max-w-[180px] truncate">
        {card.type_line}
      </td>
      <td className="px-4 py-2">
        <ColorPips colors={colors} />
      </td>
      <td className="px-4 py-2">
        <RarityBadge rarity={card.rarity as Rarity} />
      </td>
      <td className="px-4 py-2 text-center text-muted-foreground text-xs font-mono">{card.cmc}</td>
      <td className="px-4 py-2">
        <button
          onClick={() => !alreadyInCube && onAdd(card)}
          disabled={alreadyInCube}
          className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-medium transition-colors ${
            alreadyInCube
              ? 'text-muted-foreground/40 cursor-default'
              : 'text-primary hover:bg-primary hover:text-primary-foreground border border-primary'
          }`}
        >
          <PlusCircleIcon className="w-4 h-4" />
          {alreadyInCube ? 'Added' : 'Add'}
        </button>
      </td>
    </tr>
  );
}
