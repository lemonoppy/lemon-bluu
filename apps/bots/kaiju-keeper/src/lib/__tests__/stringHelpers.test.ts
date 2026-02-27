import { toTitleCase } from '../stringHelpers';

describe('toTitleCase', () => {
  it('capitalizes first letter and lowercases the rest of each word', () => {
    expect(toTitleCase('hello world')).toBe('Hello World');
  });

  it('lowercases all-caps input', () => {
    expect(toTitleCase('HELLO WORLD')).toBe('Hello World');
  });

  it('handles mixed case', () => {
    expect(toTitleCase('hElLo wOrLd')).toBe('Hello World');
  });

  it('handles a single word', () => {
    expect(toTitleCase('hello')).toBe('Hello');
  });

  it('handles an empty string', () => {
    expect(toTitleCase('')).toBe('');
  });

  it('handles multiple spaces between words', () => {
    expect(toTitleCase('new  orleans')).toBe('New  Orleans');
  });

  it('handles player positions as they appear in data', () => {
    expect(toTitleCase('wide receiver')).toBe('Wide Receiver');
    expect(toTitleCase('offensive lineman')).toBe('Offensive Lineman');
    expect(toTitleCase('defensive end')).toBe('Defensive End');
  });
});
