// Mock DB deps before importing cubes.ts
jest.mock('src/db/users', () => ({
  cubeHistoryDB: { get: jest.fn(), set: jest.fn() },
  cubeIndexDB: { get: jest.fn(), set: jest.fn() },
}));

jest.mock('src/lib/logger', () => ({
  logger: { debug: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

import { cubes, getCubeById, getCubeByKey, getRandomCube } from '../cubes';

describe('getCubeByKey', () => {
  it('returns the cube for a valid key', () => {
    const cube = getCubeByKey('Matica');
    expect(cube).toBeDefined();
    expect(cube?.id).toBe('matica');
    expect(cube?.setCode).toBe('MTC');
  });

  it('returns undefined for an unknown key', () => {
    expect(getCubeByKey('NonExistent')).toBeUndefined();
  });

  it('is case-sensitive', () => {
    expect(getCubeByKey('matica')).toBeUndefined();
    expect(getCubeByKey('Matica')).toBeDefined();
  });
});

describe('getCubeById', () => {
  it('returns the cube and key for a valid id', () => {
    const result = getCubeById('matica');
    expect(result).toBeDefined();
    expect(result?.key).toBe('Matica');
    expect(result?.cube.id).toBe('matica');
  });

  it('returns undefined for an unknown id', () => {
    expect(getCubeById('nonexistent')).toBeUndefined();
  });

  it('finds cubes with non-obvious id/key mapping', () => {
    // Vintage cube: key='Vintage', id='Decaluwe'
    const result = getCubeById('Decaluwe');
    expect(result?.key).toBe('Vintage');
  });
});

describe('getRandomCube', () => {
  it('returns a valid cube entry', () => {
    const { key, cube } = getRandomCube();
    expect(cubes[key]).toBeDefined();
    expect(cube).toBe(cubes[key]);
  });

  it('always returns a cube within the known set', () => {
    for (let i = 0; i < 20; i++) {
      const { key } = getRandomCube();
      expect(Object.keys(cubes)).toContain(key);
    }
  });

  it('excludes set cubes when removeSet is true', () => {
    const setCubeKeys = Object.entries(cubes)
      .filter(([, c]) => c.isSet)
      .map(([k]) => k);

    for (let i = 0; i < 30; i++) {
      const { key } = getRandomCube(true);
      expect(setCubeKeys).not.toContain(key);
    }
  });

  it('includes set cubes when removeSet is false (default)', () => {
    const setCubeKeys = new Set(
      Object.entries(cubes).filter(([, c]) => c.isSet).map(([k]) => k),
    );
    const seen = new Set<string>();

    for (let i = 0; i < 200; i++) {
      seen.add(getRandomCube(false).key);
    }

    // At least one set cube should appear across 200 draws
    const foundSetCube = [...seen].some((k) => setCubeKeys.has(k));
    expect(foundSetCube).toBe(true);
  });
});
