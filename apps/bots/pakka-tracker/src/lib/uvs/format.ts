import { SquadPlayerStatus, SquadStatusLine } from './squad';

export const squadStatusLabel = (
  status: SquadPlayerStatus,
  topCutSize: number,
): string => {
  switch (status) {
    case 'MISSED_DAY_2':
      return 'Missed Day 2';
    case 'MADE_CUT':
      return `Made Top ${topCutSize} Cut / Active`;
    case 'MISSED_CUT':
      return `Missed Top ${topCutSize} Cut`;
    case 'SECURE':
      return 'Secure / Can Draw In';
    case 'IN_CUT_POSITION':
      return `In Top ${topCutSize} Position`;
    case 'DEAD_FOR_CUT':
      return `Dead for Top ${topCutSize}`;
    case 'LIVE_TO_WIN_OR_DRAW':
      return `Live to Win/Draw Into Top ${topCutSize}`;
    case 'MUST_WIN_OUT':
      return `Must Win Out for Top ${topCutSize}`;
    case 'OUT_FOR_DAY_2':
      return 'Out for Day 2 / Cut';
    case 'CLINCHED_DAY_2':
      return 'Clinched Day 2';
    case 'BUBBLE':
      return 'Bubble';
    case 'LIVE':
      return 'Live';
  }
};

export function formatSquadStatusLines(
  statuses: SquadStatusLine[],
  topCutSize: number,
): string[] {
  return statuses.map(({ member, rank, record, points, status }) => {
    const tag = squadStatusLabel(status, topCutSize);
    return `${member.name} (${member.username}) - Rank ${rank} | ${record} | ${points} pts - [${tag}]`;
  });
}
