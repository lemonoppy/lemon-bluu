import { useEffect, useMemo, useState } from 'react';

import Head from 'next/head';
import { useTheme } from 'next-themes';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  computeBestDrafts,
  computeClassTrends,
  computeGMEfficiency,
  computePercentileStats,
  computePickEVTable,
  computeRoundStats,
  computeTeamEfficiency,
  computeTeamEfficiencyTrends,
} from '@/lib/isfl/draft-analysis';
import { getTeamColor } from '@/lib/isfl/teams';
import type {
  ClassTrend,
  DraftPick,
  DraftResult,
  GMData,
  GMEfficiency,
  PercentileStat,
  PickEV,
  RoundStat,
  TeamEfficiency,
  TeamEfficiencyTrend,
} from '@/lib/isfl/types';

const FULL_DATA_LAG = 7;

type DataState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ok'; picks: DraftPick[]; gmData: GMData[]; maxRound: number; currentSeason: number };

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
  const [classSize, setClassSize] = useState(50);
  const rows: PickEV[] = useMemo(
    () => computePickEVTable(picks, classSize),
    [picks, classSize],
  );

  const c = useChartColors();

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
      <div className="px-4 py-4 border-b border-border">
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart
            data={rows.map((r) => ({ ...r, bandHeight: r.p75 - r.p25 }))}
            margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
            <XAxis
              dataKey="pick"
              tickFormatter={(v) => `P${v}`}
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
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload as PickEV & { bandHeight: number };
                return (
                  <div style={{ ...tooltipStyle(c), padding: '8px 12px', lineHeight: '1.6' }}>
                    <p style={{ fontWeight: 600 }}>Pick {label}</p>
                    <p>Expected: {d.ev}</p>
                    <p style={{ color: c.tick }}>P25–P75: {d.p25}–{d.p75}</p>
                    <p style={{ color: c.tick }}>Hit rate: {d.hitRate}%</p>
                  </div>
                );
              }}
            />
            {/* Stacked areas create a floating band between p25 and p75 */}
            <Area type="monotone" stackId="band" dataKey="p25" stroke="none" fillOpacity={0} />
            <Area type="monotone" stackId="band" dataKey="bandHeight" stroke="none" fill={c.bar} fillOpacity={0.15} />
            <Line type="monotone" dataKey="ev" stroke={c.bar} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="overflow-auto max-h-80">
        <table className="w-full text-sm">
          <thead className="border-b border-border sticky top-0 bg-card">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Pick</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Pct</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">P25</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Exp. TPE</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">P75</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Hit %</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Rel. Val</th>
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
                <td className="px-3 py-1.5 text-muted-foreground tabular-nums">{row.p25}</td>
                <td className="px-3 py-1.5 font-medium tabular-nums">{row.ev}</td>
                <td className="px-3 py-1.5 text-muted-foreground tabular-nums">{row.p75}</td>
                <td className="px-3 py-1.5 tabular-nums">{row.hitRate}%</td>
                <td className="px-3 py-1.5 text-muted-foreground tabular-nums">{row.relValue}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Team efficiency trends chart
// ---------------------------------------------------------------------------

