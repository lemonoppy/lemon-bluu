import { useMemo, useState } from 'react';

import fs from 'fs';
import path from 'path';

import Head from 'next/head';
import { useTheme } from 'next-themes';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  computeClassTrends,
  computePercentileStats,
  computePickEVTable,
  computeRoundStats,
  computeTeamEfficiency,
  parseTSV,
} from '@/lib/isfl/draft-analysis';
import type { ClassTrend, DraftPick, PercentileStat, PickEV, RoundStat, TeamEfficiency } from '@/lib/isfl/types';

const FULL_DATA_LAG = 7;

interface Props {
  picks: DraftPick[];
  maxRound: number;
  currentSeason: number;
}

type SortKey = keyof Pick<
  TeamEfficiency,
  'team' | 'picks' | 'avgTPE' | 'expectedTPE' | 'delta'
>;

type PickView = 'round' | 'percentile';
type TeamMode = 'owning' | 'original';

// ---------------------------------------------------------------------------
// Theme-aware chart colors
// ---------------------------------------------------------------------------

function useChartColors() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  return {
    grid: isDark ? 'oklch(0.28 0.08 264)' : 'oklch(0.88 0.012 240)',
    tick: isDark ? 'oklch(0.67 0.04 240)' : '#64748b',
    tooltipBg: isDark ? 'oklch(0.22 0.09 264)' : '#ffffff',
    tooltipBorder: isDark ? 'oklch(0.28 0.08 264)' : '#e2e8f0',
    tooltipText: isDark ? 'oklch(0.99 0 0)' : '#0f172a',
    bar: isDark ? 'oklch(0.62 0.14 222)' : '#1e3a8a',
    lineAvg: isDark ? 'oklch(0.696 0.17 162.48)' : '#15803d',
    lineMedian: isDark ? 'oklch(0.62 0.14 222)' : '#1e3a8a',
    lineTop10: isDark ? 'oklch(0.769 0.188 70.08)' : '#b45309',
    lineTop20: isDark ? 'oklch(0.75 0.15 50)' : '#c2410c',
  };
}

function tooltipStyle(c: ReturnType<typeof useChartColors>) {
  return {
    backgroundColor: c.tooltipBg,
    border: `1px solid ${c.tooltipBorder}`,
    borderRadius: '8px',
    fontSize: 12,
    color: c.tooltipText,
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  };
}

// ---------------------------------------------------------------------------
// Shared card wrapper
// ---------------------------------------------------------------------------

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter bar
// ---------------------------------------------------------------------------

interface Filters {
  roundMin: number;
  roundMax: number;
  includeGM: boolean;
  pickView: PickView;
  teamMode: TeamMode;
  legacyMode: boolean;
  completeOnly: boolean;
}

