import { SlashCommandBuilder } from 'discord.js';
import { DatabaseClient } from 'src/db/DBClient';
import { BaseEmbed } from 'src/lib/embed';
import { logger } from 'src/lib/logger';

import { getSeasonRecords } from 'src/lib/seasonParser';

import { getTeamForGuild } from 'src/lib/teamInfo';
import { SlashCommand } from 'typings/command';

const MILESTONE_MARKERS = {
  wins: 25,
  points: 250,
  tds: 50,
  tackles: 250,
  ints: 25,
  pancakes: 100,
}

export default {
  command: new SlashCommandBuilder()
    .setName('milestones')
    .setDescription('See some team milestones!'),
  execute: async (interaction) => {
    try {
      await interaction.deferReply();

      const buildMilestone = (statName: string, currentValue: number, milestone: number) => {
        const nextMilestone = milestone - (currentValue % milestone);
        return {
          name: `${statName}`,
          value: `**${nextMilestone} more** to ${currentValue + nextMilestone} (${currentValue})`,
        };
      }

      const currentTeam = getTeamForGuild(interaction.guildId);
      const embed = BaseEmbed(interaction, {
        teamColor: currentTeam.colors.primary,
        logoUrl: currentTeam.logoUrl,
      }).setTitle(`${currentTeam.location} ${currentTeam.name} Milestones`);

      const gameRecords = await DatabaseClient.getGameStats(true, interaction.guildId ?? undefined);
      if (!Array.isArray(gameRecords)) {
        await interaction.editReply({
          content: 'No game records found.',
        });
        return;
      }
      const { wins: franchiseWins } = getSeasonRecords(gameRecords);
      const franchisePoints = gameRecords.reduce((acc, record) => {
        return acc + (Number(record.score) || 0);
      }, 0)

      const rushingRecords = await DatabaseClient.getRushingStats(true, interaction.guildId ?? undefined);
      if (!Array.isArray(rushingRecords)) {
        await interaction.editReply({
          content: 'No rushing records found.',
        });
        return;
      }
      const franchiseRushingTDs = rushingRecords.reduce((acc, record) => {
        return acc + (Number(record.td) || 0);
      }, 0)

      const receivingRecords = await DatabaseClient.getReceivingStats(true, interaction.guildId ?? undefined);
      if (!Array.isArray(receivingRecords)) {
        await interaction.editReply({
          content: 'No receiving records found.',
        });
        return;
      }
      const franchiseReceivingTDs = receivingRecords.reduce((acc, record) => {
        return acc + (Number(record.td) || 0);
      }, 0)

      const defensiveRecords = await DatabaseClient.getDefensiveStats(true, interaction.guildId ?? undefined);
      if (!Array.isArray(defensiveRecords)) {
        await interaction.editReply({
          content: 'No receiving records found.',
        });
        return;
      }
      const franchiseInts = defensiveRecords.reduce((acc, record) => {
        return acc + (Number(record.int) || 0);
      }, 0)
      const franchiseTackles = defensiveRecords.reduce((acc, record) => {
        return acc + (Number(record.tck) || 0);
      }, 0)

      const otherRecords = await DatabaseClient.getOtherStats(true, interaction.guildId ?? undefined);
      if (!Array.isArray(otherRecords)) {
        await interaction.editReply({
          content: 'No receiving records found.',
        });
        return;
      }
      const franchisePancakes = otherRecords.reduce((acc, record) => {
        return acc + (Number(record.pancakes) || 0);
      }, 0)

      embed.addFields(
        buildMilestone('Franchise Wins', franchiseWins, MILESTONE_MARKERS.wins),
        buildMilestone('Franchise Points', franchisePoints, MILESTONE_MARKERS.points),
        buildMilestone('Rushing TDs', franchiseRushingTDs, MILESTONE_MARKERS.tds),
        buildMilestone('Receiving TDs', franchiseReceivingTDs, MILESTONE_MARKERS.tds),
        buildMilestone('Tackles', franchiseTackles, MILESTONE_MARKERS.tackles),
        buildMilestone('Interceptions', franchiseInts, MILESTONE_MARKERS.ints),
        buildMilestone('Pancakes', franchisePancakes, MILESTONE_MARKERS.pancakes),
      )

      await interaction.editReply({
        embeds: [embed],
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
