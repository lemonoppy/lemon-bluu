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
});
