import fs from 'fs/promises';

import * as cheerio from 'cheerio';

import { PlayerData, PlayerLink } from './types';
import { delay, extractCareerFieldingStats, fetchPage, saveToJson, saveToTsv } from './utils';

// Configuration
const BASE_URL = 'http://www.pbesim.com';
const CURRENT_SEASON = 2075; // Update this each season
const ACTIVITY_THRESHOLD_YEARS = 3; // Only re-scrape players active within this many years

/**
 * Extract player links from an alphabetical player page
 */
export function extractPlayerLinks(html: string): PlayerLink[] {
  const $ = cheerio.load(html);
  const players: PlayerLink[] = [];

  $('a').each((_i, link) => {
    const href = $(link).attr('href');
    const name = $(link).text().trim();

    if (href && href.includes('../players/player_')) {
      const cleanHref = href.replace('../', '/');
      const fullUrl = `${BASE_URL}${cleanHref}`;
      players.push({ name, url: fullUrl });
    }
  });

  return players;
}

/**
 * Calculate the last active season from fielding stats
 */
export function calculateLastActiveSeason(fieldingStats: PlayerData['careerFieldingStats']): number | null {
  if (!fieldingStats || fieldingStats.length === 0) return null;

  const years: number[] = [];
  for (const stat of fieldingStats) {
    const yearTeamLeague = stat['Year/Team/League'] ?? '';
    const match = yearTeamLeague.match(/(\d{4})/);
    if (match) {
      years.push(parseInt(match[1]));
    }
  }

  return years.length > 0 ? Math.max(...years) : null;
}

function shouldRescrapePlayer(
  player: PlayerData,
  currentSeason: number,
  thresholdYears: number,
): boolean {
  if (!player.lastActiveSeason) return true;
  return currentSeason - player.lastActiveSeason <= thresholdYears;
}

async function loadExistingData(filename = 'all_players_fielding.json'): Promise<PlayerData[]> {
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

async function scrapeAllPlayers(existingData: PlayerData[] = [], isUpdate = false): Promise<PlayerData[]> {
  const playerMap = new Map<string, PlayerData>();

  for (const player of existingData) {
    playerMap.set(player.url, player);
  }

  const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
  let scrapedCount = 0;
  let skippedCount = 0;
  let updatedCount = 0;
  let newCount = 0;

  for (const letter of letters) {
    console.log(`\n=== Processing letter: ${letter.toUpperCase()} ===`);

    const letterUrl = `${BASE_URL}/history/league_100_players_by_letter_${letter}.html`;
    const letterHtml = await fetchPage(letterUrl);

    if (!letterHtml) {
      console.log(`Skipping letter ${letter} - failed to fetch page`);
      await delay(1000);
      continue;
    }

    const players = extractPlayerLinks(letterHtml);
    console.log(`Found ${players.length} players starting with ${letter.toUpperCase()}`);

    for (const player of players) {
      const existingPlayer = playerMap.get(player.url);

      if (isUpdate && existingPlayer && !shouldRescrapePlayer(existingPlayer, CURRENT_SEASON, ACTIVITY_THRESHOLD_YEARS)) {
        skippedCount++;
        continue;
      }

      const action = existingPlayer ? 'UPDATE' : 'NEW';
      console.log(`  ${player.name} (${action})`);

      const playerHtml = await fetchPage(player.url);
      if (!playerHtml) {
        console.log(`    Failed to fetch player page`);
        await delay(1000);
        continue;
      }

      const careerStats = extractCareerFieldingStats(playerHtml, player.name);

      if (careerStats.length > 0) {
        const lastActiveSeason = calculateLastActiveSeason(careerStats);

        const playerData: PlayerData = {
          name: player.name,
          url: player.url,
          lastActiveSeason: lastActiveSeason ?? undefined,
          scrapedDate: new Date().toISOString(),
          careerFieldingStats: careerStats,
        };

        playerMap.set(player.url, playerData);
        scrapedCount++;

        if (existingPlayer) {
          updatedCount++;
        } else {
          newCount++;
        }

        console.log(`    → ${careerStats.length} stat rows, last active: ${lastActiveSeason}`);
      } else {
        if (!existingPlayer) {
          console.log(`    → No fielding stats found`);
        } else {
          console.log(`    → No fielding stats found, keeping existing data`);
        }
      }

      await delay(1000);
    }

    await delay(2000);
  }

  console.log(`\n=== Scraping Summary ===`);
  console.log(`New players: ${newCount}`);
  console.log(`Updated players: ${updatedCount}`);
  console.log(`Skipped (inactive): ${skippedCount}`);
  console.log(`Total players in dataset: ${playerMap.size}`);
  // Suppress unused variable warning
  void scrapedCount;

  return Array.from(playerMap.values());
}

async function main() {
  const isUpdate = process.argv.includes('--update');

  console.log('Starting PBE All Players Fielding Scraper...');
  console.log(`Current season: ${CURRENT_SEASON}`);
  console.log(`Activity threshold: ${ACTIVITY_THRESHOLD_YEARS} years`);
  console.log(`Mode: ${isUpdate ? 'UPDATE (skip inactive players)' : 'FULL SCRAPE'}\n`);

  const startTime = Date.now();

  try {
    let existingData: PlayerData[] = [];
    if (isUpdate) {
      existingData = await loadExistingData();
    }

    const data = await scrapeAllPlayers(existingData, isUpdate);
    await saveToJson(data, 'all_players_fielding.json');
    await saveToTsv(data, 'all_players_fielding.tsv');

    const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
    console.log(`\nCompleted in ${elapsed} minutes`);
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

if (require.main === module) {
  main();
}
