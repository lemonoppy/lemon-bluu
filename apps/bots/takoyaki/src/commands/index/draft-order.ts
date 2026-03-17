import { DraftEntry, buildDraftOrder } from '@lemon-bluu/isfl-draft-order';
import { SlashCommandBuilder } from 'discord.js';
import { PortalClient } from 'src/db/portal/PortalClient';
import { BaseEmbed } from 'src/lib/embed';
import { withErrorHandling } from 'src/lib/helpers/command';
import { SlashCommand } from 'typings/command';

function getPlayoffNote(entry: DraftEntry, maxElimRound: number): string {
  if (entry.eliminatedRound !== undefined) {
    if (entry.eliminatedRound === maxElimRound) return 'Champion';
    if (entry.eliminatedRound === maxElimRound - 1) return 'Runner-up';
    if (entry.eliminatedRound === maxElimRound - 2) return 'Lost: Conf';
    return 'Lost: WC';
  }
  if (entry.projectedRound !== undefined) {
    if (entry.projectedRound === 1) return 'Proj: WC';
    if (entry.projectedRound === 2) return 'Proj: Conf';
    return 'Proj: Champ';
  }
  return '';
}

function formatDraftOrder(entries: DraftEntry[]): string {
  const actualPlayoffEntries = entries.filter(
    e => e.madePlayoffs && e.eliminatedRound !== undefined,
  );
  const maxElimRound =
    actualPlayoffEntries.length > 0
      ? Math.max(...actualPlayoffEntries.map(e => e.eliminatedRound!))
      : 0;

  const nonPlayoff = entries.filter(e => !e.madePlayoffs);
  const playoff = entries.filter(e => e.madePlayoffs);

  const formatLine = (e: DraftEntry) => {
    const pick = String(e.pick).padStart(2);
    const abbr = e.abbreviation.padEnd(5);
    const record = e.record.padEnd(9);
    const playoffNote = getPlayoffNote(e, maxElimRound);
    const note = [playoffNote, e.tiebreaker ? `(${e.tiebreaker})` : '']
      .filter(Boolean)
      .join(' ');
    return `${pick}  ${abbr}  ${record}${note}`;
  };

  const divider = '─'.repeat(32);
  const playoffDivider = '─ '.repeat(16);
  const header = ` #  Team    Record  Tiebreaker`;

  const lines: string[] = [header, divider];
  for (const e of nonPlayoff) lines.push(formatLine(e));
  if (playoff.length > 0) {
    lines.push(playoffDivider);
    for (const e of playoff) lines.push(formatLine(e));
  }

  return lines.join('\n');
}

export default {
  command: new SlashCommandBuilder()
    .setName('draft-order')
    .setDescription('Get the ISFL draft order for a season.')
    .addNumberOption(option =>
      option
        .setName('season')
        .setDescription(
          'Season number. If not provided, uses the current season.',
        )
        .setRequired(false),
    ),
  execute: withErrorHandling(async interaction => {
    await interaction.deferReply();

    const currentSeason = await PortalClient.getCurrentSeason();
    const season = interaction.options.getNumber('season') ?? currentSeason;

    const standings = await PortalClient.getStandings(season);
    if (!standings) {
      await interaction.editReply({ content: 'Failed to fetch standings data.' });
      return;
    }

    const playoffGames = standings.postseason
      .filter(g => g.winner === 'home' || g.winner === 'away')
      .map(g => ({
        gid: g.gid,
        week: g.week,
        homeTeam: g.homeTeam,
        awayTeam: g.awayTeam,
        homeScore: g.homeScore ?? 0,
        awayScore: g.awayScore ?? 0,
        winner: g.winner as 'home' | 'away',
      }));

    const entries = buildDraftOrder(standings.regularSeason, standings.games, playoffGames);
    const body = formatDraftOrder(entries);

    await interaction.editReply({
      embeds: [
        BaseEmbed(interaction, {})
          .setTitle(`ISFL Season ${season} Draft Order`)
          .setDescription(`\`\`\`\n${body}\n\`\`\``),
      ],
    });
  }, 'An error occurred while fetching the draft order.'),
} satisfies SlashCommand;
