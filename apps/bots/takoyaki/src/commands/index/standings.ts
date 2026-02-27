import {
  SlashCommandBuilder,
} from 'discord.js';
import { APIEmbedField } from 'node_modules/discord-api-types/v10';
import { PortalClient } from 'src/db/portal/PortalClient';
import { BaseEmbed } from 'src/lib/embed';
import { withErrorHandling } from 'src/lib/helpers/command';
import standings from 'src/lib/index/standings';
import { InternalStandings } from 'src/lib/index/standings';

import { SlashCommand } from 'typings/command';

export default {
  command: new SlashCommandBuilder()
    .setName('standings')
    .addNumberOption((option) =>
      option
        .setName('season')
        .setDescription(
          'The season\'s standings to retrieve. If not provided, will use current season.',
        )
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName('league')
        .setDescription(
          'The league to get standings for. If not provided, will use ISFL.',
        )
        .addChoices(
          { name: 'ISFL', value: 'ISFL' },
          { name: 'DSFL', value: 'DSFL' },
        )
        .setRequired(false),
    )
    .setDescription('Get seasonal standings.'),
  execute: withErrorHandling(async (interaction) => {
    await interaction.deferReply();

      const currentSeason = await PortalClient.getCurrentSeason();
      const season = interaction.options.getNumber('season') ?? currentSeason;
      const league = interaction.options.getString('league')?.toUpperCase() ?? 'ISFL';

      if (season > currentSeason || season <= 0 || (season < 3 && league === 'DSFL')) {
        await interaction.editReply({
          content: 'Invalid season provided.',
        });
        return;
      }

      if (!(league === 'ISFL' || league === 'DSFL')) {
        await interaction.editReply({
          content: 'Invalid league provided.',
        });
        return;
      }

      const seasonStandings = await standings(season, league);

      const embedFields: APIEmbedField[] = [];
      const buildConference = (conferenceName: string, conference: InternalStandings[]) => {
        return {
          name: `${conferenceName} Standings`,
          value: conference.map(team => {
            return `**${team.name}**: ${team.wins}-${team.losses}-${team.ties}`;
          }).join('\n'),
          inline: false,
        }
      }

      for (const [key, value] of Object.entries(seasonStandings)) {
        embedFields.push(buildConference(key, value))
      }

      await interaction.editReply({
        embeds: [
          BaseEmbed(interaction, { teamColor: undefined })
            .setTitle(`${league} Season ${season} Standings`)
            .addFields(
              embedFields
            ),
        ],
      });
  }, 'An error occurred while fetching team standings.'),
} satisfies SlashCommand;
