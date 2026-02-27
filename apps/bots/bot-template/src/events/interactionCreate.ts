import { Events, Interaction } from 'discord.js';

import { logger } from 'src/lib/logger';
import { BotEvent } from 'typings/event';

export default {
  name: Events.InteractionCreate,
  execute: async (interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;

    // Cooldown check
    const cooldownKey = `${interaction.commandName}-${interaction.user.id}`;
    const cooldown = interaction.client.cooldowns.get(cooldownKey);

    if (command.cooldown && cooldown) {
      if (Date.now() < cooldown) {
        const remainingSeconds = Math.ceil((cooldown - Date.now()) / 1000);
        await interaction.reply({
          content: `Please wait ${remainingSeconds}s before using this command again.`,
          ephemeral: true,
        });
        return;
      }
    } else if (command.cooldown && !cooldown) {
      interaction.client.cooldowns.set(
        cooldownKey,
        Date.now() + command.cooldown * 1000,
      );
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      logger.error(error, `Error executing /${interaction.commandName}`);

      const errorContent = {
        content: 'There was an error while executing this command.',
        ephemeral: true,
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorContent).catch(() => undefined);
      } else {
        await interaction.reply(errorContent).catch(() => undefined);
      }
    }
  },
} satisfies BotEvent;
