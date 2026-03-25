import React, { useEffect, useMemo, useState } from 'react';

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

import { PageLayout } from '@/components/layout/page-layout';
import { Accordion } from '@/components/ui/accordion';
import { ChartCard } from '@/components/ui/chart-card';
import { tooltipStyle, useChartColors } from '@/lib/chart-utils';
import {
  applyProjections,
  BUCKET_COUNT,
  computeAllPickDeltas,
  computeBestDrafts,
  computeClassTrends,
  computeGMEfficiency,
  computePercentileStats,
  computePickEVTable,
  computePicksAtPercentile,
  computeRoundStats,
  computeTeamEfficiency,
  computeTeamEfficiencyTrends,
  computeUserPicks,
  FULL_DATA_LAG,
} from '@/lib/isfl/draft-analysis';
import type { PickAtPercentile } from '@/lib/isfl/draft-analysis';
import { getTeamColor } from '@/lib/isfl/teams';
import type {
  ClassTrend,
  DraftPick,
  DraftPickDetail,
  DraftResult,
  GMData,
  GMEfficiency,
  PercentileStat,
  PickEV,
  RoundStat,
  TeamEfficiency,
  TeamEfficiencyTrend,
  UserPickResult,
} from '@/lib/isfl/types';

function rankBy<T>(sorted: T[], key: keyof T): number[] {
  return sorted.map((row, i) => {
    if (i === 0) return 1;
    return sorted[i - 1][key] === row[key] ? 0 : i + 1; // 0 = same rank as previous
  }).reduce<number[]>((acc, r, i) => {
    acc.push(r === 0 ? acc[i - 1] : r);
    return acc;
  }, []);
}

type DataState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ok'; picks: DraftPick[]; gmData: GMData[]; maxRound: number; currentSeason: number };

type SortKey = 'team' | 'picks' | 'avgTPE' | 'expectedTPE' | 'delta' | 'adj';

type PickView = 'round' | 'percentile';
type TeamMode = 'owning' | 'original';

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
  modernOnly: boolean;
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
        title={
          filters.completeOnly
            ? `Only seasons ≤ S${currentSeason - FULL_DATA_LAG}`
            : `S${currentSeason - FULL_DATA_LAG + 1}–S${currentSeason} projected via linear TPE scaling`
        }
        className={`px-3 py-1 rounded-md border text-xs font-medium transition-colors ${
          filters.completeOnly
            ? 'border-foreground/40 bg-foreground/10 text-foreground'
            : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
        }`}
      >
        {filters.completeOnly ? 'Complete only' : 'With projections'}
      </button>

      {/* Modern era toggle */}
      <button
        onClick={() => set({ modernOnly: !filters.modernOnly })}
        title="Exclude S1–20 early-era data"
        className={`px-3 py-1 rounded-md border text-xs font-medium transition-colors ${
          filters.modernOnly
            ? 'border-foreground/40 bg-foreground/10 text-foreground'
            : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
        }`}
      >
        Modern {filters.modernOnly ? 'on' : 'off'}
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
              interval={Math.floor(BUCKET_COUNT / 10) - 1}
            />
            <YAxis
              tick={{ fill: c.tick, fontSize: 11 }}
              axisLine={{ stroke: c.grid }}
              tickLine={false}
            />
            <Tooltip
              contentStyle={tooltipStyle(c)}
              formatter={(value) => [value, 'Avg TPE']}
              labelFormatter={(v) => {
                const end = parseInt(v as string);
                const start = Math.round(end - 100 / BUCKET_COUNT);
                return `${start}–${end}th percentile`;
              }}
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
// Pick EV table
// ---------------------------------------------------------------------------

