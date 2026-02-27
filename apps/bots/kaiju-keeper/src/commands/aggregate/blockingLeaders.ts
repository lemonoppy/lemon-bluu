import { SlashCommandBuilder } from 'discord.js';
import { UnifiedDatabaseClient } from 'src/db/UnifiedDBClient';
import { TeamConfig } from 'src/lib/config/config';
import { createLeaderboardEmbed } from 'src/lib/embeds/leaderboard';
import { logger } from 'src/lib/logger';

import { SlashCommand } from 'typings/command';
import { DefensiveStats } from 'typings/db.typings';
import { AggregateTypes } from 'typings/records.typings';

const statNames: {
  [key in keyof Partial<DefensiveStats>]: string;
} = {
  pancakes: 'Pancakes',
  sacksallowed: 'Sacks Allowed',
};

const choices = Object.entries(statNames).map(([value, name]) => ({ name, value }));

export default {
  command: new SlashCommandBuilder()
    .setName('blocking-leaders')
    .addStringOption((option) => {
      return option
        .setName('stats')
        .setDescription('Choose the stat to sort by')
        .addChoices(...choices)
        .setRequired(false);
    })
    .addStringOption((option) => {
      return option
        .setName('aggregate')
        .setDescription('Choose between franchise, season, or single game stats')
        .addChoices(
          { name: 'Franchise', value: 'franchise' },
          { name: 'Season', value: 'season' },
          { name: 'Single Game', value: 'single game' },
        )
        .setRequired(false);
    })
    .addBooleanOption((option =>
      option
        .setName('active')
        .setDescription('Active only')
        .setRequired(false)
    ))
    .setDescription('Get Stat Leaders (Blocking)'),
  execute: async (interaction) => {
    try {
      await interaction.deferReply();

      const stat = interaction.options.getString('stats') ?? 'pancakes';
      const aggregate = interaction.options.getString('aggregate');
      const aggregateType: AggregateTypes = (aggregate === 'season' || aggregate === 'franchise' || aggregate === 'single game') ? aggregate : 'franchise';
      const activeOnly = interaction.options.getBoolean('active') ?? false;

      // Get team abbreviation from guild ID, fallback to default team
      const teamAbbr = TeamConfig.getTeamFromServerId(interaction.guildId || '') || 'osk';
      const gameRecords = await UnifiedDatabaseClient.getOtherStats(teamAbbr, undefined, undefined, activeOnly);

      if (Array.isArray(gameRecords)) {
        await interaction.editReply({
          embeds: [await createLeaderboardEmbed(interaction, {
            statNames,
            chosenStat: stat,
            data: gameRecords,
            activeOnly,
            aggregateType,
            category: 'blocking',
            guildId: interaction.guildId || undefined,
          })]
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
