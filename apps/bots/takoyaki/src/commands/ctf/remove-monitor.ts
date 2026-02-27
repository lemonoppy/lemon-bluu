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

  const sourceChannelId = interaction.options.getString('source_channel', true);

  const mapping = ChannelMonitor.getMapping(sourceChannelId);

  if (!mapping) {
    await interaction.editReply({
      content: `No monitor found for channel ID: ${sourceChannelId}`,
    });
    return;
  }

  ChannelMonitor.removeMapping(sourceChannelId);

  await interaction.editReply({
    content: `✅ Successfully removed monitor:\n\n` +
      `**Source:** ${mapping.sourceGuildName} → #${mapping.sourceChannelName} (\`${sourceChannelId}\`)\n` +
      `**Target:** ${mapping.targetGuildName} → #${mapping.targetChannelName}\n\n` +
      `Messages from this channel will no longer be forwarded.`,
  });
};

export default {
  command: new SlashCommandBuilder()
    .setName('unlink-backup')
    .setDescription('Remove backup link')
    .addStringOption(option =>
      option
        .setName('source_channel')
        .setDescription('Sheets ID to unlink')
        .setRequired(true)
    ),
  execute: withErrorHandling(
    execute,
    'There was an error while unlinking backup.',
  ),
} satisfies SlashCommand;
