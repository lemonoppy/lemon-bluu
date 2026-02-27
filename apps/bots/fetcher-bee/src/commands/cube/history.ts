import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { getAllCubeStats, getTopUserForCube } from 'src/lib/cubes';
import { BaseEmbed } from 'src/lib/embed';
import { withErrorHandling } from 'src/lib/errorHandling';
import { SlashCommand } from 'typings/command';
import { CubeUsageStats } from 'typings/cube';

const execute = async (interaction: ChatInputCommandInteraction) => {
  const cubeStats = await getAllCubeStats();

  if (cubeStats.length === 0) {
    await interaction.reply({
      content: 'No cube selections recorded yet! Use `/rp1p1` to start generating some stats.',
      ephemeral: true,
    });
    return;
  }

  const buildEmbedFields = async (stats: CubeUsageStats[]) => {
    const fields: any[] = [];

    // Only show top 10 to avoid embed limits
    const topStats = stats.slice(0, 10);

    for (const [index, stat] of topStats.entries()) {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;

      // Get top user for this cube
      const topUser = stat.count > 0 ? await getTopUserForCube(stat.cubeKey) : null;

      let value = `**Selections:** ${stat.count}`;
      if (topUser) {
        value += `\n**Top User:** ${topUser.username} (${topUser.count})`;
      }

      fields.push({
        name: `${medal} ${stat.cubeKey}`,
        value,
        inline: true,
      });
    }

    return fields;
  };

  const fields = await buildEmbedFields(cubeStats);

  await interaction.reply({
    embeds: [
      BaseEmbed(interaction, {})
        .setTitle('Shuffle Truther History')
        .setDescription('Most popular cubes from `/rp1p1` selections')
        .addFields(fields)
        .setFooter({ text: 'Use /rp1p1 to add to these stats!' })
    ]
  });
};

export default {
  command: new SlashCommandBuilder()
    .setName('history')
    .setDescription('View cube selection statistics from random picks'),
  execute: withErrorHandling(execute, 'Failed to retrieve cube history.'),
} satisfies SlashCommand;