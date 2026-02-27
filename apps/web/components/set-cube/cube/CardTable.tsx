import { BookmarkIcon, TrashIcon } from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';

import { getCardColors, getCardManaCost } from '@/lib/set-cube/scryfall';
import type { CubeCard, Rarity, ScryfallCard } from '@/lib/set-cube/types';

const COLOR_ORDER: Record<string, number> = { W: 0, U: 1, B: 2, R: 3, G: 4 };

function colorGroupIndex(card: CubeCard): number {
  if (card.scryfallData.type_line?.includes('Land')) return 7;
  const colors = getCardColors(card.scryfallData);
  if (colors.length === 0) return 6; // colorless
  if (colors.length > 1) return 5; // multicolour
  return COLOR_ORDER[colors[0]] ?? 6;
}

function colorComboKey(card: CubeCard): string {
  const colors = getCardColors(card.scryfallData);
  return [...colors]
    .sort((a, b) => (COLOR_ORDER[a] ?? 9) - (COLOR_ORDER[b] ?? 9))
    .map((c) => COLOR_ORDER[c] ?? 9)
    .join('');
}

function sortCards(cards: CubeCard[], archiveIds: Set<string>): CubeCard[] {
  return [...cards].sort((a, b) => {
    const archiveDiff =
      (archiveIds.has(a.id) ? 1 : 0) - (archiveIds.has(b.id) ? 1 : 0);
    if (archiveDiff !== 0) return archiveDiff;
    const groupDiff = colorGroupIndex(a) - colorGroupIndex(b);
    if (groupDiff !== 0) return groupDiff;
    if (colorGroupIndex(a) === 5) {
      const aColors = getCardColors(a.scryfallData);
      const bColors = getCardColors(b.scryfallData);
      const countDiff = aColors.length - bColors.length;
      if (countDiff !== 0) return countDiff;
      const comboDiff = colorComboKey(a).localeCompare(colorComboKey(b));
      if (comboDiff !== 0) return comboDiff;
    }
    return (a.scryfallData.cmc ?? 0) - (b.scryfallData.cmc ?? 0);
  });
}

import ColorPips from '../shared/ColorPips';
import ManaCost from '../shared/ManaCost';
import RarityBadge from '../shared/RarityBadge';

import CardArtPopover from './CardArtPopover';

interface Props {
  cards: CubeCard[];
  archiveIds: Set<string>;
  readOnly?: boolean;
  onRemove?: (id: string) => void;
  onToggleArchive?: (card: ScryfallCard) => void;
}

export default function CardTable({
  cards,
  archiveIds,
  readOnly = false,
  onRemove,
  onToggleArchive,
}: Props) {
  if (cards.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground bg-card border border-border rounded-xl shadow-sm">
        <p className="text-lg font-medium text-muted-foreground">
          Your cube is empty.
        </p>
        <p className="text-sm mt-1">Search for a card above to get started.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border shadow-sm bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-primary text-primary-foreground text-left">
            <th className="px-4 py-3 font-semibold">Name</th>
            <th className="px-4 py-3 font-semibold">Cost</th>
            <th className="px-4 py-3 font-semibold">Type</th>
            <th className="px-4 py-3 font-semibold">Color</th>
            <th className="px-4 py-3 font-semibold">Rarity</th>
            <th className="px-4 py-3 font-semibold text-center">CMC</th>
            <th
              className="px-4 py-3 font-semibold text-center w-8"
              title="Mystical Archive"
            >
              🌟
            </th>
            {!readOnly && <th className="px-4 py-3 font-semibold w-8"></th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sortCards(cards, archiveIds).map((card) => (
            <CardRow
              key={card.id}
              card={card}
              inArchive={archiveIds.has(card.id)}
              readOnly={readOnly}
              onRemove={onRemove}
              onToggleArchive={onToggleArchive}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CardRow({
  card,
  inArchive,
  readOnly,
  onRemove,
  onToggleArchive,
}: {
  card: CubeCard;
  inArchive: boolean;
  readOnly?: boolean;
  onRemove?: (id: string) => void;
  onToggleArchive?: (card: ScryfallCard) => void;
}) {
  const manaCost = getCardManaCost(card.scryfallData);
  const colors = getCardColors(card.scryfallData);

  return (
    <tr className="hover:bg-muted/40 transition-colors">
      <td className="px-4 py-2">
        <CardArtPopover card={card.scryfallData}>
          <span className="text-foreground hover:text-accent cursor-default font-medium transition-colors">
            {card.name}
          </span>
        </CardArtPopover>
      </td>
      <td className="px-4 py-2">
        <ManaCost cost={manaCost} />
      </td>
      <td className="px-4 py-2 text-muted-foreground text-xs max-w-[200px] truncate">
        {card.scryfallData.type_line}
      </td>
      <td className="px-4 py-2">
        <ColorPips colors={colors} />
      </td>
      <td className="px-4 py-2">
        <RarityBadge rarity={card.scryfallData.rarity as Rarity} />
      </td>
      <td className="px-4 py-2 text-center text-muted-foreground font-mono text-xs">
        {card.scryfallData.cmc}
      </td>
      <td className="px-4 py-2 text-center">
        {readOnly ? (
          inArchive ? (
            <BookmarkSolidIcon className="w-4 h-4 text-violet-500 mx-auto" />
          ) : null
        ) : (
          <button
            onClick={() => onToggleArchive?.(card.scryfallData)}
            title={
              inArchive
                ? 'Remove from Mystical Archive'
                : 'Add to Mystical Archive'
            }
            className={
              inArchive
                ? 'text-violet-500'
                : 'text-muted-foreground/40 hover:text-violet-400 transition-colors'
            }
          >
            {inArchive ? (
              <BookmarkSolidIcon className="w-4 h-4" />
            ) : (
              <BookmarkIcon className="w-4 h-4" />
            )}
          </button>
        )}
      </td>
      {!readOnly && (
        <td className="px-4 py-2">
          <button
            onClick={() => onRemove?.(card.id)}
            className="text-muted-foreground/40 hover:text-red-500 transition-colors"
            aria-label="Remove card"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </td>
      )}
    </tr>
  );
}
