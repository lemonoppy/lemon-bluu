import { SlashCommandBuilder } from 'discord.js';
import { PortalClient } from 'src/db/PortalClient';
import { BaseEmbed } from 'src/lib/embed';
import schedule, { InternalSchedule } from 'src/lib/index/schedule';
import { logger } from 'src/lib/logger';

import { getTeamForGuild } from 'src/lib/teamInfo';
import { SlashCommand } from 'typings/command';

function getRecordFromSchedule(games: InternalSchedule[]) {
  return {
    wins: games.filter(g => g.result === 'W').length,
    losses: games.filter(g => g.result === 'L').length,
    ties: games.filter(g => g.result === 'T').length,
  };
}

export default {
  command: new SlashCommandBuilder()
    .setName('team-info')
    .setDescription('Get Osaka Kaiju Team Records'),
  execute: async (interaction) => {
    try {
      await interaction.deferReply();

      const currentSeason = await PortalClient.getCurrentSeason();
      const currentTeam = getTeamForGuild(interaction.guildId);

      const teamEmbed = BaseEmbed(interaction, {
        teamColor: currentTeam.colors.primary,
        logoUrl: currentTeam.logoUrl,
      }).setTitle(`${currentTeam.location} ${currentTeam.name} Team Info`);

      try {
        const scheduleData = await schedule(currentSeason, currentTeam);
        const { wins, losses, ties } = getRecordFromSchedule(scheduleData);

        teamEmbed.addFields(
          {
            name: `Season ${currentSeason} Record`,
            value: `**Wins:** ${wins} - **Losses:** ${losses} - **Ties:** ${ties}`,
            inline: false,
          },
          {
            name: `Season ${currentSeason} Schedule`,
            value: scheduleData.map(game => {
              return `**Week ${game.week}**: ${game.home ? 'vs' : '@'} ${game.opponent} - ${game.result} (${game.homeScore}-${game.awayScore})`;
            }).join('\n'),
            inline: false,
          }
        );
      } catch (error) {
        logger.error('Error fetching schedule:', error);
        teamEmbed.addFields({
          name: `Season ${currentSeason} Schedule`,
          value: 'Season Not Started',
          inline: false,
        });
      }

      await interaction.editReply({
        embeds: [teamEmbed]
      });
    } catch (error) {
      logger.error(error);
      await interaction.editReply({
        content: 'An error occurred while fetching team info.',
      });
      return;
    }
  },
} satisfies SlashCommand;
