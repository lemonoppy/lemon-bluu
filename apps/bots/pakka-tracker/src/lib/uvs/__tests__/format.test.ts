import { formatSquadStatusLines, squadStatusLabel } from '../format';
import { SquadPlayerStatus, SquadStatusLine } from '../squad';

describe('squadStatusLabel', () => {
  it('shows final placement for a finished event', () => {
    expect(squadStatusLabel('FINISHED', 4, 4)).toBe('Finished 4th');
    expect(squadStatusLabel('FINISHED', 4, 1)).toBe('Finished 1st');
    expect(squadStatusLabel('FINISHED', 8, 23)).toBe('Finished 23rd');
  });

  it('parameterizes cut labels with the top cut size', () => {
    expect(squadStatusLabel('MADE_CUT', 4, 2)).toBe('Made Top 4 Cut / Active');
    expect(squadStatusLabel('MISSED_CUT', 8, 10)).toBe('Missed Top 8 Cut');
    expect(squadStatusLabel('IN_CUT_POSITION', 4, 2)).toBe('In Top 4 Position');
    expect(squadStatusLabel('DEAD_FOR_CUT', 8, 10)).toBe('Dead for Top 8');
    expect(squadStatusLabel('LIVE_TO_WIN_OR_DRAW', 4, 5)).toBe(
      'Live to Win/Draw Into Top 4',
    );
    expect(squadStatusLabel('MUST_WIN_OUT', 8, 10)).toBe('Must Win Out for Top 8');
  });

  it('leaves day-1 labels static', () => {
    expect(squadStatusLabel('LIVE', 4, 5)).toBe('Live');
    expect(squadStatusLabel('BUBBLE', 4, 5)).toBe('Bubble');
    expect(squadStatusLabel('CLINCHED_DAY_2', 4, 5)).toBe('Clinched Day 2');
  });
});

describe('formatSquadStatusLines', () => {
  const statusLine = (
    overrides: Partial<SquadStatusLine> = {},
  ): SquadStatusLine => ({
    member: { username: 'BNutty', name: 'Bennett', eloShowdownId: 74345 },
    rank: 4,
    record: '3-1-0',
    points: 9,
    status: 'FINISHED' as SquadPlayerStatus,
    ...overrides,
  });

  it('formats a squad status line with the status tag', () => {
    const lines = formatSquadStatusLines([statusLine()], 4);
    expect(lines[0]).toBe(
      'Bennett (BNutty) - Rank 4 | 3-1-0 | 9 pts - [Finished 4th]',
    );
  });
});
