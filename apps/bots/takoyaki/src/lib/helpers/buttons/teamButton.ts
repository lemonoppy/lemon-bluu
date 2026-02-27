import {
  ActionRowBuilder,
  ButtonBuilder, ButtonStyle,
  CacheType,
  ChatInputCommandInteraction,
} from 'discord.js';
import {
  createRosterEmbed, createStatsEmbed,
} from 'src/lib/team';
import { ManagerInfo, Team } from 'typings/portal';

export function createActionRow(
  abbr: string,
  view: string,
  season: number,
) {
  const actionRow = new ActionRowBuilder<ButtonBuilder>();
  actionRow.addComponents(
    new ButtonBuilder()
      .setCustomId(`overview_${abbr}_${season ?? 'current'}`)
      .setLabel('Overview')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(view === 'overview'),
  );
  actionRow.addComponents(
    new ButtonBuilder()
      .setCustomId(`roster_${abbr}_${season ?? 'current'}`)
      .setLabel('Current Roster')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(view === 'roster'),
  );

  return actionRow;
}

export async function createTeamEmbed(
  interaction: ChatInputCommandInteraction<CacheType>,
  teamInfo: Team,
  season: number,
  view?: string,
  managerInfo?: ManagerInfo[],
) {
  switch (view) {
    case 'roster':
      if (
        teamInfo.league === 'ISFL' ||
        teamInfo.league === 'DSFL'
      ) {
        return await createRosterEmbed(
          interaction,
          teamInfo,
          managerInfo,
        );
      }
      return;
    default:
      return await createStatsEmbed(
        interaction,
        teamInfo,
        season,
      );
  }
}