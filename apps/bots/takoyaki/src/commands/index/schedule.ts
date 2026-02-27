import {
  SlashCommandBuilder,
} from 'discord.js';
import { PortalClient } from 'src/db/portal/PortalClient';
import { BaseEmbed } from 'src/lib/embed';
import { withErrorHandling } from 'src/lib/helpers/command';
import schedule, { InternalSchedule } from 'src/lib/index/schedule';

import { findTeamByName } from 'src/lib/teams';
import { SlashCommand } from 'typings/command';

export default {
  command: new SlashCommandBuilder()
    .setName('schedule')
    .addNumberOption((option) =>
      option
        .setName('season')
        .setDescription(
          'The season\'s schedule to retrieve. If not provided, will use current season.',
        )
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName('team')
        .setDescription(
          'The team to get standings for. If not provided, will use your stored team.',
        )
        .setRequired(false),
    )
    .setDescription('Get a team\'s schedule for a season.'),
  execute: withErrorHandling(async (interaction) => {
    await interaction.deferReply();

      const { getPlayerFromDiscordUser } = await import('src/lib/helpers/playerHelpers');

      const currentSeason = await PortalClient.getCurrentSeason();
      const season = interaction.options.getNumber('season') ?? currentSeason;
      const targetTeam = interaction.options.getString('team')?.toUpperCase();

      const player = await getPlayerFromDiscordUser(interaction.user.id);

      const teamAbbreviation = targetTeam ?? (player?.currentLeague === 'ISFL' ? player?.isflTeam : player?.dsflTeam);

      if (!teamAbbreviation) {
        await interaction.editReply({
          content:
            'Could not find team. Please check your spelling, store your user, or create an active player.',
        });
        return;
      }

      const team = findTeamByName(teamAbbreviation)

      if (!team) {
        await interaction.editReply({
          content:
            'Could not find team. Please check your spelling, store your user, or create an active player.',
        });
        return;
      }

      if (season > currentSeason || season <= 0 || (season < 3 && team.league === 'DSFL')) {
        await interaction.editReply({
          content: 'Invalid season provided.',
        });
        return;
      }

      const scheduleData = await schedule(season, team);

      const buildSchedule = (schedule: InternalSchedule[]) => {
        return {
          name: `Schedule`,
          value: schedule.map(game => {
            return `**Week ${game.week}**: ${game.home ? 'vs' : '@'} ${game.opponent} - ${game.result} (${game.homeScore}-${game.awayScore})`;
          }).join('\n'),
          inline: false,
        }
      }

      const buildRecord = (schedule: InternalSchedule[]) => {
        // Calculate all stats in a single pass
        const stats = schedule.reduce((acc, game) => {
          // Overall
          acc.overall[game.result] = (acc.overall[game.result] || 0) + 1;
          // Home/Away
          const location = game.home ? 'home' : 'away';
          acc[location][game.result] = (acc[location][game.result] || 0) + 1;
          return acc;
        }, {
          overall: { W: 0, L: 0, T: 0 },
          home: { W: 0, L: 0, T: 0 },
          away: { W: 0, L: 0, T: 0 }
        } as Record<string, Record<string, number>>);

        return [
          {
            name: `Record`,
            value: `${stats.overall.W}-${stats.overall.L}-${stats.overall.T}`,
            inline: false,
          },
          {
            name: `Home`,
            value: `${stats.home.W}-${stats.home.L}-${stats.home.T}`,
            inline: false,
          },
          {
            name: `Away`,
            value: `${stats.away.W}-${stats.away.L}-${stats.away.T}`,
            inline: false,
          },
        ]
      }

      await interaction.editReply({
        embeds: [
          BaseEmbed(interaction, {
            teamColor: team.colors.primary,
            logoUrl: team.logoUrl,
          })
            .setTitle(`${team.location} ${team.name} Season ${season} Schedule`)
            .setDescription(
              buildSchedule(scheduleData).value,
            )
            .addFields(
              buildRecord(scheduleData)
            )
        ],
      });
  }, 'An error occurred while fetching team schedule.'),
} satisfies SlashCommand;
