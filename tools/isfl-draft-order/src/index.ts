import { buildDraftOrder } from './calculator';
import { fetchCurrentSeason, fetchStandingsData } from './scraper';
import { DraftEntry } from './types';

function getActualPlayoffNote(eliminatedRound: number, maxElimRound: number): string {
  if (eliminatedRound === maxElimRound) return 'Champion';
  if (eliminatedRound === maxElimRound - 1) return 'Runner-up';
  if (eliminatedRound === maxElimRound - 2) return 'Lost: Conference';
  if (eliminatedRound === maxElimRound - 3) return 'Lost: Wild Card';
  return `Lost: Week ${eliminatedRound}`;
}

function getProjectedNote(projectedRound: number): string {
  if (projectedRound === 1) return 'Proj: Wild Card';
  if (projectedRound === 2) return 'Proj: Conference';
  return 'Proj: Championship';
}

function printDraftOrder(season: number, entries: DraftEntry[]): void {
  const actualPlayoffEntries = entries.filter(
    e => e.madePlayoffs && e.eliminatedRound !== undefined,
  );
  const maxElimRound =
    actualPlayoffEntries.length > 0
      ? Math.max(...actualPlayoffEntries.map(e => e.eliminatedRound!))
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
    if (entry.eliminatedRound !== undefined) {
      notes.push(getActualPlayoffNote(entry.eliminatedRound, maxElimRound));
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
