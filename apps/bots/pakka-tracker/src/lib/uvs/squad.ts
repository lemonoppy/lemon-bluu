import { simulateSwissWithDraws } from './cut-finder';
import { ScrapeResult, UVSResultData } from './types';

export interface SquadMember {
  username: string;
  name: string;
  eloShowdownId: number;
}

export const squadMembers: SquadMember[] = [
  { username: 'badboijerbear', name: 'Jerry', eloShowdownId: 74340 },
  { username: 'Miss Play', name: 'Chloe', eloShowdownId: 74339 },
  { username: 'Sphere Itself', name: 'Sam', eloShowdownId: 74343 },
  { username: 'BNutty', name: 'Bennett', eloShowdownId: 74345 },
  { username: 'lolford', name: 'Luka', eloShowdownId: 74335 },
  { username: 'Nova', name: 'Ernest', eloShowdownId: 74041 },
  { username: 'lemonoppy', name: 'Nelson', eloShowdownId: 128962 },
];

export const squadMemberByUsername = new Map(
  squadMembers.map((member) => [member.username.toLowerCase(), member]),
);

export const squadMemberByPlayerId = new Map(
  squadMembers.map((member) => [member.eloShowdownId, member]),
);

export type SquadPlayerStatus =
  | 'FINISHED'
  | 'MISSED_DAY_2'
  | 'MADE_CUT'
  | 'MISSED_CUT'
  | 'SECURE'
  | 'IN_CUT_POSITION'
  | 'DEAD_FOR_CUT'
  | 'LIVE_TO_WIN_OR_DRAW'
  | 'MUST_WIN_OUT'
  | 'OUT_FOR_DAY_2'
  | 'CLINCHED_DAY_2'
  | 'BUBBLE'
  | 'LIVE';

export interface SquadStatusLine {
  member: SquadMember;
  rank: number;
  record: string;
  points: number;
  status: SquadPlayerStatus;
}

export interface SquadStatusResult {
  players: SquadStatusLine[];
  thresholdPoints?: number;
  squadTotals: { wins: number; losses: number; draws: number };
  combinedWinPercent: number;
  combinedPointsPercent: number;
}

const DEFAULT_DAY_1_ROUNDS = 7;
const MAX_DROPPED_POINTS_FOR_DAY_2 = 6;

export function evaluateSquadStatus(data: ScrapeResult): SquadStatusResult | null {
  const {
    players,
    currentRound,
    totalRounds,
    roundsRemaining,
    isComplete,
    isDay2,
    isElimination,
    isCuttingPhase,
    totalSwissRounds,
    topCutSize,
    allPhases,
  } = data;

  const foundPlayers = players.filter((player) =>
    squadMemberByUsername.has(player.username.toLowerCase()),
  );

  if (foundPlayers.length === 0) return null;

  const day1Rounds = allPhases[0]?.number_of_rounds ?? DEFAULT_DAY_1_ROUNDS;
  const day2CutThresholdPoints = day1Rounds * 3 - MAX_DROPPED_POINTS_FOR_DAY_2;

  let thresholdPoints: number | undefined;
  if (topCutSize > 0 && players.length > 0) {
    const simulatedRecords = simulateSwissWithDraws({
      playerCount: players.length,
      roundCount: totalSwissRounds > 0 ? totalSwissRounds : totalRounds,
      topCutSize,
      trials: 5000,
      drawWindow: 1,
    }).probabilityTable.filter((record) => record.probabilityOfMakingCut > 0);
    thresholdPoints = simulatedRecords[simulatedRecords.length - 1]?.points;
  }

  const squadTotals = { wins: 0, losses: 0, draws: 0 };

  const statuses = foundPlayers.map((player: UVSResultData): SquadStatusLine => {
    const member = squadMemberByUsername.get(player.username.toLowerCase())!;
    const [wins = 0, losses = 0, draws = 0] = player.record.split('-').map(Number);
    const manualPoints = wins * 3 + draws;
    const rankNum = parseInt(player.rank, 10) || 999;

    squadTotals.wins += wins;
    squadTotals.losses += losses;
    squadTotals.draws += draws;

    const day1Finished = currentRound > day1Rounds || (isDay2 && allPhases.length > 1);
    const madeDay2 = manualPoints >= day2CutThresholdPoints;

    let status: SquadPlayerStatus;

    // 0. Event finished: show the final placement from the standings rank
    if (isComplete) {
      status = 'FINISHED';

      // 1. Elimination phase: the cut is decided
    } else if (isElimination) {
      status = rankNum <= topCutSize ? 'MADE_CUT' : 'MISSED_CUT';

      // 2. Final Swiss phase feeding the cut: chasing the top cut
    } else if (isCuttingPhase) {
      const maxWinOut = manualPoints + roundsRemaining * 3;
      const maxDrawOut = manualPoints + roundsRemaining;

      if (rankNum <= topCutSize) {
        status =
          roundsRemaining === 1 && rankNum <= topCutSize - 2
            ? 'SECURE'
            : 'IN_CUT_POSITION';
      } else if (thresholdPoints !== undefined && maxWinOut < thresholdPoints) {
        status = 'DEAD_FOR_CUT';
      } else if (thresholdPoints !== undefined && maxDrawOut >= thresholdPoints) {
        status = 'LIVE_TO_WIN_OR_DRAW';
      } else {
        status = 'MUST_WIN_OUT';
      }

      // 3. Early Swiss phase (or no-cut event): day 1 processing
    } else {
      const remainingDay1 = Math.max(0, day1Rounds - currentRound);
      const maxLosses = losses + remainingDay1;
      const droppedPoints = losses * 3 + draws * 2;

      if (day1Finished && !madeDay2) {
        status = 'MISSED_DAY_2';
      } else if (droppedPoints > MAX_DROPPED_POINTS_FOR_DAY_2) {
        status = 'OUT_FOR_DAY_2';
      } else if (maxLosses <= 2) {
        status = 'CLINCHED_DAY_2';
      } else if (droppedPoints === MAX_DROPPED_POINTS_FOR_DAY_2 || remainingDay1 === 1) {
        status = 'BUBBLE';
      } else {
        status = 'LIVE';
      }
    }

    return { member, rank: rankNum, record: player.record, points: manualPoints, status };
  });

  const { wins, losses, draws } = squadTotals;
  const totalGames = wins + losses + draws;
  const combinedWinPercent =
    totalGames > 0 ? (100 * (wins + 0.5 * draws)) / totalGames : 0;

  const totalPossiblePoints = totalGames * 3;
  const actualPoints = wins * 3 + draws;
  const combinedPointsPercent =
    totalPossiblePoints > 0 ? (100 * actualPoints) / totalPossiblePoints : 0;

  return {
    players: statuses,
    thresholdPoints,
    squadTotals,
    combinedWinPercent,
    combinedPointsPercent,
  };
}
