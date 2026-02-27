import { useRef, useState } from 'react';

import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  CloudArrowUpIcon,
} from '@heroicons/react/24/outline';
import Head from 'next/head';

import ManaCurveGallery from '@/components/set-cube/analysis/ManaCurveGallery';
import CardSearch from '@/components/set-cube/cube/CardSearch';
import CardTable from '@/components/set-cube/cube/CardTable';
import CubeStatsBar from '@/components/set-cube/cube/CubeStatsBar';
import { SetCubeNav } from '@/components/set-cube/SetCubeNav';
import { useCube } from '@/lib/set-cube/hooks/use-cube';
import { getCardColors } from '@/lib/set-cube/scryfall';
import { loadSyncMeta, syncCube } from '@/lib/set-cube/sync';
import type { CubeCard, ScryfallCard } from '@/lib/set-cube/types';

const RARITIES = ['common', 'uncommon', 'rare', 'mythic'];

const COLOR_FILTERS = [
  { key: 'W', label: 'W' },
  { key: 'U', label: 'U' },
  { key: 'B', label: 'B' },
  { key: 'R', label: 'R' },
  { key: 'G', label: 'G' },
  { key: 'M', label: 'Multi' },
  { key: 'C', label: 'Colorless' },
  { key: 'L', label: 'Land' },
];

function matchesColor(card: ScryfallCard, filter: string): boolean {
  if (filter === 'L') return card.type_line.includes('Land');
  const colors = getCardColors(card);
  if (filter === 'C')
    return colors.length === 0 && !card.type_line.includes('Land');
  if (filter === 'M') return colors.length > 1;
  return colors.length === 1 && colors.includes(filter);
}

function filterCards(
  cards: CubeCard[],
  rarityFilters: Set<string>,
  colorFilters: Set<string>,
): CubeCard[] {
  return cards.filter((c) => {
    if (rarityFilters.size > 0 && !rarityFilters.has(c.scryfallData.rarity))
      return false;
    return !(
      colorFilters.size > 0 &&
      !Array.from(colorFilters).some((cf) => matchesColor(c.scryfallData, cf))
    );
  });
}

