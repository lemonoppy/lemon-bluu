import {
  CacheType,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';

import { capitalize } from 'lodash';

import { hexColorToInt } from './format';

export const BaseEmbed = (
  interaction: ChatInputCommandInteraction<CacheType>,
  {
    thumbnailUrl,
    embedColor,
    forceColor,
  }: {
    thumbnailUrl?: string;
    embedColor?: string;
    forceColor?: string;
  },
) => {
  const color =
    forceColor ||
    embedColor ||
    '#f5df4d';

  const embed = new EmbedBuilder()
    .setColor(hexColorToInt(color))
    .setTimestamp()
    .setFooter({
      text: 'stan winter',
    });
  if (thumbnailUrl) {
    embed.setThumbnail(thumbnailUrl);
  }
  return embed;
};

export const ErrorEmbed = (
  interaction: ChatInputCommandInteraction<CacheType>,
  error: unknown,
) => {
  return new EmbedBuilder()
    .setColor(0xff0000)
    .setTimestamp()
    .setTitle(
      `Unhandled ${error instanceof Error ? error?.name : 'Error'} Occurred`,
    )
    .setDescription(
      `Error occured while executing command \`/${interaction.commandName}\`.`,
    )
    .addFields(
      {
        name: 'Error Location',
        value: [
          `**Username:** ${interaction.user.username}`,
          `**User ID:** ${interaction.user.id}`,
          `**Guild Name:** ${interaction.guild?.name ?? 'DM'}`,
          `**Guild ID:** ${interaction.guildId}`,
          ...(interaction.channel && 'name' in interaction.channel
            ? [`**Channel Name:** ${interaction.channel.name}`]
            : []),
          `**Channel ID:** ${interaction.channelId}`,
        ].join('\n'),
        inline: true,
      },
      {
        name: 'Interaction Details',
        value: [
          `**Name:** /${interaction.commandName}`,
          `**Options:**`,
          interaction.options.data.map(
            (option) => `*${capitalize(option.name)}:* ${option.value}`,
          ),
        ].join('\n'),
        inline: true,
      },
      {
        name: 'Raw Error',
        value: `\`\`\`js\n${
          error instanceof Error ? error.stack : error
        }\`\`\``,
      },
    );
};
