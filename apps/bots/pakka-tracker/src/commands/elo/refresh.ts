import { hexColorToInt } from '@lemon-bluu/discord';
import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';

import { refreshStalePlayerElos } from 'src/lib/eloshowdown/service';
import { SlashCommand } from 'typings/command';

const UVS_COLOR = '#7b5df5';

const execute = async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply();

  const result = await refreshStalePlayerElos();

  const description = [
    `**Players refreshed:** ${result.refreshed}`,
    `**Requests used:** ${result.requestsUsed}`,
    result.stoppedEarly
      ? '⚠️ Stopped early (EloShowdown request budget/rate limit) — rerun to continue'
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  const embed = new EmbedBuilder()
    .setColor(hexColorToInt(UVS_COLOR))
    .setTitle('Elo Refresh')
    .setDescription(description)
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
};

export const command = {
  command: new SlashCommandBuilder()
    .setName('refresh')
    .setDescription('Refresh stale elo histories from EloShowdown'),
  execute,
} satisfies SlashCommand;
