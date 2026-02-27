import { GameStats } from 'typings/db.typings';

import { getSeasonRecords } from '../seasonParser';

const makeGame = (score: number, opponentScore: number): GameStats => ({
  id: 1,
  season: 1,
  week: 1,
  home: true,
  opponent: 'Test',
  score,
  opponentscore: opponentScore,
  isplayoffs: false,
  win: score > opponentScore,
});

describe('getSeasonRecords', () => {
  it('counts wins, losses, and ties correctly from a mixed record', () => {
    const games = [makeGame(21, 14), makeGame(14, 21), makeGame(7, 7)];
    expect(getSeasonRecords(games)).toEqual({ wins: 1, losses: 1, ties: 1 });
  });

  it('returns zeros for an empty game list', () => {
    expect(getSeasonRecords([])).toEqual({ wins: 0, losses: 0, ties: 0 });
  });

  it('handles a perfect season', () => {
    const games = [makeGame(28, 7), makeGame(35, 14), makeGame(21, 0)];
    expect(getSeasonRecords(games)).toEqual({ wins: 3, losses: 0, ties: 0 });
  });

  it('handles a winless season', () => {
    const games = [makeGame(0, 21), makeGame(7, 28), makeGame(14, 35)];
    expect(getSeasonRecords(games)).toEqual({ wins: 0, losses: 3, ties: 0 });
  });

  it('counts multiple ties', () => {
    const games = [makeGame(7, 7), makeGame(14, 14), makeGame(21, 21)];
    expect(getSeasonRecords(games)).toEqual({ wins: 0, losses: 0, ties: 3 });
  });

  it('handles a single game win', () => {
    expect(getSeasonRecords([makeGame(17, 10)])).toEqual({ wins: 1, losses: 0, ties: 0 });
  });
});
