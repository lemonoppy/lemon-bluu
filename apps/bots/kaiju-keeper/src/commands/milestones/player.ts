import { SlashCommandBuilder } from 'discord.js';
import { UnifiedDatabaseClient } from 'src/db/UnifiedDBClient';
import { BaseEmbed } from 'src/lib/embed';
import { logger } from 'src/lib/logger';

import { sumStatsByKeys } from 'src/lib/sumStats';
import { getTeamForGuild } from 'src/lib/teamInfo';
import { SlashCommand } from 'typings/command';

const MILESTONE_MARKERS = {
  yards: {
    target: 250,
    min: 150
  },
  passingYards: {
    target: 500,
    min: 200
  },
  tds: {
    target: 10,
    min: 3
  },
  tackles: {
    target: 50,
    min: 10
  },
  ints: {
    target: 10,
    min: 2
  },
  pancakes: {
    target: 25,
    min: 10
  },
  xp: {
    target: 10,
    min: 3
  }
}

type MilestoneChase = {
  player: string;
  stat: number;
  milestone: number;
}

// Helper to build and filter milestone chases (generic for any stat)
function buildMilestoneChases(records: any[], statKey: string, marker: { target: number, min: number }) {
  const chases: Array<MilestoneChase> = records
    .filter(record => record.onteam && record.status === 'active') // Filter for active players on team
    .map(record => {
      const stat = Number(record[statKey]) || 0;
      return {
        player: `${record.firstname} ${record.lastname}`,
        stat,
        milestone: marker.target - (stat % marker.target),
      };
    });
  return chases
    .sort((a, b) => b.stat - a.stat)
    .sort((a, b) => a.milestone - b.milestone)
    .filter(milestoneChase => milestoneChase.milestone <= marker.min);
}

