import axios from 'axios';
import { AttachmentBuilder, EmbedBuilder, Events, Message } from 'discord.js';
import { ChannelMonitor } from 'src/db/ctf/ChannelMonitor';
import { logger } from 'src/lib/logger';
import { BotEvent } from 'typings/event';

export default {
  name: Events.MessageCreate,
  once: false,
  execute: async (message: Message) => {
    // Ignore bot messages to prevent loops
    if (message.author.bot) return;

    // Check if this channel is being monitored
    const mapping = ChannelMonitor.getMapping(message.channelId);
    if (!mapping) return;

    try {
      // Get the target channel
      const targetChannel = await message.client.channels.fetch(mapping.targetChannelId);

      if (!targetChannel || !targetChannel.isTextBased() || !('send' in targetChannel)) {
        logger.error(`Target channel ${mapping.targetChannelId} is not a valid text-based channel`);
        return;
      }

      // Create an embed with the message information
      const embed = new EmbedBuilder()
        .setAuthor({
          name: message.author.tag,
          iconURL: message.author.displayAvatarURL(),
        })
        .setDescription(message.content || '*[No text content]*')
        .setColor(0x5865F2)
        .setTimestamp(message.createdAt)
        .addFields([
          {
            name: 'Source',
            value: `${mapping.sourceGuildName} → #${mapping.sourceChannelName}`,
            inline: true,
          },
          {
            name: 'Message ID',
            value: message.id,
            inline: true,
          },
        ]);

      // Add jump link if message has a guild
      if (message.guild) {
        embed.addFields([
          {
            name: 'Jump to Message',
            value: `[Click here](${message.url})`,
            inline: true,
          },
        ]);
      }

      const forwardPayload: any = {
        embeds: [embed],
      };

      // Handle attachments
      if (message.attachments.size > 0) {
        const attachmentFiles: AttachmentBuilder[] = [];

        for (const [, attachment] of message.attachments) {
          try {
            // Download the attachment
            const response = await axios.get(attachment.url, {
              responseType: 'arraybuffer',
            });

            const file = new AttachmentBuilder(Buffer.from(response.data), {
              name: attachment.name || 'attachment',
            });

            attachmentFiles.push(file);
          } catch (error) {
            logger.error(`Failed to download attachment ${attachment.url}:`, error);
            embed.addFields([
              {
                name: 'Attachment (failed to download)',
                value: `[${attachment.name}](${attachment.url})`,
                inline: false,
              },
            ]);
          }
        }

        if (attachmentFiles.length > 0) {
          forwardPayload.files = attachmentFiles;
        }
      }

      // Handle embeds from original message
      if (message.embeds.length > 0) {
        const embedDescriptions = message.embeds.map((e, i) => {
          return `**Embed ${i + 1}:** ${e.title || 'No title'}\n${e.description || 'No description'}`;
        });

        embed.addFields([
          {
            name: `Original Embeds (${message.embeds.length})`,
            value: embedDescriptions.join('\n\n').substring(0, 1000),
            inline: false,
          },
        ]);
      }

      // Handle stickers
      if (message.stickers.size > 0) {
        const stickerNames = Array.from(message.stickers.values())
          .map(s => s.name)
          .join(', ');

        embed.addFields([
          {
            name: 'Stickers',
            value: stickerNames,
            inline: false,
          },
        ]);
      }

      // Handle replies
      if (message.reference) {
        try {
          const repliedMessage = await message.channel.messages.fetch(message.reference.messageId!);
          embed.addFields([
            {
              name: 'Replying to',
              value: `${repliedMessage.author.tag}: ${repliedMessage.content.substring(0, 100)}${repliedMessage.content.length > 100 ? '...' : ''}`,
              inline: false,
            },
          ]);
        } catch (error) {
          // Could not fetch replied message
        }
      }

      // Send the message to the target channel
      await targetChannel.send(forwardPayload);

      logger.info(`Forwarded message from ${mapping.sourceChannelName} to ${mapping.targetChannelName}`);
    } catch (error) {
      logger.error(`Error forwarding message from ${message.channelId}:`, error);
    }
  },
} satisfies BotEvent;
