import { useEffect, useState } from 'react';

import Head from 'next/head';

import { SetCubeNav } from '@/components/set-cube/SetCubeNav';
import DraftConfigForm from '@/components/set-cube/simulator/DraftConfigForm';
import MysticalArchivePanel from '@/components/set-cube/simulator/MysticalArchivePanel';
import SimulatorTable from '@/components/set-cube/simulator/SimulatorTable';
import {
  DEFAULT_DRAFT_CONFIG,
  DRAFT_CONFIG_KEY,
} from '@/lib/set-cube/constants';
import { useCube } from '@/lib/set-cube/hooks/use-cube';
import { calculateDraftNeeds } from '@/lib/set-cube/simulator';
import {
  exportCubeCobraCSVSingleton,
  exportCubeCobraCSVWithCopies,
} from '@/lib/set-cube/storage';
import type { DraftConfig } from '@/lib/set-cube/types';

export default function SimulatorPage() {
  const { cube, isLoaded, addArchiveCard, removeArchiveCard } = useCube();
  const [config, setConfig] = useState<DraftConfig>(DEFAULT_DRAFT_CONFIG);

  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_CONFIG_KEY);
    if (saved) {
      try {
        setConfig(JSON.parse(saved));
      } catch {}
    }
  }, []);

  function handleConfigChange(c: DraftConfig) {
    setConfig(c);
    localStorage.setItem(DRAFT_CONFIG_KEY, JSON.stringify(c));
  }

  const archiveCards = cube.cards.filter((c) => c.inArchive);
  const nonArchiveCards = cube.cards.filter((c) => !c.inArchive);
  const results = calculateDraftNeeds(nonArchiveCards, config, archiveCards);

  return (
    <>
      <Head>
        <title>Pack Calculator · Lemonoppy</title>
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
          {!isLoaded ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              Loading…
            </div>
          ) : (
            <div className="space-y-6 max-w-6xl">
              <h1 className="text-xl font-bold text-foreground">
                Pack Copy Calculator
              </h1>
              <DraftConfigForm config={config} onChange={handleConfigChange} />
              {cube.cards.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Add cards to your cube to calculate copy requirements.
                </p>
              ) : (
                <>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      How many copies of each card you should have on hand to
                      simulate opening real packs.
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Because packs are random, some cards will show up more
                      often than others — these numbers give you enough stock to
                      cover{' '}
                      <span className="font-semibold text-foreground">
                        95% of possible openings
                      </span>{' '}
                      when building packs for the draft.
                      <br />
                      <span className="font-semibold italic text-foreground">
                        Numbers reflect current Draft Configuration
                      </span>
                    </p>
                    <SimulatorTable results={results} />
                    <div className="flex items-center gap-3 pt-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Export to CubeCobra</span>
                      <button
                        onClick={() => exportCubeCobraCSVSingleton(cube)}
                        className="px-4 py-2 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-sm transition-colors"
                      >
                        Singleton
                      </button>
                      <button
                        onClick={() => exportCubeCobraCSVWithCopies(cube, results)}
                        className="px-4 py-2 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-sm transition-colors"
                      >
                        With Copies
                      </button>
                    </div>
                  </div>
                  <MysticalArchivePanel
                    cards={archiveCards}
                    onAdd={addArchiveCard}
                    onRemove={removeArchiveCard}
                  />
                </>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
