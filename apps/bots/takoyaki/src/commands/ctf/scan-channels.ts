import { ChannelType, ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
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

  const client = interaction.client;
  const channelData: Array<{
    guild: string;
    guildId: string;
    channel: string;
    channelId: string;
    type: string;
  }> = [];

  // Iterate through all guilds the bot is in
  for (const [guildId, guild] of client.guilds.cache) {
    try {
      // Fetch all channels in the guild
      const channels = await guild.channels.fetch();

      for (const [channelId, channel] of channels) {
        if (!channel) continue;

        // Check if it's a text-based channel
        if (
          channel.type === ChannelType.GuildText ||
          channel.type === ChannelType.GuildAnnouncement
        ) {
          // Check if bot has read permissions
          const permissions = channel.permissionsFor(client.user!);
          if (permissions?.has(PermissionFlagsBits.ViewChannel) &&
              permissions?.has(PermissionFlagsBits.ReadMessageHistory)) {
            channelData.push({
              guild: guild.name,
              guildId: guildId,
              channel: channel.name,
              channelId: channelId,
              type: ChannelType[channel.type],
            });
          }
        }
      }
    } catch (error) {
      // console.error(`Error scanning guild ${guild.name}:`, error);
    }
  }

  // Format the response
  if (channelData.length === 0) {
    await interaction.editReply({
      content: 'No readable channels found.',
    });
    return;
  }

  // Group by guild for better readability
  const groupedByGuild: { [key: string]: typeof channelData } = {};
  channelData.forEach(item => {
    if (!groupedByGuild[item.guildId]) {
      groupedByGuild[item.guildId] = [];
    }
    groupedByGuild[item.guildId].push(item);
  });

  let response = `**Found ${channelData.length} readable channels across ${Object.keys(groupedByGuild).length} servers:**\n\n`;

  for (const guildId in groupedByGuild) {
    const items = groupedByGuild[guildId];
    const guildName = items[0].guild;

    response += `**${guildName}** (${guildId}):\n`;
    items.forEach(item => {
      response += `  - #${item.channel} (${item.channelId}) [${item.type}]\n`;
    });
    response += '\n';
  }

  // Discord has a 2000 character limit, so we might need to split the response
  if (response.length > 2000) {
    // Split into chunks
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

    // Send first chunk as reply
    await interaction.editReply({ content: chunks[0] });

    // Send remaining chunks as follow-ups
    for (let i = 1; i < chunks.length; i++) {
      await interaction.followUp({ content: chunks[i], ephemeral: true });
    }
  } else {
    await interaction.editReply({ content: response });
  }
};

export default {
  command: new SlashCommandBuilder()
    .setName('debug-perms')
    .setDescription('Debug permission issues'),
  execute: withErrorHandling(
    execute,
    'There was an error while debugging permissions.',
  ),
} satisfies SlashCommand;
