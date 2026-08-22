import { SimulationConfig, simulateSwissWithDraws } from '../cut-finder';

const BASE_CONFIG: SimulationConfig = {
  playerCount: 16,
  roundCount: 5,
  topCutSize: 4,
  trials: 200,
  drawWindow: 1,
};

describe('simulateSwissWithDraws', () => {
  it('throws when given a non-positive input', () => {
    expect(() =>
      simulateSwissWithDraws({ ...BASE_CONFIG, playerCount: 0 }),
    ).toThrow();
    expect(() =>
      simulateSwissWithDraws({ ...BASE_CONFIG, roundCount: 0 }),
    ).toThrow();
    expect(() =>
      simulateSwissWithDraws({ ...BASE_CONFIG, topCutSize: 0 }),
    ).toThrow();
  });

  it('sorts the probability table by points descending', () => {
    const { probabilityTable } = simulateSwissWithDraws(BASE_CONFIG);
    const points = probabilityTable.map((record) => record.points);
    expect(points).toEqual([...points].sort((a, b) => b - a));
  });

  it('keeps all probabilities within [0, 1]', () => {
    const { probabilityTable } = simulateSwissWithDraws(BASE_CONFIG);
    for (const record of probabilityTable) {
      expect(record.probabilityOfMakingCut).toBeGreaterThanOrEqual(0);
      expect(record.probabilityOfMakingCut).toBeLessThanOrEqual(1);
      expect(record.trialsMadeCut).toBeLessThanOrEqual(record.trialsObserved);
    }
  });

  it('observes exactly trials * playerCount record entries', () => {
    const { probabilityTable } = simulateSwissWithDraws(BASE_CONFIG);
    const observed = probabilityTable.reduce(
      (sum, record) => sum + record.trialsObserved,
      0,
    );
    expect(observed).toBe(BASE_CONFIG.playerCount * 200);
  });

  it('cuts line distribution sums to the number of trials', () => {
    const { cutLineDistribution } = simulateSwissWithDraws(BASE_CONFIG);
    const total = Object.values(cutLineDistribution).reduce(
      (sum, count) => sum + count,
      0,
    );
    expect(total).toBe(200);
  });

  it('tracks the loosest record that ever cleared the cut', () => {
    const { worstRecordToMakeCut, averageCutLinePoints } =
      simulateSwissWithDraws(BASE_CONFIG);
    expect(worstRecordToMakeCut.points).toBeLessThanOrEqual(
      averageCutLinePoints,
    );
    expect(worstRecordToMakeCut.record).toMatch(/^\d+-\d+(-\d+)?$/);
  });

  it('does not collapse to a single degenerate cut line', () => {
    const { averageCutLinePoints, worstRecordToMakeCut, cutLineDistribution } =
      simulateSwissWithDraws({
        playerCount: 14,
        roundCount: 4,
        topCutSize: 4,
        trials: 2000,
        drawWindow: 1,
      });
    expect(Object.keys(cutLineDistribution).length).toBeGreaterThan(1);
    expect(worstRecordToMakeCut.points).toBeLessThan(averageCutLinePoints);
  });

  it('never lets in-cut pairs draw', () => {
    const { probabilityTable } = simulateSwissWithDraws({
      playerCount: 16,
      roundCount: 4,
      topCutSize: 4,
      trials: 2000,
      drawWindow: 1,
      drawProb: 1,
    });
    const perfect = probabilityTable.find((record) => record.record === '4-0');
    expect(perfect).toBeDefined();
    expect(perfect!.probabilityOfMakingCut).toBe(1);
    expect(perfect!.trialsObserved).toBe(2000);
  });

  it('draws at a lower rate when players need a win to get in', () => {
    const base = {
      playerCount: 16,
      roundCount: 4,
      topCutSize: 4,
      trials: 2000,
      drawWindow: 1,
      drawProb: 1,
    };
    const needsWin = simulateSwissWithDraws({ ...base, needsWinFactor: 0 });
    expect(needsWin.averageIntentionalDrawsPerTrial).toBe(0);

    const reduced = simulateSwissWithDraws({ ...base, needsWinFactor: 0.3 });
    expect(reduced.averageIntentionalDrawsPerTrial).toBeGreaterThan(0);

    const fullRate = simulateSwissWithDraws({ ...base, needsWinFactor: 1 });
    expect(fullRate.averageIntentionalDrawsPerTrial).toBeGreaterThan(
      reduced.averageIntentionalDrawsPerTrial,
    );
  });
});
