import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { PortalClient } from 'src/db/portal/PortalClient';
import { UserRole } from 'src/lib/config/config';
import { withErrorHandling } from 'src/lib/helpers/command';

import { SlashCommand } from 'typings/command';

const execute = async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply({ ephemeral: true });

  await PortalClient.updatePlayerAssignment();

  await interaction.editReply({
    content: `Updated player assignments!`,
  });
  return;
};

export const command = {
  command: new SlashCommandBuilder()
    .setName('update-player-assignments')
    .setDescription('Update active players for stored users.'),
  execute: withErrorHandling(
    execute,
    'There was an error while updating the user db.',
  ),
  minRole: UserRole.BOT_OWNERS,
} satisfies SlashCommand;