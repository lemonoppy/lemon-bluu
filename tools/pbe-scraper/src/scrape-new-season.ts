import fs from 'fs/promises';

import axios from 'axios';

import { extractSecondBasemenLinks } from './scraper';
import { PlayerData } from './types';
import { delay, extractCareerFieldingStats, saveToTsv } from './utils';

const BASE_URL = 'http://www.pbesim.com';

async function loadExistingDataAndGetNextSeason(): Promise<{
  existingPlayers: PlayerData[];
  nextSeason: number;
}> {
  try {
    const data = await fs.readFile('second_basemen_stats.json', 'utf8');
    const players = JSON.parse(data) as PlayerData[];

    const maxYear = Math.max(...players.map(p => p.scrapedFromYear ?? 0));
    const nextSeason = maxYear + 1;

    console.log(`✓ Loaded ${players.length} existing players`);
    console.log(`✓ Most recent season: ${maxYear}`);
    console.log(`✓ Next season to scrape: ${nextSeason}\n`);

    return { existingPlayers: players, nextSeason };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log('✗ No existing data found. Run yarn start first to create initial dataset.');
      process.exit(1);
    }
    throw error;
  }
}

async function scrapeNewSeason() {
  console.log('=== PBE New Season Scraper ===\n');

  const { existingPlayers, nextSeason } = await loadExistingDataAndGetNextSeason();

  const playerMap = new Map<string, PlayerData>();
  for (const player of existingPlayers) {
    playerMap.set(player.url, player);
  }

  const year = nextSeason;
  console.log(`Scraping season ${year}...\n`);

  const yearUrl = `${BASE_URL}/history/sl_fielders_100_0_${year}.html`;
  console.log(`Fetching: ${yearUrl}`);

  const yearResponse = await axios.get<string>(yearUrl);
  const players = extractSecondBasemenLinks(yearResponse.data);

  console.log(`Found ${players.length} second basemen for season ${year}\n`);

  const newPlayers: PlayerData[] = [];
  const updatedPlayers: PlayerData[] = [];

  for (const player of players) {
    const isExisting = playerMap.has(player.url);
    console.log(`Processing: ${player.name} ${isExisting ? '(UPDATE)' : '(NEW)'}`);

    const playerResponse = await axios.get<string>(player.url);
    const careerStats = extractCareerFieldingStats(playerResponse.data, player.name, '2B');

    if (careerStats.length > 0) {
      const playerData: PlayerData = {
        name: player.name,
        url: player.url,
        scrapedFromYear: year,
        careerFieldingStats: careerStats,
      };

      playerMap.set(player.url, playerData);

      if (isExisting) {
        updatedPlayers.push(playerData);
        console.log(`  → Updated with ${careerStats.length} career stat rows (newer data)`);
      } else {
        newPlayers.push(playerData);
        console.log(`  → Added with ${careerStats.length} career stat rows`);
      }
    } else {
      console.log(`  → No career stats found`);
    }

    await delay(1000);
  }

  const allPlayers = Array.from(playerMap.values());

  console.log(`\n=== Summary ===`);
  console.log(`New players: ${newPlayers.length}`);
  console.log(`Updated players: ${updatedPlayers.length}`);
  console.log(`Total players: ${allPlayers.length}`);

  await fs.writeFile('second_basemen_stats.json', JSON.stringify(allPlayers, null, 2));
  console.log(`\n✓ Saved complete dataset to second_basemen_stats.json`);

  await saveToTsv(allPlayers, 'second_basemen_stats.tsv');
  console.log(`✓ Saved complete dataset to second_basemen_stats.tsv`);

  const seasonPlayers = [...newPlayers, ...updatedPlayers];
  await saveToTsv(seasonPlayers, `season_${year}_players.tsv`);
  console.log(`✓ Saved season ${year} players to season_${year}_players.tsv`);

  console.log(`\nDone! Season ${year} scraped successfully.`);
}

scrapeNewSeason().catch(error => {
  console.error('Error:', (error as Error).message);
  process.exit(1);
});
