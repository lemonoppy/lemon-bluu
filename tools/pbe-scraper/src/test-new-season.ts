import fs from 'fs/promises';

import { PlayerData } from './types';

async function testNewSeasonDryRun() {
  console.log('=== New Season Scraper - Dry Run ===\n');

  const data = await fs.readFile('second_basemen_stats.json', 'utf8');
  const players = JSON.parse(data) as PlayerData[];

  const maxYear = Math.max(...players.map(p => p.scrapedFromYear ?? 0));
  const nextSeason = maxYear + 1;

  console.log(`Current dataset:`);
  console.log(`  - Total players: ${players.length}`);
  console.log(`  - Most recent season: ${maxYear}`);
  console.log(`  - Next season to scrape: ${nextSeason}`);

  const yearCounts: Record<number, number> = {};
  players.forEach(p => {
    if (p.scrapedFromYear !== undefined) {
      yearCounts[p.scrapedFromYear] = (yearCounts[p.scrapedFromYear] ?? 0) + 1;
    }
  });

  console.log(`\nPlayers per season scraped:`);
  Object.keys(yearCounts)
    .map(Number)
    .sort((a, b) => b - a)
    .slice(0, 5)
    .forEach(year => {
      console.log(`  - ${year}: ${yearCounts[year]} players`);
    });

  console.log(`\nWhat would happen when you run: yarn new-season`);
  console.log(`  1. Scrape season ${nextSeason} second basemen`);
  console.log(`  2. For each player found:`);
  console.log(`     - If they exist in current data → OVERWRITE with new stats`);
  console.log(`     - If they're new → ADD to dataset`);
  console.log(`  3. Save updated dataset to:`);
  console.log(`     - second_basemen_stats.json (all players)`);
  console.log(`     - second_basemen_stats.tsv (all players)`);
  console.log(`     - season_${nextSeason}_players.tsv (season ${nextSeason} players only)`);

  console.log(`\n✓ Dry run complete. Ready to run: yarn new-season`);
}

testNewSeasonDryRun().catch(console.error);
