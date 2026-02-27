import { SlashCommandBuilder } from 'discord.js';

import { SlashCommand } from 'typings/command';

export default {
  command: new SlashCommandBuilder()
    .setName('blockgod')
    .setDescription('Sing me the song of the block god'),
  execute: async (interaction) => {
    const bamaSong =
`\`\`\`They got a name for the winners in the world
(I) I want a name when I lose
They call Alabama the Crimson Tide
Call me Deacon Blues\`\`\``.toString()

    await interaction.reply({
      content: bamaSong,
    });
    return;
  },
} satisfies SlashCommand;
