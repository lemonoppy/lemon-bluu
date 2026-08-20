export interface SimulationConfig {
  playerCount: number;
  roundCount: number;
  topCutSize: number;
  trials?: number;
  drawWindow?: number;
  winPoints?: number;
  drawPoints?: number;
}

export function simulateSwissWithDraws(config: SimulationConfig): {
  probabilityTable: {
    record: string;
    trialsMadeCut: number;
    probabilityOfMakingCut: number;
    trialsObserved: number;
    points: number;
  }[];
  averageIntentionalDrawsPerTrial: number;
  averageCutLinePoints: number;
  worstRecordToMakeCut: { record: string; points: number };
  cutLineDistribution: Record<string, number>;
} {
  const {
    playerCount,
    roundCount,
    topCutSize,
    trials = 5000,
    drawWindow = 1,
    winPoints = 3,
    drawPoints = 1,
  } = config;

  if (playerCount <= 0 || roundCount <= 0 || topCutSize <= 0) {
    throw new Error('playerCount, roundCount, and topCutSize must be positive');
  }

  const maxPts = roundCount * winPoints;

  const wins = new Int32Array(playerCount);
  const losses = new Int32Array(playerCount);
  const draws = new Int32Array(playerCount);
  const points = new Int32Array(playerCount);
  const order = new Int32Array(playerCount);
  const bucketHeads = new Int32Array(maxPts + 1);
  const bucketFill = new Int32Array(maxPts + 1);

  const observed = new Map<string, { points: number; observed: number; madeCut: number }>();
  const cutLineDistribution: Record<string, number> = {};
  let totalCutLinePoints = 0;
  let totalIntentionalDraws = 0;

  // Track the loosest (lowest-points) record that EVER cleared the cut
  let worstCutPoints = Infinity;
  let worstCutLabel = '';

  const recordLabel = (i: number) =>
    draws[i] > 0 ? `${wins[i]}-${losses[i]}-${draws[i]}` : `${wins[i]}-${losses[i]}`;

  for (let t = 0; t < trials; t++) {
    wins.fill(0);
    losses.fill(0);
    draws.fill(0);
    points.fill(0);

    let intentionalDraws = 0;

    for (let round = 1; round <= roundCount; round++) {
      bucketHeads.fill(0);
      for (let i = 0; i < playerCount; i++) bucketHeads[points[i]]++;
      let offset = 0;
      for (let p = maxPts; p >= 0; p--) {
        const count = bucketHeads[p];
        bucketHeads[p] = offset;
        offset += count;
      }
      bucketFill.set(bucketHeads);
      for (let i = 0; i < playerCount; i++) {
        const p = points[i];
        order[bucketFill[p]++] = i;
      }

      const inWindow = round > roundCount - drawWindow;
      const n = playerCount;
      const pairCount = n >> 1;
      const cutLine = inWindow ? points[order[Math.min(topCutSize - 1, n - 1)]] : 0;

      for (let i = 0; i < pairCount; i++) {
        const a = order[i * 2];
        const b = order[i * 2 + 1];
        const shouldDraw =
          inWindow && points[a] + drawPoints >= cutLine && points[b] + drawPoints >= cutLine;

        if (shouldDraw) {
          draws[a]++;
          draws[b]++;
          points[a] += drawPoints;
          points[b] += drawPoints;
          intentionalDraws++;
        } else if (Math.random() < 0.5) {
          wins[a]++;
          points[a] += winPoints;
          losses[b]++;
        } else {
          wins[b]++;
          points[b] += winPoints;
          losses[a]++;
        }
      }
      if (n % 2 === 1) {
        const bye = order[n - 1];
        wins[bye]++;
        points[bye] += winPoints;
      }
    }

    totalIntentionalDraws += intentionalDraws;

    bucketHeads.fill(0);
    for (let i = 0; i < playerCount; i++) bucketHeads[points[i]]++;
    let offset = 0;
    for (let p = maxPts; p >= 0; p--) {
      const count = bucketHeads[p];
      bucketHeads[p] = offset;
      offset += count;
    }
    bucketFill.set(bucketHeads);
    for (let i = 0; i < playerCount; i++) {
      const p = points[i];
      order[bucketFill[p]++] = i;
    }

    const cutLinePlayer = order[Math.min(topCutSize - 1, playerCount - 1)];
    const cutLinePts = points[cutLinePlayer];
    totalCutLinePoints += cutLinePts;

    const cutLabel = recordLabel(cutLinePlayer);
    cutLineDistribution[cutLabel] = (cutLineDistribution[cutLabel] ?? 0) + 1;

    // Update the worst (loosest) record ever seen making the cut
    if (cutLinePts < worstCutPoints) {
      worstCutPoints = cutLinePts;
      worstCutLabel = cutLabel;
    }

    for (let rank = 0; rank < playerCount; rank++) {
      const idx = order[rank];
      const label = recordLabel(idx);
      const entry = observed.get(label) ?? { points: points[idx], observed: 0, madeCut: 0 };
      entry.observed += 1;
      if (rank < topCutSize) entry.madeCut += 1;
      observed.set(label, entry);
    }
  }

  const probabilityTable = Array.from(observed.entries())
    .map(([record, v]) => ({
      record,
      points: v.points,
      trialsObserved: v.observed,
      trialsMadeCut: v.madeCut,
      probabilityOfMakingCut: v.madeCut / v.observed,
    }))
    .sort((a, b) => b.points - a.points);

  return {
    probabilityTable,
    cutLineDistribution,
    averageCutLinePoints: totalCutLinePoints / trials,
    averageIntentionalDrawsPerTrial: totalIntentionalDraws / trials,
    worstRecordToMakeCut: { record: worstCutLabel, points: worstCutPoints },
  };
}
