import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { withErrorHandling } from 'src/lib/errorHandling';
import { SlashCommand } from 'typings/command';

const execute = async (interaction: ChatInputCommandInteraction) => {
  if (!interaction.isRepliable()) {
    return;
  }

  await interaction.deferReply();

  const honkCount = Math.floor(Math.random() * 20) + Math.floor(Math.random() * 20) + 3;
  const honkString = 'honk '.repeat(honkCount).trim();

  const honkGIF = 'https://tenor.com/view/honk-goose-honking-untitled-goose-game-gif-17492593';
  const goldenHonk = 'https://media.discordapp.net/attachments/1121495689608822806/1370506578809061517/goldgoosestonks.png?format=webp&quality=lossless';

  if (honkCount >= 39) {
    await interaction.editReply({ content: goldenHonk });
    setTimeout(() => {
      if (interaction.isRepliable()) {
        interaction.followUp({
          content: 'BEHOLD THE GOLDEN GOOSE\n\n' + 'honk '.repeat(100).trim(),
        });
      }
    }, 1500);
  } else if (honkCount >= 33) {
    await interaction.editReply({ content: honkGIF });
  } else if (honkCount >= 32) {
    await interaction.editReply({ content: 'HONK '.repeat(40).trim() });
  } else {
    await interaction.editReply({ content: honkString });
  }
};

export default {
  command: new SlashCommandBuilder()
    .setName('honk')
    .setDescription('HONKS'),
  execute: withErrorHandling(execute, 'Failed to honk properly.'),
} satisfies SlashCommand;