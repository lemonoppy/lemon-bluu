import { useState } from 'react';

import { ChevronDownIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import Image from 'next/image';

import CardArtPopover from '@/components/set-cube/cube/CardArtPopover';
import { getCardColors, getCardSmallImageUri } from '@/lib/set-cube/scryfall';
import type { ScryfallCard } from '@/lib/set-cube/types';

const COLOR_FILTERS = [
  {
    key: 'all',
    label: 'All',
    active: 'bg-primary border-primary text-primary-foreground',
    inactive:
      'bg-background border-border text-muted-foreground hover:bg-muted',
  },
  {
    key: 'W',
    label: 'W',
    active: 'bg-slate-100 border-slate-300 text-slate-700',
    inactive:
      'bg-background border-border text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800/30',
  },
  {
    key: 'U',
    label: 'U',
    active: 'bg-blue-600 border-blue-700 text-white',
    inactive:
      'bg-background border-border text-muted-foreground hover:bg-blue-50 dark:hover:bg-blue-950/30',
  },
  {
    key: 'B',
    label: 'B',
    active: 'bg-slate-800 border-slate-700 text-white',
    inactive:
      'bg-background border-border text-muted-foreground hover:bg-muted',
  },
  {
    key: 'R',
    label: 'R',
    active: 'bg-red-600 border-red-700 text-white',
    inactive:
      'bg-background border-border text-muted-foreground hover:bg-red-50 dark:hover:bg-red-950/30',
  },
  {
    key: 'G',
    label: 'G',
    active: 'bg-emerald-600 border-emerald-700 text-white',
    inactive:
      'bg-background border-border text-muted-foreground hover:bg-emerald-50 dark:hover:bg-emerald-950/30',
  },
  {
    key: 'M',
    label: 'M',
    active:
      'bg-gradient-to-br from-yellow-300 to-yellow-500 border-yellow-400 text-yellow-900',
    inactive:
      'bg-background border-border text-muted-foreground hover:bg-yellow-50 dark:hover:bg-yellow-950/30',
  },
  {
    key: 'C',
    label: 'C',
    active: 'bg-slate-400 border-slate-500 text-white',
    inactive:
      'bg-background border-border text-muted-foreground hover:bg-muted',
  },
];

const RARITY_FILTERS = [
  {
    key: 'common',
    label: 'C',
    title: 'Common',
    active: 'bg-slate-500 border-slate-600 text-white',
    inactive: 'bg-background border-border text-muted-foreground hover:bg-muted',
  },
  {
    key: 'uncommon',
    label: 'U',
    title: 'Uncommon',
    active: 'bg-sky-500 border-sky-600 text-white',
    inactive: 'bg-background border-border text-muted-foreground hover:bg-sky-50 dark:hover:bg-sky-950/30',
  },
  {
    key: 'rare',
    label: 'R',
    title: 'Rare',
    active: 'bg-amber-500 border-amber-600 text-white',
    inactive: 'bg-background border-border text-muted-foreground hover:bg-amber-50 dark:hover:bg-amber-950/30',
  },
  {
    key: 'mythic',
    label: 'M',
    title: 'Mythic',
    active: 'bg-orange-500 border-orange-600 text-white',
    inactive: 'bg-background border-border text-muted-foreground hover:bg-orange-50 dark:hover:bg-orange-950/30',
  },
];

const CMC_VALS = [0, 1, 2, 3, 4, 5, 6];

type Section = 'creature' | 'spell';
type Override = { cmc: number; section: Section };

function effectiveCmc(
  card: ScryfallCard,
  ov: Record<string, Override>,
): number {
  return ov[card.id]?.cmc ?? Math.min(Math.floor(card.cmc), 6);
}
function effectiveSection(
  card: ScryfallCard,
  ov: Record<string, Override>,
): Section {
  return (
    ov[card.id]?.section ??
    (card.type_line.includes('Creature') ? 'creature' : 'spell')
  );
}

const zoneId = (cmc: number, s: Section) => `${cmc}-${s}`;

interface Props {
  cards: ScryfallCard[];
  setName?: string;
  archiveIds?: Set<string>;
}

export default function ManaCurveGallery({
  cards,
  setName,
  archiveIds,
}: Props) {
  const [open, setOpen] = useState(false);
  const [color, setColor] = useState('all');
  const [strictColor, setStrictColor] = useState(false);
  const [rarityFilter, setRarityFilter] = useState<Set<string>>(new Set());

  function toggleRarity(r: string) {
    setRarityFilter((prev) => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r);
      else next.add(r);
      return next;
    });
  }
  const [archiveMode, setArchiveMode] = useState<'all' | 'hide' | 'only'>('all');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overZone, setOverZone] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [orderMap, setOrderMap] = useState<Record<string, string[]>>({});
  const [overCardId, setOverCardId] = useState<string | null>(null);
  const [overCardBefore, setOverCardBefore] = useState(true);

  const filtered = cards.filter((card) => {
    if (card.type_line.includes('Basic Land')) return false;
    if (archiveMode === 'hide' && archiveIds?.has(card.id)) return false;
    if (archiveMode === 'only' && !archiveIds?.has(card.id)) return false;
    if (rarityFilter.size > 0 && !rarityFilter.has(card.rarity)) return false;
    if (color === 'all') return true;
    const colors = getCardColors(card);
    if (color === 'C') return colors.length === 0;
    if (color === 'M') return colors.length > 1;
    if (strictColor) return colors.length === 1 && colors.includes(color);
    return colors.includes(color);
  });

  const grid: Record<
    number,
    Record<Section, ScryfallCard[]>
  > = Object.fromEntries(
    CMC_VALS.map((cmc) => [cmc, { creature: [], spell: [] }]),
  );
  for (const card of filtered) {
    grid[effectiveCmc(card, overrides)][effectiveSection(card, overrides)].push(
      card,
    );
  }

  for (const cmc of CMC_VALS) {
    for (const section of ['creature', 'spell'] as Section[]) {
      const key = zoneId(cmc, section);
      const order = orderMap[key];
      if (order && order.length > 0) {
        const zoneCards = grid[cmc][section];
        const cardMap = new Map(zoneCards.map((c) => [c.id, c]));
        const ordered = order
          .filter((id) => cardMap.has(id))
          .map((id) => cardMap.get(id)!);
        const rest = zoneCards.filter((c) => !order.includes(c.id));
        grid[cmc][section] = [...ordered, ...rest];
      }
    }
  }

  function drop(
    cmc: number,
    section: Section,
    targetId: string | null,
    before: boolean,
  ) {
    if (!draggingId) return;

    const targetKey = zoneId(cmc, section);
    const draggedCard = cards.find((c) => c.id === draggingId);
    if (!draggedCard) {
      setDraggingId(null);
      setOverZone(null);
      setOverCardId(null);
      return;
    }

    const sourceCmc = effectiveCmc(draggedCard, overrides);
    const sourceSection = effectiveSection(draggedCard, overrides);
    const sourceKey = zoneId(sourceCmc, sourceSection);

    const sourceIds = grid[sourceCmc][sourceSection].map((c) => c.id);
    const targetIds = grid[cmc][section].map((c) => c.id);

    const newSourceIds = sourceIds.filter((id) => id !== draggingId);
    const base =
      sourceKey === targetKey
        ? newSourceIds
        : targetIds.filter((id) => id !== draggingId);

    const effectiveTarget = targetId === draggingId ? null : targetId;

    let newTargetIds: string[];
    if (effectiveTarget) {
      const idx = base.indexOf(effectiveTarget);
      const at = idx !== -1 ? (before ? idx : idx + 1) : base.length;
      newTargetIds = [...base.slice(0, at), draggingId, ...base.slice(at)];
    } else {
      newTargetIds = [...base, draggingId];
    }

    setOrderMap((prev) => {
      const m = { ...prev };
      if (sourceKey !== targetKey) m[sourceKey] = newSourceIds;
      m[targetKey] = newTargetIds;
      return m;
    });
    setOverrides((p) => ({ ...p, [draggingId]: { cmc, section } }));
    setDraggingId(null);
    setOverZone(null);
    setOverCardId(null);
  }

  const dragHandlers = (cmc: number, s: Section) => ({
    draggingId,
    isOver: overZone === zoneId(cmc, s),
    onDragStart: setDraggingId,
    onDragEnd: () => {
      setDraggingId(null);
      setOverZone(null);
      setOverCardId(null);
    },
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      setOverZone(zoneId(cmc, s));
      setOverCardId(null);
    },
    onDragLeave: (e: React.DragEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        setOverZone(null);
        setOverCardId(null);
      }
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      drop(cmc, s, overCardId, overCardBefore);
    },
    hoveredId,
    onHover: setHoveredId,
    overCardId,
    overCardBefore,
    onCardDragOver: (cardId: string, before: boolean) => {
      setOverZone(zoneId(cmc, s));
      setOverCardId(cardId);
      setOverCardBefore(before);
    },
  });

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm isolate">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Card Gallery by Mana Value
            {setName && (
              <span className="ml-2 font-normal text-muted-foreground">
                — {setName}
              </span>
            )}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {filtered.length} cards · hover to identify · drag to reorganise
          </p>
        </div>
        <ChevronDownIcon
          className={clsx(
            'w-4 h-4 text-muted-foreground shrink-0 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-border">
          <div className="flex items-center justify-between gap-3 flex-wrap pt-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                {COLOR_FILTERS.map(({ key, label, active, inactive }) => (
                  <button
                    key={key}
                    onClick={() => setColor(key)}
                    title={
                      key === 'all'
                        ? 'All colours'
                        : key === 'M'
                          ? 'Multicolour'
                          : key
                    }
                    className={clsx(
                      'w-8 h-8 rounded-full text-xs font-bold border-2 transition-all shadow-sm',
                      color === key ? active : inactive,
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="w-px h-5 bg-border self-center" />
              <div className="flex items-center gap-1.5 flex-wrap">
                {RARITY_FILTERS.map(({ key, label, title, active, inactive }) => (
                  <button
                    key={key}
                    onClick={() => toggleRarity(key)}
                    title={title}
                    className={clsx(
                      'w-8 h-8 rounded-lg text-xs font-bold border-2 transition-all shadow-sm',
                      rarityFilter.has(key) ? active : inactive,
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {!['all', 'M', 'C'].includes(color) && (
                <button
                  onClick={() => setStrictColor((v) => !v)}
                  className={clsx(
                    'text-xs font-medium px-3 py-1 rounded-full border-2 transition-all shadow-sm',
                    strictColor
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted',
                  )}
                >
                  Strict Colour
                </button>
              )}
              {archiveIds && archiveIds.size > 0 && (
                <button
                  onClick={() =>
                    setArchiveMode((prev) =>
                      prev === 'all' ? 'hide' : prev === 'hide' ? 'only' : 'all',
                    )
                  }
                  className={clsx(
                    'text-xs font-medium px-3 py-1 rounded-full border-2 transition-all shadow-sm',
                    archiveMode !== 'all'
                      ? 'border-violet-500 bg-violet-500/15 text-violet-500'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted',
                  )}
                >
                  {archiveMode === 'hide'
                    ? 'Hide 🌟'
                    : archiveMode === 'only'
                      ? 'Only 🌟'
                      : 'Mystical Archive'}
                </button>
              )}
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-10">
              No cards match this colour filter.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <div
                className="grid gap-x-3"
                style={{ gridTemplateColumns: 'repeat(7, minmax(72px, 1fr))' }}
              >
                {CMC_VALS.map((cmc) => (
                  <div
                    key={`h${cmc}`}
                    className="text-center border-b border-border pb-1 mb-1"
                  >
                    <span className="text-xs font-bold text-foreground">
                      MV {cmc === 6 ? '6+' : cmc}
                    </span>{' '}
                    <span className="text-[10px] text-muted-foreground ml-1">
                      {grid[cmc].creature.length + grid[cmc].spell.length}
                    </span>
                  </div>
                ))}

                <div
                  style={{ gridColumn: '1 / -1' }}
                  className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1"
                >
                  Creatures
                </div>

                {CMC_VALS.map((cmc) => (
                  <DropZone
                    key={`c${cmc}`}
                    cards={grid[cmc].creature}
                    {...dragHandlers(cmc, 'creature')}
                  />
                ))}

                <div
                  style={{ gridColumn: '1 / -1' }}
                  className="border-t border-border my-2"
                />

                <div
                  style={{ gridColumn: '1 / -1' }}
                  className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1"
                >
                  Spells
                </div>

                {CMC_VALS.map((cmc) => (
                  <DropZone
                    key={`s${cmc}`}
                    cards={grid[cmc].spell}
                    {...dragHandlers(cmc, 'spell')}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface DropZoneProps {
  cards: ScryfallCard[];
  isOver: boolean;
  draggingId: string | null;
  hoveredId: string | null;
  overCardId: string | null;
  overCardBefore: boolean;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onHover: (id: string | null) => void;
  onCardDragOver: (cardId: string, before: boolean) => void;
}

function DropZone({
  cards,
  isOver,
  draggingId,
  hoveredId,
  overCardId,
  overCardBefore,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onHover,
  onCardDragOver,
}: DropZoneProps) {
  return (
    <div
      className={clsx(
        'rounded-lg transition-colors',
        isOver && 'bg-accent/10 ring-2 ring-accent/50',
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {cards.length === 0 ? (
        <div
          className={clsx(
            'min-h-[40px] rounded border-2 border-dashed flex items-center justify-center',
            isOver ? 'border-accent/60' : 'border-border',
          )}
        >
          {isOver && (
            <span className="text-[9px] text-accent font-medium">
              drop here
            </span>
          )}
        </div>
      ) : (
        <div className="flex flex-col">
          {cards.map((card, i) => {
            const imgSrc = getCardSmallImageUri(card);
            const isDragging = draggingId === card.id;
            const isHovered = hoveredId === card.id;
            const isTarget =
              overCardId === card.id && overCardId !== draggingId;

            return (
              <div
                key={card.id}
                draggable
                className={i > 0 ? 'mt-[-123%] md:mt-[-121.56%]' : undefined}
                style={{
                  position: 'relative',
                  zIndex: isHovered ? 100 : i + 1,
                  transform: isHovered ? 'translateY(-10px)' : 'none',
                  transition: 'transform 100ms ease',
                  opacity: isDragging ? 0.35 : 1,
                }}
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move';
                  onDragStart(card.id);
                }}
                onDragEnd={onDragEnd}
                onDragOver={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  const rect = e.currentTarget.getBoundingClientRect();
                  const before = e.clientY < rect.top + rect.height / 2;
                  onCardDragOver(card.id, before);
                }}
                onMouseEnter={() => onHover(card.id)}
                onMouseLeave={() => onHover(null)}
              >
                {isTarget && overCardBefore && (
                  <div className="absolute top-0 inset-x-0 h-0.5 bg-accent z-[300] rounded-full pointer-events-none" />
                )}

                <CardArtPopover card={card} wrapperClassName="block w-full">
                  <div
                    className="relative w-full"
                    style={{ aspectRatio: '146 / 204' }}
                  >
                    {imgSrc ? (
                      <Image
                        src={imgSrc}
                        alt={card.name}
                        fill
                        draggable={false}
                        className={clsx(
                          'rounded-md object-cover select-none cursor-grab active:cursor-grabbing',
                          isHovered
                            ? 'ring-2 ring-accent shadow-xl'
                            : 'shadow-sm',
                          isTarget ? 'ring-2 ring-accent' : '',
                        )}
                        unoptimized
                      />
                    ) : (
                      <div
                        className={clsx(
                          'absolute inset-0 rounded-md bg-muted border flex items-center justify-center cursor-grab',
                          isHovered || isTarget
                            ? 'border-accent'
                            : 'border-border',
                        )}
                      >
                        <span className="text-[8px] text-muted-foreground text-center px-0.5 leading-tight">
                          {card.name}
                        </span>
                      </div>
                    )}
                  </div>
                </CardArtPopover>

                {isTarget && !overCardBefore && (
                  <div className="absolute bottom-0 inset-x-0 h-0.5 bg-accent z-[300] rounded-full pointer-events-none" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
