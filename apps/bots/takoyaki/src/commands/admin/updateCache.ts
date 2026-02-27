import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { FantasyClient } from 'src/db/fantasy/FantasyClient';
import { PortalClient } from 'src/db/portal/PortalClient';
import { SheetsClient } from 'src/db/sheets/SheetsClient';
import { UserRole } from 'src/lib/config/config';
import { withErrorHandling } from 'src/lib/helpers/command';

import { SlashCommand } from 'typings/command';

const execute = async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply({ ephemeral: true });

  await PortalClient.reload();
  await FantasyClient.reload();
  await SheetsClient.reload();

  await interaction.editReply({
    content: `Updated cache!`,
  });
  return;
};

export default {
  command: new SlashCommandBuilder()
    .setName('update-cache')
    .setDescription('Update the internal bot cache.'),
  execute: withErrorHandling(
    execute,
    'There was an error while updating the cache.',
  ),
  minRole: UserRole.BOT_OWNERS,
} satisfies SlashCommand;