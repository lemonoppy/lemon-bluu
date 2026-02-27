import { formatBalance, shortenPosition } from '../helpers/playerHelpers';

describe('shortenPosition', () => {
  it.each([
    ['Quarterback', 'QB'],
    ['Running Back', 'RB'],
    ['Wide Receiver', 'WR'],
    ['Tight End', 'TE'],
    ['Offensive Lineman', 'OL'],
    ['Defensive End', 'DE'],
    ['Defensive Tackle', 'DT'],
    ['Linebacker', 'LB'],
    ['Cornerback', 'CB'],
    ['Safety', 'S'],
    ['Kicker', 'K'],
  ])('shortens "%s" to "%s"', (full, abbr) => {
    expect(shortenPosition(full)).toBe(abbr);
  });

  it('returns the input unchanged for an unknown position', () => {
    expect(shortenPosition('Fullback')).toBe('Fullback');
    expect(shortenPosition('')).toBe('');
  });
});

describe('formatBalance', () => {
  it('formats with a dollar sign and no decimal places', () => {
    expect(formatBalance(1000)).toBe('$1,000');
  });

  it('formats zero', () => {
    expect(formatBalance(0)).toBe('$0');
  });

  it('formats large balances with commas', () => {
    expect(formatBalance(1_000_000)).toBe('$1,000,000');
  });

  it('formats small values under 1000', () => {
    expect(formatBalance(42)).toBe('$42');
  });
});
