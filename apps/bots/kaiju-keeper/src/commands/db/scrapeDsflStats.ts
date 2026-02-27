import { SlashCommandBuilder } from 'discord.js';
import { UserRole } from 'src/lib/config/config';
import { logger } from 'src/lib/logger';
import { processWeeksDSFL } from 'src/lib/process-week-dsfl';
import { SlashCommand } from 'typings/command';

const command: SlashCommand = {
  command: new SlashCommandBuilder()
    .setName('scrape-dsfl-stats')
    .setDescription('Scrape DSFL S58 stats for a specific week and append to Google Sheets')
    .addIntegerOption(option =>
      option
        .setName('week')
        .setDescription('Week number to scrape and append to the season tab')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(19)
    ),
  minRole: UserRole.SERVER_ADMIN,
  execute: async (interaction) => {
    const targetWeek = interaction.options.getInteger('week', true);

    await interaction.deferReply();

    try {
      logger.info(`Processing DSFL S58 Week ${targetWeek}`);

      const result = await processWeeksDSFL(targetWeek);

      if (!result.success) {
        let errorMessage = `❌ **Error:** ${result.message}`;
        if (result.errors.length > 0) {
          errorMessage += `\n\`\`\`${result.errors.join('\n')}\`\`\``;

          // Provide helpful tips for common errors
          const errorText = result.errors.join(' ');
          if (errorText.includes('GOOGLE_SERVICE_ACCOUNT_PATH')) {
            errorMessage += '\n💡 **Tip:** Set `GOOGLE_SERVICE_ACCOUNT_PATH` in your `.env` file';
          }
          if (errorText.includes('DSFL_SHEET_ID')) {
            errorMessage += '\n💡 **Tip:** Set `DSFL_SHEET_ID` in your `.env` file';
          }
          if (errorText.includes('Service account file not found')) {
            errorMessage += '\n💡 **Tip:** Make sure your service account JSON file exists at the specified path';
          }
          if (errorText.includes('404') || errorText.includes('not found')) {
            errorMessage += '\n💡 **Tip:** Verify DSFL Season 58 data is available at https://index.sim-football.com/DSFLS58/';
          }
        }

        await interaction.editReply(errorMessage);
        return;
      }

      const sheetUrl = process.env.DSFL_SHEET_ID
        ? `https://docs.google.com/spreadsheets/d/${process.env.DSFL_SHEET_ID}`
        : 'Google Spreadsheet';

      let resultMessage = [
        `✅ **DSFL S58 W${targetWeek} - Appended to Sheet**`,
        `📊 **Records Processed:** ${result.totalRecords}`,
        `📤 **Exported to Sheets:** ${result.exportedCount}`,
        `🔗 **View Results:** [Open Spreadsheet](${sheetUrl})`
      ];

      if (result.errors.length > 0) {
        resultMessage.push(`\n⚠️ **Warnings:**`);
        result.errors.slice(0, 5).forEach(error => {
          resultMessage.push(`- ${error}`);
        });
        if (result.errors.length > 5) {
          resultMessage.push(`- ... and ${result.errors.length - 5} more warnings`);
        }
      }

      await interaction.editReply(resultMessage.join('\n'));

    } catch (error) {
      logger.error('DSFL scraping failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);

      let reply = `❌ **Error:** Failed to process DSFL S58 W${targetWeek}\n\`\`\`${errorMessage}\`\`\``;

      // Provide helpful context
      if (errorMessage.includes('GOOGLE_SERVICE_ACCOUNT_PATH') || errorMessage.includes('DSFL_SHEET_ID')) {
        reply += '\n\n💡 **Setup Required:**\nEnsure the following environment variables are set in your `.env` file:\n- `GOOGLE_SERVICE_ACCOUNT_PATH`\n- `DSFL_SHEET_ID`';
      }

      await interaction.editReply(reply);
    }
  },

  cooldown: 30 // 30 second cooldown due to data fetching and processing
};

export default command;
