import { hexColorToInt, pluralize, suffix } from '@lemon-bluu/discord';

describe('pluralize', () => {
  it('appends the default "s" suffix when count is not 1', () => {
    expect(pluralize(0, 'point')).toBe('points');
    expect(pluralize(2, 'point')).toBe('points');
    expect(pluralize(100, 'point')).toBe('points');
  });

  it('returns the root alone when count is exactly 1', () => {
    expect(pluralize(1, 'point')).toBe('point');
  });

  it('uses a custom suffix when provided', () => {
    expect(pluralize(2, 'categor', 'ies')).toBe('categories');
    expect(pluralize(1, 'categor', 'ies')).toBe('categor');
  });

  it('treats undefined count as "not 1" and applies the suffix', () => {
    expect(pluralize(undefined, 'point')).toBe('points');
  });
});

describe('suffix (ordinal)', () => {
  it('returns "st" for 1, 21, 31, 101', () => {
    expect(suffix(1)).toBe('1st');
    expect(suffix(21)).toBe('21st');
    expect(suffix(31)).toBe('31st');
    expect(suffix(101)).toBe('101st');
  });

  it('returns "nd" for 2, 22, 32', () => {
    expect(suffix(2)).toBe('2nd');
    expect(suffix(22)).toBe('22nd');
    expect(suffix(32)).toBe('32nd');
  });

  it('returns "rd" for 3, 23, 33', () => {
    expect(suffix(3)).toBe('3rd');
    expect(suffix(23)).toBe('23rd');
    expect(suffix(33)).toBe('33rd');
  });

  it('returns "th" for 4–20 (including teens)', () => {
    expect(suffix(4)).toBe('4th');
    expect(suffix(10)).toBe('10th');
    expect(suffix(11)).toBe('11th');
    expect(suffix(12)).toBe('12th');
    expect(suffix(13)).toBe('13th');
    expect(suffix(20)).toBe('20th');
  });

  it('handles teen edge cases correctly (11th, 12th, 13th not 11st/12nd/13rd)', () => {
    expect(suffix(111)).toBe('111th');
    expect(suffix(112)).toBe('112th');
    expect(suffix(113)).toBe('113th');
  });
});

describe('hexColorToInt', () => {
  it('converts a hex string with a # prefix to its integer value', () => {
    expect(hexColorToInt('#ffffff')).toBe(16777215);
    expect(hexColorToInt('#000000')).toBe(0);
    expect(hexColorToInt('#ff0000')).toBe(16711680);
    expect(hexColorToInt('#0000ff')).toBe(255);
  });

  it('converts a hex string without a # prefix', () => {
    expect(hexColorToInt('ffffff')).toBe(16777215);
    expect(hexColorToInt('000000')).toBe(0);
  });
});
