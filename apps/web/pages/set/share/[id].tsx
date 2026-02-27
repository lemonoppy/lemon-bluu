import { useEffect, useState } from 'react';

import Head from 'next/head';
import { useRouter } from 'next/router';

import ManaCurveGallery from '@/components/set-cube/analysis/ManaCurveGallery';
import CardTable from '@/components/set-cube/cube/CardTable';
import { SetCubeNav } from '@/components/set-cube/SetCubeNav';
import { getCardColors } from '@/lib/set-cube/scryfall';
import { loadCube, saveCube } from '@/lib/set-cube/storage';
import type { CubeCard, CubeList, ScryfallCard } from '@/lib/set-cube/types';

const RARITIES = ['common', 'uncommon', 'rare', 'mythic'] as const;

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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const RARITY_COLORS: Record<string, string> = {
  common: 'var(--muted-foreground)',
  uncommon: '#6366f1',
  rare: '#f59e0b',
  mythic: '#f97316',
};

export default function SharePage() {
  const router = useRouter();
  const { id } = router.query;

  const [cube, setCube] = useState<CubeList | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [rarityFilters, setRarityFilters] = useState<Set<string>>(new Set());
  const [colorFilters, setColorFilters] = useState<Set<string>>(new Set());
  const [copying, setCopying] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }
  const [copyName, setCopyName] = useState('');
  const [copied, setCopied] = useState(false);

  function startCopy() {
    setCopyName(`Copy of ${cube?.name ?? 'Cube'}`);
    setCopying(true);
  }

  function confirmCopy() {
    if (!cube) return;
    const name = copyName.trim() || `Copy of ${cube.name}`;
    const existing = loadCube();
    const hasCards = existing.cards.length > 0;
    if (
      hasCards &&
      !confirm(
        `This will replace your current cube (${existing.cards.length} cards). Continue?`,
      )
    )
      return;
    saveCube({ ...cube, name });
    setCopied(true);
    setCopying(false);
    setTimeout(() => router.push('/set/cube'), 800);
  }

  useEffect(() => {
    if (!id || typeof id !== 'string') return;
    setLoading(true);
    fetch(`/api/cube/${id}`)
      .then(async (res) => {
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error('Failed');
        const json = await res.json();
        setCube(json.data as CubeList);
        setUpdatedAt(json.updatedAt);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  function toggleRarity(r: string) {
    setRarityFilters((prev) => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r); else next.add(r);
      return next;
    });
  }

  function toggleColor(c: string) {
    setColorFilters((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c); else next.add(c);
      return next;
    });
  }

  const cards = cube?.cards ?? [];
  const archiveIds = new Set(
    cards.filter((c: CubeCard) => c.inArchive).map((c: CubeCard) => c.id),
  );

  const filteredCards = cards.filter((c: CubeCard) => {
    if (rarityFilters.size > 0 && !rarityFilters.has(c.scryfallData.rarity))
      return false;
    return !(
      colorFilters.size > 0 &&
      !Array.from(colorFilters).some((cf) => matchesColor(c.scryfallData, cf))
    );
  });

  const hasFilters = rarityFilters.size > 0 || colorFilters.size > 0;

  const rarityCounts = RARITIES.reduce<Record<string, number>>((acc, r) => {
    acc[r] = cards.filter((c: CubeCard) => c.scryfallData.rarity === r).length;
    return acc;
  }, {});

  const title = cube ? `${cube.name} · Lemonoppy` : 'Cube · Lemonoppy';

  return (
    <>
      <Head>
        <title>{title}</title>
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
          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-16">
              <span className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
              Loading cube…
            </div>
          )}

          {!loading && notFound && (
            <div className="py-16 text-center space-y-2">
              <p className="text-lg font-semibold text-foreground">
                Cube not found
              </p>
              <p className="text-sm text-muted-foreground">
                This cube hasn&apos;t been published yet, or the link is
                incorrect.
              </p>
            </div>
          )}

          {!loading && cube && (
            <div className="space-y-6 max-w-6xl">
              {/* ── Header ── */}
              <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                <div style={{ padding: 'clamp(1.25rem, 3vw, 2rem)' }}>
                  {/* Top row: label + action */}
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <p className="text-xs text-muted-foreground tracking-widest uppercase">
                      Public Cube
                    </p>
                    <div className="flex items-center gap-2">
                      {copied ? (
                        <span className="text-xs text-green-600">
                          Copied! Redirecting…
                        </span>
                      ) : copying ? (
                        <div className="flex items-center gap-2">
                          <input
                            autoFocus
                            value={copyName}
                            onChange={(e) => setCopyName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') confirmCopy();
                              if (e.key === 'Escape') setCopying(false);
                            }}
                            className="text-xs bg-background border border-border rounded-md px-2 py-1 text-foreground outline-none focus:border-ring w-48"
                          />
                          <button
                            onClick={confirmCopy}
                            className="text-xs px-2 py-1 rounded-md bg-primary text-primary-foreground"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setCopying(false)}
                            className="text-xs px-2 py-1 rounded-md text-muted-foreground hover:text-foreground"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={startCopy}
                          className="text-xs px-3 py-1 rounded-lg border border-border bg-background text-muted-foreground hover:bg-muted shadow-sm transition-colors"
                        >
                          Make Copy
                        </button>
                      )}
                      <button
                        onClick={handleCopyLink}
                        className={`text-xs px-3 py-1 rounded-lg border shadow-sm transition-colors ${
                          linkCopied
                            ? 'bg-green-500/10 text-green-600 border-green-500/30'
                            : 'bg-background text-muted-foreground hover:bg-muted border-border'
                        }`}
                      >
                        {linkCopied ? 'Copied!' : 'Copy Link'}
                      </button>
                    </div>
                  </div>

                  {/* Bottom row: name/stats + rarity counts */}
                  <div className="flex items-end justify-between gap-4">
                    <div className="space-y-1">
                      <h1
                        style={{
                          fontFamily: 'var(--font-display, var(--font-mono))',
                          fontSize: 'clamp(1.5rem, 4vw, 2.25rem)',
                          fontWeight: 900,
                          lineHeight: 1.1,
                          color: 'var(--foreground)',
                          margin: 0,
                        }}
                      >
                        {cube.name}
                      </h1>
                      <p className="text-xs text-muted-foreground">
                        {cards.length} cards · synced{' '}
                        {updatedAt ? timeAgo(updatedAt) : '—'}
                      </p>
                    </div>

                    {/* Rarity pip strip */}
                    <div className="flex items-center gap-3 shrink-0">
                      {RARITIES.map((r) => (
                        <div
                          key={r}
                          className="flex flex-col items-center gap-1"
                        >
                          <span
                            className="text-sm font-bold tabular-nums"
                            style={{ color: RARITY_COLORS[r] }}
                          >
                            {rarityCounts[r]}
                          </span>
                          <span className="text-[10px] text-muted-foreground capitalize">
                            {r[0]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* end bottom row */}
                </div>
                {/* end padding wrapper */}
              </div>
              {/* end card */}

              {/* ── Mana Curve Gallery ── */}
              <ManaCurveGallery
                cards={cards.map((c: CubeCard) => c.scryfallData)}
                archiveIds={archiveIds}
              />

              {/* ── Filters ── */}
              <div className="space-y-2">
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
                        ({rarityCounts[r]})
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
                          cards.filter((c: CubeCard) =>
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
                    Showing {filteredCards.length} of {cards.length} cards
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

              {/* ── Card Table ── */}
              <CardTable
                cards={filteredCards}
                archiveIds={archiveIds}
                readOnly
              />
            </div>
          )}
        </main>
      </div>
    </>
  );
}
