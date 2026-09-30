import { hexColorToInt } from '@lemon-bluu/discord';
import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';

import Query from 'src/lib/db';
import {
  HydrateRegistrantsResult,
  hydrateRegistrants,
} from 'src/lib/eloshowdown/service';
import { fetchEventDetails, fetchEventRegistrations } from 'src/lib/uvs/client';
import { squadMemberByUsername } from 'src/lib/uvs/squad';
import { SlashCommand } from 'typings/command';

const UVS_COLOR = '#7b5df5';
const DEFAULT_LIMIT = 25;
const SQUAD_EMOJI = '⭐';

interface CachedElo {
  riftbound_id: string;
  current_elo: number | null;
}

const loadElos = async (
  riftboundIds: string[],
): Promise<Map<string, number | null>> => {
  const result = await Query<CachedElo>(
    `SELECT riftbound_id, current_elo
     FROM eloshowdown_players
     WHERE riftbound_id = ANY($1::text[])`,
    [riftboundIds],
  );
  if (result.isErr()) {
    throw new Error('Failed to load elos from the database.');
  }
  return new Map(
    result.value.rows.map((row) => [row.riftbound_id, row.current_elo]),
  );
};

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

  const riftboundIds = enrolled.map((registration) =>
    String(registration.user.id),
  );
  let eloById = await loadElos(riftboundIds);
  const missing = enrolled.filter(
    (registration) => eloById.get(String(registration.user.id)) == null,
  );

  let hydration: HydrateRegistrantsResult | null = null;
  if (missing.length > 0) {
    hydration = await hydrateRegistrants(
      missing.map((registration) => ({
        riftboundId: registration.user.id,
        username: registration.best_identifier,
      })),
    );
    eloById = await loadElos(riftboundIds);
  }

  const rows = enrolled
    .map((registration) => ({
      name: registration.best_identifier,
      isSquad: squadMemberByUsername.has(
        registration.best_identifier.toLowerCase(),
      ),
      elo: eloById.get(String(registration.user.id)) ?? null,
    }))
    .sort(
      (a, b) => (b.elo ?? -1) - (a.elo ?? -1) || a.name.localeCompare(b.name),
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

  const footerParts = ['⭐ = Do Some Work squad', `${rows.length} enrolled`];
  if (hydration?.stoppedEarly) {
    footerParts.push('Elo refresh incomplete');
  } else if (hydration && hydration.unresolved > 0) {
    footerParts.push(`${hydration.unresolved} Elo unavailable`);
  }

  const embed = new EmbedBuilder()
    .setColor(hexColorToInt(UVS_COLOR))
    .setTitle(eventData.name)
    .setDescription(lines.join('\n'))
    .setFooter({ text: footerParts.join(' • ') })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
};

export const command = {
  command: new SlashCommandBuilder()
    .setName('scout')
    .setDescription("List an event's enrolled players by elo")
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
