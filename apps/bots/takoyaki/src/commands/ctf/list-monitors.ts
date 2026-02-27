import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { ChannelMonitor } from 'src/db/ctf/ChannelMonitor';
import { checkCTFAuthorization, sendUnauthorized } from 'src/lib/ctf';
import { withErrorHandling } from 'src/lib/helpers/command';
import { SlashCommand } from 'typings/command';

const execute = async (interaction: ChatInputCommandInteraction) => {
  // Check authorization first
  if (!checkCTFAuthorization(interaction)) {
    await sendUnauthorized(interaction);
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const mappings = ChannelMonitor.getAllMappings();

  if (mappings.length === 0) {
    await interaction.editReply({
      content: 'No channel monitors are currently active.',
    });
    return;
  }

  let response = `**Active Channel Monitors (${mappings.length}):**\n\n`;

  mappings.forEach((mapping, index) => {
    response += `**${index + 1}.** \`${mapping.sourceChannelId}\`\n`;
    response += `   Source: ${mapping.sourceGuildName} → #${mapping.sourceChannelName}\n`;
    response += `   Target: ${mapping.targetGuildName} → #${mapping.targetChannelName}\n`;
    response += `   Created: ${new Date(mapping.createdAt).toLocaleString()}\n\n`;
  });

  // Handle long responses
  if (response.length > 2000) {
    const chunks: string[] = [];
    let currentChunk = '';

    response.split('\n').forEach(line => {
      if ((currentChunk + line + '\n').length > 1900) {
        chunks.push(currentChunk);
        currentChunk = line + '\n';
      } else {
        currentChunk += line + '\n';
      }
    });

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    await interaction.editReply({ content: chunks[0] });

    for (let i = 1; i < chunks.length; i++) {
      await interaction.followUp({ content: chunks[i], ephemeral: true });
    }
  } else {
    await interaction.editReply({ content: response });
  }
};

export default {
  command: new SlashCommandBuilder()
    .setName('show-backups')
    .setDescription('Show backup channel configurations'),
  execute: withErrorHandling(
    execute,
    'There was an error while showing backups.',
  ),
} satisfies SlashCommand;
