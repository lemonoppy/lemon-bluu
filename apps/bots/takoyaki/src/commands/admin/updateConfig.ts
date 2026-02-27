import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { UserRole } from 'src/lib/config/config';
import { DynamicConfig } from 'src/lib/config/dynamicConfig';
import { withErrorHandling } from 'src/lib/helpers/command';

import { SlashCommand } from 'typings/command';

const execute = async (interaction: ChatInputCommandInteraction) => {
  const fantasySheetId = interaction.options.getString('fantasysheetid');
  if (!fantasySheetId) {
    await interaction.reply({
      content: 'You must provide some value to update the config',
      ephemeral: true,
    });
    return;
  }
  await DynamicConfig.set('fantasySheetId', fantasySheetId);
  await interaction.reply({
    content: `Updated the fantasy sheet ID to ${fantasySheetId}.`,
    ephemeral: true,
  });
  return;
};

export default {
  command: new SlashCommandBuilder()
    .setName('update-config')
    .addStringOption((option) =>
      option
        .setName('fantasysheetid')
        .setDescription(
          'The ID of the Google Sheet that contains the fantasy data.',
        )
        .setRequired(true),
    )
    .setDescription('Update the internal bot configuration.'),
  execute: withErrorHandling(
    execute,
    'There was an error while updating the config.',
  ),
  minRole: UserRole.BOT_OWNERS,
} satisfies SlashCommand;
