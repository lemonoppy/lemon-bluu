import { hexColorToInt } from '@lemon-bluu/discord';
import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';

// import { Config } from 'src/lib/config/config';
// import { formatDate } from 'src/lib/eloshowdown/format';
import {
  OttawaLeaderboardRow,
  getOttawaLeaderboard,
  getOttawaLeaderboardForPlayers,
} from 'src/lib/eloshowdown/queries';
import { squadMemberByPlayerId } from 'src/lib/uvs/squad';
import { SlashCommand } from 'typings/command';

const UVS_COLOR = '#7b5df5';
const DEFAULT_LIMIT = 25;
const SQUAD_EMOJI = '⭐';

const execute = async (interaction: ChatInputCommandInteraction) => {
  const limit = interaction.options.getInteger('limit') ?? DEFAULT_LIMIT;
  await interaction.deferReply();

  const allResult = await getOttawaLeaderboard(null);
  const squadResult = await getOttawaLeaderboardForPlayers([
    ...squadMemberByPlayerId.keys(),
  ]);
  if (allResult.isErr() || squadResult.isErr()) {
    throw new Error('Failed to load the Ottawa leaderboard from the database.');
  }

  const all = allResult.value;
  if (all.length === 0) {
    await interaction.editReply({
      content:
        'No Ottawa event data yet. Run `yarn job` to backfill Ottawa events.',
    });
    return;
  }

  // Rank everyone (including squad members) by elo so squad members with no
  // recorded Ottawa events still get the rank they'd hold in the community.
  const byId = new Map<number, OttawaLeaderboardRow>();
  for (const row of [...all, ...squadResult.value]) {
    byId.set(row.player_id, row);
  }
  const ranked = [...byId.values()].sort(
    (a, b) =>
      (b.current_elo ?? -1) - (a.current_elo ?? -1) || a.player_id - b.player_id,
  );

  const rankById = new Map(
    ranked.map((row, index) => [row.player_id, index + 1]),
  );
  const topIds = new Set(ranked.slice(0, limit).map((row) => row.player_id));

  // Always show squad members, even when they fall outside the top `limit`.
  const extras = ranked.filter(
    (row) => squadMemberByPlayerId.has(row.player_id) && !topIds.has(row.player_id),
  );
  const rows = [...ranked.slice(0, limit), ...extras];

  // const now = new Date();
  // const recentMs = Config.ottawaRecentWindowDays * 24 * 60 * 60 * 1000;

  const lines = rows.map((row) => {
    const isSquad = squadMemberByPlayerId.has(row.player_id);
    const rank = rankById.get(row.player_id);
    const rankText = rank != null ? `${rank}.` : '—.';
    const name = isSquad
      ? `${SQUAD_EMOJI} ${row.display_name}`
      : row.display_name;
    const elo = row.current_elo != null ? String(row.current_elo) : '—';
    /*
    const events = row.ottawa_events === 1 ? '1 event' : `${row.ottawa_events} events`;
    const last =
      row.last_event != null ? formatDate(new Date(row.last_event)) : '—';
    const recent =
      row.last_event != null &&
      now.getTime() - new Date(row.last_event).getTime() < recentMs
        ? ' (recent)'
        : '';
     */
    return `${rankText} ${name} — ${elo} elo`;

    // return `${rankText} ${name} — ${elo} elo — ${events} — last ${last}${recent}`;
  });

  const embed = new EmbedBuilder()
    .setColor(hexColorToInt(UVS_COLOR))
    .setTitle('Ottawa Riftbound Players by Elo')
    .setDescription(lines.join('\n'))
    .setFooter({ text: '⭐ = Do Some Work squad' })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
};

export const command = {
  command: new SlashCommandBuilder()
    .setName('ottawa')
    .setDescription('Show Ottawa players by elo from tracked events')
    .addIntegerOption((option) =>
      option
        .setName('limit')
        .setDescription('Number of players to show')
        .setMinValue(1)
        .setMaxValue(50),
    ),
  execute,
} satisfies SlashCommand;
