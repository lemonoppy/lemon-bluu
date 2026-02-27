import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { ChannelMapping, ChannelMonitor } from 'src/db/ctf/ChannelMonitor';
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
  const targetChannelId = interaction.options.getString('target_channel', true);

  // Validate source channel
  let sourceChannel;
  try {
    // Try to fetch from current guild first
    sourceChannel = await interaction.client.channels.fetch(sourceChannelId);
  } catch (error) {
    await interaction.editReply({
      content: `Could not find source channel with ID: ${sourceChannelId}`,
    });
    return;
  }

  if (!sourceChannel || !sourceChannel.isTextBased()) {
    await interaction.editReply({
      content: 'Source channel must be a text-based channel.',
    });
    return;
  }

  // Validate target channel
  let targetChannel;
  try {
    targetChannel = await interaction.client.channels.fetch(targetChannelId);
  } catch (error) {
    await interaction.editReply({
      content: `Could not find target channel with ID: ${targetChannelId}`,
    });
    return;
  }

  if (!targetChannel || !targetChannel.isTextBased()) {
    await interaction.editReply({
      content: 'Target channel must be a text-based channel.',
    });
    return;
  }

  // Check if already mapped
  if (ChannelMonitor.isMapped(sourceChannelId)) {
    await interaction.editReply({
      content: `Source channel <#${sourceChannelId}> is already being monitored. Remove the existing mapping first.`,
    });
    return;
  }

  // Create the mapping
  const mapping: ChannelMapping = {
    sourceChannelId: sourceChannelId,
    sourceChannelName: ('name' in sourceChannel ? sourceChannel.name : null) ?? 'Unknown',
    sourceGuildId: ('guildId' in sourceChannel && sourceChannel.guildId) ? sourceChannel.guildId : 'DM',
    sourceGuildName: 'guild' in sourceChannel && sourceChannel.guild ? sourceChannel.guild.name : 'DM',
    targetChannelId: targetChannelId,
    targetChannelName: ('name' in targetChannel ? targetChannel.name : null) ?? 'Unknown',
    targetGuildId: ('guildId' in targetChannel && targetChannel.guildId) ? targetChannel.guildId : 'DM',
    targetGuildName: 'guild' in targetChannel && targetChannel.guild ? targetChannel.guild.name : 'DM',
    createdAt: new Date().toISOString(),
  };

  ChannelMonitor.addMapping(mapping);

  await interaction.editReply({
    content: `✅ Successfully set up monitoring:\n\n` +
      `**Source:** ${mapping.sourceGuildName} → #${mapping.sourceChannelName} (\`${sourceChannelId}\`)\n` +
      `**Target:** ${mapping.targetGuildName} → #${mapping.targetChannelName} (\`${targetChannelId}\`)\n\n` +
      `Messages from the source channel will now be forwarded to the target channel.`,
  });
};

export default {
  command: new SlashCommandBuilder()
    .setName('link-backup')
    .setDescription('Link backup Google Sheets for redundancy')
    .addStringOption(option =>
      option
        .setName('source_channel')
        .setDescription('Primary Sheets ID')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('target_channel')
        .setDescription('Backup Sheets ID')
        .setRequired(true)
    ),
  execute: withErrorHandling(
    execute,
    'There was an error while linking backup channel.',
  ),
} satisfies SlashCommand;
