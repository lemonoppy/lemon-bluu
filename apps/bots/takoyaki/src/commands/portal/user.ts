import {
  SlashCommandBuilder,
} from 'discord.js';
import { getUserByFuzzy } from 'src/db/portal';
import { users } from 'src/db/users';
import { withErrorHandling } from 'src/lib/helpers/command';
import { logger } from 'src/lib/logger';
import { withUserInfo } from 'src/lib/user';
import { SlashCommand } from 'typings/command';

export default {
  command: new SlashCommandBuilder()
    .setName('user')
    .addStringOption((option) =>
      option
        .setName('username')
        .setDescription('The username of the player on the forum.')
        .setRequired(false),
    )
    .setDescription('Retrieve player info from the portal.'),
  execute: withErrorHandling(async (interaction) => {
    await interaction.deferReply({ ephemeral: false });
    const target = interaction.options.getString('username');
    const currentUserInfo = await users.get(interaction.user.id);
    const name = target || currentUserInfo?.forumName;
    // const currentSeason = await PortalClient.getCurrentSeason();

    if (!name) {
      await interaction
        .editReply({
          content: 'No player name provided or stored.',
        })
        .catch((error) => {
          logger.error(error);
        });
      return;
    }

    const user = await getUserByFuzzy(name);
    if (!user) {
      await interaction.editReply({
        content:
          'Could not find user with that username. Please check your spelling and try again.',
      });
      return;
    }

    await withUserInfo(interaction, user);
  }, 'An error occurred while retrieving player info.'),
} satisfies SlashCommand;
