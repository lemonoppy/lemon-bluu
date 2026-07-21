import * as process from 'node:process';

import { SlashCommandBuilder } from 'discord.js';

import { SlashCommand } from 'typings/command';

export const command = {
  command: new SlashCommandBuilder()
    .setName('minjeong')
    .setDescription('Stan Minjeong'),
  execute: async (interaction) => {

    const response = await fetch(
      `https://api.klipy.com/v2/search?key=${process.env.KLIPY_KEY}&contentfilter=medium&random=true&q=winter%20aespa`
    );
    const gifResponse = await response.json();

        const gif = gifResponse?.results?.[0];

    await interaction.reply({
      content: gif?.url || 'No gif found',
    });
    return;
  },
} satisfies SlashCommand;