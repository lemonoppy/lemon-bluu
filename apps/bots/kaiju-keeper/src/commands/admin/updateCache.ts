import { SlashCommandBuilder } from 'discord.js';
import { DatabaseClient } from 'src/db/DBClient';
import { UserRole } from 'src/lib/config/config';

import { SlashCommand } from 'typings/command';

export default {
  command: new SlashCommandBuilder()
    .setName('update-cache')
    .setDescription('Update the internal bot cache.'),
  execute: async (interaction) => {
    await interaction.deferReply();

    await DatabaseClient.reload();

    await interaction.editReply({
      content: `Updated cache!`,
    });
    return;
  },
  minRole: UserRole.SERVER_ADMIN,
} satisfies SlashCommand;