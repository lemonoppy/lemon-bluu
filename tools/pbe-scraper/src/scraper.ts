import fs from 'fs/promises';

import * as cheerio from 'cheerio';

import { PlayerData, PlayerLink } from './types';
import { delay, extractCareerFieldingStats, fetchPage, saveToJson, saveToTsv } from './utils';

// Configuration
const BASE_URL = 'http://www.pbesim.com';
const START_YEAR = 2017;
const END_YEAR = 2073;

/**
 * Extract Second Basemen player links from a fielding page
 */
export function extractSecondBasemenLinks(html: string): PlayerLink[] {
  const $ = cheerio.load(html);
  const players: PlayerLink[] = [];

  $('td.boxtitle').each((_i, element) => {
    const title = $(element).text().trim();

    if (title === 'SECOND BASEMEN') {
      const nextRow = $(element).closest('tr').next('tr');
      const table = nextRow.find('table').first();

      table.find('a').each((_j, link) => {
        const href = $(link).attr('href');
        const name = $(link).text().trim();

        if (href && href.includes('../players/player_')) {
          const cleanHref = href.replace('../', '/');
          const fullUrl = `${BASE_URL}${cleanHref}`;
          players.push({ name, url: fullUrl });
        }
      });

      return false; // Break after finding Second Basemen
    }
  });

  return players;
}

async function loadExistingData(filename = 'second_basemen_stats.json'): Promise<PlayerData[]> {
  try {
    const data = await fs.readFile(filename, 'utf8');
    const players = JSON.parse(data) as PlayerData[];
    console.log(`✓ Loaded ${players.length} existing players from ${filename}`);
    return players;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log(`No existing data found (${filename}), starting fresh`);
      return [];
    }
    console.error(`Error loading existing data: ${(error as Error).message}`);
    return [];
  }
}

async function scrapeSecondBasemenStats(existingData: PlayerData[] = []): Promise<PlayerData[]> {
  const playerMap = new Map<string, PlayerData>();

  for (const player of existingData) {
    playerMap.set(player.url, player);
  }

  if (existingData.length > 0) {
    console.log(`Skipping ${existingData.length} already-scraped players\n`);
  }

  for (let year = END_YEAR; year >= START_YEAR; year--) {
    console.log(`\n=== Processing year ${year} ===`);

    const yearUrl = `${BASE_URL}/history/sl_fielders_100_0_${year}.html`;
    const yearHtml = await fetchPage(yearUrl);

    if (!yearHtml) {
      console.log(`Skipping year ${year} - failed to fetch page`);
      await delay(1000);
      continue;
    }

    const players = extractSecondBasemenLinks(yearHtml);
    console.log(`Found ${players.length} second basemen for year ${year}`);

    for (const player of players) {
      if (playerMap.has(player.url)) {
        console.log(`  Skipping: ${player.name} (already scraped)`);
        continue;
      }

      console.log(`  Processing: ${player.name}`);

      const playerHtml = await fetchPage(player.url);
      if (!playerHtml) {
        console.log(`    Failed to fetch player page for ${player.name}`);
        await delay(1000);
        continue;
      }

      const careerStats = extractCareerFieldingStats(playerHtml, player.name, '2B');

      if (careerStats.length > 0) {
        const playerData: PlayerData = {
          name: player.name,
          url: player.url,
          scrapedFromYear: year,
          careerFieldingStats: careerStats,
        };
        playerMap.set(player.url, playerData);
        console.log(`    Extracted ${careerStats.length} career stat rows`);
      } else {
        console.log(`    No career stats found for ${player.name}`);
      }

      await delay(1000);
    }

    await delay(2000);
  }

  return Array.from(playerMap.values());
}

async function main() {
  console.log('Starting PBE Second Basemen Scraper...');
  console.log(`Years: ${END_YEAR} - ${START_YEAR} (newest to oldest)`);
  console.log('Position filter: 2B only\n');

  const startTime = Date.now();

  try {
    const existingData = await loadExistingData();
    const data = await scrapeSecondBasemenStats(existingData);
    await saveToJson(data, 'second_basemen_stats.json');
    await saveToTsv(data, 'second_basemen_stats.tsv');

    const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
    console.log(`\nCompleted in ${elapsed} minutes`);
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

if (require.main === module) {
  main();
}
