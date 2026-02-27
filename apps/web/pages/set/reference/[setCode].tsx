import { useEffect, useState } from 'react';

import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

import ManaCurveGallery from '@/components/set-cube/analysis/ManaCurveGallery';
import SetCardRow from '@/components/set-cube/reference/SetCardRow';
import { SetCubeNav } from '@/components/set-cube/SetCubeNav';
import { useCube } from '@/lib/set-cube/hooks/use-cube';
import {
  fetchSet,
  fetchSetCards,
  getCardColors,
} from '@/lib/set-cube/scryfall';
import type { ScryfallCard, ScryfallSet } from '@/lib/set-cube/types';

const RARITIES = ['all', 'common', 'uncommon', 'rare', 'mythic'];

const COLOR_FILTERS = [
  { key: 'all', label: 'All' },
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
  if (filter === 'all') return true;
  if (filter === 'L') return card.type_line.includes('Land');
  const colors = getCardColors(card);
  if (filter === 'C')
    return colors.length === 0 && !card.type_line.includes('Land');
  if (filter === 'M') return colors.length > 1;
  return colors.length === 1 && colors.includes(filter);
}

export default function SetDetailPage() {
  const router = useRouter();
  const { setCode } = router.query;
  const { cube, addCard } = useCube();
  const [set, setSet] = useState<ScryfallSet | null>(null);
  const [cards, setCards] = useState<ScryfallCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rarityFilters, setRarityFilters] = useState<Set<string>>(new Set());
  const [colorFilters, setColorFilters] = useState<Set<string>>(new Set());

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

  useEffect(() => {
    if (!setCode || typeof setCode !== 'string') return;
    setLoading(true);
    setError('');
    Promise.all([fetchSet(setCode), fetchSetCards(setCode)])
      .then(([s, c]) => {
        setSet(s);
        setCards(c);
      })
      .catch(() => setError('Failed to load set.'))
      .finally(() => setLoading(false));
  }, [setCode]);

  const cubeIds = new Set(cube.cards.map((c) => c.id));
  const filtered = cards.filter((c) => {
    if (rarityFilters.size > 0 && !rarityFilters.has(c.rarity)) return false;
    return !(
      colorFilters.size > 0 &&
      !Array.from(colorFilters).some((cf) => matchesColor(c, cf))
    );
  });

  return (
    <>
      <Head>
        <title>{set ? `${set.name} · Reference · Lemonoppy` : 'Reference · Lemonoppy'}</title>
      </Head>
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--background)',
        fontFamily: 'var(--font-mono)',
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
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Link
              href="/set/reference"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4" />
            </Link>
            {set ? (
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={set.icon_svg_uri}
                  alt={set.name}
                  width={20}
                  height={20}
                  style={{
                    filter: 'var(--set-icon-filter)',
                  }}
                  className="opacity-60"
                />
                <h1 className="text-xl font-bold text-foreground">
                  {set.name}
                </h1>
                <span className="text-muted-foreground text-sm">
                  {set.code.toUpperCase()} · {set.released_at?.slice(0, 4)} ·{' '}
                  {cards.length} cards
                </span>
              </div>
            ) : (
              <h1 className="text-xl font-bold text-foreground">
                {typeof setCode === 'string' ? setCode.toUpperCase() : ''}
              </h1>
            )}
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2">
              {error}
            </p>
          )}

          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-8">
              <span className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
              Loading cards…
            </div>
          ) : (
            <>
              <ManaCurveGallery cards={cards} setName={set?.name} />

              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {RARITIES.filter((r) => r !== 'all').map((r) => (
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
                        ({cards.filter((c) => c.rarity === r).length})
                      </span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {COLOR_FILTERS.filter(({ key }) => key !== 'all').map(
                    ({ key, label }) => (
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
                          ({cards.filter((c) => matchesColor(c, key)).length})
                        </span>
                      </button>
                    ),
                  )}
                </div>

                {(rarityFilters.size > 0 || colorFilters.size > 0) && (
                  <p className="text-xs text-muted-foreground">
                    Showing {filtered.length} of {cards.length} cards
                    <button
                      onClick={() => {
                        setRarityFilters(new Set());
                        setColorFilters(new Set());
                      }}
                      className="ml-2 text-accent hover:underline"
                    >
                      clear filters
                    </button>
                  </p>
                )}
              </div>

              <div className="overflow-x-auto rounded-xl border border-border shadow-sm bg-card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-primary text-primary-foreground text-left">
                      <th className="px-4 py-3 font-semibold">Name</th>
                      <th className="px-4 py-3 font-semibold">Cost</th>
                      <th className="px-4 py-3 font-semibold">Type</th>
                      <th className="px-4 py-3 font-semibold">Color</th>
                      <th className="px-4 py-3 font-semibold">Rarity</th>
                      <th className="px-4 py-3 font-semibold text-center">
                        CMC
                      </th>
                      <th className="px-4 py-3 font-semibold"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((card) => (
                      <SetCardRow
                        key={card.id}
                        card={card}
                        alreadyInCube={cubeIds.has(card.id)}
                        onAdd={addCard}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
    </>
  );
}
