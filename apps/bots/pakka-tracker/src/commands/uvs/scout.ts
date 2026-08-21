import { hexColorToInt } from '@lemon-bluu/discord';
import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';

import Query from 'src/lib/db';
import { fetchEventDetails, fetchEventRegistrations } from 'src/lib/uvs/client';
import { squadMemberByUsername } from 'src/lib/uvs/squad';
import { SlashCommand } from 'typings/command';

const UVS_COLOR = '#7b5df5';
const DEFAULT_LIMIT = 25;
const SQUAD_EMOJI = '⭐';

const execute = async (interaction: ChatInputCommandInteraction) => {
  const eventId = interaction.options.getInteger('event_id', true);
  const limit = interaction.options.getInteger('limit') ?? DEFAULT_LIMIT;

  await interaction.deferReply();

  const [eventData, registrations] = await Promise.all([
    fetchEventDetails(eventId),
    fetchEventRegistrations(eventId),
  ]);

  const enrolled = registrations.filter(
    (registration) => registration.registration_status === 'COMPLETE',
  );
  if (enrolled.length === 0) {
    await interaction.editReply({
      content: `No enrolled players found for **${eventData.name}**.`,
    });
    return;
  }

  const riftboundIds = enrolled.map((registration) => String(registration.user.id));
  const eloResult = await Query<{
    riftbound_id: string;
    current_elo: number | null;
  }>(
    `SELECT riftbound_id, current_elo
     FROM eloshowdown_players
     WHERE riftbound_id = ANY($1::text[])`,
    [riftboundIds],
  );
  if (eloResult.isErr()) {
    throw new Error('Failed to load elos from the database.');
  }
  const eloById = new Map(
    eloResult.value.rows.map((row) => [row.riftbound_id, row.current_elo]),
  );

  const rows = enrolled
    .map((registration) => ({
      name: registration.best_identifier,
      isSquad: squadMemberByUsername.has(registration.best_identifier.toLowerCase()),
      elo: eloById.get(String(registration.user.id)) ?? null,
    }))
    .sort(
      (a, b) =>
        (b.elo ?? -1) - (a.elo ?? -1) ||
        a.name.localeCompare(b.name),
    );

  const lines = rows.slice(0, limit).map((row, index) => {
    const name = row.isSquad ? `${SQUAD_EMOJI} ${row.name}` : row.name;
    const elo = row.elo != null ? String(row.elo) : '—';
    return `${index + 1}. ${name} — ${elo} elo`;
  });

  const extraCount = Math.max(0, rows.length - limit);
  if (extraCount > 0) {
    lines.push(`…and ${extraCount} more`);
  }

  const embed = new EmbedBuilder()
    .setColor(hexColorToInt(UVS_COLOR))
    .setTitle(eventData.name)
    .setDescription(lines.join('\n'))
    .setFooter({ text: `⭐ = Do Some Work squad • ${rows.length} enrolled` })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
};

export const command = {
  command: new SlashCommandBuilder()
    .setName('scout')
    .setDescription('List an event\'s enrolled players by elo')
    .addIntegerOption((option) =>
      option
        .setName('event_id')
        .setDescription('The UVS event ID to scout')
        .setRequired(true)
        .setMinValue(1),
    )
    .addIntegerOption((option) =>
      option
        .setName('limit')
        .setDescription('Number of players to show')
        .setMinValue(1)
        .setMaxValue(50),
    ),
  execute,
} satisfies SlashCommand;
