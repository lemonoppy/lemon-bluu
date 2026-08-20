import { timerStatusLabel } from '../scraper';
import { ScrapeResult } from '../types';

const makeResult = (overrides: Partial<ScrapeResult> = {}): ScrapeResult => ({
  players: [],
  event: {
    id: 1,
    start_datetime: '',
    end_datetime: '',
    timer_is_running: false,
    timer_end_datetime: '',
    name: 'Test Event',
    store: { id: 1, name: 'Store' },
    tournament_phases: [],
  },
  currentRound: 1,
  displayRound: 1,
  totalRounds: 5,
  roundsRemaining: 4,
  isComplete: false,
  latestRoundStatus: 'IN_PROGRESS',
  phaseName: 'Phase 1',
  isDay2: false,
  isElimination: false,
  isCuttingPhase: true,
  totalSwissRounds: 5,
  topCutSize: 4,
  activePhase: {
    id: 1,
    phase_name: 'Phase 1',
    status: 'IN_PROGRESS',
    order_in_phases: 1,
    number_of_rounds: 5,
    round_type: 'SWISS',
    rank_required_to_enter_phase: null,
    rounds: [],
  },
  allPhases: [],
  ...overrides,
});

describe('timerStatusLabel', () => {
  it('reports a finished phase', () => {
    const result = makeResult({ isComplete: true });
    expect(timerStatusLabel(result)).toBe('Round timer: PHASE FINISHED');
  });

  it('reports a running timer with time remaining', () => {
    const endsAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const result = makeResult({
      latestRoundStatus: 'IN_PROGRESS',
      event: {
        ...makeResult().event,
        timer_is_running: true,
        timer_end_datetime: endsAt,
      },
    });
    expect(timerStatusLabel(result)).toMatch(/RUNNING - \d+m \d+s remaining/);
  });

  it('reports a complete round waiting on the next', () => {
    const result = makeResult({ latestRoundStatus: 'COMPLETE' });
    expect(timerStatusLabel(result)).toBe(
      'Round timer: ROUND COMPLETE (Waiting for next round)',
    );
  });

  it('reports no timer when idle', () => {
    expect(timerStatusLabel(makeResult())).toBe('Round timer: NOT RUNNING');
  });
});
