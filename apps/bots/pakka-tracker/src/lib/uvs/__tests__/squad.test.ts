import { evaluateSquadStatus } from '../squad';
import {
  ScrapeResult,
  UVSResultData,
  UVSTournamentPhase,
} from '../types';

const makePhase = (overrides: Partial<UVSTournamentPhase> = {}): UVSTournamentPhase => ({
  id: 1,
  phase_name: 'Phase 1',
  status: 'COMPLETE',
  order_in_phases: 1,
  number_of_rounds: 5,
  round_type: 'SWISS',
  rank_required_to_enter_phase: null,
  rounds: [],
  ...overrides,
});

const makePlayer = (overrides: Partial<UVSResultData> = {}): UVSResultData => ({
  rank: '1',
  username: 'BNutty',
  legend: '',
  points: 9,
  record: '3-0-0',
  omw: 0.5,
  gw: 1,
  ogw: 0.5,
  status: 'ACTIVE',
  ...overrides,
});

const makeResult = (overrides: Partial<ScrapeResult> = {}): ScrapeResult => {
  const phase1 = makePhase();
  return {
    players: [makePlayer()],
    event: {
      id: 1,
      start_datetime: '',
      end_datetime: '',
      timer_is_running: false,
      timer_end_datetime: '',
      name: 'Test Event',
      store: { id: 1, name: 'Store' },
      tournament_phases: [phase1],
    },
    currentRound: 3,
    displayRound: 3,
    totalRounds: 5,
    roundsRemaining: 2,
    isComplete: false,
    isCutDecided: false,
    latestRoundStatus: 'COMPLETE',
    phaseName: 'Phase 1',
    isDay2: false,
    isElimination: false,
    isCuttingPhase: true,
    totalSwissRounds: 5,
    topCutSize: 4,
    activePhase: phase1,
    allPhases: [phase1],
    ...overrides,
  };
};

describe('evaluateSquadStatus', () => {
  it('returns null when no tracked members are present', () => {
    const result = makeResult({ players: [makePlayer({ username: 'SomeoneElse' })] });
    expect(evaluateSquadStatus(result)).toBeNull();
  });

  it('marks a player inside the cut as in cut position', () => {
    const result = makeResult();
    const squad = evaluateSquadStatus(result);
    expect(squad?.players[0].status).toBe('IN_CUT_POSITION');
  });

  it('marks a player as secure on the final round inside the cut', () => {
    const result = makeResult({
      roundsRemaining: 1,
      players: [makePlayer({ rank: '2', record: '4-0-0', points: 12 })],
    });
    expect(evaluateSquadStatus(result)?.players[0].status).toBe('SECURE');
  });

  it('marks players as finished once the event is complete', () => {
    const result = makeResult({
      isComplete: true,
      roundsRemaining: 0,
      players: [makePlayer({ rank: '4' })],
    });
    expect(evaluateSquadStatus(result)?.players[0].status).toBe('FINISHED');
  });

  it('marks made/missed cut during the elimination phase', () => {
    const made = makeResult({
      isElimination: true,
      players: [makePlayer({ rank: '2' })],
    });
    expect(evaluateSquadStatus(made)?.players[0].status).toBe('MADE_CUT');

    const missed = makeResult({
      isElimination: true,
      players: [makePlayer({ rank: '10' })],
    });
    expect(evaluateSquadStatus(missed)?.players[0].status).toBe('MISSED_CUT');
  });

  it('marks made/missed cut once the cutting phase finishes', () => {
    const made = makeResult({
      isCutDecided: true,
      isElimination: false,
      roundsRemaining: 0,
      players: [makePlayer({ rank: '2' })],
    });
    expect(evaluateSquadStatus(made)?.players[0].status).toBe('MADE_CUT');
    expect(evaluateSquadStatus(made)?.thresholdPoints).toBeUndefined();

    const missed = makeResult({
      isCutDecided: true,
      isElimination: false,
      roundsRemaining: 0,
      players: [makePlayer({ rank: '9', record: '1-3-0', points: 3 })],
    });
    expect(evaluateSquadStatus(missed)?.players[0].status).toBe('MISSED_CUT');
  });

  describe('day 1 processing', () => {
    const day1 = (record: string): ScrapeResult =>
      makeResult({
        isCuttingPhase: false,
        players: [makePlayer({ rank: '5', record })],
      });

    it('flags a live record as live', () => {
      expect(evaluateSquadStatus(day1('1-1-0'))?.players[0].status).toBe('LIVE');
    });

    it('flags a player at the drop threshold as bubble', () => {
      expect(evaluateSquadStatus(day1('0-2-0'))?.players[0].status).toBe('BUBBLE');
    });

    it('flags a player with too many dropped points as out', () => {
      expect(evaluateSquadStatus(day1('0-3-0'))?.players[0].status).toBe('OUT_FOR_DAY_2');
    });
  });

  it('computes combined squad totals and percentages', () => {
    const result = makeResult({
      players: [
        makePlayer({ username: 'BNutty', rank: '1', record: '3-0-0', points: 9 }),
        makePlayer({ username: 'Nova', rank: '4', record: '1-1-1', points: 4 }),
      ],
    });
    const squad = evaluateSquadStatus(result);
    expect(squad?.squadTotals).toEqual({ wins: 4, losses: 1, draws: 1 });
    expect(squad?.combinedWinPercent).toBeCloseTo(75, 2);
    expect(squad?.combinedPointsPercent).toBeCloseTo(72.22, 2);
  });

  it('uses a realistic cut line to classify bubble players', () => {
    const fillers = Array.from({ length: 13 }, (_, i) =>
      makePlayer({
        username: `Player${i}`,
        rank: String(i + 1),
        record: '2-1-0',
        points: 6,
      }),
    );

    const base = makeResult({
      roundsRemaining: 1,
      totalRounds: 4,
      totalSwissRounds: 4,
    });

    const mustWin = evaluateSquadStatus({
      ...base,
      players: [...fillers, makePlayer({ username: 'BNutty', rank: '14', record: '2-2-0', points: 6 })],
    });
    expect(mustWin?.thresholdPoints).toBeGreaterThanOrEqual(8);
    expect(mustWin?.thresholdPoints).toBeLessThanOrEqual(9);
    expect(mustWin?.players[0].status).toBe('MUST_WIN_OUT');

    const canDraw = evaluateSquadStatus({
      ...base,
      players: [...fillers, makePlayer({ username: 'BNutty', rank: '6', record: '3-1-0', points: 9 })],
    });
    expect(canDraw?.players[0].status).toBe('LIVE_TO_WIN_OR_DRAW');
  });
});