export default {
  command: new SlashCommandBuilder()
    .setName('player-milestones')
    .setDescription('See some player milestones!'),
  execute: async (interaction) => {
    try {
      await interaction.deferReply();

      const buildMilestone = (statName: string, milestones: Array<MilestoneChase>) => {
        const milestoneStrings: string[] = [];
        milestones.forEach((milestone: MilestoneChase) => {
          if (milestone && milestone.player) {
            milestoneStrings.push(`**${milestone.player}** needs ${milestone.milestone} more to ${milestone.milestone + milestone.stat} (${milestone.stat})`);
          }
        });

        // Return null if no milestones to skip this field entirely
        if (milestoneStrings.length === 0) {
          return null;
        }

        const value = milestoneStrings.join('\n');
        const field = {
          name: String(statName || 'Unknown Stat'),
          value: String(value || 'No data available.'),
          inline: false
        };

        // Ensure name and value are valid strings with proper length
        if (!field.name || field.name.length === 0 || field.name.length > 256) {
          field.name = 'Invalid Stat';
        }
        if (!field.value || field.value.length === 0 || field.value.length > 1024) {
          field.value = 'No data available.';
        }

        return field;
      }

      const currentTeam = getTeamForGuild(interaction.guildId);
      const teamAbbr = currentTeam.abbreviation;

      // Fetch portal data once, share across all stat queries
      const portalData = await UnifiedDatabaseClient.getPortalData(teamAbbr);

      const singleEmbed = BaseEmbed(interaction, {
        teamColor: currentTeam.colors.primary,
        logoUrl: currentTeam.logoUrl,
      }).setTitle(`Upcoming Player Milestones - ${currentTeam.location} ${currentTeam.name}`);

      const offenseEmbed = BaseEmbed(interaction, {
        teamColor: currentTeam.colors.primary,
        logoUrl: currentTeam.logoUrl,
      }).setTitle(`🏈 Offensive Milestones - ${currentTeam.location} ${currentTeam.name}`);

      const defenseEmbed = BaseEmbed(interaction, {
        teamColor: currentTeam.colors.primary,
        logoUrl: currentTeam.logoUrl,
      }).setTitle(`🛡️ Defensive Milestones - ${currentTeam.location} ${currentTeam.name}`);

      const otherEmbed = BaseEmbed(interaction, {
        teamColor: currentTeam.colors.primary,
        logoUrl: currentTeam.logoUrl,
      }).setTitle(`Other Milestones - ${currentTeam.location} ${currentTeam.name}`);

      // Fetch all stat categories in parallel, sharing portal data
      const [
        passingRecords, rushingRecords, receivingRecords,
        defensiveRecords, otherRecords, kickingRecords, puntingRecords
      ] = await Promise.all([
        UnifiedDatabaseClient.getPassingStats(teamAbbr, undefined, undefined, false, portalData),
        UnifiedDatabaseClient.getRushingStats(teamAbbr, undefined, undefined, false, portalData),
        UnifiedDatabaseClient.getReceivingStats(teamAbbr, undefined, undefined, false, portalData),
        UnifiedDatabaseClient.getDefenseStats(teamAbbr, undefined, undefined, false, portalData),
        UnifiedDatabaseClient.getOtherStats(teamAbbr, undefined, undefined, false, portalData),
        UnifiedDatabaseClient.getKickingStats(teamAbbr, undefined, undefined, false, portalData),
        UnifiedDatabaseClient.getPuntingStats(teamAbbr, undefined, undefined, false, portalData),
      ]);

      if (!Array.isArray(passingRecords)) { await interaction.editReply({ content: 'No passing records found.' }); return; }
      if (!Array.isArray(rushingRecords)) { await interaction.editReply({ content: 'No rushing records found.' }); return; }
      if (!Array.isArray(receivingRecords)) { await interaction.editReply({ content: 'No receiving records found.' }); return; }
      if (!Array.isArray(defensiveRecords)) { await interaction.editReply({ content: 'No defensive records found.' }); return; }
      if (!Array.isArray(otherRecords)) { await interaction.editReply({ content: 'No other records found.' }); return; }
      if (!Array.isArray(kickingRecords)) { await interaction.editReply({ content: 'No kicking records found.' }); return; }
      if (!Array.isArray(puntingRecords)) { await interaction.editReply({ content: 'No punting records found.' }); return; }

      const franchisePassingRecords = Object.values(sumStatsByKeys(passingRecords, ['pid'], ['id', 'season', 'week']));
      const franchiseRushingRecords = Object.values(sumStatsByKeys(rushingRecords, ['pid'], ['id', 'season', 'week']));
      const franchiseReceivingRecords = Object.values(sumStatsByKeys(receivingRecords, ['pid'], ['id', 'season', 'week']));
      const franchiseDefensiveRecords = Object.values(sumStatsByKeys(defensiveRecords, ['pid'], ['id', 'season', 'week']));
      const franchiseOtherRecords = Object.values(sumStatsByKeys(otherRecords, ['pid'], ['id', 'season', 'week']));
      const franchiseKickingRecords = Object.values(sumStatsByKeys(kickingRecords, ['pid'], ['id', 'season', 'week']));
      const franchisePuntingRecords = Object.values(sumStatsByKeys(puntingRecords, ['pid'], ['id', 'season', 'week']));

      // Use the helper for both rushing and receiving milestones
      const filteredPassingTDMilestones = buildMilestoneChases(franchisePassingRecords, 'td', MILESTONE_MARKERS.tds);
      const filteredPassingYardMilestones = buildMilestoneChases(franchisePassingRecords, 'yards', MILESTONE_MARKERS.yards);
      const filteredRushingTDMilestones = buildMilestoneChases(franchiseRushingRecords, 'td', MILESTONE_MARKERS.tds);
      const filteredRushingYardMilestones = buildMilestoneChases(franchiseRushingRecords, 'yards', MILESTONE_MARKERS.yards);
      const filteredReceivingTDMilestones = buildMilestoneChases(franchiseReceivingRecords, 'td', MILESTONE_MARKERS.tds);
      const filteredReceivingYardMilestones = buildMilestoneChases(franchiseReceivingRecords, 'yards', MILESTONE_MARKERS.yards);
      const filteredTackleMilestones = buildMilestoneChases(franchiseDefensiveRecords, 'tck', MILESTONE_MARKERS.tackles);
      const filteredSackMilestones = buildMilestoneChases(franchiseDefensiveRecords, 'sack', MILESTONE_MARKERS.ints);
      const filteredInterceptionMilestones = buildMilestoneChases(franchiseDefensiveRecords, 'int', MILESTONE_MARKERS.ints);
      const filteredPDMilestones = buildMilestoneChases(franchiseDefensiveRecords, 'pd', MILESTONE_MARKERS.ints);
      const filteredPancakeMilestones = buildMilestoneChases(franchiseOtherRecords, 'pancakes', MILESTONE_MARKERS.pancakes);

      const offenseFields = [
        buildMilestone('Passing TDs', filteredPassingTDMilestones),
        buildMilestone('Passing Yards', filteredPassingYardMilestones),
        buildMilestone('Rushing TDs', filteredRushingTDMilestones),
        buildMilestone('Rushing Yards', filteredRushingYardMilestones),
        buildMilestone('Receiving TDs', filteredReceivingTDMilestones),
        buildMilestone('Receiving Yards', filteredReceivingYardMilestones),
      ].filter((field): field is { name: string; value: string; inline: boolean } =>
        field !== null && field.name.length > 0 && field.value.length > 0
      );

      const defenseFields = [
        buildMilestone('Tackles', filteredTackleMilestones),
        buildMilestone('Sacks', filteredSackMilestones),
        buildMilestone('Interceptions', filteredInterceptionMilestones),
        buildMilestone('Passes Defensed', filteredPDMilestones),
      ].filter((field): field is { name: string; value: string; inline: boolean } =>
        field !== null && field.name.length > 0 && field.value.length > 0
      );

      const otherFields = [
        buildMilestone('Pancakes', filteredPancakeMilestones),
        buildMilestone('Kicking XP Made', buildMilestoneChases(franchiseKickingRecords, 'xpmade', MILESTONE_MARKERS.xp)),
        buildMilestone('Punting Yards', buildMilestoneChases(franchisePuntingRecords, 'yds', MILESTONE_MARKERS.yards)),
        buildMilestone('Inside 20', buildMilestoneChases(franchisePuntingRecords, 'inside20', MILESTONE_MARKERS.xp)),
      ].filter((field): field is { name: string; value: string; inline: boolean } =>
        field !== null && field.name.length > 0 && field.value.length > 0
      );

      if (offenseFields.length > 0) {
        offenseEmbed.addFields(...offenseFields);
        singleEmbed.addFields(...offenseFields);
      }
      if (defenseFields.length > 0) {
        defenseEmbed.addFields(...defenseFields);
        singleEmbed.addFields(...defenseFields);
      }
      if (otherFields.length > 0) {
        otherEmbed.addFields(...otherFields);
        singleEmbed.addFields(...otherFields);
      }

      const embeds = [];
      if (singleEmbed.length > 0) embeds.push(singleEmbed);

      if (embeds.length === 0) {
        await interaction.editReply({
          content: 'No milestone data available for this team.',
        });
      } else {
        await interaction.editReply({
          embeds: embeds,
        });
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
