import { formatGroupValue, getGroupDisplayName, normalizeGroupSearchKey } from '../helpers/fantasyHelpers';

describe('getGroupDisplayName', () => {
  it('returns the special name for group 1', () => {
    expect(getGroupDisplayName(1)).toBe('S56 Degens');
  });

  it('returns the special name for group 2', () => {
    expect(getGroupDisplayName(2)).toBe('League Of Champions');
  });

  it('returns the special name for group 3', () => {
    expect(getGroupDisplayName(3)).toBe('Icebear Stinks');
  });

  it('returns "Group X" for numeric groups without a special name', () => {
    expect(getGroupDisplayName(4)).toBe('Group 4');
    expect(getGroupDisplayName(10)).toBe('Group 10');
  });

  it('returns the string as-is when the group is already a string', () => {
    expect(getGroupDisplayName('Premier')).toBe('Premier');
    expect(getGroupDisplayName('S56 Degens')).toBe('S56 Degens');
  });
});

describe('normalizeGroupSearchKey', () => {
  it('returns the special name string for groups 1–3', () => {
    expect(normalizeGroupSearchKey(1)).toBe('S56 Degens');
    expect(normalizeGroupSearchKey(2)).toBe('League Of Champions');
    expect(normalizeGroupSearchKey(3)).toBe('Icebear Stinks');
  });

  it('returns the number as-is for groups without a special name', () => {
    expect(normalizeGroupSearchKey(4)).toBe(4);
    expect(normalizeGroupSearchKey(99)).toBe(99);
  });
});

describe('formatGroupValue', () => {
  it('converts a number to its string representation', () => {
    expect(formatGroupValue(4)).toBe('4');
  });

  it('passes through a string unchanged', () => {
    expect(formatGroupValue('Premier')).toBe('Premier');
  });
});