function PickEVTable({ picks }: { picks: DraftPick[] }) {
  const [classSize, setClassSize] = useState(56);
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
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Pctile</th>
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
                <td className="px-3 py-1.5 text-muted-foreground tabular-nums">{Math.round(100 - row.percentile)}th</td>
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
  const [metric, setMetric] = useState<'delta' | 'rating'>('delta');

  const K_TEAM = 50;

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

  // Pivot: one row per era with each team's delta or rating as a key
  const chartData = useMemo(
    () =>
      allEras.map((era) => {
        const row: Record<string, string | number | null> = { era };
        for (const t of trends) {
          const e = t.eras.find((x) => x.era === era);
          if (!e) { row[t.team] = null; continue; }
          row[t.team] = metric === 'rating'
            ? Math.round(e.delta * e.picks / (e.picks + K_TEAM))
            : e.delta;
        }
        return row;
      }),
    [allEras, trends, metric],
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
        <span className="text-xs text-muted-foreground flex-1">
          Selected team highlighted · others shown faintly
        </span>
        <div className="flex text-xs border border-border rounded overflow-hidden shrink-0">
          {(['delta', 'rating'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`px-2 py-1 transition-colors capitalize ${metric === m ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {m === 'delta' ? 'Delta' : 'Rating'}
            </button>
          ))}
        </div>
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
                      {selectedTeam} {metric === 'rating' ? 'Rating' : 'Delta'}: {val > 0 ? '+' : ''}
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
  type GMSortKey = 'username' | 'picks' | 'avgTPE' | 'expectedTPE' | 'delta' | 'adj';
  const [sortKey, setSortKey] = useState<GMSortKey>('adj');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const K_GM = 10;
  const rows = data.map((r) => ({
    ...r,
    adj: Math.round(r.delta * r.picks / (r.picks + K_GM)),
  }));

  function handleSort(key: GMSortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'username' ? 'asc' : 'desc');
    }
  }

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    const cmp =
      typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
    if (cmp !== 0) return sortDir === 'asc' ? cmp : -cmp;
    if (a.picks !== b.picks) return b.picks - a.picks;
    return a.username.localeCompare(b.username);
  });
  const ranks = rankBy(sorted, sortKey);

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

  function DeltaCell({ value }: { value: number }) {
    return (
      <td
        className="px-3 py-2 font-semibold tabular-nums"
        style={{
          color: value > 0 ? 'oklch(0.55 0.18 145)' : value < 0 ? 'oklch(0.55 0.2 25)' : undefined,
        }}
      >
        {value > 0 ? '+' : ''}
        {value}
      </td>
    );
  }

  return (
    <>
      <p className="px-4 py-2 text-xs text-muted-foreground border-b border-border">
        Delta = avg TPE vs expected per pick. Rating = Bayesian-shrunk surplus
        (small samples pulled toward zero). Only complete-development seasons
        included. (≥ 5 picks to qualify)
      </p>
      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border sticky top-0 bg-card">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-8">
                #
              </th>
              <Th label="GM" col="username" />
              <Th label="Picks" col="picks" />
              <Th label="Avg TPE" col="avgTPE" />
              <Th label="Expected" col="expectedTPE" />
              <Th label="Delta" col="delta" />
              <Th label="Rating" col="adj" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr
                key={row.username}
                className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
              >
                <td className="px-3 py-2 text-muted-foreground tabular-nums text-xs">
                  {ranks[i]}
                </td>
                <td className="px-3 py-2 font-medium text-foreground">
                  {row.username}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{row.picks}</td>
                <td className="px-3 py-2">{row.avgTPE}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {row.expectedTPE}
                </td>
                <DeltaCell value={row.delta} />
                <DeltaCell value={row.adj} />
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
  const [sortKey, setSortKey] = useState<SortKey>('adj');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const K_TEAM = 50;
  const rows = data.map((r) => ({
    ...r,
    adj: Math.round(r.delta * r.picks / (r.picks + K_TEAM)),
  }));

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'team' ? 'asc' : 'desc');
    }
  }

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    const cmp =
      typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
    if (cmp !== 0) return sortDir === 'asc' ? cmp : -cmp;
    if (a.picks !== b.picks) return b.picks - a.picks;
    return a.team.localeCompare(b.team);
  });
  const ranks = rankBy(sorted, sortKey);

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

  function DeltaCell({ value }: { value: number }) {
    return (
      <td
        className="px-3 py-2 font-semibold tabular-nums"
        style={{
          color: value > 0 ? 'oklch(0.55 0.18 145)' : value < 0 ? 'oklch(0.55 0.2 25)' : undefined,
        }}
      >
        {value > 0 ? '+' : ''}
        {value}
      </td>
    );
  }

  const description =
    mode === 'owning'
      ? 'Delta = avg TPE vs expected per pick. Rating = Bayesian-shrunk surplus (small samples pulled toward zero).'
      : 'Cumulative: picks attributed to the team that originally owned them, including picks traded away. Delta = avg TPE vs expected per pick. Rating = Bayesian-shrunk surplus.';

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
              <Th label="Rating" col="adj" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr
                key={row.team}
                className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
              >
                <td className="px-3 py-2 text-muted-foreground tabular-nums text-xs">{ranks[i]}</td>
                <td className="px-3 py-2 font-medium text-foreground">{row.team}</td>
                <td className="px-3 py-2 text-muted-foreground">{row.picks}</td>
                <td className="px-3 py-2">{row.avgTPE}</td>
                <td className="px-3 py-2 text-muted-foreground">{row.expectedTPE}</td>
                <DeltaCell value={row.delta} />
                <DeltaCell value={row.adj} />
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

function PickDetailRow({ detail }: { detail: DraftPickDetail }) {
  const deltaColor =
    detail.delta > 0 ? 'oklch(0.55 0.18 145)' : detail.delta < 0 ? 'oklch(0.55 0.2 25)' : undefined;
  // Parent columns: # | Team | Season | Picks | Avg TPE | Expected | Delta | Rating
  // Detail:        &nbsp; | empty | R1 #14 | name | TPE | Expected | delta | empty
  return (
    <tr className="border-b border-border/50 last:border-0 bg-muted/20">
      <td className="px-3 py-1.5 w-8">&nbsp;</td>
      <td className="px-3 py-1.5" />
      <td className="px-3 py-1.5 text-muted-foreground tabular-nums text-xs whitespace-nowrap">
        R{detail.round} #{detail.pick}
      </td>
      <td className="px-3 py-1.5 text-xs">{detail.name}</td>
      <td className="px-3 py-1.5 tabular-nums text-xs">{detail.highestTPE}</td>
      <td className="px-3 py-1.5 text-muted-foreground tabular-nums text-xs">{detail.expectedTPE}</td>
      <td className="px-3 py-1.5 font-medium tabular-nums text-xs" style={{ color: deltaColor }}>
        {detail.delta > 0 ? '+' : ''}
        {detail.delta}
      </td>
      <td className="px-3 py-1.5" />
    </tr>
  );
}

function BestDraftsTable({ data }: { data: DraftResult[] }) {
  type DSortKey = 'team' | 'season' | 'picks' | 'avgTPE' | 'expectedTPE' | 'rawDelta' | 'delta';
  const [sortKey, setSortKey] = useState<DSortKey>('delta');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const K_DRAFT = 3;
  const rows = data.map((r) => ({
    ...r,
    rawDelta: r.avgTPE - r.expectedTPE,
    delta: Math.round((r.avgTPE - r.expectedTPE) * r.picks / (r.picks + K_DRAFT)),
  }));

  function handleSort(key: DSortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'team' ? 'asc' : 'desc');
    }
  }

  const sorted = [...rows].sort((a, b) => {
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
  const ranks = rankBy(sorted, sortKey);


  function DeltaCell({ value }: { value: number }) {
    return (
      <td
        className="px-3 py-2 font-semibold tabular-nums"
        style={{
          color: value > 0 ? 'oklch(0.55 0.18 145)' : value < 0 ? 'oklch(0.55 0.2 25)' : undefined,
        }}
      >
        {value > 0 ? '+' : ''}
        {value}
      </td>
    );
  }

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
      <p className="px-4 py-2 text-xs text-muted-foreground border-b border-border">
        Each row is one team&apos;s draft in one season. Delta = avg TPE vs expected per pick. Rating =
        Bayesian-shrunk surplus (small samples pulled toward zero).
      </p>
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
              <Th label="Delta" col="rawDelta" />
              <Th label="Rating" col="delta" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => {
              const key = `${row.team}-${row.season}`;
              const isExpanded = expandedKey === key;
              return (
                <React.Fragment key={key}>
                  <tr
                    key={key}
                    className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors cursor-pointer select-none"
                    onClick={() => setExpandedKey(isExpanded ? null : key)}
                  >
                    <td className="px-3 py-2 text-muted-foreground tabular-nums text-xs">{ranks[i]}</td>
                    <td className="px-3 py-2 font-medium text-foreground">
                      <span className="mr-1.5 text-muted-foreground text-xs">{isExpanded ? '▾' : '▸'}</span>
                      {row.team}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground tabular-nums">S{row.season}</td>
                    <td className="px-3 py-2 text-muted-foreground tabular-nums">{row.picks}</td>
                    <td className="px-3 py-2 tabular-nums">{row.avgTPE}</td>
                    <td className="px-3 py-2 text-muted-foreground tabular-nums">{row.expectedTPE}</td>
                    <DeltaCell value={row.rawDelta} />
                    <DeltaCell value={row.delta} />
                  </tr>
                  {isExpanded &&
                    row.pickDetails.map((detail) => (
                      <PickDetailRow key={detail.pid} detail={detail} />
                    ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// User search
// ---------------------------------------------------------------------------

function UserSearch({ picks }: { picks: DraftPick[] }) {
  const [query, setQuery] = useState('');

  const usernames = useMemo(() => {
    const set = new Set(picks.map((p) => p.username));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [picks]);

  const results = useMemo<UserPickResult[]>(() => {
    const q = query.trim();
    if (!q) return [];
    return computeUserPicks(picks, q);
  }, [picks, query]);

  const summary = useMemo(() => {
    if (results.length === 0) return null;
    const avgDelta = Math.round(results.reduce((s, r) => s + r.delta, 0) / results.length);
    const avgTPE = Math.round(results.reduce((s, r) => s + r.highestTPE, 0) / results.length);
    const avgExp = Math.round(results.reduce((s, r) => s + r.expectedTPE, 0) / results.length);
    return { avgDelta, avgTPE, avgExp, total: results.length };
  }, [results]);

  const deltaColor = (d: number) =>
    d > 0 ? 'oklch(0.55 0.18 145)' : d < 0 ? 'oklch(0.55 0.2 25)' : undefined;

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-3">
        <h2 className="text-sm font-semibold text-foreground">User Search</h2>
        <input
          list="username-list"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by username…"
          className="flex-1 max-w-xs rounded-md border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-border"
        />
        <datalist id="username-list">
          {usernames.map((u) => (
            <option key={u} value={u} />
          ))}
        </datalist>
      </div>

      {results.length === 0 && query.trim() && (
        <p className="px-4 py-3 text-xs text-muted-foreground">
          No picks found for &quot;{query.trim()}&quot;.
        </p>
      )}

      {results.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Season</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Pick</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Player</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Team</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">TPE</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Expected</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Δ</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr
                    key={r.pid}
                    className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
                  >
                    <td className="px-3 py-2 text-muted-foreground tabular-nums text-xs">S{r.season}</td>
                    <td className="px-3 py-2 text-muted-foreground tabular-nums text-xs">
                      R{r.round} #{r.pick}
                    </td>
                    <td className="px-3 py-2 font-medium text-foreground">{r.name}</td>
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-1.5">
                        <span
                          className="inline-block w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: getTeamColor(r.owningTeam) }}
                        />
                        <span className="text-muted-foreground text-xs">{r.owningTeam}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2 tabular-nums">{r.highestTPE}</td>
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">{r.expectedTPE}</td>
                    <td
                      className="px-3 py-2 font-semibold tabular-nums"
                      style={{ color: deltaColor(r.delta) }}
                    >
                      {r.delta > 0 ? '+' : ''}
                      {r.delta}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {summary && (
            <div className="px-4 py-2 border-t border-border flex gap-6 text-xs text-muted-foreground">
              <span>{summary.total} picks</span>
              <span>
                Avg TPE <span className="text-foreground font-medium">{summary.avgTPE}</span>
              </span>
              <span>
                Avg expected <span className="text-foreground font-medium">{summary.avgExp}</span>
              </span>
              <span>
                Avg Δ{' '}
                <span className="font-semibold" style={{ color: deltaColor(summary.avgDelta) }}>
                  {summary.avgDelta > 0 ? '+' : ''}
                  {summary.avgDelta}
                </span>
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// All picks by delta
// ---------------------------------------------------------------------------

function AllPicksByDeltaTable({ picks }: { picks: DraftPick[] }) {
  type Col = keyof UserPickResult;
  const [sortKey, setSortKey] = useState<Col>('delta');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const rows = useMemo(() => computeAllPickDeltas(picks), [picks]);

  function handleSort(key: Col) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        const cmp =
          typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
        return sortDir === 'asc' ? cmp : -cmp;
      }),
    [rows, sortKey, sortDir],
  );
  const ranks = rankBy(sorted, sortKey);

  function Th({ label, col }: { label: string; col: Col }) {
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

  function DeltaCell({ value }: { value: number }) {
    return (
      <td
        className="px-3 py-2 font-semibold tabular-nums"
        style={{
          color: value > 0 ? 'oklch(0.55 0.18 145)' : value < 0 ? 'oklch(0.55 0.2 25)' : undefined,
        }}
      >
        {value > 0 ? '+' : ''}
        {value}
      </td>
    );
  }

  return (
    <>
      <p className="px-4 py-2 text-xs text-muted-foreground border-b border-border">
        Every draftee ranked by delta (actual TPE − interpolated expected for their draft slot). {rows.length} picks.
      </p>
      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border sticky top-0 bg-card">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-8">#</th>
              <Th label="Player" col="name" />
              <Th label="Season" col="season" />
              <Th label="Team" col="owningTeam" />
              <Th label="Round" col="round" />
              <Th label="Pick #" col="pick" />
              <Th label="Pctile" col="pct" />
              <Th label="TPE" col="highestTPE" />
              <Th label="Expected" col="expectedTPE" />
              <Th label="Delta" col="delta" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr
                key={`${row.pid}-${row.season}`}
                className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
              >
                <td className="px-3 py-2 text-muted-foreground tabular-nums text-xs">{ranks[i]}</td>
                <td className="px-3 py-2 font-medium">
                  <a
                    href={`https://portal.sim-football.com/player/${row.pid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {row.name}
                  </a>
                </td>
                <td className="px-3 py-2 text-muted-foreground tabular-nums">S{row.season}</td>
                <td className="px-3 py-2 text-muted-foreground">{row.owningTeam}</td>
                <td className="px-3 py-2 text-muted-foreground tabular-nums">{row.round}</td>
                <td className="px-3 py-2 text-muted-foreground tabular-nums">{row.pick}</td>
                <td className="px-3 py-2 text-muted-foreground tabular-nums">{Math.round(100 - row.pct)}th</td>
                <td className="px-3 py-2 tabular-nums">{row.highestTPE}</td>
                <td className="px-3 py-2 tabular-nums text-muted-foreground">{row.expectedTPE}</td>
                <DeltaCell value={row.delta} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Picks at percentile
// ---------------------------------------------------------------------------

function PicksAtPercentileTable({ picks }: { picks: DraftPick[] }) {
  const [bucketIndex, setBucketIndex] = useState(0);

  const result = useMemo(
    () => computePicksAtPercentile(picks, bucketIndex),
    [picks, bucketIndex],
  );

  type Col = keyof PickAtPercentile;
  const [sortKey, setSortKey] = useState<Col>('pickDelta');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  function handleSort(key: Col) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const sorted = [...result.picks].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    const cmp =
      typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
    return sortDir === 'asc' ? cmp : -cmp;
  });
  const ranks = rankBy(sorted, sortKey);

  function Th({ label, col }: { label: string; col: Col }) {
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

  function DeltaCell({ value }: { value: number }) {
    return (
      <td
        className="px-3 py-2 font-semibold tabular-nums"
        style={{
          color: value > 0 ? 'oklch(0.55 0.18 145)' : value < 0 ? 'oklch(0.55 0.2 25)' : undefined,
        }}
      >
        {value > 0 ? '+' : ''}
        {value}
      </td>
    );
  }

  return (
    <>
      <div className="px-4 py-3 flex flex-wrap items-center gap-4 border-b border-border">
        <div className="flex items-center gap-2 flex-1">
          <label className="text-xs text-muted-foreground whitespace-nowrap">Bucket</label>
          <div className="flex items-center border border-border rounded overflow-hidden text-xs">
            <button
              onClick={() => setBucketIndex((b) => Math.max(0, b - 1))}
              disabled={bucketIndex === 0}
              className="px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30"
            >
              ‹
            </button>
            <span className="px-3 py-1 tabular-nums font-medium min-w-16 text-center">
              {Math.round(100 - result.bucketEnd)}–{Math.round(100 - result.bucketStart)}th
            </span>
            <button
              onClick={() => setBucketIndex((b) => Math.min(BUCKET_COUNT - 1, b + 1))}
              disabled={bucketIndex === BUCKET_COUNT - 1}
              className="px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30"
            >
              ›
            </button>
          </div>
        </div>
        <div className="flex gap-4 text-xs text-muted-foreground shrink-0">
          <span>
            Interp. expected <span className="text-foreground font-medium">{result.expectedTPE} TPE</span>
          </span>
          <span>
            Bucket median <span className="text-foreground font-medium">{result.medianTPE} TPE</span>
          </span>
          <span>
            {result.picks.length} picks
          </span>
        </div>
      </div>
      <p className="px-4 py-2 text-xs text-muted-foreground border-b border-border">
        Picks shown are from the {Math.round(100 - result.bucketEnd)}–{Math.round(100 - result.bucketStart)}th percentile bucket ({result.bucketEnd - result.bucketStart}-point window). Expected TPE is interpolated for the exact percentile selected.
      </p>
      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border sticky top-0 bg-card">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-8">#</th>
              <Th label="Player" col="name" />
              <Th label="Season" col="season" />
              <Th label="Team" col="owningTeam" />
              <Th label="Round" col="round" />
              <Th label="Pick #" col="pick" />
              <Th label="Pctile" col="pct" />
              <Th label="TPE" col="highestTPE" />
              <Th label="Expected" col="pickExpectedTPE" />
              <Th label="Delta" col="pickDelta" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr
                key={`${row.pid}-${row.season}`}
                className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
              >
                <td className="px-3 py-2 text-muted-foreground tabular-nums text-xs">{ranks[i]}</td>
                <td className="px-3 py-2 font-medium">
                  <a
                    href={`https://portal.sim-football.com/player/${row.pid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {row.name}
                  </a>
                </td>
                <td className="px-3 py-2 text-muted-foreground tabular-nums">S{row.season}</td>
                <td className="px-3 py-2 text-muted-foreground">{row.owningTeam}</td>
                <td className="px-3 py-2 text-muted-foreground tabular-nums">{row.round}</td>
                <td className="px-3 py-2 text-muted-foreground tabular-nums">{row.pick}</td>
                <td className="px-3 py-2 text-muted-foreground tabular-nums">{Math.round(100 - row.pct)}th</td>
                <td className="px-3 py-2 tabular-nums">{row.highestTPE}</td>
                <td className="px-3 py-2 tabular-nums text-muted-foreground">{row.pickExpectedTPE}</td>
                <DeltaCell value={row.pickDelta} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Draft lookup
// ---------------------------------------------------------------------------

function DraftLookupTable({ picks }: { picks: DraftPick[] }) {
  type DraftSortKey = 'pick' | 'pct' | 'owningTeam' | 'name' | 'highestTPE' | 'expectedTPE' | 'delta';

  const allDeltas = useMemo(() => computeAllPickDeltas(picks), [picks]);

  const seasons = useMemo(
    () => [...new Set(picks.map((p) => p.season))].sort((a, b) => b - a),
    [picks],
  );

  const [season, setSeason] = useState(0);
  const [sortKey, setSortKey] = useState<DraftSortKey>('pick');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const effectiveSeason = season || seasons[0] || 0;

  function handleSort(key: DraftSortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'owningTeam' || key === 'name' ? 'asc' : key === 'pick' || key === 'pct' ? 'asc' : 'desc');
    }
  }

  const rows = useMemo(() => {
    const filtered = allDeltas.filter((r) => r.season === effectiveSeason);
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      if (cmp !== 0) return sortDir === 'asc' ? cmp : -cmp;
      return a.pick - b.pick;
    });
  }, [allDeltas, effectiveSeason, sortKey, sortDir]);

  const avgTPE = rows.length ? Math.round(rows.reduce((s, r) => s + r.highestTPE, 0) / rows.length) : 0;
  const avgExp = rows.length ? Math.round(rows.reduce((s, r) => s + r.expectedTPE, 0) / rows.length) : 0;
  const avgDelta = rows.length ? Math.round(rows.reduce((s, r) => s + r.delta, 0) / rows.length) : 0;

  function Th({ label, col }: { label: string; col: DraftSortKey }) {
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

  function DeltaCell({ value }: { value: number }) {
    return (
      <td
        className="px-3 py-2 font-semibold tabular-nums"
        style={{
          color: value > 0 ? 'oklch(0.55 0.18 145)' : value < 0 ? 'oklch(0.55 0.2 25)' : undefined,
        }}
      >
        {value > 0 ? '+' : ''}{value}
      </td>
    );
  }

  return (
    <>
      <div className="px-4 py-3 flex flex-wrap items-center gap-3 border-b border-border">
        <select
          value={effectiveSeason}
          onChange={(e) => setSeason(Number(e.target.value))}
          className="rounded-md border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-border"
        >
          {seasons.map((s) => <option key={s} value={s}>S{s}</option>)}
        </select>
        {rows.length > 0 && (
          <div className="flex gap-4 text-xs text-muted-foreground ml-auto">
            <span>Avg TPE <span className="text-foreground font-medium">{avgTPE}</span></span>
            <span>Avg expected <span className="text-foreground font-medium">{avgExp}</span></span>
            <span>
              Avg Δ{' '}
              <span
                className="font-semibold"
                style={{ color: avgDelta > 0 ? 'oklch(0.55 0.18 145)' : avgDelta < 0 ? 'oklch(0.55 0.2 25)' : undefined }}
              >
                {avgDelta > 0 ? '+' : ''}{avgDelta}
              </span>
            </span>
          </div>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Round</th>
              <Th label="Pick #" col="pick" />
              <Th label="Pctile" col="pct" />
              <Th label="Team" col="owningTeam" />
              <Th label="Player" col="name" />
              <Th label="TPE" col="highestTPE" />
              <Th label="Expected" col="expectedTPE" />
              <Th label="Delta" col="delta" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={`${row.pid}-${row.season}`}
                className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
              >
                <td className="px-3 py-2 text-muted-foreground tabular-nums">{row.round}</td>
                <td className="px-3 py-2 text-muted-foreground tabular-nums">{row.pick}</td>
                <td className="px-3 py-2 text-muted-foreground tabular-nums">{Math.round(100 - row.pct)}th</td>
                <td className="px-3 py-2 text-muted-foreground font-mono text-xs">{row.owningTeam}</td>
                <td className="px-3 py-2 font-medium">
                  <a
                    href={`https://portal.sim-football.com/player/${row.pid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {row.name}
                  </a>
                </td>
                <td className="px-3 py-2 tabular-nums">{row.highestTPE}</td>
                <td className="px-3 py-2 tabular-nums text-muted-foreground">{row.expectedTPE}</td>
                <DeltaCell value={row.delta} />
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
    modernOnly: true,
  });

  const filteredPicks = useMemo(() => {
    const applyRounds = filters.pickView === 'round';
    const seen = new Set<string>();
    const raw = picks.filter((p) => {
      if (!(!applyRounds || (p.round >= filters.roundMin && p.round <= filters.roundMax))) return false;
      if (!(filters.includeGM || p.type.toLowerCase() !== 'gm')) return false;
      if (!(!filters.completeOnly || p.season <= currentSeason - FULL_DATA_LAG)) return false;
      if (!(!filters.modernOnly || p.season >= 21)) return false;
      const key = `${p.pid}-${p.season}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    // When incomplete players are included, project their final TPE so they
    // compare fairly with complete classes.
    return filters.completeOnly ? raw : applyProjections(raw, currentSeason);
  }, [picks, filters.roundMin, filters.roundMax, filters.includeGM, filters.completeOnly, filters.pickView, filters.modernOnly, currentSeason]);

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
    () => computeGMEfficiency(filteredPicks, gmData),
    [filteredPicks, gmData],
  );

  const bestDrafts = useMemo(
    () => computeBestDrafts(filteredPicks, filters.teamMode, filters.legacyMode),
    [filteredPicks, filters.teamMode, filters.legacyMode],
  );

  if (data.status === 'loading') {
    return (
      <PageLayout title="ISFL Draft Analysis">
        <p className="text-muted-foreground text-sm">Loading draft data…</p>
      </PageLayout>
    );
  }

  if (data.status === 'error') {
    return (
      <PageLayout title="ISFL Draft Analysis">
        <p className="text-muted-foreground text-sm">Failed to load draft data. Try refreshing.</p>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="ISFL Draft Analysis"
      description="Historical draft data — pick value, class trends, and team efficiency."
    >
      <div className="space-y-6 pb-8">
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

        <UserSearch picks={filteredPicks} />

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

        <Accordion title="Picks at Percentile">
          <PicksAtPercentileTable picks={filteredPicks} />
        </Accordion>

        <Accordion title="All Picks by Delta">
          <AllPicksByDeltaTable picks={filteredPicks} />
        </Accordion>

        <Accordion title="Draft Lookup">
          <DraftLookupTable picks={filteredPicks} />
        </Accordion>
      </div>
    </PageLayout>
  );
}

