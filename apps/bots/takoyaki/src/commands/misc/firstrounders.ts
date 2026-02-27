import { SlashCommandBuilder } from 'discord.js';
import { SheetsClient } from 'src/db/sheets/SheetsClient';
import { DynamicConfig } from 'src/lib/config/dynamicConfig';
import { BaseEmbed } from 'src/lib/embed';
import { logger } from 'src/lib/logger';
import { SlashCommand } from 'typings/command';

import { DraftUsers } from 'typings/sheets';

export default {
  command: new SlashCommandBuilder()
    .setName('firstrounders')
    .setDescription('Check the consensus first rounders for a season')
    .addNumberOption((option) =>
      option
        .setName('season')
        .setDescription(
          'The season of first rounder consensus to retrieve.',
        )
        .setRequired(false),
    ),
  execute: async (interaction) => {
    if (!interaction.isRepliable()) {
      logger.error('Interaction is no longer repliable.');
      return;
    }

    await interaction.deferReply();

    try {
      const currentSeason = DynamicConfig.currentSeason.get() + 1;
      const searchKey = interaction.options.getNumber('season') ?? currentSeason;

      const allFirstRounders = await SheetsClient.getDrafts();
      const seasons = await SheetsClient.getSeasons();
      const currentDraft = await SheetsClient.getCurrent();

      let draft;

      const season = seasons.find((season) => season.season === searchKey);

      if (searchKey === currentSeason) {
        draft = currentDraft
      } else {
        draft = allFirstRounders.filter((user) => user.season === searchKey);
      }

      const buildEmbedFields = (draft: DraftUsers[]) => {
        const embeds: any[] = [];

        for (let x = 0; x < 20; x++) {
          if (draft[x].count > 0)
            embeds.push(`${draft[x].firstRounder ? '✅️ ' : ''}${draft[x].name} - ${draft[x].count}`);
        }

        return embeds.join('\n');
      }

      await interaction.editReply({
        embeds: [
          BaseEmbed(interaction, {
          })
            .setTitle(`S${searchKey} Consensus First Rounders (${season?.count} Responses)`)
            .setDescription(buildEmbedFields(draft))
        ],
      });
      return;

    } catch (error) {
      logger.error('Failed to handle interaction:', error);
      await interaction.editReply({
        content: `Failed to retrieve season. Only seasons 47 and onwards are available.`,
      });
      return;
    }
  },
} satisfies SlashCommand;