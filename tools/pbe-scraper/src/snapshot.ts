import { extractPlayerLinks } from './scraper';
import { PlayerData } from './types';
import {
  delay,
  extractCareerFieldingStats,
  fetchPage,
  saveToTsv,
} from './utils';

const BASE_URL = 'http://www.pbesim.com';
const CURRENT_SEASON = 2079; // Last season in the complete store

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');

function getSeason(): number {
  const seasonArgument = process.argv[2];

  if (seasonArgument) {
    if (!/^\d+$/.test(seasonArgument)) {
      console.error('Usage: yarn snapshot [season]');
      console.error('Example: yarn snapshot 2080');
      process.exit(1);
    }

    return Number.parseInt(seasonArgument, 10);
  }

  return CURRENT_SEASON + 1;
}

function getStatSeason(
  row: PlayerData['careerFieldingStats'][number],
): number | null {
  const match = (row['Year/Team/League'] ?? '').match(/(\d{4})/);
  return match ? Number.parseInt(match[1], 10) : null;
}

async function scrapeSeasonSnapshot(season: number): Promise<PlayerData[]> {
  const players: PlayerData[] = [];
  let scannedCount = 0;

  for (const letter of LETTERS) {
    console.log(`\n=== Processing letter: ${letter.toUpperCase()} ===`);

    const letterUrl = `${BASE_URL}/leagues/league_100_players_${letter}.html`;
    const letterHtml = await fetchPage(letterUrl);

    if (!letterHtml) {
      console.log(`Skipping letter ${letter} - failed to fetch page`);
      await delay(1000);
      continue;
    }

    const playerLinks = extractPlayerLinks(letterHtml);
    console.log(
      `Found ${playerLinks.length} players starting with ${letter.toUpperCase()}`,
    );

    for (const player of playerLinks) {
      scannedCount++;
      console.log(`  ${player.name}`);

      const playerHtml = await fetchPage(player.url);
      if (!playerHtml) {
        console.log(`    Failed to fetch player page`);
        await delay(1000);
        continue;
      }

      const seasonStats = extractCareerFieldingStats(
        playerHtml,
        player.name,
      ).filter((stat) => getStatSeason(stat) === season);

      if (seasonStats.length > 0) {
        players.push({
          name: player.name,
          url: player.url,
          lastActiveSeason: season,
          scrapedDate: new Date().toISOString(),
          careerFieldingStats: seasonStats,
        });
        console.log(`    → ${seasonStats.length} fielding row(s) in ${season}`);
      }

      await delay(1000);
    }

    await delay(2000);
  }

  console.log(`\n=== Snapshot Summary ===`);
  console.log(`Season: ${season}`);
  console.log(`Players scanned: ${scannedCount}`);
  console.log(`Players with fielding stats: ${players.length}`);
  console.log(
    `Total fielding rows: ${players.reduce((sum, p) => sum + p.careerFieldingStats.length, 0)}`,
  );

  return players;
}

async function main() {
  const season = getSeason();

  console.log('Starting PBE current-season fielding snapshot...');
  console.log(`Season: ${season}`);
  console.log(`Source: ${BASE_URL}/leagues/league_100_players_*.html\n`);

  const startTime = Date.now();

  try {
    const players = await scrapeSeasonSnapshot(season);
    await saveToTsv(players, `current_season_fielding_${season}.tsv`);

    const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
    console.log(`\nCompleted in ${elapsed} minutes`);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
