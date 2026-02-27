import { SlashCommandBuilder } from 'discord.js';

import { SlashCommand } from 'typings/command';

export default {
  command: new SlashCommandBuilder()
    .setName('retire')
    .setDescription('No tamper'),
  execute: async (interaction) => {
    await interaction.reply({
      content: 'https://media.discordapp.net/attachments/647264522058334220/1372779886317666405/ezgif-8b3d3c2b1aeac7.gif?ex=6839d0a5&is=68387f25&hm=0bb24f5f0a75538f68f12aa43747d1d7e91d44aed463bc1beb5f6f927a831bb9&=',
    });
    return;
  },
} satisfies SlashCommand;
