import { hexColorToInt } from '@lemon-bluu/discord';
import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';

import { processOttawaEventById } from 'src/lib/eloshowdown/service';
import { SlashCommand } from 'typings/command';

const UVS_COLOR = '#7b5df5';

const execute = async (interaction: ChatInputCommandInteraction) => {
  const eventId = interaction.options.getInteger('event_id', true);

  await interaction.deferReply();

  const result = await processOttawaEventById(eventId);

  const description = [
    `**Event ID:** ${eventId}`,
    `**Participants:** ${result.participants}`,
    `**Players linked to elo:** ${result.processedPlayers}`,
    `**Elo complete:** ${result.eloComplete ? 'Yes' : 'No — rerun to finish backfill'}`,
    result.stoppedEarly
      ? '⚠️ Stopped early (EloShowdown request budget/rate limit) — rerun to continue'
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  const embed = new EmbedBuilder()
    .setColor(hexColorToInt(UVS_COLOR))
    .setTitle(result.eventName)
    .setDescription(description)
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
};

export const command = {
  command: new SlashCommandBuilder()
    .setName('track')
    .setDescription('Track a single UVS event for elo (works for any store)')
    .addIntegerOption((option) =>
      option
        .setName('event_id')
        .setDescription('The UVS event ID to record')
        .setRequired(true)
        .setMinValue(1),
    ),
  execute,
} satisfies SlashCommand;
