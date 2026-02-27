import type { Jest } from '@jest/globals';

declare global {
  // @types/jest v30 dropped the global `jest` variable declaration.
  // This restores it so jest.setTimeout(), jest.fn(), etc. are typed in test files.
  // eslint-disable-next-line no-var
  var jest: Jest;
}
