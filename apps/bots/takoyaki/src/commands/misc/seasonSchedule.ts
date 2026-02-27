import { SlashCommandBuilder } from 'discord.js';

import { Config } from 'src/lib/config/config';
import { DynamicConfig } from 'src/lib/config/dynamicConfig';
import { logger } from 'src/lib/logger';
import { SlashCommand } from 'typings/command';

export default {
  command: new SlashCommandBuilder()
    .setName('league-schedule')
    .setDescription('View the current league schedule'),
  execute: async (interaction) => {
    const messageId = DynamicConfig.scheduleId.get();

    await interaction.deferReply();

    try {
      const channel = interaction.client.channels.cache.get(
        Config.botCDNChannelId,
      );
      if (!channel) throw new Error('Could not find schedule channel.')
      if (!channel.isTextBased()) throw new Error('Schedule channel is not a text channel.')
      const storedMessage = await channel.messages.fetch(messageId);

      await interaction.editReply({
        content: storedMessage.content,
        embeds: storedMessage.embeds,
        components: storedMessage.components,
        allowedMentions: { parse: [] }
      })
      return;
    } catch (e) {
      logger.error(e)
      await interaction.editReply({
        content: "Could not retrieve the league schedule. Please try again later.",
      });
      return;
    }
  },
} satisfies SlashCommand;
