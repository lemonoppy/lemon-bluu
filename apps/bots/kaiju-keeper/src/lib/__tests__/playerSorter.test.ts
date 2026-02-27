import { PortalPlayer } from 'typings/portal';

import { playerSorter } from '../playerSorter';

const makePlayer = (position: PortalPlayer['position'], totalTPE: number): PortalPlayer =>
  ({ position, totalTPE } as PortalPlayer);

describe('playerSorter', () => {
  it('returns an empty array for undefined input', () => {
    expect(playerSorter(undefined)).toEqual([]);
  });

  it('returns an empty array for an empty roster', () => {
    expect(playerSorter([])).toEqual([]);
  });

  it('sorts players by position order (QB before RB before WR etc.)', () => {
    const roster = [
      makePlayer('Linebacker', 500),
      makePlayer('Quarterback', 600),
      makePlayer('Wide Receiver', 550),
      makePlayer('Kicker', 200),
    ];
    const sorted = playerSorter(roster);
    expect(sorted.map((p) => p.position)).toEqual([
      'Quarterback',
      'Wide Receiver',
      'Linebacker',
      'Kicker',
    ]);
  });

  it('sorts players with the same position by total TPE descending', () => {
    const roster = [
      makePlayer('Wide Receiver', 300),
      makePlayer('Wide Receiver', 500),
      makePlayer('Wide Receiver', 400),
    ];
    const sorted = playerSorter(roster);
    expect(sorted.map((p) => p.totalTPE)).toEqual([500, 400, 300]);
  });

  it('correctly interleaves position order and TPE sorting', () => {
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