export default function CubePage() {
  const {
    cube,
    isLoaded,
    addCard,
    removeCard,
    addArchiveCard,
    removeArchiveCard,
    exportCube,
    exportCubeCobra,
    importCube,
    renameCube,
  } = useCube();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rarityFilters, setRarityFilters] = useState<Set<string>>(new Set());
  const [colorFilters, setColorFilters] = useState<Set<string>>(new Set());
  const [nameSearch, setNameSearch] = useState('');
  const [syncStatus, setSyncStatus] = useState<
    'idle' | 'syncing' | 'done' | 'error'
  >('idle');
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [shareId, setShareId] = useState<string | null>(
    () => loadSyncMeta()?.shareId ?? null,
  );
  const [lastSyncedModified, setLastSyncedModified] = useState<string | null>(
    () => loadSyncMeta()?.lastSyncedModified ?? null,
  );
  const isSynced = !!shareId && lastSyncedModified === cube.lastModified;

  function toggleRarity(r: string) {
    setRarityFilters((prev) => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r);
      else next.add(r);
      return next;
    });
  }

  function toggleColor(c: string) {
    setColorFilters((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }

  const filteredCards = filterCards(cube.cards, rarityFilters, colorFilters).filter(
    (c) => !nameSearch || c.name.toLowerCase().includes(nameSearch.toLowerCase()),
  );
  const hasFilters = rarityFilters.size > 0 || colorFilters.size > 0 || !!nameSearch;

  async function handleSync() {
    setSyncStatus('syncing');
    try {
      const id = await syncCube(cube);
      setShareId(id);
      setLastSyncedModified(cube.lastModified);
      setSyncStatus('done');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch {
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  }

  return (
    <>
      <Head>
        <title>Cube · Lemonoppy</title>
      </Head>
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--background)',
          fontFamily: 'var(--font-mono)',
          overflowX: 'hidden',
        }}
      >
        <SetCubeNav />
        <main
          style={{
            maxWidth: '80rem',
            margin: '0 auto',
            padding: '2rem clamp(1rem, 4vw, 2.5rem)',
          }}
        >
          {!isLoaded ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              Loading…
            </div>
          ) : (
            <div className="space-y-4 max-w-6xl">
              <div className="flex flex-wrap items-center justify-between gap-y-2">
                {editingName ? (
                  <input
                    autoFocus
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onBlur={() => {
                      renameCube(nameInput.trim() || cube.name);
                      setEditingName(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        renameCube(nameInput.trim() || cube.name);
                        setEditingName(false);
                      }
                      if (e.key === 'Escape') setEditingName(false);
                    }}
                    className="text-xl font-bold bg-transparent border-b border-border text-foreground outline-none focus:border-ring"
                  />
                ) : (
                  <h1
                    className="text-xl font-bold text-foreground cursor-pointer hover:text-accent transition-colors group"
                    onClick={() => {
                      setNameInput(cube.name);
                      setEditingName(true);
                    }}
                    title="Click to rename"
                  >
                    {cube.name}
                    <span className="ml-2 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity font-normal">
                      rename
                    </span>
                  </h1>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  {isSynced && syncStatus === 'idle' && (
                    <a
                      href={`/set/share/${shareId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-accent hover:underline"
                    >
                      View public ↗
                    </a>
                  )}
                  <button
                    onClick={handleSync}
                    disabled={syncStatus === 'syncing'}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg shadow-sm border transition-colors ${
                      syncStatus === 'done'
                        ? 'bg-green-500/10 text-green-600 border-green-500/30'
                        : syncStatus === 'error'
                          ? 'bg-red-500/10 text-red-600 border-red-500/30'
                          : 'bg-background text-muted-foreground hover:bg-muted border-border'
                    }`}
                  >
                    <CloudArrowUpIcon
                      className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-pulse' : ''}`}
                    />
                    {syncStatus === 'syncing'
                      ? 'Syncing…'
                      : syncStatus === 'done'
                        ? 'Synced!'
                        : syncStatus === 'error'
                          ? 'Error'
                          : shareId
                            ? 'Sync'
                            : 'Publish'}
                  </button>
                  <button
                    onClick={exportCube}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground bg-background hover:bg-muted border border-border rounded-lg shadow-sm transition-colors"
                  >
                    <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                    Export
                  </button>
                  <button
                    onClick={exportCubeCobra}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground bg-background hover:bg-muted border border-border rounded-lg shadow-sm transition-colors"
                  >
                    <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                    CubeCobra
                  </button>
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground bg-background hover:bg-muted border border-border rounded-lg shadow-sm transition-colors"
                  >
                    <ArrowUpTrayIcon className="w-3.5 h-3.5" />
                    Import
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) importCube(file);
                      e.target.value = '';
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <CardSearch onAdd={addCard} />
                <CubeStatsBar cards={cube.cards} />
              </div>

              <ManaCurveGallery
                cards={cube.cards.map((c) => c.scryfallData)}
                archiveIds={
                  new Set(
                    cube.cards.filter((c) => c.inArchive).map((c) => c.id),
                  )
                }
              />

              <div className="space-y-2">
                <div className="relative w-56">
                  <input
                    type="text"
                    placeholder="Search cards…"
                    value={nameSearch}
                    onChange={(e) => setNameSearch(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring pr-7"
                  />
                  {nameSearch && (
                    <button
                      onClick={() => setNameSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Clear search"
                    >
                      ×
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {RARITIES.map((r) => (
                    <button
                      key={r}
                      onClick={() => toggleRarity(r)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        rarityFilters.has(r)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background text-muted-foreground hover:bg-muted border border-border shadow-sm'
                      }`}
                    >
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                      <span
                        className={`ml-1 ${rarityFilters.has(r) ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}
                      >
                        (
                        {
                          cube.cards.filter((c) => c.scryfallData.rarity === r)
                            .length
                        }
                        )
                      </span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {COLOR_FILTERS.map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => toggleColor(key)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        colorFilters.has(key)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background text-muted-foreground hover:bg-muted border border-border shadow-sm'
                      }`}
                    >
                      {label}
                      <span
                        className={`ml-1 ${colorFilters.has(key) ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}
                      >
                        (
                        {
                          cube.cards.filter((c) =>
                            matchesColor(c.scryfallData, key),
                          ).length
                        }
                        )
                      </span>
                    </button>
                  ))}
                </div>

                {hasFilters && (
                  <p className="text-xs text-muted-foreground">
                    Showing {filteredCards.length} of {cube.cards.length} cards
                    <button
                      onClick={() => {
                        setRarityFilters(new Set());
                        setColorFilters(new Set());
                        setNameSearch('');
                      }}
                      className="ml-2 text-accent hover:underline"
                    >
                      clear filters
                    </button>
                  </p>
                )}
              </div>

              <CardTable
                cards={filteredCards}
                archiveIds={
                  new Set(
                    cube.cards.filter((c) => c.inArchive).map((c) => c.id),
                  )
                }
                onRemove={removeCard}
                onToggleArchive={(card: ScryfallCard) =>
                  cube.cards.find((c) => c.id === card.id)?.inArchive
                    ? removeArchiveCard(card.id)
                    : addArchiveCard(card)
                }
              />
            </div>
          )}
        </main>
      </div>
    </>
  );
}
