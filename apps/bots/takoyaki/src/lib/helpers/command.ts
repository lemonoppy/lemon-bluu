import { ChatInputCommandInteraction } from 'discord.js';

import { logger } from '../logger';

export const withErrorHandling = (
  execute: (interaction: ChatInputCommandInteraction) => Promise<void> | void,
  errorMessage = 'An unexpected error occurred.',
) => {
  return async (interaction: ChatInputCommandInteraction) => {
    try {
      await execute(interaction);
    } catch (error) {
      logger.error(error);

      if (!interaction.isRepliable()) {
        return;
      }

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: errorMessage,
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: errorMessage,
          ephemeral: true,
        });
      }
    }
  };
};
