import { buildDraftOrder } from './calculator';
import { fetchCurrentSeason, fetchStandingsData } from './scraper';
import { DraftEntry } from './types';

function getActualPlayoffNote(
  eliminatedRound: number | undefined,
  maxElimRound: number,
  minPlayoffWeek: number,
  seasonComplete: boolean,
): string {
  if (eliminatedRound === undefined) return 'Active';
  if (seasonComplete && eliminatedRound === maxElimRound) return 'Champion';
  const round = eliminatedRound - minPlayoffWeek; // 0 = WC, 1 = Conf, 2 = Runner-up
  if (round === 0) return 'Lost: Wild Card';
  if (round === 1) return 'Lost: Conference';
  return 'Runner-up';
}

function getProjectedNote(projectedRound: number): string {
  if (projectedRound === 1) return 'Proj: Wild Card';
  if (projectedRound === 2) return 'Proj: Conference';
  return 'Proj: Championship';
}

function printDraftOrder(season: number, entries: DraftEntry[]): void {
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

  const title = `ISFL Season ${season} Draft Order`;
  console.log(`\n${title}`);
  console.log('='.repeat(title.length));
  console.log(`${'Pick'.padStart(4)}  ${'Team'.padEnd(35)}${'Record'.padEnd(10)}Notes`);
  console.log('-'.repeat(70));

  for (const entry of entries) {
    const pick = String(entry.pick).padStart(4);
    const teamLabel = `${entry.team} (${entry.abbreviation})`;
    const team = teamLabel.padEnd(35);
    const record = entry.record.padEnd(10);

    const notes: string[] = [];
    if (entry.madePlayoffs) {
      notes.push(
        getActualPlayoffNote(entry.eliminatedRound, maxElimRound, minPlayoffWeek, seasonComplete),
      );
    } else if (entry.projectedRound !== undefined) {
      notes.push(getProjectedNote(entry.projectedRound));
    }
    if (entry.tiebreaker) {
      notes.push(`Tiebreaker: ${entry.tiebreaker}`);
    }

    console.log(`${pick}  ${team}${record}${notes.join(', ')}`);
  }
  console.log();
}

function printAlphabetical(entries: DraftEntry[]): void {
  const sorted = [...entries].sort((a, b) =>
    a.abbreviation.localeCompare(b.abbreviation),
  );
  for (const entry of sorted) {
    console.log(`${entry.abbreviation},${entry.pick}`);
  }
  console.log();
}

async function main(): Promise<void> {
  // Allow --season=N override for testing past seasons
  const seasonArg = process.argv.find(arg => arg.startsWith('--season='));
  const season = seasonArg
    ? parseInt(seasonArg.split('=')[1], 10)
    : await fetchCurrentSeason();

  console.log(`Fetching ISFL Season ${season} standings...`);
  const { teams, games, postseason } = await fetchStandingsData(season);

  const draftOrder = buildDraftOrder(teams, games, postseason);
  printDraftOrder(season, draftOrder);
  printAlphabetical(draftOrder);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