function TeamEfficiencyTrends({ trends }: { trends: TeamEfficiencyTrend[] }) {
  const c = useChartColors();
  const [selectedTeam, setSelectedTeam] = useState('');

  const teams = useMemo(() => trends.map((t) => t.team), [trends]);
  const teamsKey = teams.join(',');

  useEffect(() => {
    setSelectedTeam((prev) => (teams.includes(prev) ? prev : (teams[0] ?? '')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamsKey]);

  const allEras = useMemo(() => {
    const seen = new Set<string>();
    for (const t of trends) for (const e of t.eras) seen.add(e.era);
    return [...seen].sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));
  }, [trends]);

  // Pivot: one row per era with each team's delta as a key
  const chartData = useMemo(
    () =>
      allEras.map((era) => {
        const row: Record<string, string | number | null> = { era };
        for (const t of trends) {
          const e = t.eras.find((x) => x.era === era);
          row[t.team] = e ? e.delta : null;
        }
        return row;
      }),
    [allEras, trends],
  );

  if (trends.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-muted-foreground">
        Not enough data to show trends.
      </p>
    );
  }

  return (
    <>
      <div className="px-4 py-3 flex flex-wrap items-center gap-3 border-b border-border">
        <span className="text-xs text-muted-foreground">Team</span>
        <select
          value={selectedTeam}
          onChange={(e) => setSelectedTeam(e.target.value)}
          className="rounded-md border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-border"
        >
          {teams.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">
          Selected team highlighted · others shown faintly · delta = avg TPE − expected
        </span>
      </div>
      <div className="px-4 py-4">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
            <XAxis
              dataKey="era"
              tick={{ fill: c.tick, fontSize: 10 }}
              axisLine={{ stroke: c.grid }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: c.tick, fontSize: 11 }}
              axisLine={{ stroke: c.grid }}
              tickLine={false}
            />
            <ReferenceLine y={0} stroke={c.tick} strokeDasharray="4 2" strokeOpacity={0.5} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const sel = payload.find((p) => p.dataKey === selectedTeam);
                if (!sel) return null;
                const val = sel.value as number;
                return (
                  <div style={{ ...tooltipStyle(c), padding: '8px 12px' }}>
                    <p style={{ fontWeight: 600 }}>{String(label)}</p>
                    <p>
                      {selectedTeam}: {val > 0 ? '+' : ''}
                      {val}
                    </p>
                  </div>
                );
              }}
            />
            {/* Faint lines for all non-selected teams */}
            {trends
              .filter((t) => t.team !== selectedTeam)
              .map((t) => (
                <Line
                  key={t.team}
                  type="monotone"
                  dataKey={t.team}
                  stroke={getTeamColor(t.team)}
                  strokeWidth={1}
                  strokeOpacity={0.4}
                  dot={false}
                  connectNulls={false}
                  legendType="none"
                />
              ))}
            {/* Selected team highlighted on top */}
            {selectedTeam && (
              <Line
                key={selectedTeam}
                type="monotone"
                dataKey={selectedTeam}
                stroke={getTeamColor(selectedTeam)}
                strokeWidth={2.5}
                dot={{ fill: getTeamColor(selectedTeam), r: 3 }}
                activeDot={{ r: 5 }}
                connectNulls={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// GM efficiency table
// ---------------------------------------------------------------------------

function GMEfficiencyTable({ data }: { data: GMEfficiency[] }) {
  type GMSortKey = keyof Pick<GMEfficiency, 'username' | 'picks' | 'avgTPE' | 'expectedTPE' | 'delta'>;
  const [sortKey, setSortKey] = useState<GMSortKey>('delta');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  function handleSort(key: GMSortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'username' ? 'asc' : 'desc');
    }
  }

  const sorted = [...data].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    const cmp =
      typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
    if (cmp !== 0) return sortDir === 'asc' ? cmp : -cmp;
    // Tiebreaker: more picks first, then name asc
    if (a.picks !== b.picks) return b.picks - a.picks;
    return a.username.localeCompare(b.username);
  });

  function Th({ label, col }: { label: string; col: GMSortKey }) {
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

  return (
    <>
      <p className="px-4 py-2 text-xs text-muted-foreground border-b border-border">
        All GMs on a team&apos;s staff are credited for each pick (≥ 5 picks to qualify). Delta = avg
        TPE earned vs expected for slots held. Only seasons with complete player development are
        included — GMs whose tenure is primarily in recent seasons will have a smaller sample here.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-8">#</th>
              <Th label="GM" col="username" />
              <Th label="Picks" col="picks" />
              <Th label="Avg TPE" col="avgTPE" />
              <Th label="Expected" col="expectedTPE" />
              <Th label="Delta" col="delta" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr
                key={row.username}
                className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
              >
                <td className="px-3 py-2 text-muted-foreground tabular-nums text-xs">{i + 1}</td>
                <td className="px-3 py-2 font-medium text-foreground">{row.username}</td>
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
    if (cmp !== 0) return sortDir === 'asc' ? cmp : -cmp;
    // Tiebreaker: more picks first, then team name asc
    if (a.picks !== b.picks) return b.picks - a.picks;
    return a.team.localeCompare(b.team);
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
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-8">#</th>
              <Th label="Team" col="team" />
              <Th label="Picks" col="picks" />
              <Th label="Avg TPE" col="avgTPE" />
              <Th label="Expected" col="expectedTPE" />
              <Th label="Delta" col="delta" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr
                key={row.team}
                className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
              >
                <td className="px-3 py-2 text-muted-foreground tabular-nums text-xs">{i + 1}</td>
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
// Best / worst individual drafts table
// ---------------------------------------------------------------------------

function BestDraftsTable({ data }: { data: DraftResult[] }) {
  type DSortKey = keyof Pick<DraftResult, 'team' | 'season' | 'picks' | 'avgTPE' | 'expectedTPE' | 'delta'>;
  const [sortKey, setSortKey] = useState<DSortKey>('delta');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showCount, setShowCount] = useState<'top' | 'all'>('top');

  function handleSort(key: DSortKey) {
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
    if (cmp !== 0) return sortDir === 'asc' ? cmp : -cmp;
    // Tiebreaker: more picks first, then season desc, then team name asc
    if (a.picks !== b.picks) return b.picks - a.picks;
    if (a.season !== b.season) return b.season - a.season;
    return a.team.localeCompare(b.team);
  });

  const displayed = showCount === 'top' ? sorted.slice(0, 25) : sorted;

  function Th({ label, col }: { label: string; col: DSortKey }) {
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

  return (
    <>
      <div className="px-4 py-2 flex items-center gap-3 border-b border-border">
        <p className="text-xs text-muted-foreground flex-1">
          Each row is one team&apos;s draft in one season. Delta = avg TPE of picks vs expected for those
          slots.
        </p>
        <button
          onClick={() => setShowCount((v) => (v === 'top' ? 'all' : 'top'))}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          {showCount === 'top' ? `Show all ${data.length}` : 'Show top 25'}
        </button>
      </div>
      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border sticky top-0 bg-card">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-8">#</th>
              <Th label="Team" col="team" />
              <Th label="Season" col="season" />
              <Th label="Picks" col="picks" />
              <Th label="Avg TPE" col="avgTPE" />
              <Th label="Expected" col="expectedTPE" />
              <Th label="Delta" col="delta" />
            </tr>
          </thead>
          <tbody>
            {displayed.map((row, i) => (
              <tr
                key={`${row.team}-${row.season}`}
                className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
              >
                <td className="px-3 py-2 text-muted-foreground tabular-nums text-xs">{i + 1}</td>
                <td className="px-3 py-2 font-medium text-foreground">{row.team}</td>
                <td className="px-3 py-2 text-muted-foreground tabular-nums">S{row.season}</td>
                <td className="px-3 py-2 text-muted-foreground tabular-nums">{row.picks}</td>
                <td className="px-3 py-2 tabular-nums">{row.avgTPE}</td>
                <td className="px-3 py-2 text-muted-foreground tabular-nums">{row.expectedTPE}</td>
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

export default function DraftAnalysisPage() {
  const [data, setData] = useState<DataState>({ status: 'loading' });

  useEffect(() => {
    fetch('/api/isfl/draft-data')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((json) => setData({ status: 'ok', ...json }))
      .catch(() => setData({ status: 'error' }));
  }, []);

  const picks = useMemo(() => (data.status === 'ok' ? data.picks : []), [data]);
  const gmData = useMemo(() => (data.status === 'ok' ? data.gmData : []), [data]);
  const maxRound = data.status === 'ok' ? data.maxRound : 10;
  const currentSeason = data.status === 'ok' ? data.currentSeason : 1;

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

  const teamEfficiencyTrends = useMemo(
    () => computeTeamEfficiencyTrends(filteredPicks, filters.teamMode, filters.legacyMode),
    [filteredPicks, filters.teamMode, filters.legacyMode],
  );

  const gmEfficiency = useMemo(
    () => computeGMEfficiency(filteredPicks, gmData, filteredPicks),
    [filteredPicks, gmData],
  );

  const bestDrafts = useMemo(
    () => computeBestDrafts(filteredPicks, filters.teamMode, filters.legacyMode),
    [filteredPicks, filters.teamMode, filters.legacyMode],
  );

  if (data.status === 'loading') {
    return (
      <>
        <Head>
          <title>ISFL Draft Analysis</title>
        </Head>
        <div className="max-w-5xl mx-auto px-4 py-8">
          <p className="text-muted-foreground text-sm">Loading draft data…</p>
        </div>
      </>
    );
  }

  if (data.status === 'error') {
    return (
      <>
        <Head>
          <title>ISFL Draft Analysis</title>
        </Head>
        <div className="max-w-5xl mx-auto px-4 py-8">
          <p className="text-muted-foreground text-sm">Failed to load draft data. Try refreshing.</p>
        </div>
      </>
    );
  }

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

        <Accordion title="Team Efficiency Trends">
          <TeamEfficiencyTrends trends={teamEfficiencyTrends} />
        </Accordion>

        <Accordion title="GM Drafting Efficiency">
          <GMEfficiencyTable data={gmEfficiency} />
        </Accordion>

        <Accordion title="Best Individual Drafts">
          <BestDraftsTable data={bestDrafts} />
        </Accordion>

        <Accordion title="Pick Expected Value">
          <PickEVTable picks={filteredPicks} />
        </Accordion>
      </div>
    </>
  );
}

