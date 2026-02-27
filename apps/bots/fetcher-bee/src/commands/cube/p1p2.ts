import { AttachmentBuilder, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { withErrorHandling } from 'src/lib/errorHandling';
import { processPackImage } from 'src/lib/imageProcessor';
import { SlashCommand } from 'typings/command';

const execute = async (interaction: ChatInputCommandInteraction) => {
  const cubeId = interaction.options.getString('cube_id', true);

  // Defer the reply since image processing might take a moment
  await interaction.deferReply();

  try {
    // Generate a random integer for the pack image
    const randomInt = Math.floor(Math.random() * 1000000);

    // Construct the CubeCobra sample pack image URL
    const imageUrl = `https://www.cubecobra.com/cube/samplepackimage/${cubeId}/${randomInt}.png`;

    // Process the image to grey out a random card
    const processedImageBuffer = await processPackImage(imageUrl);

    // Create attachment
    const attachment = new AttachmentBuilder(processedImageBuffer, {
      name: `${cubeId}_p1p2.png`
    });

    await interaction.editReply({
      content: `**P1P2 from ${cubeId}**\n*One card has been picked...*`,
      files: [attachment]
    });
  } catch (error) {
    await interaction.editReply({
      content: `Error processing pack image for cube ${cubeId}. Please try again.`
    });
    throw error; // Re-throw for error handling middleware
  }
};

export default {
  command: new SlashCommandBuilder()
    .setName('p1p2')
    .setDescription('Generate a Pack 1, Pick 2 from a CubeCobra cube')
    .addStringOption((option) =>
      option
        .setName('cube_id')
        .setDescription('The CubeCobra cube Id')
        .setRequired(true)
    ),
  execute: withErrorHandling(execute, 'Failed to generate Pack 1, Pick 2.'),
} satisfies SlashCommand;