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
import {
  extractEventId,
  fetchEventDetails,
  fetchEventRegistrations,
} from 'src/lib/uvs/client';
import { squadMemberByUsername } from 'src/lib/uvs/squad';
import { SlashCommand } from 'typings/command';

const UVS_COLOR = '#7b5df5';
const DEFAULT_LIMIT = 25;
const SQUAD_EMOJI = '⭐';

interface CachedElo {
  player_id: number;
  riftbound_id: string | null;
  display_name: string | null;
  current_elo: number | null;
}

// EloShowdown still keys many players by their old numeric Riftbound id, so
// resolve by display name too. Names shared by two players are ignored.
const loadElos = async (
  players: { id: string; name: string }[],
): Promise<Map<string, number | null>> => {
  const result = await Query<CachedElo>(
    `SELECT player_id, riftbound_id, lower(display_name) AS display_name, current_elo
     FROM eloshowdown_players
     WHERE riftbound_id = ANY($1::text[])
        OR lower(display_name) = ANY($2::text[])`,
    [
      players.map((player) => player.id),
      players.map((player) => player.name.trim().toLowerCase()),
    ],
  );
  if (result.isErr()) {
    throw new Error('Failed to load elos from the database.');
  }

  const eloById = new Map<string, number | null>();
  const byName = new Map<string, { elo: number | null; ambiguous: boolean }>();
  for (const row of result.value.rows) {
    if (row.riftbound_id) eloById.set(row.riftbound_id, row.current_elo);
    if (!row.display_name) continue;
    const entry = byName.get(row.display_name);
    if (entry) entry.ambiguous = true;
    else
      byName.set(row.display_name, { elo: row.current_elo, ambiguous: false });
  }

  return new Map(
    players.map((player) => {
      const named = byName.get(player.name.trim().toLowerCase());
      return [
        player.id,
        eloById.get(player.id) ??
          (named && !named.ambiguous ? named.elo : null),
      ];
    }),
  );
};

const execute = async (interaction: ChatInputCommandInteraction) => {
  const eventId = extractEventId(
    interaction.options.getString('event_id', true),
  );
  const limit = interaction.options.getInteger('limit') ?? DEFAULT_LIMIT;

  await interaction.deferReply();

  if (!eventId) {
    await interaction.editReply({
      content: 'Provide a Riftbound event ID or playriftbound.com event URL.',
    });
    return;
  }

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

  const players = enrolled.map((registration) => ({
    id: String(registration.user.id),
    name: registration.best_identifier,
  }));
  let eloById = await loadElos(players);
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
    eloById = await loadElos(players);
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
    .setTitle(
      [eventData.store.name, eventData.name].filter(Boolean).join(' — '),
    )
    .setDescription(lines.join('\n'))
    .setFooter({ text: footerParts.join(' • ') })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
};

export const command = {
  command: new SlashCommandBuilder()
    .setName('scout')
    .setDescription("List an event's enrolled players by elo")
    .addStringOption((option) =>
      option
        .setName('event_id')
        .setDescription('Riftbound event ID or playriftbound.com event URL')
        .setRequired(true),
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
