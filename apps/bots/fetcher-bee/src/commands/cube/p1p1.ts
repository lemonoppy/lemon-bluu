import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { withErrorHandling } from 'src/lib/errorHandling';
import { SlashCommand } from 'typings/command';

const execute = async (interaction: ChatInputCommandInteraction) => {
  const cubeId = interaction.options.getString('cube_id', true);

  // Generate a random integer for the pack image
  const randomInt = Math.floor(Math.random() * 1000000);

  // Construct the CubeCobra sample pack image URL
  const imageUrl = `https://www.cubecobra.com/cube/samplepackimage/${cubeId}/${randomInt}.png`;

  await interaction.reply({
    content: `**P1P1 from ${cubeId}**\n${imageUrl}`,
  });
};

export default {
  command: new SlashCommandBuilder()
    .setName('p1p1')
    .setDescription('Generate a Pack 1, Pick 1 from a CubeCobra cube')
    .addStringOption((option) =>
      option
        .setName('cube_id')
        .setDescription('The CubeCobra cube Id')
        .setRequired(true)
    ),
  execute: withErrorHandling(execute, 'Failed to generate Pack 1, Pick 1.'),
} satisfies SlashCommand;