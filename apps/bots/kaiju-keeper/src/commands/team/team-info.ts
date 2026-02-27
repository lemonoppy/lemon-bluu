import { SlashCommandBuilder } from 'discord.js';
import { DatabaseClient } from 'src/db/DBClient';
import { PortalClient } from 'src/db/PortalClient';
import { BaseEmbed } from 'src/lib/embed';
import schedule, { InternalSchedule } from 'src/lib/index/schedule';
import { logger } from 'src/lib/logger';
import { getSeasonRecords } from 'src/lib/seasonParser';

import { getTeamForGuild } from 'src/lib/teamInfo';
import { SlashCommand } from 'typings/command';

export default {
  command: new SlashCommandBuilder()
    .setName('team-info')
    .setDescription('Get Osaka Kaiju Team Records'),
  execute: async (interaction) => {
    try {
      await interaction.deferReply();

      const gameRecords = await DatabaseClient.getGameStats(true, interaction.guildId ?? undefined);
      const currentSeason = await PortalClient.getCurrentSeason();

      if (Array.isArray(gameRecords)) {
        const currentTeam = getTeamForGuild(interaction.guildId);
        const teamEmbed = BaseEmbed(interaction, {
          teamColor: currentTeam.colors.primary,
          logoUrl: currentTeam.logoUrl,
        }).setTitle(`${currentTeam.location} ${currentTeam.name} Franchise Records`);

        const { wins: franchiseWins, losses: franchiseLosses, ties: franchiseTies } = getSeasonRecords(gameRecords);
        const { wins: playoffWins, losses: playoffLosses, ties: playoffTies } = getSeasonRecords(gameRecords.filter(game => game.isplayoffs));
        const { wins: seasonWins, losses: seasonLosses, ties: seasonTies } = getSeasonRecords(gameRecords.filter(game => game.season === currentSeason));

        teamEmbed.addFields(
          {
            name: 'Franchise Record',
            value: `**Wins:** ${franchiseWins} - **Losses:** ${franchiseLosses} - **Ties:** ${franchiseTies}`,
            inline: false,
          },
          {
            name: `Franchise Playoffs Record`,
            value: `**Wins:** ${playoffWins} - **Losses:** ${playoffLosses} - **Ties:** ${playoffTies}`,
            inline: false,
          },
          {
            name: `Season ${currentSeason} Record`,
            value: `**Wins:** ${seasonWins} - **Losses:** ${seasonLosses} - **Ties:** ${seasonTies}`,
            inline: false,
          }
        )

        try {
          const scheduleData = await schedule(currentSeason, currentTeam);

          const buildSchedule = (schedule: InternalSchedule[]) => {
            return {
              name: `Season ${currentSeason} Schedule`,
              value: schedule.map(game => {
                return `**Week ${game.week}**: ${game.home ? 'vs' : '@'} ${game.opponent} - ${game.result} (${game.homeScore}-${game.awayScore})`;
              }).join('\n'),
              inline: false,
            }
          }

          teamEmbed.addFields(buildSchedule(scheduleData));
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
        })
      } else {
        await interaction.editReply({
          content: 'An error occurred while fetching player info.',
        });
        return;
      }
    } catch (error) {
      logger.error(error);
      await interaction.editReply({
        content: 'An error occurred while fetching team info.',
      });
      return;
    }
  },
} satisfies SlashCommand;
