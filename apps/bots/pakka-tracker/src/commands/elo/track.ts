import { hexColorToInt } from '@lemon-bluu/discord';
import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';

import { processOttawaEventById } from 'src/lib/eloshowdown/service';
import { extractEventId } from 'src/lib/uvs/client';
import { SlashCommand } from 'typings/command';

const UVS_COLOR = '#7b5df5';

const execute = async (interaction: ChatInputCommandInteraction) => {
  const eventId = extractEventId(
    interaction.options.getString('event_id', true),
  );

  await interaction.deferReply();

  if (!eventId) {
    await interaction.editReply({
      content: 'Provide a Riftbound event ID or playriftbound.com event URL.',
    });
    return;
  }

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
    .setDescription(
      'Track a single Riftbound event for elo (works for any store)',
    )
    .addStringOption((option) =>
      option
        .setName('event_id')
        .setDescription('Riftbound event ID or playriftbound.com event URL')
        .setRequired(true),
    ),
  execute,
} satisfies SlashCommand;
