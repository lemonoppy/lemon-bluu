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
// normalizing each pick's TPE by its season's median to remove the temporal
// upward trend. Returns normalized bucket arrays and the raw global median
// (used to scale expected values back to absolute TPE for display).
function assignNormalizedBuckets(picks: DraftPick[]): {
  buckets: number[][];
  globalMean: number;
} {
  // Use median as the reference to avoid star players inflating season means,
  // which would compress the top of the curve.
  const allTPEs = picks.map((p) => p.highestTPE);
  const globalMean = median(allTPEs);
  if (globalMean === 0) {
    return {
      buckets: Array.from({ length: BUCKET_COUNT }, () => []),
      globalMean: 0,
    };
  }

  // Compute per-season medians
  const seasonTPEs = new Map<number, number[]>();
  for (const p of picks) {
    if (!seasonTPEs.has(p.season)) seasonTPEs.set(p.season, []);
    seasonTPEs.get(p.season)!.push(p.highestTPE);
  }
  const seasonMeans = new Map<number, number>();
  for (const [season, tpes] of seasonTPEs) {
    seasonMeans.set(season, median(tpes));
  }

  const bySeason = new Map<number, DraftPick[]>();
  for (const p of picks) {
    if (!bySeason.has(p.season)) bySeason.set(p.season, []);
    bySeason.get(p.season)!.push(p);
  }

  const buckets: number[][] = Array.from({ length: BUCKET_COUNT }, () => []);
  for (const seasonPicks of bySeason.values()) {
    const seasonMean = seasonMeans.get(seasonPicks[0].season) ?? globalMean;
    const sorted = [...seasonPicks].sort((a, b) => a.pick - b.pick);
    const total = sorted.length;
    sorted.forEach((p, i) => {
      const pct = total === 1 ? 0 : (i / (total - 1)) * 100;
      const bucket = Math.min(Math.floor(pct / BUCKET_WIDTH), BUCKET_COUNT - 1);
      // Normalized ratio: 1.0 = season average, 1.5 = 50% above average
      buckets[bucket].push(p.highestTPE / seasonMean);
    });
  }

  return { buckets, globalMean };
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

export function parseGMTSV(raw: string): GMData[] {
  const lines = raw.trim().split('\n');
  if (lines.length < 2) return [];

  return lines.slice(1).flatMap((line) => {
    const cols = line.split('\t');
    if (cols.length < 4) return [];
    const [uid, username, season, team] = cols;
    const s = parseInt(season, 10);
    const u = parseInt(uid, 10);
    if (isNaN(s) || isNaN(u)) return [];
    return [
      {
        uid: u,
        username: username.trim(),
        season: s,
        team: team.trim(),
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
  const { buckets, globalMean } = assignNormalizedBuckets(picks);
  return buckets.map((normalized, i) => ({
    label: `${Math.round(i * BUCKET_WIDTH)}%`,
    bucket: i,
    avg: Math.round(avg(normalized) * globalMean),
    median: Math.round(median(normalized) * globalMean),
    count: normalized.length,
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

// Practical TPE ceiling — a small number of players exceed 1600 but the cap
// is effectively around 1650. We clamp displayed values to avoid confusing
// outputs where interpolated p75 exceeds what any player can actually reach.
const TPE_CAP = 1650;

export function computePickEVTable(picks: DraftPick[], classSize: number): PickEV[] {
  const { buckets, globalMean } = assignNormalizedBuckets(picks);
  const bucketAvgs = buckets.map((b) => avg(b));
  const bucketP25s = buckets.map((b) => percentileValue([...b].sort((a, c) => a - c), 25));
  const bucketP75s = buckets.map((b) => percentileValue([...b].sort((a, c) => a - c), 75));
  // Hit: normalized TPE >= 2.0 means player earned ≥ 2× their season's median TPE
  const HIT_THRESHOLD = 2.0;
  const bucketHitRates = buckets.map((b) =>
    b.length === 0 ? 0 : (b.filter((v) => v >= HIT_THRESHOLD).length / b.length) * 100,
  );

  const rows = Array.from({ length: classSize }, (_, i) => {
    const pct = classSize === 1 ? 0 : (i / (classSize - 1)) * 100;
    return {
      pick: i + 1,
      percentile: Math.round(pct * 10) / 10,
      ev: Math.min(Math.round(interpolateExpected(bucketAvgs, pct) * globalMean), TPE_CAP),
      p25: Math.min(Math.round(interpolateExpected(bucketP25s, pct) * globalMean), TPE_CAP),
      p75: Math.min(Math.round(interpolateExpected(bucketP75s, pct) * globalMean), TPE_CAP),
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

export function computeTeamEfficiency(
  picks: DraftPick[],
  mode: 'owning' | 'original' = 'owning',
  legacy = false,
): TeamEfficiency[] {
  const { buckets, globalMean } = assignNormalizedBuckets(picks);
  const bucketAvgs = buckets.map((normalized) => avg(normalized));

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
      // Scale normalized expected value back to raw TPE using global mean
      const expected = interpolateExpected(bucketAvgs, pct) * globalMean;

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
  const { buckets, globalMean } = assignNormalizedBuckets(picks);
  const bucketAvgs = buckets.map((b) => avg(b));

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
      const expected = interpolateExpected(bucketAvgs, pct) * globalMean;
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
// Requires gm-data.tsv cross-reference (uid, username, season, team).
//
// evBasePicks: the complete-season filtered set used to build the EV curve.
// attributionPicks: all eligible picks to credit to GMs (ignores completeOnly
//   so GMs in recent seasons get full credit for their tenure).
// GMs with fewer than MIN_PICKS attributed are excluded to avoid noise.
export function computeGMEfficiency(
  attributionPicks: DraftPick[],
  gmData: GMData[],
  evBasePicks: DraftPick[],
): GMEfficiency[] {
  // EV curve is derived from complete-season data for fair expectations
  const { buckets, globalMean } = assignNormalizedBuckets(evBasePicks);
  const bucketAvgs = buckets.map((b) => avg(b));

  // Build lookup: "season:team" → username[]
  const gmMap = new Map<string, string[]>();
  for (const gm of gmData) {
    const key = `${gm.season}:${gm.team}`;
    if (!gmMap.has(key)) gmMap.set(key, []);
    gmMap.get(key)!.push(gm.username);
  }

  const bySeason = new Map<number, DraftPick[]>();
  for (const p of attributionPicks) {
    if (!bySeason.has(p.season)) bySeason.set(p.season, []);
    bySeason.get(p.season)!.push(p);
  }

  const byGM = new Map<string, { tpes: number[]; expectedTotal: number }>();

  for (const seasonPicks of bySeason.values()) {
    const sorted = [...seasonPicks].sort((a, b) => a.pick - b.pick);
    const total = sorted.length;
    sorted.forEach((p, i) => {
      const pct = total === 1 ? 0 : (i / (total - 1)) * 100;
      const expected = interpolateExpected(bucketAvgs, pct) * globalMean;
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
  const { buckets, globalMean } = assignNormalizedBuckets(picks);
  const bucketAvgs = buckets.map((b) => avg(b));

  const bySeason = new Map<number, DraftPick[]>();
  for (const p of picks) {
    if (!bySeason.has(p.season)) bySeason.set(p.season, []);
    bySeason.get(p.season)!.push(p);
  }

  const teamKey = mode === 'owning' ? 'owningTeam' : 'originalTeam';
  // key: "season:team"
  const byDraft = new Map<string, { season: number; team: string; tpes: number[]; expectedTotal: number }>();

  for (const seasonPicks of bySeason.values()) {
    const sorted = [...seasonPicks].sort((a, b) => a.pick - b.pick);
    const total = sorted.length;
    sorted.forEach((p, i) => {
      const pct = total === 1 ? 0 : (i / (total - 1)) * 100;
      const expected = interpolateExpected(bucketAvgs, pct) * globalMean;
      const team = resolveTeam(p[teamKey], legacy);
      const key = `${p.season}:${team}`;
      if (!byDraft.has(key)) byDraft.set(key, { season: p.season, team, tpes: [], expectedTotal: 0 });
      const entry = byDraft.get(key)!;
      entry.tpes.push(p.highestTPE);
      entry.expectedTotal += expected;
    });
  }

  const MIN_PICKS = 2;

  return Array.from(byDraft.values())
    .filter((d) => d.tpes.length >= MIN_PICKS)
    .map(({ season, team, tpes, expectedTotal }) => {
      const actualAvg = avg(tpes);
      const expectedAvg = expectedTotal / tpes.length;
      return {
        team,
        season,
        picks: tpes.length,
        avgTPE: Math.round(actualAvg),
        expectedTPE: Math.round(expectedAvg),
        delta: Math.round(actualAvg - expectedAvg),
      };
    })
    .sort((a, b) => b.delta - a.delta);
}
