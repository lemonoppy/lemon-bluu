import { hexColorToInt } from '@lemon-bluu/discord';
import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';

import { formatDate, formatSigned } from 'src/lib/eloshowdown/format';
import {
  PlayerRecentEventRow,
  getPlayerRecentEvents,
  getPlayerRow,
} from 'src/lib/eloshowdown/queries';
import { SquadMember, squadMembers } from 'src/lib/uvs/squad';
import { SlashCommand } from 'typings/command';

const UVS_COLOR = '#7b5df5';
const MEDALS = ['🥇', '🥈', '🥉'];

const execute = async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply();

  const rows: {
    member: SquadMember;
    currentElo: number | null | undefined;
    changeLast5: number;
    events: PlayerRecentEventRow[];
  }[] = [];

  for (const member of squadMembers) {
    const playerResult = await getPlayerRow(member.eloShowdownId);
    const eventsResult = await getPlayerRecentEvents(member.eloShowdownId, 5);

    if (playerResult.isErr() || eventsResult.isErr()) {
      throw new Error('Failed to load squad elo data from the database.');
    }

    const player = playerResult.value;
    const events = eventsResult.value;
    const currentElo = player?.current_elo;
    const changeLast5 = events.reduce((sum, event) => sum + (event.elo_change ?? 0), 0);

    rows.push({ member, currentElo, changeLast5, events });
  }

  rows.sort((a, b) => (b.currentElo ?? -1) - (a.currentElo ?? -1));

  const lines: string[] = [];
  let hasData = false;

  for (const [index, { member, currentElo, changeLast5, events }] of rows.entries()) {
    hasData ||= currentElo != null || events.length > 0;

    const medal = currentElo != null ? MEDALS[index] : undefined;
    const prefix = medal != null ? `${medal} ` : '';
    const eloText = currentElo != null ? String(currentElo) : '—';
    const changeText = events.length > 0 ? formatSigned(changeLast5) : '—';
    const eventCountText =
      events.length === 1 ? '1 event' : `${events.length} events`;

    lines.push(
      `${prefix}${member.name} (${member.username}) — ${eloText} elo (${changeText} over last ${eventCountText})`,
    );
    if (events.length > 0) {
      const trail = events
        .map(
          (event) =>
            `${formatDate(event.start_datetime)} ${formatSigned(event.elo_change ?? 0)}`,
        )
        .join(', ');
      lines.push(`  ↳ ${trail}`);
    }
  }

  if (!hasData) {
    await interaction.editReply({
      content:
        'No EloShowdown data yet. Run `yarn job` to backfill Ottawa events.',
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(hexColorToInt(UVS_COLOR))
    .setTitle('Do Some Work Squad — Elo')
    .setDescription(lines.join('\n'))
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
};

export const command = {
  command: new SlashCommandBuilder()
    .setName('squad')
    .setDescription('Show Do Some Work squad elos and recent changes'),
  execute,
} satisfies SlashCommand;
