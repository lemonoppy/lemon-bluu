import { hexColorToInt } from '@lemon-bluu/discord';
import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';

import { formatDate, formatSigned } from 'src/lib/eloshowdown/format';
import {
  getPlayerRecentEvents,
  getPlayerRow,
} from 'src/lib/eloshowdown/queries';
import { squadMembers } from 'src/lib/uvs/squad';
import { SlashCommand } from 'typings/command';

const UVS_COLOR = '#7b5df5';

const execute = async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply();

  const lines: string[] = [];
  let hasData = false;

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

    hasData ||= currentElo != null || events.length > 0;

    const eloText = currentElo != null ? String(currentElo) : '—';
    const changeText = events.length > 0 ? formatSigned(changeLast5) : '—';
    const eventCountText =
      events.length === 1 ? '1 event' : `${events.length} events`;

    lines.push(
      `**${member.name} (${member.username})** — ${eloText} elo (${changeText} over last ${eventCountText})`,
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
