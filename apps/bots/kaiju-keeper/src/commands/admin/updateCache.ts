import { SlashCommandBuilder } from 'discord.js';
import { PortalClient } from 'src/db/PortalClient';
import { UserRole } from 'src/lib/config/config';

import { SlashCommand } from 'typings/command';

export default {
  command: new SlashCommandBuilder()
    .setName('update-cache')
    .setDescription('Update the internal bot cache.'),
  execute: async (interaction) => {
    await interaction.deferReply();

    await PortalClient.reload();

    await interaction.editReply({
      content: `Updated cache!`,
    });
    return;
  },
  minRole: UserRole.SERVER_ADMIN,
} satisfies SlashCommand;
