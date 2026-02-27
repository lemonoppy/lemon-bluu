import { sumStatsByKeys } from '../sumStats';

describe('sumStatsByKeys', () => {
  describe('basic grouping and summation', () => {
    it('groups records by a single key and sums numeric fields', () => {
      const data = [
        { player: 'Alice', yards: 100, td: 1 },
        { player: 'Alice', yards: 50, td: 0 },
        { player: 'Bob', yards: 75, td: 2 },
      ];
      const result = sumStatsByKeys(data, ['player']);
      expect(result['Alice'].yards).toBe(150);
      expect(result['Alice'].td).toBe(1);
      expect(result['Bob'].yards).toBe(75);
    });

    it('groups by multiple keys joined with a dash', () => {
      const data = [
        { player: 'Alice', season: 1, yards: 100 },
        { player: 'Alice', season: 1, yards: 50 },
        { player: 'Alice', season: 2, yards: 200 },
      ];
      const result = sumStatsByKeys(data, ['player', 'season']);
      expect(result['Alice-1'].yards).toBe(150);
      expect(result['Alice-2'].yards).toBe(200);
    });

    it('does not sum fields listed in the exclude parameter', () => {
      const data = [
        { player: 'Alice', yards: 100, jerseyNumber: 12 },
        { player: 'Alice', yards: 50, jerseyNumber: 12 },
      ];
      const result = sumStatsByKeys(data, ['player'], ['jerseyNumber']);
      expect(result['Alice'].yards).toBe(150);
      expect(result['Alice'].jerseyNumber).toBe(12);
    });
  });

  describe('rushing stats — YPC and points', () => {
    it('calculates yards per carry across multiple games', () => {
      const data = [
        { player: 'RB', season: 1, yards: 100, attempts: 20, td: 2, ypc: 0 },
        { player: 'RB', season: 1, yards: 50, attempts: 10, td: 1, ypc: 0 },
      ];
      const result = sumStatsByKeys(data, ['player', 'season']);
      expect(result['RB-1'].yards).toBe(150);
      expect(result['RB-1'].attempts).toBe(30);
      expect(result['RB-1'].ypc).toBe('5.00');
      expect(result['RB-1'].points).toBe(18); // 3 TDs × 6
    });

    it('skips YPC calculation when attempts is 0', () => {
      const data = [{ player: 'RB', season: 1, yards: 0, attempts: 0, td: 0, ypc: 0 }];
      const result = sumStatsByKeys(data, ['player', 'season']);
      expect(result['RB-1'].attempts).toBe(0);
      expect(result['RB-1'].ypc).toBe(0); // unchanged
    });
  });

  describe('receiving stats — YPR and points', () => {
    it('calculates yards per reception', () => {
      const data = [
        { player: 'WR', season: 1, yards: 80, receptions: 8, td: 1, ypr: 0 },
        { player: 'WR', season: 1, yards: 40, receptions: 4, td: 0, ypr: 0 },
      ];
      const result = sumStatsByKeys(data, ['player', 'season']);
      expect(result['WR-1'].ypr).toBe('10.00'); // 120 / 12
      expect(result['WR-1'].points).toBe(6);
    });

    it('skips YPR calculation when receptions is 0', () => {
      const data = [{ player: 'WR', season: 1, yards: 0, receptions: 0, td: 0, ypr: 0 }];
      const result = sumStatsByKeys(data, ['player', 'season']);
      expect(result['WR-1'].ypr).toBe(0);
    });
  });

  describe('passing stats — completion pct, YPA, rating, and points', () => {
    it('calculates completion percentage and yards per attempt', () => {
      const data = [{
        player: 'QB', season: 1,
        yards: 300, completions: 20, attempts: 30, td: 2, int: 0,
        rating: 0, ypa: 0, completionpct: 0, points: 0,
      }];
      const result = sumStatsByKeys(data, ['player', 'season']);
      expect(result['QB-1'].completionpct).toBe('0.67');
      expect(result['QB-1'].ypa).toBe('10.00');
      expect(result['QB-1'].points).toBe(12);
    });

    it('aggregates passing stats across multiple games before calculating derived stats', () => {
      const data = [
        { player: 'QB', season: 1, yards: 200, completions: 15, attempts: 20, td: 1, int: 0, rating: 0, ypa: 0, completionpct: 0, points: 0 },
        { player: 'QB', season: 1, yards: 100, completions: 5, attempts: 10, td: 0, int: 1, rating: 0, ypa: 0, completionpct: 0, points: 0 },
      ];
      const result = sumStatsByKeys(data, ['player', 'season']);
      expect(result['QB-1'].yards).toBe(300);
      expect(result['QB-1'].completions).toBe(20);
      expect(result['QB-1'].attempts).toBe(30);
      expect(result['QB-1'].completionpct).toBe('0.67');
    });

    it('returns passer rating 0.00 when attempts is 0', () => {
      const data = [{
        player: 'QB', season: 1,
        yards: 0, completions: 0, attempts: 0, td: 0, int: 0,
        rating: 0, ypa: 0, completionpct: 0, points: 0,
      }];
      const result = sumStatsByKeys(data, ['player', 'season']);
      expect(result['QB-1'].rating).toBe('0.00');
    });

    it('passer rating components are capped between 0 and 2.375', () => {
      // Perfect game: high comp%, high YPA, all TDs, no INTs → high rating
      const data = [{
        player: 'QB', season: 1,
        yards: 500, completions: 30, attempts: 30, td: 5, int: 0,
        rating: 0, ypa: 0, completionpct: 0, points: 0,
      }];
      const result = sumStatsByKeys(data, ['player', 'season']);
      const rating = parseFloat(result['QB-1'].rating as string);
      expect(rating).toBeGreaterThan(100);
      expect(rating).toBeLessThanOrEqual(158.4); // NFL max passer rating (158.333...)
    });
  });

  describe('kicking stats — FG pct and points', () => {
    it('calculates field goal percentage across all distance buckets', () => {
      const data = [{
        player: 'K', season: 1,
        xpmade: 3,
        fgunder20made: 1, fgunder20att: 1,
        fg20_29made: 2, fg20_29att: 2,
        fg30_39made: 1, fg30_39att: 2,
        fg40_49made: 0, fg40_49att: 1,
        fg50plusmade: 0, fg50plusatt: 0,
      }];
      const result = sumStatsByKeys(data, ['player', 'season']);
      // 4 made / 6 attempted
      expect(result['K-1'].fgPct).toBe('0.667');
      // 3 XP + 4 FG × 3 = 15
      expect(result['K-1'].points).toBe(15);
    });

    it('handles a kicker with no field goal attempts', () => {
      const data = [{
        player: 'K', season: 1,
        xpmade: 2,
        fgunder20made: 0, fgunder20att: 0,
        fg20_29made: 0, fg20_29att: 0,
        fg30_39made: 0, fg30_39att: 0,
        fg40_49made: 0, fg40_49att: 0,
        fg50plusmade: 0, fg50plusatt: 0,
      }];
      const result = sumStatsByKeys(data, ['player', 'season']);
      expect(result['K-1'].fgPct).toBe('0.000');
      expect(result['K-1'].points).toBe(2);
    });
  });

  describe('punting stats — average', () => {
    it('calculates punting average across multiple games', () => {
      const data = [
        { player: 'P', season: 1, punts: 4, yds: 180, avg: 0, lng: 55, inside20: 2 },
        { player: 'P', season: 1, punts: 2, yds: 90, avg: 0, lng: 48, inside20: 1 },
      ];
      const result = sumStatsByKeys(data, ['player', 'season']);
      expect(result['P-1'].punts).toBe(6);
      expect(result['P-1'].yds).toBe(270);
      expect(result['P-1'].avg).toBe('45.00');
    });

    it('skips average calculation when punts is 0', () => {
      const data = [{ player: 'P', season: 1, punts: 0, yds: 0, avg: 0, lng: 0, inside20: 0 }];
      const result = sumStatsByKeys(data, ['player', 'season']);
      expect(result['P-1'].avg).toBe(0);
    });
  });

  describe('scrimmage yards', () => {
    it('sums rushing and receiving yards into scrimmageYards', () => {
      const data = [{
        player: 'RB', season: 1,
        rushYards: 80, recYards: 30,
        attempts: 15, receptions: 4, td: 1, ypc: 0, ypr: 0,
      }];
      const result = sumStatsByKeys(data, ['player', 'season']);
      expect(result['RB-1'].scrimmageYards).toBe(110);
    });

    it('returns 0 scrimmageYards when both are absent', () => {
      const data = [{ player: 'OL', season: 1, pancakes: 5 }];
      const result = sumStatsByKeys(data, ['player', 'season']);
      expect(result['OL-1'].scrimmageYards).toBe(0);
    });
  });
});
