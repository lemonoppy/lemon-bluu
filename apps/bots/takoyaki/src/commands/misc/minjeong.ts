import * as process from 'node:process';

import { SlashCommandBuilder } from 'discord.js';

import { SlashCommand } from 'typings/command';

export default {
  command: new SlashCommandBuilder()
    .setName('minjeong')
    .setDescription('Stan Minjeong'),
  execute: async (interaction) => {

    const response = await fetch(
      `https://tenor.googleapis.com/v2/search?key=${process.env.TENOR_KEY}&contentfilter=medium&random=true&q=winter%20aespa`
    );
    const gifResponse = await response.json();

    await interaction.reply({
      content: gifResponse.results[1].url,
    });
    return;
  },
} satisfies SlashCommand;
