import {
  ButtonInteraction,
  SlashCommandBuilder,
} from 'discord.js';
import { PortalClient } from 'src/db/portal/PortalClient';
import { createButtonCollector } from 'src/lib/helpers/buttonCollector';
import {
  createActionRow,
  createTeamEmbed,
} from 'src/lib/helpers/buttons/teamButton';
import { withErrorHandling } from 'src/lib/helpers/command';
import { logger } from 'src/lib/logger';
import { findTeamByName } from 'src/lib/teams';

import { SlashCommand } from 'typings/command';
import { ManagerInfo } from 'typings/portal';

export default {
  command: new SlashCommandBuilder()
    .setName('team')
    .addStringOption((option) =>
      option
        .setName('abbr')
        .setDescription(
          'The abbreviation of the team. If not provided, will use the team name stored by /store.',
        )
        .setRequired(false),
    )
    .addNumberOption((option) =>
      option
        .setName('season')
        .setDescription(
          'The season to get stats for. If not provided, will get current season.',
        )
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName('view')
        .setDescription('Choose what information to view')
        .addChoices(
          { name: 'Overview', value: 'overview' },
          { name: 'Current Roster', value: 'roster' },
          // { name: 'Schedule', value: 'schedule' },
        )
        .setRequired(false),
    )
    .setDescription('Get team information.'),
  execute: withErrorHandling(async (interaction) => {
    await interaction.deferReply();

      const view = interaction.options.getString('view') ?? 'overview';

      const { getPlayerFromDiscordUser } = await import('src/lib/helpers/playerHelpers');

      const currentSeason = await PortalClient.getCurrentSeason();
      const season = interaction.options.getNumber('season') ?? currentSeason;

      const player = await getPlayerFromDiscordUser(interaction.user.id);

      if (!interaction.options.getString('abbr') && !player) {
        await interaction
          .editReply({
            content: 'No team abbreviation provided or user stored.',
          })
          .catch((error) => {
            logger.error(error);
          });
        return;
      }

      const abbreviation = interaction.options.getString('abbr') ??
        (player?.currentLeague === 'ISFL' ? player?.isflTeam : player?.dsflTeam);

      if (!abbreviation) {
        await interaction
          .editReply({
            content: 'No team abbreviation provided and user\'s player without a team.',
          })
          .catch((error) => {
            logger.error(error);
          });
        return;
      }

      const teamInfo = findTeamByName(abbreviation);

      if (!teamInfo) {
        await interaction.editReply({
          content: `Could not find team with abbreviation ${abbreviation}.`,
        });
        return;
      }

      let managerInfo: ManagerInfo[] = [];

      managerInfo = (
        await PortalClient.getGeneralManagers(false)
      ).filter((manager) => manager.team === teamInfo.abbreviation);

      const row = createActionRow(abbreviation, view, 54);

      const initialEmbed = await createTeamEmbed(
        interaction,
        teamInfo,
        season,
        view,
        managerInfo,
      );

      if (!initialEmbed) {
        return;
      }

      const response = await interaction
        .editReply({
          embeds: [initialEmbed],
          components: [row],
        })
        .catch(async (error) => {
          logger.error(error);
          await interaction.editReply({
            content: 'An error occurred while fetching team info.',
          });
          return;
        });

      if (!response) {
        return;
      }

      createButtonCollector(
        response,
        interaction.user.id,
        async (i: ButtonInteraction) => {
          const [action, abbr] = i.customId.split('_');

          await i.deferUpdate();

          const newEmbed = await createTeamEmbed(
            interaction,
            teamInfo,
            season,
            action,
            managerInfo,
          );

          const updatedRow = createActionRow(
            abbr,
            action,
            season
          );

          if (!newEmbed) return;
          await i.editReply({
            embeds: [newEmbed],
            components: [updatedRow],
          });
        },
        {
          onEnd: async () => {
            try {
              await interaction.editReply({
                components: [],
              });
            } catch (error) {
              logger.error(error);
            }
          }
        }
      );
  }, 'An error occurred while fetching team info.'),
} satisfies SlashCommand;
