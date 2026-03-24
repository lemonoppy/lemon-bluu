import type {
  ClassTrend,
  DraftPick,
  PercentileStat,
  PickEV,
  RoundStat,
  TeamEfficiency,
} from './types';

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function topNAvg(values: number[], n: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => b - a);
  return Math.round(avg(sorted.slice(0, n)));
}

// Number of buckets used for expected-value calculations and the percentile chart.
// Higher = finer granularity, smaller interpolation range per bucket.
const BUCKET_COUNT = 20;
const BUCKET_WIDTH = 100 / BUCKET_COUNT;

function interpolateExpected(bucketAvgs: number[], pct: number): number {
  const bucketF = pct / BUCKET_WIDTH;
  const bucket = Math.floor(bucketF);
  if (bucket >= BUCKET_COUNT - 1) return bucketAvgs[BUCKET_COUNT - 1];
  const t = bucketF - bucket;
  return bucketAvgs[bucket] * (1 - t) + bucketAvgs[bucket + 1] * t;
}

// Teams that rebranded — old name maps to current name.
export const TEAM_RENAMES: Record<string, string> = {
  CHI: 'OSK',
  PHI: 'CTC',
  LVL: 'NOLA',
  BER: 'BFB',
};

function resolveTeam(team: string, legacy: boolean): string {
  return legacy ? (TEAM_RENAMES[team] ?? team) : team;
}

// Groups picks into BUCKET_COUNT buckets by their rank within each season's draft.
function assignBuckets(picks: DraftPick[]): number[][] {
  const bySeason = new Map<number, DraftPick[]>();
  for (const p of picks) {
    if (!bySeason.has(p.season)) bySeason.set(p.season, []);
    bySeason.get(p.season)!.push(p);
  }

  const buckets: number[][] = Array.from({ length: BUCKET_COUNT }, () => []);
  for (const seasonPicks of bySeason.values()) {
    const sorted = [...seasonPicks].sort((a, b) => a.pick - b.pick);
    const total = sorted.length;
    sorted.forEach((p, i) => {
      const pct = total === 1 ? 0 : (i / (total - 1)) * 100;
      const bucket = Math.min(Math.floor(pct / BUCKET_WIDTH), BUCKET_COUNT - 1);
      buckets[bucket].push(p.highestTPE);
    });
  }

  return buckets;
}

export function parseTSV(raw: string): DraftPick[] {
  const lines = raw.trim().split('\n');
  if (lines.length < 2) return [];

  return lines.slice(1).flatMap((line) => {
    const cols = line.split('\t');
    if (cols.length < 10) return [];
    const [season, round, pick, pid, type, originalTeam, owningTeam, username, name, highestTPE] =
      cols;
    const tpe = parseInt(highestTPE, 10);
    if (isNaN(tpe) || tpe === 0) return [];
    return [
      {
        season: parseInt(season, 10),
        round: parseInt(round, 10),
        pick: parseInt(pick, 10),
        pid: parseInt(pid, 10),
        type: type.trim() || 'regular',
        originalTeam: originalTeam.trim(),
        owningTeam: owningTeam.trim(),
        username: username.trim(),
        name: name.trim(),
        highestTPE: tpe,
      },
    ];
  });
}

export function computeRoundStats(picks: DraftPick[]): RoundStat[] {
  const byRound = new Map<number, number[]>();
  for (const p of picks) {
    if (!byRound.has(p.round)) byRound.set(p.round, []);
    byRound.get(p.round)!.push(p.highestTPE);
  }
  return Array.from(byRound.entries())
    .sort(([a], [b]) => a - b)
    .map(([round, tpes]) => ({
      round,
      avg: Math.round(avg(tpes)),
      median: Math.round(median(tpes)),
      count: tpes.length,
    }));
}

export function computePercentileStats(picks: DraftPick[]): PercentileStat[] {
  const buckets = assignBuckets(picks);
  return buckets.map((tpes, i) => ({
    label: `${Math.round(i * BUCKET_WIDTH)}%`,
    bucket: i,
    avg: Math.round(avg(tpes)),
    median: Math.round(median(tpes)),
    count: tpes.length,
  }));
}

export function computeClassTrends(picks: DraftPick[]): ClassTrend[] {
  const bySeason = new Map<number, number[]>();
  for (const p of picks) {
    if (!bySeason.has(p.season)) bySeason.set(p.season, []);
    bySeason.get(p.season)!.push(p.highestTPE);
  }
  return Array.from(bySeason.entries())
    .sort(([a], [b]) => a - b)
    .map(([season, tpes]) => ({
      season,
      avg: Math.round(avg(tpes)),
      median: Math.round(median(tpes)),
      top10Avg: topNAvg(tpes, 10),
      top20Avg: topNAvg(tpes, 20),
      count: tpes.length,
    }));
}

export function computePickEVTable(picks: DraftPick[], classSize: number): PickEV[] {
  const bucketAvgs = assignBuckets(picks).map((tpes) => avg(tpes));
  return Array.from({ length: classSize }, (_, i) => {
    const pct = classSize === 1 ? 0 : (i / (classSize - 1)) * 100;
    return {
      pick: i + 1,
      percentile: Math.round(pct * 10) / 10,
      ev: Math.round(interpolateExpected(bucketAvgs, pct)),
    };
  });
}

export function computeTeamEfficiency(
  picks: DraftPick[],
  mode: 'owning' | 'original' = 'owning',
  legacy = false,
): TeamEfficiency[] {
  // Build decile expected-value lookup from the full filtered pick set
  const bucketAvgs = assignBuckets(picks).map((tpes) => avg(tpes));

  // For each pick, determine its decile rank within its own season
  const bySeason = new Map<number, DraftPick[]>();
  for (const p of picks) {
    if (!bySeason.has(p.season)) bySeason.set(p.season, []);
    bySeason.get(p.season)!.push(p);
  }

  const teamKey = mode === 'owning' ? 'owningTeam' : 'originalTeam';
  const byTeam = new Map<string, { tpes: number[]; expectedTotal: number }>();

  for (const seasonPicks of bySeason.values()) {
    const sorted = [...seasonPicks].sort((a, b) => a.pick - b.pick);
    const total = sorted.length;

    sorted.forEach((p, i) => {
      const pct = total === 1 ? 0 : (i / (total - 1)) * 100;
      Math.min(Math.floor(pct / 10), 9);
      const expected = interpolateExpected(bucketAvgs, pct);

      const team = resolveTeam(p[teamKey], legacy);
      if (!byTeam.has(team)) byTeam.set(team, { tpes: [], expectedTotal: 0 });
      const entry = byTeam.get(team)!;
      entry.tpes.push(p.highestTPE);
      entry.expectedTotal += expected;
    });
  }

  return Array.from(byTeam.entries())
    .map(([team, { tpes, expectedTotal }]) => {
      const actualAvg = avg(tpes);
      const expectedAvg = expectedTotal / tpes.length;
      return {
        team,
        picks: tpes.length,
        avgTPE: Math.round(actualAvg),
        expectedTPE: Math.round(expectedAvg),
        delta: Math.round(actualAvg - expectedAvg),
      };
    })
    .sort((a, b) => b.delta - a.delta);
}
