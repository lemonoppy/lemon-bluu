import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { UserRole } from 'src/lib/config/config';
import { DynamicConfig } from 'src/lib/config/dynamicConfig';
import { withErrorHandling } from 'src/lib/helpers/command';

import { SlashCommand } from 'typings/command';

const execute = async (interaction: ChatInputCommandInteraction) => {
  const messageId = interaction.options.getString('schedule-message');
  if (!messageId) {
    await interaction.reply({
      content: 'You must provide some value to update the config'
    });
    return;
  }
  await DynamicConfig.set('scheduleId', messageId);
  await interaction.reply({
    content: `Updated the league schedule id to ${messageId}.`,
    ephemeral: true,
  });
  return;
};

export default {
  command: new SlashCommandBuilder()
    .setName('update-schedule')
    .addStringOption((option) =>
      option
        .setName('schedule-message')
        .setDescription('The ID of the schedule message.')
        .setRequired(true),
    )
    .setDescription('Update the internal bot configuration.'),
  execute: withErrorHandling(
    execute,
    'There was an error while updating the schedule message ID.',
  ),
  minRole: UserRole.BOT_OWNERS,
} satisfies SlashCommand;
