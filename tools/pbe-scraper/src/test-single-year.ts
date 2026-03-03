import fs from 'fs/promises';

import axios from 'axios';

import { extractSecondBasemenLinks } from './scraper';
import { PlayerData } from './types';
import { extractCareerFieldingStats } from './utils';

const BASE_URL = 'http://www.pbesim.com';

async function testDeduplication() {
  console.log('Testing scraper deduplication across multiple years...\n');

  const testYears = [2073, 2072];
  const playerMap = new Map<string, PlayerData>();

  for (const year of testYears) {
    console.log(`\n=== Year ${year} ===`);
    const yearUrl = `${BASE_URL}/history/sl_fielders_100_0_${year}.html`;
    console.log(`Fetching: ${yearUrl}`);

    const yearResponse = await axios.get<string>(yearUrl);
    const players = extractSecondBasemenLinks(yearResponse.data);

    console.log(`Found ${players.length} second basemen`);

    const limit = Math.min(3, players.length);

    for (let i = 0; i < limit; i++) {
      const player = players[i];

      if (playerMap.has(player.url)) {
        console.log(`  Skipping: ${player.name} (already scraped)`);
        continue;
      }

      console.log(`  Processing: ${player.name}`);

      const playerResponse = await axios.get<string>(player.url);
      const stats = extractCareerFieldingStats(playerResponse.data, player.name, '2B');

      playerMap.set(player.url, {
        name: player.name,
        url: player.url,
        scrapedFromYear: year,
        careerFieldingStats: stats,
      });

      console.log(`    → Extracted ${stats.length} career stat rows`);

      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  const results = Array.from(playerMap.values());
  const totalStatRows = results.reduce((sum, player) => sum + player.careerFieldingStats.length, 0);

  await fs.writeFile('test_output.json', JSON.stringify(results, null, 2));

  const tsvHeaders = [
    'Player Name', 'Player URL', 'Scraped From Year', 'Year/Team/League', 'POS',
    'G', 'GS', 'PO', 'A', 'DP', 'TC', 'E', 'PCT', 'INN', 'RNG', 'ZR', 'EFF',
    'PB', 'RSTA', 'RTO', 'RTO%',
  ];
  const tsvRows: string[] = [tsvHeaders.join('\t')];

  for (const player of results) {
    for (const stat of player.careerFieldingStats) {
      const row = [
        player.name,
        player.url,
        player.scrapedFromYear ?? '',
        stat['Year/Team/League'] ?? '',
        stat['POS'] ?? '',
        stat['G'] ?? '',
        stat['GS'] ?? '',
        stat['PO'] ?? '',
        stat['A'] ?? '',
        stat['DP'] ?? '',
        stat['TC'] ?? '',
        stat['E'] ?? '',
        stat['PCT'] ?? '',
        stat['INN'] ?? '',
        stat['RNG'] ?? '',
        stat['ZR'] ?? '',
        stat['EFF'] ?? '',
        stat['PB'] ?? '',
        stat['RSTA'] ?? '',
        stat['RTO'] ?? '',
        stat['RTO%'] ?? '',
      ];
      tsvRows.push(row.join('\t'));
    }
  }

  await fs.writeFile('test_output.tsv', tsvRows.join('\n'));

  console.log(`\n✓ Test complete!`);
  console.log(`✓ Unique players scraped: ${results.length}`);
  console.log(`✓ Total stat rows (2B only): ${totalStatRows}`);
  console.log(`✓ Results saved to test_output.json`);
  console.log(`✓ Results saved to test_output.tsv (ready for Google Sheets)`);
  console.log(`\nTo run the full scraper, use: yarn start`);
}

testDeduplication().catch(console.error);
