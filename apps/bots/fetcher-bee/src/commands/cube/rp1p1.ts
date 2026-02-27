import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { getRandomCube, trackCubeSelection } from 'src/lib/cubes';
import { withErrorHandling } from 'src/lib/errorHandling';
import { SlashCommand } from 'typings/command';

const execute = async (interaction: ChatInputCommandInteraction) => {
  const { key, cube } = getRandomCube();

  // Track the cube selection
  await trackCubeSelection(
    key,
    interaction.user.id,
    interaction.user.username || interaction.user.displayName || 'Unknown User'
  );

  // Generate a random integer for the pack image
  const randomInt = Math.floor(Math.random() * 1000000);

  // Construct the CubeCobra sample pack image URL
  const imageUrl = `https://www.cubecobra.com/cube/samplepackimage/${cube.id}/${randomInt}.png`;

  await interaction.reply({
    content: `**[[${cube.setCode}] ${key}](<https://www.cubecobra.com/cube/overview/${cube.id}>)** - ${cube.description}\n${imageUrl}`,
  });
};

export default {
  command: new SlashCommandBuilder()
    .setName('rp1p1')
    .setDescription('Generate a random Pack 1, Pick 1 from one of our cubes'),
  execute: withErrorHandling(execute, 'Failed to generate random Pack 1, Pick 1.'),
} satisfies SlashCommand;