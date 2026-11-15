import { Events, Interaction } from 'discord.js';

import { logger } from 'src/lib/logger';
import { checkRole } from 'src/lib/role';
import { BotEvent } from 'typings/event';

const ERROR_RESPONSE = {
  content: 'There was an error while executing this command.',
  ephemeral: true,
} as const;

export const event = {
  name: Events.InteractionCreate,
  execute: async (interaction: Interaction) => {
    if (interaction.isAutocomplete()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command?.autocomplete) return;
      try {
        await command.autocomplete(interaction);
      } catch (error) {
        logger.error(
          error,
          `Error handling autocomplete for /${interaction.commandName}`,
        );
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;

    if (command.minRole && !checkRole(interaction.member, command.minRole)) {
      await interaction.reply({
        content: 'You do not have permission to run this command.',
        ephemeral: true,
      });
      return;
    }

    // Cooldown check
    const cooldownKey = `${interaction.commandName}-${interaction.user.id}`;
    const cooldown = interaction.client.cooldowns.get(cooldownKey);

    if (command.cooldown && cooldown && Date.now() < cooldown) {
      const remainingSeconds = Math.ceil((cooldown - Date.now()) / 1000);
      await interaction.reply({
        content: `Please wait ${remainingSeconds}s before using this command again.`,
        ephemeral: true,
      });
      return;
    }

    // Re-arm on every accepted use; otherwise the cooldown stays expired forever.
    if (command.cooldown) {
      interaction.client.cooldowns.set(
        cooldownKey,
        Date.now() + command.cooldown * 1000,
      );
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      logger.error(error, `Error executing /${interaction.commandName}`);

      if (interaction.replied || interaction.deferred) {
        await interaction
          .editReply(ERROR_RESPONSE)
          .catch(() =>
            interaction.followUp(ERROR_RESPONSE).catch(() => undefined),
          );
      } else {
        await interaction.reply(ERROR_RESPONSE).catch(() => undefined);
      }
    }
  },
} satisfies BotEvent<Events.InteractionCreate>;
