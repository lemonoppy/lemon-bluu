import { useEffect, useState } from 'react';

import Head from 'next/head';

import DistributionChart from '@/components/set-cube/analysis/DistributionChart';
import SetSelector from '@/components/set-cube/analysis/SetSelector';
import { SetCubeNav } from '@/components/set-cube/SetCubeNav';
import {
  buildColorPieData,
  buildManaCurveData,
  buildRarityData,
  buildTypeBreakdownData,
  computeCubeDistribution,
  computeDistribution,
} from '@/lib/set-cube/analysis';
import { useCube } from '@/lib/set-cube/hooks/use-cube';
import { fetchSet, fetchSetCards } from '@/lib/set-cube/scryfall';
import type { Distribution, ScryfallCard, ScryfallSet } from '@/lib/set-cube/types';

const SESSION_KEY = 'set-cube:ref:';

const EMPTY_DIST: Distribution = {
  manaCurve: Object.fromEntries(Array.from({ length: 7 }, (_, i) => [i, 0])),
  colorPie: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 },
  typeBreakdown: {},
  rarityDistribution: { common: 0, uncommon: 0, rare: 0, mythic: 0 },
};

export default function AnalysisPage() {
  const { cube, isLoaded } = useCube();
  const [setCode, setSetCode] = useState('');
  const [refCards, setRefCards] = useState<ScryfallCard[]>([]);
  const [, setRefSet] = useState<ScryfallSet | null>(null);
  const [loadingRef, setLoadingRef] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!setCode) {
      setRefCards([]);
      setRefSet(null);
      return;
    }
    const cacheKey = SESSION_KEY + setCode;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      const cards = Array.isArray(parsed) ? parsed : parsed.cards;
      const set = Array.isArray(parsed) ? null : parsed.set;
      if (Array.isArray(cards)) {
        setRefCards(cards);
        setRefSet(set ?? null);
        return;
      }
      sessionStorage.removeItem(cacheKey);
    }
    setLoadingRef(true);
    setError('');
    Promise.all([fetchSetCards(setCode), fetchSet(setCode)])
      .then(([cards, set]) => {
        setRefCards(cards);
        setRefSet(set);
        sessionStorage.setItem(cacheKey, JSON.stringify({ cards, set }));
      })
      .catch(() => setError('Failed to load reference set.'))
      .finally(() => setLoadingRef(false));
  }, [setCode]);

  const cubeDist = computeCubeDistribution(cube.cards);
  const refDist = (refCards?.length ?? 0) > 0 ? computeDistribution(refCards) : EMPTY_DIST;

  return (
    <>
      <Head>
        <title>Analysis · Lemonoppy</title>
      </Head>
    <div style={{ minHeight: '100vh', background: 'var(--background)', fontFamily: 'var(--font-mono)' }}>
      <SetCubeNav />
      <main style={{ maxWidth: '80rem', margin: '0 auto', padding: '2rem clamp(1rem, 4vw, 2.5rem)' }}>
        {!isLoaded ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            Loading…
          </div>
        ) : (
          <div className="space-y-6 max-w-6xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-xl font-bold text-foreground">Distribution Analysis</h1>
              <SetSelector value={setCode} onChange={setSetCode} />
            </div>

            {cube.cards.length === 0 && (
              <p className="text-muted-foreground text-sm">
                Add cards to your cube to see distribution charts.
              </p>
            )}

            {error && (
              <p className="text-red-600 text-sm bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2">
                {error}
              </p>
            )}

            {loadingRef && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <span className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                Loading reference set…
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DistributionChart data={buildManaCurveData(cubeDist, refDist)} title="Mana Curve" />
              <DistributionChart data={buildColorPieData(cubeDist, refDist)} title="Color Distribution" />
              <DistributionChart data={buildTypeBreakdownData(cubeDist, refDist)} title="Card Type Breakdown" />
              <DistributionChart data={buildRarityData(cubeDist, refDist)} title="Rarity Distribution" />
            </div>

            {!setCode && (
              <p className="text-muted-foreground text-xs text-center">
                Select a reference set above to compare your cube against a real MTG set.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
    </>
  );
}
