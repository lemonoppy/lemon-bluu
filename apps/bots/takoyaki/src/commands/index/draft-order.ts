import { DraftEntry, buildDraftOrder } from '@lemon-bluu/isfl-draft-order';
import { SlashCommandBuilder } from 'discord.js';
import { PortalClient } from 'src/db/portal/PortalClient';
import { BaseEmbed } from 'src/lib/embed';
import { withErrorHandling } from 'src/lib/helpers/command';
import { SlashCommand } from 'typings/command';

function getPlayoffNote(
  entry: DraftEntry,
  maxElimRound: number,
  minPlayoffWeek: number,
  seasonComplete: boolean,
): string {
  if (entry.madePlayoffs) {
    if (entry.eliminatedRound === undefined) return 'Active';
    if (seasonComplete && entry.eliminatedRound === maxElimRound) return 'Champion';
    const round = entry.eliminatedRound - minPlayoffWeek; // 0 = WC, 1 = Conf, 2 = Runner-up
    if (round === 0) return 'Lost: WC';
    if (round === 1) return 'Lost: Conf';
    return 'Runner-up';
  }
  if (entry.projectedRound !== undefined) {
    if (entry.projectedRound === 1) return 'Proj: WC';
    if (entry.projectedRound === 2) return 'Proj: Conf';
    return 'Proj: Champ';
  }
  return '';
}

function formatDraftOrder(entries: DraftEntry[]): string {
  const eliminatedEntries = entries.filter(
    e => e.madePlayoffs && e.eliminatedRound !== undefined,
  );
  const seasonComplete = !entries.some(e => e.madePlayoffs && e.eliminatedRound === undefined);
  const maxElimRound =
    eliminatedEntries.length > 0
      ? Math.max(...eliminatedEntries.map(e => e.eliminatedRound!))
      : 0;
  const minPlayoffWeek =
    eliminatedEntries.length > 0
      ? Math.min(...eliminatedEntries.map(e => e.eliminatedRound!))
      : 0;

  const nonPlayoff = entries.filter(e => !e.madePlayoffs);
  const playoff = entries.filter(e => e.madePlayoffs);

  const formatLine = (e: DraftEntry) => {
    const pick = String(e.pick).padStart(2);
    const abbr = e.abbreviation.padEnd(5);
    const record = e.record.padEnd(9);
    const playoffNote = getPlayoffNote(e, maxElimRound, minPlayoffWeek, seasonComplete);
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