function FilterBar({
  filters,
  maxRound,
  currentSeason,
  onChange,
}: {
  filters: Filters;
  maxRound: number;
  currentSeason: number;
  onChange: (f: Filters) => void;
}) {
  function set(partial: Partial<Filters>) {
    onChange({ ...filters, ...partial });
  }

  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 flex flex-wrap gap-4 items-center text-sm">
      {/* Round range */}
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-xs font-medium">
          Rounds
        </span>
        <input
          type="number"
          min={1}
          max={filters.roundMax}
          value={filters.roundMin}
          onChange={(e) =>
            set({
              roundMin: Math.max(
                1,
                Math.min(+e.target.value, filters.roundMax),
              ),
            })
          }
          className="w-12 rounded-md border border-border bg-background px-2 py-1 text-xs text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-border"
        />
        <span className="text-muted-foreground text-xs">to</span>
        <input
          type="number"
          min={filters.roundMin}
          max={maxRound}
          value={filters.roundMax}
          onChange={(e) =>
            set({
              roundMax: Math.max(
                filters.roundMin,
                Math.min(+e.target.value, maxRound),
              ),
            })
          }
          className="w-12 rounded-md border border-border bg-background px-2 py-1 text-xs text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-border"
        />
      </div>

      {/* Comp pick toggle */}
      <button
        onClick={() => set({ includeGM: !filters.includeGM })}
        className={`px-3 py-1 rounded-md border text-xs font-medium transition-colors ${
          filters.includeGM
            ? 'border-foreground/40 bg-foreground/10 text-foreground'
            : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
        }`}
      >
        GM picks {filters.includeGM ? 'on' : 'off'}
      </button>

      {/* Pick view toggle */}
      <div className="flex rounded-md border border-border overflow-hidden text-xs font-medium">
        {(['round', 'percentile'] as PickView[]).map((v) => (
          <button
            key={v}
            onClick={() => set({ pickView: v })}
            className={`px-3 py-1 capitalize transition-colors ${
              filters.pickView === v
                ? 'bg-foreground/10 text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {/* Legacy mode toggle */}
      <button
        onClick={() => set({ legacyMode: !filters.legacyMode })}
        className={`px-3 py-1 rounded-md border text-xs font-medium transition-colors ${
          filters.legacyMode
            ? 'border-foreground/40 bg-foreground/10 text-foreground'
            : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
        }`}
      >
        Legacy {filters.legacyMode ? 'on' : 'off'}
      </button>

      {/* Complete data toggle */}
      <button
        onClick={() => set({ completeOnly: !filters.completeOnly })}
        title={`Only seasons ≤ S${currentSeason - FULL_DATA_LAG}`}
        className={`px-3 py-1 rounded-md border text-xs font-medium transition-colors ${
          filters.completeOnly
            ? 'border-foreground/40 bg-foreground/10 text-foreground'
            : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
        }`}
      >
        Complete only {filters.completeOnly ? 'on' : 'off'}
      </button>

      {/* Team mode toggle */}
      <div className="flex rounded-md border border-border overflow-hidden text-xs font-medium">
        {(
          [
            ['owning', 'By Owner'],
            ['original', 'Cumulative'],
          ] as [TeamMode, string][]
        ).map(([v, label]) => (
          <button
            key={v}
            onClick={() => set({ teamMode: v })}
            className={`px-3 py-1 transition-colors ${
              filters.teamMode === v
                ? 'bg-foreground/10 text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pick value chart (round or percentile)
// ---------------------------------------------------------------------------

function PickValueChart({
  picks,
  view,
}: {
  picks: DraftPick[];
  view: PickView;
}) {
  const c = useChartColors();

  const data = useMemo(
    () =>
      view === 'round' ? computeRoundStats(picks) : computePercentileStats(picks),
    [picks, view],
  );
  return (
    <ChartCard
      title={view === 'round' ? 'Avg TPE by Draft Round' : 'Avg TPE by Draft Percentile'}
    >
      <ResponsiveContainer width="100%" height={220}>
        {view === 'round' ? (
          <LineChart data={data as RoundStat[]} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
            <XAxis
              dataKey="round"
              tickFormatter={(v: number) => `R${v}`}
              tick={{ fill: c.tick, fontSize: 11 }}
              axisLine={{ stroke: c.grid }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: c.tick, fontSize: 11 }}
              axisLine={{ stroke: c.grid }}
              tickLine={false}
            />
            <Tooltip
              contentStyle={tooltipStyle(c)}
              formatter={(value) => [value, 'Avg TPE']}
              labelFormatter={(v) => `Round ${v}`}
            />
            <Line
              type="monotone"
              dataKey="avg"
              stroke={c.bar}
              strokeWidth={2}
              dot={{ fill: c.bar, r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        ) : (
          <LineChart
            data={data as PercentileStat[]}
            margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
            <XAxis
              dataKey="label"
              tick={{ fill: c.tick, fontSize: 10 }}
              axisLine={{ stroke: c.grid }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: c.tick, fontSize: 11 }}
              axisLine={{ stroke: c.grid }}
              tickLine={false}
            />
            <Tooltip
              contentStyle={tooltipStyle(c)}
              formatter={(value) => [value, 'Avg TPE']}
              labelFormatter={(v) => `${v}–${parseInt(v as string) + 5}% percentile`}
            />
            <Line
              type="monotone"
              dataKey="avg"
              stroke={c.bar}
              strokeWidth={2}
              dot={{ fill: c.bar, r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
      <p className="text-xs text-muted-foreground">
        {view === 'round'
          ? 'Average highest TPE earned by players drafted in each round, across all seasons.'
          : 'Picks ranked within each season and grouped into deciles. 0–10% = earliest picks.'}
      </p>
    </ChartCard>
  );
}

// ---------------------------------------------------------------------------
// Class trends chart
// ---------------------------------------------------------------------------

function ClassTrendsChart({ data }: { data: ClassTrend[] }) {
  const c = useChartColors();

  const lines: Array<{ key: keyof ClassTrend; label: string; color: string; dashed?: boolean }> = [
    { key: 'avg', label: 'Avg', color: c.lineAvg },
    { key: 'median', label: 'Median', color: c.lineMedian, dashed: true },
    { key: 'top10Avg', label: 'Top 10', color: c.lineTop10 },
    { key: 'top20Avg', label: 'Top 20', color: c.lineTop20, dashed: true },
  ];

  return (
    <ChartCard title="Draft Class TPE by Season">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
          <XAxis
            dataKey="season"
            tickFormatter={(v) => `S${v}`}
            tick={{ fill: c.tick, fontSize: 11 }}
            axisLine={{ stroke: c.grid }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: c.tick, fontSize: 11 }}
            axisLine={{ stroke: c.grid }}
            tickLine={false}
          />
          <Tooltip
            contentStyle={tooltipStyle(c)}
            labelFormatter={(v) => `Season ${v}`}
            formatter={(value, name) => {
              const line = lines.find((l) => l.key === name);
              return [value, line?.label ?? name];
            }}
          />
          {lines.map((l) => (
            <Line
              key={l.key}
              type="monotone"
              dataKey={l.key as string}
              name={l.key as string}
              stroke={l.color}
              strokeWidth={2}
              strokeDasharray={l.dashed ? '4 2' : undefined}
              dot={l.dashed ? false : { fill: l.color, r: 3 }}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {lines.map((l) => (
          <span key={l.key} className="flex items-center gap-1.5">
            <span
              className="inline-block w-5 h-0"
              style={{
                borderTop: `2px ${l.dashed ? 'dashed' : 'solid'} ${l.color}`,
              }}
            />
            {l.label}
          </span>
        ))}
      </div>
    </ChartCard>
  );
}

// ---------------------------------------------------------------------------
// Accordion wrapper
// ---------------------------------------------------------------------------

function Accordion({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted/40 transition-colors"
      >
        {title}
        <span className="text-muted-foreground text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="border-t border-border">{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pick EV table
// ---------------------------------------------------------------------------

function PickEVTable({ picks }: { picks: DraftPick[] }) {
  const [classSize, setClassSize] = useState(16);
  const rows: PickEV[] = useMemo(
    () => computePickEVTable(picks, classSize),
    [picks, classSize],
  );

  return (
    <>
      <div className="px-4 py-3 flex items-center gap-3 border-b border-border">
        <span className="text-xs text-muted-foreground">Class size</span>
        <input
          type="number"
          min={2}
          max={200}
          value={classSize}
          onChange={(e) =>
            setClassSize(Math.max(2, Math.min(200, parseInt(e.target.value) || 2)))
          }
          className="w-16 rounded-md border border-border bg-background px-2 py-1 text-xs text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-border"
        />
        <span className="text-xs text-muted-foreground">
          {rows.length} picks · EV based on filtered data
        </span>
      </div>
      <div className="overflow-auto max-h-80">
        <table className="w-full text-sm">
          <thead className="border-b border-border sticky top-0 bg-card">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Pick</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Percentile</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Expected TPE</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.pick}
                className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
              >
                <td className="px-3 py-1.5 font-medium text-foreground tabular-nums">{row.pick}</td>
                <td className="px-3 py-1.5 text-muted-foreground tabular-nums">{row.percentile}%</td>
                <td className="px-3 py-1.5 tabular-nums">{row.ev}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Team efficiency table
// ---------------------------------------------------------------------------

function TeamEfficiencyTable({ data, mode }: { data: TeamEfficiency[]; mode: TeamMode }) {
  const [sortKey, setSortKey] = useState<SortKey>('delta');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'team' ? 'asc' : 'desc');
    }
  }

  const sorted = [...data].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    const cmp =
      typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  function Th({ label, col }: { label: string; col: SortKey }) {
    const active = col === sortKey;
    return (
      <th
        className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors whitespace-nowrap"
        onClick={() => handleSort(col)}
      >
        {label}
        <span className={active ? '' : 'opacity-30'}>
          {active ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ' ↕'}
        </span>
      </th>
    );
  }

  const description =
    mode === 'owning'
      ? 'Delta = avg TPE earned vs expected for the slots each team actually drafted with.'
      : 'Cumulative: picks attributed to the team that originally owned them, including picks traded away.';

  return (
    <>
      <p className="px-4 py-2 text-xs text-muted-foreground border-b border-border">{description}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border">
            <tr>
              <Th label="Team" col="team" />
              <Th label="Picks" col="picks" />
              <Th label="Avg TPE" col="avgTPE" />
              <Th label="Expected" col="expectedTPE" />
              <Th label="Delta" col="delta" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr
                key={row.team}
                className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
              >
                <td className="px-3 py-2 font-medium text-foreground">{row.team}</td>
                <td className="px-3 py-2 text-muted-foreground">{row.picks}</td>
                <td className="px-3 py-2">{row.avgTPE}</td>
                <td className="px-3 py-2 text-muted-foreground">{row.expectedTPE}</td>
                <td
                  className="px-3 py-2 font-semibold tabular-nums"
                  style={{
                    color:
                      row.delta > 0
                        ? 'oklch(0.55 0.18 145)'
                        : row.delta < 0
                          ? 'oklch(0.55 0.2 25)'
                          : undefined,
                  }}
                >
                  {row.delta > 0 ? '+' : ''}
                  {row.delta}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DraftAnalysisPage({ picks, maxRound, currentSeason }: Props) {
  const [filters, setFilters] = useState<Filters>({
    roundMin: 1,
    roundMax: 5,
    includeGM: false,
    pickView: 'percentile',
    teamMode: 'owning',
    legacyMode: true,
    completeOnly: true,
  });

  const filteredPicks = useMemo(() => {
    const applyRounds = filters.pickView === 'round';
    return picks.filter(
      (p) =>
        (!applyRounds || (p.round >= filters.roundMin && p.round <= filters.roundMax)) &&
        (filters.includeGM || p.type !== 'GM') &&
        (!filters.completeOnly || p.season <= currentSeason - FULL_DATA_LAG),
    );
  }, [picks, filters.roundMin, filters.roundMax, filters.includeGM, filters.completeOnly, filters.pickView, currentSeason]);

  const classTrends = useMemo(() => computeClassTrends(filteredPicks), [filteredPicks]);

  const teamEfficiency = useMemo(
    () => computeTeamEfficiency(filteredPicks, filters.teamMode, filters.legacyMode),
    [filteredPicks, filters.teamMode, filters.legacyMode],
  );

  return (
    <>
      <Head>
        <title>ISFL Draft Analysis</title>
      </Head>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            ISFL Draft Analysis
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Historical draft data — pick value, class trends, and team
            efficiency.
          </p>
        </div>

        <FilterBar
          filters={filters}
          maxRound={maxRound}
          currentSeason={currentSeason}
          onChange={setFilters}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PickValueChart picks={filteredPicks} view={filters.pickView} />
          <ClassTrendsChart data={classTrends} />
        </div>

        <Accordion title="Team Drafting Efficiency">
          <TeamEfficiencyTable data={teamEfficiency} mode={filters.teamMode} />
        </Accordion>

        <Accordion title="Pick Expected Value">
          <PickEVTable picks={filteredPicks} />
        </Accordion>
      </div>
    </>
  );
}

export async function getStaticProps() {
  const filePath = path.join(process.cwd(), 'data', 'isfl-draft.tsv');

  if (!fs.existsSync(filePath)) {
    return { props: { picks: [], maxRound: 10, currentSeason: 1 } };
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const picks = parseTSV(raw);
  const maxRound = picks.reduce((m, p) => Math.max(m, p.round), 1);
  const currentSeason = picks.reduce((m, p) => Math.max(m, p.season), 1);

  return { props: { picks, maxRound, currentSeason } };
}
