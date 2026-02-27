import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { SheetsClient } from 'src/db/sheets/SheetsClient';
import { UserRole } from 'src/lib/config/config';
import { withErrorHandling } from 'src/lib/helpers/command';
import { SlashCommand } from 'typings/command';

const execute = async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply();
  const targetType: string = interaction.options.getString('type') ?? 'weekly'

  await SheetsClient.refreshTPETrackerViaWebApp(targetType as 'dsfl' | 'weekly' | 'daily');

  await interaction.editReply({
    content: 'Sheet data has been refreshed.',
  });
};

export default {
  command: new SlashCommandBuilder()
    .setName('sheet-refresh')
    .setDescription('Update the Improved TPE Tracker sheet data.')
    .addStringOption((option) =>
      option
        .setName('type')
        .setDescription(
          'The tracker to update.',
        )
        .addChoices(
          { name: 'DSFL Draft', value: 'dsfl' },
          { name: 'Weekly Tracker', value: 'weekly' },
          { name: 'Daily Tracker', value: 'daily' },
        )
        .setRequired(true),
    ),
  execute: withErrorHandling(execute, 'Failed to update sheet.'),
  minRole: UserRole.SHEET_UPDATER
} satisfies SlashCommand;
