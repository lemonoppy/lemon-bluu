import { playerSorter } from '../playerSorter';
import { Player } from 'typings/portal';

const makePlayer = (position: Player['position'], totalTPE: number): Player =>
  ({ position, totalTPE } as Player);

describe('playerSorter', () => {
  it('returns an empty array for undefined input', () => {
    expect(playerSorter(undefined)).toEqual([]);
  });

  it('returns an empty array for an empty roster', () => {
    expect(playerSorter([])).toEqual([]);
  });

  it('sorts players by position order across all positions', () => {
    const roster = [
      makePlayer('Kicker', 200),
      makePlayer('Safety', 400),
      makePlayer('Cornerback', 450),
      makePlayer('Linebacker', 500),
      makePlayer('Defensive End', 480),
      makePlayer('Defensive Tackle', 460),
      makePlayer('Offensive Lineman', 520),
      makePlayer('Tight End', 540),
      makePlayer('Wide Receiver', 560),
      makePlayer('Running Back', 580),
      makePlayer('Quarterback', 600),
    ];
    const sorted = playerSorter(roster);
    const positions = sorted.map((p) => p.position);
    expect(positions).toEqual([
      'Quarterback',
      'Running Back',
      'Wide Receiver',
      'Tight End',
      'Offensive Lineman',
      'Defensive Tackle',
      'Defensive End',
      'Linebacker',
      'Cornerback',
      'Safety',
      'Kicker',
    ]);
  });

  it('sorts players with the same position by TPE descending', () => {
    const roster = [
      makePlayer('Wide Receiver', 300),
      makePlayer('Wide Receiver', 500),
      makePlayer('Wide Receiver', 400),
    ];
    const sorted = playerSorter(roster);
    expect(sorted.map((p) => p.totalTPE)).toEqual([500, 400, 300]);
  });

  it('interleaves position and TPE ordering correctly', () => {
    const roster = [
      makePlayer('Running Back', 400),
      makePlayer('Quarterback', 300),
      makePlayer('Running Back', 500),
      makePlayer('Quarterback', 600),
    ];
    const sorted = playerSorter(roster);
    expect(sorted[0]).toMatchObject({ position: 'Quarterback', totalTPE: 600 });
    expect(sorted[1]).toMatchObject({ position: 'Quarterback', totalTPE: 300 });
    expect(sorted[2]).toMatchObject({ position: 'Running Back', totalTPE: 500 });
    expect(sorted[3]).toMatchObject({ position: 'Running Back', totalTPE: 400 });
  });
});
