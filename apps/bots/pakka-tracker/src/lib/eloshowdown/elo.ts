import { EloHistoryPoint } from './types';

export interface EventElo {
  eloBefore: number | null;
  eloAfter: number | null;
  matches: number;
}

const inWindow = (points: EloHistoryPoint[], startMs: number, endMs: number) =>
  points
    .filter((point) => {
      const time = new Date(point.date).getTime();
      return time >= startMs && time <= endMs;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

/**
 * Given a player's elo-history and an event time window, returns the elo
 * before the first match and after the last match that fall within the window.
 */
export function computeEventElo(
  points: EloHistoryPoint[],
  start: Date,
  end: Date,
): EventElo {
  const matches = inWindow(points, start.getTime(), end.getTime());

  if (matches.length === 0) {
    return { eloBefore: null, eloAfter: null, matches: 0 };
  }

  return {
    eloBefore: matches[0].elo_before,
    eloAfter: matches[matches.length - 1].elo_after,
    matches: matches.length,
  };
}

export interface ParsedRecord {
  wins: number;
  losses: number;
  draws: number;
}

export function parseRecord(record: string): ParsedRecord {
  const [wins = 0, losses = 0, draws = 0] = record.split('-').map(Number);
  return { wins, losses, draws };
}
