import { PortalClient } from 'src/db/portal/PortalClient';
import { users } from 'src/db/users';
import { tpeTeamWebhookMap } from 'src/lib/config/config';
import { logger } from 'src/lib/logger';
import { findTeamByName } from 'src/lib/teams';
import { PendingTask, Player } from 'typings/portal';

const teamWebhookMap = tpeTeamWebhookMap;


const getTaskLink = (task: PendingTask): string => {
  if (task.type === 'PT' || task.type === 'OT' || task.type === 'Other') {
    return `${task.taskName}\nhttps://forums.sim-football.com/showthread.php?tid=${task.taskId}`;
  }
  if (task.type === 'Activity') {
    return `${task.taskName}\nhttps://portal.sim-football.com/player`;
  }
  if (task.type === 'Prediction') {
    return `${task.taskName}\nhttps://portal.sim-football.com/predictions`;
  }
  return task.taskName;
};

export async function postTPEReminders(): Promise<void> {
  const players = await PortalClient.getActivePlayers(true);
  const playerMap = new Map<number, Player>();
  players.forEach((player) => playerMap.set(player.uid, player));

  const usersMap = new Map<number, string>();
  const teams = new Map<string, number[]>();

  for await (const [, value] of users.iterator()) {
    usersMap.set(value.forumUserId, value.discordId);

    if (value.tpeNotifications) {
      const player = playerMap.get(value.forumUserId);
      const team = findTeamByName(player?.currentLeague === 'ISFL' ? player?.isflTeam ?? '' : player?.dsflTeam ?? '');
      const abbr = team?.abbreviation ?? '';
      if (abbr) {
        if (teams.has(abbr)) {
          teams.get(abbr)!.push(player?.uid ?? 0);
        } else {
          teams.set(abbr, [player?.uid ?? 0]);
        }
      }
    }
  }

  for (const [teamAbbreviation, webhook] of Object.entries(teamWebhookMap)) {
    const uids = teams.get(teamAbbreviation) ?? [];
    logger.info(`Team ${teamAbbreviation}: ${uids.length} UIDs with TPE notifications`);

		const in24Hours = new Date(Date.now() + 24 * 60 * 60 * 1000);

		const pendingTasks = (await PortalClient.getPlayerTasks(uids))
			.filter((task) => task.closeDate && new Date(task.closeDate) <= in24Hours);

    const lines = pendingTasks.length > 0
      ? pendingTasks.map((task) => {
          const mentions = task.pendingUids.map((uid) => `<@${usersMap.get(uid)}>`).join(' ');
          const closeDate = task.closeDate
            ? `<t:${Math.floor(new Date(task.closeDate).getTime() / 1000)}:D>`
            : 'No deadline';
          return `${mentions}\n**${getTaskLink(task)}** - ${closeDate}`;
        })
      : [`🎉 No pending tasks for ${teamAbbreviation}! Great job! 🎉`];

    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: lines.join('\n\n'),
        username: `Theo's TPE Reminder Service - ${teamAbbreviation}`,
        avatar_url: 'https://i.postimg.cc/kGKkvKGf/BB8E3825-4456-4278-B699-8727EE41EF0A-1-105-c-2.jpg',
      }),
    });
  }
}