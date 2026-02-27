import { SlashCommandBuilder } from 'discord.js';
import { UnifiedDatabaseClient } from 'src/db/UnifiedDBClient';
import { TeamConfig } from 'src/lib/config/config';
import { createLeaderboardEmbed } from 'src/lib/embeds/leaderboard';
import { logger } from 'src/lib/logger';

import { SlashCommand } from 'typings/command';
import { DefensiveStats } from 'typings/db.typings';
import { AggregateTypes } from 'typings/records.typings';
import {
  UnifiedPassingStatsWithPlayer,
  UnifiedReceivingStatsWithPlayer,
  UnifiedRushingStatsWithPlayer,
  UnifiedSpecialTeamsStatsWithPlayer
} from 'typings/unified-db.typings';

const statNames: {
  [key in keyof Partial<DefensiveStats>]: string;
} = {
  scrimmageYards: 'Scrimmage Yards',
  yards: 'Total Yards',
  points: 'Points',
};

const choices = Object.entries(statNames).map(([value, name]) => ({ name, value }));

// Merge stats by player (using pid as a unique key)
function mergeOffensiveStats(
  rushing: any[],
  receiving: any[],
  passing: UnifiedPassingStatsWithPlayer[],
  specialTeams: UnifiedSpecialTeamsStatsWithPlayer[]
): Array<any> {
  const merged = new Map();
  // Helper to add or update player stats
  function addOrUpdate(record: any) {
    if (!record || !record.pid) return;
    if (!merged.has(record.pid)) {
      merged.set(record.pid, { ...record });
    } else {
      const existing = merged.get(record.pid);
      for (const key in record) {
        if (key === 'pid' || key === 'name' || key === 'season' || key === 'week') continue;
        if (typeof record[key] === 'number') {
          existing[key] = (existing[key] || 0) + record[key];
        } else if (record[key] && !existing[key]) {
          existing[key] = record[key];
        }
      }
    }
  }
  rushing.forEach(r => addOrUpdate(r));
  receiving.forEach(r => addOrUpdate(r));
  passing.forEach(r => addOrUpdate(r));
  specialTeams.forEach(r => addOrUpdate(r));
  // Recalculate totalYards for each player
  merged.forEach(player => {
    player.totalYards =
      (player.rushingYards || 0) +
      (player.receivingYards || 0) +
      (player.passingYards || 0) +
      (player.kickReturnYards || 0) +
      (player.puntReturnYards || 0);
    player.scrimmageYards =
      (player.rushingYards || 0) +
      (player.receivingYards || 0);
  });
  return Array.from(merged.values());
}

export default {
  command: new SlashCommandBuilder()
    .setName('offensive-leaders')
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
    .setDescription('Get Stat Leaders (Offense)'),
  execute: async (interaction) => {
    try {
      await interaction.deferReply();

      const stat = interaction.options.getString('stats') ?? 'yards';
      const aggregate = interaction.options.getString('aggregate');
      const aggregateType: AggregateTypes = (aggregate === 'season' || aggregate === 'franchise' || aggregate === 'single game') ? aggregate : 'franchise';
      const activeOnly = interaction.options.getBoolean('active') ?? false;

      // Get team abbreviation from guild ID, fallback to default team
      const teamAbbr = TeamConfig.getTeamFromServerId(interaction.guildId || '') || 'osk';
      const rushingRecords = await UnifiedDatabaseClient.getRushingStats(teamAbbr, undefined, undefined, activeOnly);
      const receivingRecords = await UnifiedDatabaseClient.getReceivingStats(teamAbbr, undefined, undefined, activeOnly);

      if (!Array.isArray(rushingRecords) || !Array.isArray(receivingRecords)) {
        await interaction.editReply({
          content: 'An error occurred while fetching player info.',
        });
        return;
      }

      const passingRecords = await UnifiedDatabaseClient.getPassingStats(teamAbbr, undefined, undefined, activeOnly);
      const specialTeamsRecords = await UnifiedDatabaseClient.getSpecialTeamsStats(teamAbbr, undefined, undefined, activeOnly);

      if (Array.isArray(rushingRecords) && Array.isArray(receivingRecords) && Array.isArray(passingRecords) && Array.isArray(specialTeamsRecords)) {
        const parsedRushingRecords = rushingRecords.map((r: UnifiedRushingStatsWithPlayer) => ({ ...r, rushingYards: r.yards, position: r.position || '' }));
        const parsedReceivingRecords = receivingRecords.map((r: UnifiedReceivingStatsWithPlayer) => ({ ...r, receivingYards: r.yards, position: r.position || '' }));
        const parsedPassingRecords = passingRecords.map((p: UnifiedPassingStatsWithPlayer) => ({ ...p, position: p.position || '' }));
        const parsedSpecialTeamsRecords = specialTeamsRecords.map((st: UnifiedSpecialTeamsStatsWithPlayer) => ({ ...st, kickReturnYards: st.kryds, puntReturnYards: st.pryds, position: st.position || '' }));

        const mergedData = mergeOffensiveStats(parsedRushingRecords, parsedReceivingRecords, parsedPassingRecords, parsedSpecialTeamsRecords);
        await interaction.editReply({
          embeds: [await createLeaderboardEmbed(interaction, {
            statNames,
            chosenStat: stat,
            data: mergedData,
            activeOnly,
            aggregateType,
            category: 'offensive',
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
