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

// Linear interpolation of the p-th percentile from a pre-sorted array.
function percentileValue(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

// Number of buckets used for expected-value calculations and the percentile chart.
// Higher = finer granularity, smaller interpolation range per bucket.
const BUCKET_COUNT = 20;
const BUCKET_WIDTH = 100 / BUCKET_COUNT;

// Number of seasons per era for team efficiency trend analysis.
const ERA_SIZE = 10;

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

// Groups picks into BUCKET_COUNT buckets by within-season percentile rank,
// normalizing each pick's TPE by its season's median. Used only for hit-rate
// calculation in computePickEVTable, where "hit" is defined relative to the
// season's own median (1.0 = season median, 2.0 = hit threshold).
function assignNormalizedBuckets(picks: DraftPick[]): { buckets: number[][] } {
  const seasonTPEs = new Map<number, number[]>();
  for (const p of picks) {
    if (!seasonTPEs.has(p.season)) seasonTPEs.set(p.season, []);
    seasonTPEs.get(p.season)!.push(p.highestTPE);
  }
  const seasonMedians = new Map<number, number>();
  for (const [season, tpes] of seasonTPEs) {
    seasonMedians.set(season, median(tpes));
  }

  const bySeason = new Map<number, DraftPick[]>();
  for (const p of picks) {
    if (!bySeason.has(p.season)) bySeason.set(p.season, []);
    bySeason.get(p.season)!.push(p);
  }

  const buckets: number[][] = Array.from({ length: BUCKET_COUNT }, () => []);
  for (const seasonPicks of bySeason.values()) {
    const seasonMed = seasonMedians.get(seasonPicks[0].season) ?? 1;
    if (seasonMed === 0) continue;
    const sorted = [...seasonPicks].sort((a, b) => a.pick - b.pick);
    const total = sorted.length;
    sorted.forEach((p, i) => {
      const pct = total === 1 ? 0 : (i / (total - 1)) * 100;
      const bucket = Math.min(Math.floor(pct / BUCKET_WIDTH), BUCKET_COUNT - 1);
      buckets[bucket].push(p.highestTPE / seasonMed);
    });
  }

  return { buckets };
}

// Groups picks into BUCKET_COUNT buckets by within-season percentile rank,
// storing raw (absolute) TPE values. Used for all EV and efficiency functions.
function assignRawBuckets(picks: DraftPick[]): { buckets: number[][] } {
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
  return { buckets };
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
  const { buckets } = assignRawBuckets(picks);
  return buckets.map((raw, i) => ({
    label: `${Math.round(i * BUCKET_WIDTH)}%`,
    bucket: i,
    avg: Math.round(avg(raw)),
    median: Math.round(median(raw)),
    count: raw.length,
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
  const { buckets: rawBuckets } = assignRawBuckets(picks);
  // Normalized buckets for hit rate — "hit" means ≥ 2× season median, which
  // requires the season-median normalization to be meaningful across eras.
  const { buckets: normBuckets } = assignNormalizedBuckets(picks);

  // Median is more robust than mean here: top picks tend to have a bimodal
  // distribution (early quitters at low TPE vs. developed players at high TPE).
  // Mean is dragged down by quitters equally at every position, flattening the
  // curve. Median sits in the developer cluster for top picks and the quitter
  // cluster for late picks, producing a steeper, more meaningful dropoff.
  const bucketAvgs = rawBuckets.map((b) => median(b));
  const bucketP25s = rawBuckets.map((b) => percentileValue([...b].sort((a, c) => a - c), 25));
  const bucketP75s = rawBuckets.map((b) => percentileValue([...b].sort((a, c) => a - c), 75));
  // Hit: normalized TPE >= 2.0 means player earned ≥ 2× their season's median TPE
  const HIT_THRESHOLD = 2.0;
  const bucketHitRates = normBuckets.map((b) =>
    b.length === 0 ? 0 : (b.filter((v) => v >= HIT_THRESHOLD).length / b.length) * 100,
  );

  const rows = Array.from({ length: classSize }, (_, i) => {
    const pct = classSize === 1 ? 0 : (i / (classSize - 1)) * 100;
    return {
      pick: i + 1,
      percentile: Math.round(pct * 10) / 10,
      ev: Math.round(interpolateExpected(bucketAvgs, pct)),
      p25: Math.round(interpolateExpected(bucketP25s, pct)),
      p75: Math.round(interpolateExpected(bucketP75s, pct)),
      hitRate: Math.round(interpolateExpected(bucketHitRates, pct) * 10) / 10,
      relValue: 100,
    };
  });

  // Second pass: relative value as % of pick 1's EV
  const pick1EV = rows[0]?.ev || 1;
  for (const r of rows) {
    r.relValue = Math.round((r.ev / pick1EV) * 100);
  }

  return rows;
}

export function computeUserPicks(allPicks: DraftPick[], username: string): UserPickResult[] {
  const { buckets } = assignRawBuckets(allPicks);
  const bucketAvgs = buckets.map((b) => median(b));

  // Per-season pick lists sorted by overall pick order (needed for percentile rank)
  const bySeason = new Map<number, DraftPick[]>();
  for (const p of allPicks) {
    if (!bySeason.has(p.season)) bySeason.set(p.season, []);
    bySeason.get(p.season)!.push(p);
  }
  for (const [s, sp] of bySeason) {
    bySeason.set(s, [...sp].sort((a, b) => a.pick - b.pick));
  }

  const lower = username.toLowerCase();
  const userPicks = allPicks.filter((p) => p.username.toLowerCase() === lower);

  return userPicks
    .map((p) => {
      const seasonPicks = bySeason.get(p.season) ?? [];
      const total = seasonPicks.length;
      const idx = seasonPicks.findIndex((sp) => sp.pid === p.pid);
      const pct = total <= 1 ? 0 : (idx / (total - 1)) * 100;
      const expectedTPE = Math.round(interpolateExpected(bucketAvgs, pct));
      return {
        season: p.season,
        round: p.round,
        pick: p.pick,
        pid: p.pid,
        name: p.name,
        owningTeam: p.owningTeam,
        highestTPE: p.highestTPE,
        expectedTPE,
        delta: p.highestTPE - expectedTPE,
      };
    })
    .sort((a, b) => a.season - b.season || a.pick - b.pick);
}

export function computeTeamEfficiency(
  picks: DraftPick[],
  mode: 'owning' | 'original' = 'owning',
  legacy = false,
): TeamEfficiency[] {
  const { buckets } = assignRawBuckets(picks);
  const bucketAvgs = buckets.map((b) => median(b));

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

// Splits team efficiency into 10-season era buckets so you can see how a
// franchise's drafting performance has changed over time.
export function computeTeamEfficiencyTrends(
  picks: DraftPick[],
  mode: 'owning' | 'original' = 'owning',
  legacy = false,
): TeamEfficiencyTrend[] {
  const { buckets } = assignRawBuckets(picks);
  const bucketAvgs = buckets.map((b) => median(b));

  const bySeason = new Map<number, DraftPick[]>();
  for (const p of picks) {
    if (!bySeason.has(p.season)) bySeason.set(p.season, []);
    bySeason.get(p.season)!.push(p);
  }

  const seasons = Array.from(bySeason.keys()).sort((a, b) => a - b);
  if (seasons.length === 0) return [];

  const minSeason = seasons[0];
  const maxSeason = seasons[seasons.length - 1];

  function getEraLabel(season: number): string {
    const eraIndex = Math.floor((season - minSeason) / ERA_SIZE);
    const start = minSeason + eraIndex * ERA_SIZE;
    const end = Math.min(start + ERA_SIZE - 1, maxSeason);
    return `S${start}–${end}`;
  }

  const teamKey = mode === 'owning' ? 'owningTeam' : 'originalTeam';
  const teamEraData = new Map<string, Map<string, { tpes: number[]; expectedTotal: number }>>();

  for (const seasonPicks of bySeason.values()) {
    const sorted = [...seasonPicks].sort((a, b) => a.pick - b.pick);
    const total = sorted.length;
    sorted.forEach((p, i) => {
      const pct = total === 1 ? 0 : (i / (total - 1)) * 100;
      const expected = interpolateExpected(bucketAvgs, pct);
      const team = resolveTeam(p[teamKey], legacy);
      const era = getEraLabel(p.season);
      if (!teamEraData.has(team)) teamEraData.set(team, new Map());
      const eraMap = teamEraData.get(team)!;
      if (!eraMap.has(era)) eraMap.set(era, { tpes: [], expectedTotal: 0 });
      const entry = eraMap.get(era)!;
      entry.tpes.push(p.highestTPE);
      entry.expectedTotal += expected;
    });
  }

  // Build ordered era labels from minSeason to maxSeason
  const allEras: string[] = [];
  for (let s = minSeason; s <= maxSeason; s += ERA_SIZE) {
    allEras.push(getEraLabel(s));
  }

  const MIN_PICKS = 3;

  return Array.from(teamEraData.entries())
    .map(([team, eraMap]) => ({
      team,
      eras: allEras
        .filter((era) => (eraMap.get(era)?.tpes.length ?? 0) >= MIN_PICKS)
        .map((era) => {
          const { tpes, expectedTotal } = eraMap.get(era)!;
          const actualAvg = avg(tpes);
          const expectedAvg = expectedTotal / tpes.length;
          return {
            era,
            picks: tpes.length,
            avgTPE: Math.round(actualAvg),
            expectedTPE: Math.round(expectedAvg),
            delta: Math.round(actualAvg - expectedAvg),
          };
        }),
    }))
    .filter((t) => t.eras.length >= 2)
    .sort((a, b) => a.team.localeCompare(b.team));
}

// Attributes each pick to all GMs on the owning team's staff that season.
// GMs with fewer than MIN_PICKS attributed are excluded to avoid noise.
export function computeGMEfficiency(picks: DraftPick[], gmData: GMData[]): GMEfficiency[] {
  const { buckets } = assignRawBuckets(picks);
  const bucketAvgs = buckets.map((b) => median(b));

  // Build lookup: "season:team" → username[]
  const gmMap = new Map<string, string[]>();
  for (const gm of gmData) {
    const key = `${gm.season}:${gm.team}`;
    if (!gmMap.has(key)) gmMap.set(key, []);
    gmMap.get(key)!.push(gm.username);
  }

  const bySeason = new Map<number, DraftPick[]>();
  for (const p of picks) {
    if (!bySeason.has(p.season)) bySeason.set(p.season, []);
    bySeason.get(p.season)!.push(p);
  }

  const byGM = new Map<string, { tpes: number[]; expectedTotal: number }>();

  for (const seasonPicks of bySeason.values()) {
    const sorted = [...seasonPicks].sort((a, b) => a.pick - b.pick);
    const total = sorted.length;
    sorted.forEach((p, i) => {
      const pct = total === 1 ? 0 : (i / (total - 1)) * 100;
      const expected = interpolateExpected(bucketAvgs, pct);
      const gms = gmMap.get(`${p.season}:${p.owningTeam}`) ?? [];
      for (const username of gms) {
        if (!byGM.has(username)) byGM.set(username, { tpes: [], expectedTotal: 0 });
        const entry = byGM.get(username)!;
        entry.tpes.push(p.highestTPE);
        entry.expectedTotal += expected;
      }
    });
  }

  const MIN_PICKS = 5;

  return Array.from(byGM.entries())
    .filter(([, { tpes }]) => tpes.length >= MIN_PICKS)
    .map(([username, { tpes, expectedTotal }]) => {
      const actualAvg = avg(tpes);
      const expectedAvg = expectedTotal / tpes.length;
      return {
        username,
        picks: tpes.length,
        avgTPE: Math.round(actualAvg),
        expectedTPE: Math.round(expectedAvg),
        delta: Math.round(actualAvg - expectedAvg),
      };
    })
    .sort((a, b) => b.delta - a.delta);
}

// Ranks every individual team draft (one row per team per season) by how far
// the actual avg TPE deviated from expected. Useful for identifying the best
// and worst single-season drafts in league history.
export function computeBestDrafts(
  picks: DraftPick[],
  mode: 'owning' | 'original' = 'owning',
  legacy = false,
): DraftResult[] {
  const { buckets } = assignRawBuckets(picks);
  const bucketAvgs = buckets.map((b) => median(b));

  const bySeason = new Map<number, DraftPick[]>();
  for (const p of picks) {
    if (!bySeason.has(p.season)) bySeason.set(p.season, []);
    bySeason.get(p.season)!.push(p);
  }

  const teamKey = mode === 'owning' ? 'owningTeam' : 'originalTeam';
  // key: "season:team"
  const byDraft = new Map<string, { season: number; team: string; tpes: number[]; expectedTotal: number; details: DraftPickDetail[] }>();

  for (const seasonPicks of bySeason.values()) {
    const sorted = [...seasonPicks].sort((a, b) => a.pick - b.pick);
    const total = sorted.length;
    sorted.forEach((p, i) => {
      const pct = total === 1 ? 0 : (i / (total - 1)) * 100;
      const expectedRaw = interpolateExpected(bucketAvgs, pct);
      const expectedTPE = Math.round(expectedRaw);
      const team = resolveTeam(p[teamKey], legacy);
      const key = `${p.season}:${team}`;
      if (!byDraft.has(key)) byDraft.set(key, { season: p.season, team, tpes: [], expectedTotal: 0, details: [] });
      const entry = byDraft.get(key)!;
      entry.tpes.push(p.highestTPE);
      entry.expectedTotal += expectedRaw;
      entry.details.push({
        round: p.round,
        pick: p.pick,
        pid: p.pid,
        name: p.name,
        highestTPE: p.highestTPE,
        expectedTPE,
        delta: p.highestTPE - expectedTPE,
      });
    });
  }

  const MIN_PICKS = 2;

  return Array.from(byDraft.values())
    .filter((d) => d.tpes.length >= MIN_PICKS)
    .map(({ season, team, tpes, expectedTotal, details }) => {
      const n = tpes.length;
      const actualTotal = tpes.reduce((s, v) => s + v, 0);
      // Blend between sum and average: divide total delta by √picks.
      // A 4-pick draft needs 2× the total surplus of a 1-pick draft to rank
      // equally — rewarding both quality and volume with diminishing returns.
      const delta = Math.round((actualTotal - expectedTotal) / Math.sqrt(n));
      return {
        team,
        season,
        picks: n,
        avgTPE: Math.round(avg(tpes)),
        expectedTPE: Math.round(expectedTotal / n),
        delta,
        pickDetails: details,
      };
    })
    .sort((a, b) => b.delta - a.delta);
}
