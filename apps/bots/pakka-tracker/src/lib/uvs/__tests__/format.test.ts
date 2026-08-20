import { formatSquadStatusLines, squadStatusLabel } from '../format';
import { SquadPlayerStatus, SquadStatusLine } from '../squad';

describe('squadStatusLabel', () => {
  it('parameterizes cut labels with the top cut size', () => {
    expect(squadStatusLabel('MADE_CUT', 4)).toBe('Made Top 4 Cut / Active');
    expect(squadStatusLabel('MISSED_CUT', 8)).toBe('Missed Top 8 Cut');
    expect(squadStatusLabel('IN_CUT_POSITION', 4)).toBe('In Top 4 Position');
    expect(squadStatusLabel('DEAD_FOR_CUT', 8)).toBe('Dead for Top 8');
    expect(squadStatusLabel('LIVE_TO_WIN_OR_DRAW', 4)).toBe(
      'Live to Win/Draw Into Top 4',
    );
    expect(squadStatusLabel('MUST_WIN_OUT', 8)).toBe('Must Win Out for Top 8');
  });

  it('leaves day-1 labels static', () => {
    expect(squadStatusLabel('LIVE', 4)).toBe('Live');
    expect(squadStatusLabel('BUBBLE', 4)).toBe('Bubble');
    expect(squadStatusLabel('CLINCHED_DAY_2', 4)).toBe('Clinched Day 2');
  });
});

describe('formatSquadStatusLines', () => {
  const statusLine = (
    overrides: Partial<SquadStatusLine> = {},
  ): SquadStatusLine => ({
    member: { username: 'BNutty', name: 'Bennett' },
    rank: 2,
    record: '3-0-0',
    points: 9,
    status: 'MADE_CUT' as SquadPlayerStatus,
    ...overrides,
  });

  it('formats a squad status line with the status tag', () => {
    const lines = formatSquadStatusLines([statusLine()], 4);
    expect(lines[0]).toBe(
      'Bennett (BNutty) - Rank 2 | 3-0-0 | 9 pts - [Made Top 4 Cut / Active]',
    );
  });
});
