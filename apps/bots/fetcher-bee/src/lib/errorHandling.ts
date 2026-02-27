import { ChatInputCommandInteraction } from 'discord.js';

import { logger } from './logger';

export const withErrorHandling = (
  executeFunction: (interaction: ChatInputCommandInteraction) => Promise<void>,
  errorMessage: string = 'An error occurred while executing this command.',
) => {
  return async (interaction: ChatInputCommandInteraction): Promise<void> => {
    try {
      await executeFunction(interaction);
    } catch (error) {
      logger.error(error, `Error in command ${interaction.commandName}: ${errorMessage}`);

      const errorResponse = {
        content: errorMessage,
        ephemeral: true,
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorResponse).catch(() => {
          // If followUp fails, try editReply as fallback
          interaction.editReply(errorResponse).catch(() => {
            // If both fail, log it but don't throw
            logger.error('Failed to send error message to user');
          });
        });
      } else {
        await interaction.reply(errorResponse).catch(() => {
          logger.error('Failed to send error message to user');
        });
      }
    }
  };
};