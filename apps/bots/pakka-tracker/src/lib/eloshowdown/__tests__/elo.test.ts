import { computeEventElo, parseRecord } from '../elo';
import { EloHistoryPoint } from '../types';

const point = (overrides: Partial<EloHistoryPoint>): EloHistoryPoint => ({
  date: '2026-08-05T22:00:00Z',
  elo_before: 1000,
  elo_after: 1018,
  elo_change: 18,
  match_id: 1,
  opponent_id: 2,
  opponent_name: 'Opponent',
  result: 'win',
  ...overrides,
});

describe('computeEventElo', () => {
  const start = new Date('2026-08-05T21:00:00Z');
  const end = new Date('2026-08-05T23:00:00Z');

  it('returns nulls when there is no history in the window', () => {
    const elo = computeEventElo([point({ date: '2026-08-10T22:00:00Z' })], start, end);
    expect(elo).toEqual({ eloBefore: null, eloAfter: null, matches: 0 });
  });

  it('returns the before/after elo across the window', () => {
    const elo = computeEventElo(
      [
        point({ date: '2026-08-05T21:30:00Z', elo_before: 1000, elo_after: 1018 }),
        point({ date: '2026-08-05T22:15:00Z', elo_before: 1018, elo_after: 1038 }),
        point({ date: '2026-08-05T22:50:00Z', elo_before: 1038, elo_after: 1010 }),
      ],
      start,
      end,
    );
    expect(elo).toEqual({ eloBefore: 1000, eloAfter: 1010, matches: 3 });
  });

  it('ignores matches outside the window and sorts by date', () => {
    const elo = computeEventElo(
      [
        point({ date: '2026-08-05T23:30:00Z', elo_before: 9999, elo_after: 9999 }),
        point({ date: '2026-08-05T22:50:00Z', elo_before: 1038, elo_after: 1010 }),
        point({ date: '2026-08-05T21:30:00Z', elo_before: 1000, elo_after: 1018 }),
      ],
      start,
      end,
    );
    expect(elo).toEqual({ eloBefore: 1000, eloAfter: 1010, matches: 2 });
  });
});

describe('parseRecord', () => {
  it('parses a full record', () => {
    expect(parseRecord('3-1-0')).toEqual({ wins: 3, losses: 1, draws: 0 });
  });

  it('handles records without draws', () => {
    expect(parseRecord('2-0')).toEqual({ wins: 2, losses: 0, draws: 0 });
  });

  it('handles empty records', () => {
    expect(parseRecord('')).toEqual({ wins: 0, losses: 0, draws: 0 });
  });
});
