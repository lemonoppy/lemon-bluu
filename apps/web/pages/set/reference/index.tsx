import { useEffect, useState } from 'react';

import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import Head from 'next/head';

import SetGrid from '@/components/set-cube/reference/SetGrid';
import { SetCubeNav } from '@/components/set-cube/SetCubeNav';
import { REFERENCE_SET_TYPES } from '@/lib/set-cube/constants';
import { fetchSets } from '@/lib/set-cube/scryfall';
import type { ScryfallSet } from '@/lib/set-cube/types';

export default function ReferencePage() {
  const [sets, setSets] = useState<ScryfallSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchSets().then((all) => {
      const filtered = all
        .filter((s) => REFERENCE_SET_TYPES.includes(s.set_type) && !s.digital && s.released_at)
        .sort(
          (a, b) =>
            new Date(b.released_at!).getTime() - new Date(a.released_at!).getTime()
        );
      setSets(filtered);
      setLoading(false);
    });
  }, []);

  const filtered = search
    ? sets.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.code.toLowerCase().includes(search.toLowerCase())
      )
    : sets;

  return (
    <>
      <Head>
        <title>Reference · Lemonoppy</title>
      </Head>
    <div style={{ minHeight: '100vh', background: 'var(--background)', fontFamily: 'var(--font-mono)' }}>
      <SetCubeNav />
      <main style={{ maxWidth: '80rem', margin: '0 auto', padding: '2rem clamp(1rem, 4vw, 2.5rem)' }}>
        <div className="space-y-4 max-w-6xl">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-foreground">Reference Sets</h1>
            <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-1.5 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20 transition-all shadow-sm">
              <MagnifyingGlassIcon className="w-4 h-4 text-muted-foreground" />
              <input
                className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-40"
                placeholder="Search sets…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-8">
              <span className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
              Loading sets…
            </div>
          ) : (
            <SetGrid sets={filtered} />
          )}
        </div>
      </main>
    </div>
    </>
  );
}
