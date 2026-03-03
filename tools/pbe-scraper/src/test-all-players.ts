import fs from 'fs/promises';

import axios from 'axios';

import { calculateLastActiveSeason, extractPlayerLinks } from './scraper-all';
import { PlayerData } from './types';
import { extractCareerFieldingStats } from './utils';

const BASE_URL = 'http://www.pbesim.com';

async function testSingleLetter() {
  console.log('Testing All Players Scraper on letter "B"...\n');

  const letterUrl = `${BASE_URL}/history/league_100_players_by_letter_b.html`;
  console.log(`Fetching: ${letterUrl}`);

  const letterResponse = await axios.get<string>(letterUrl);
  const players = extractPlayerLinks(letterResponse.data);

  console.log(`✓ Found ${players.length} players starting with B\n`);

  const limit = Math.min(3, players.length);
  const results: PlayerData[] = [];

  for (let i = 0; i < limit; i++) {
    const player = players[i];
    console.log(`${i + 1}. ${player.name}`);
    console.log(`   URL: ${player.url}`);

    const playerResponse = await axios.get<string>(player.url);
    const stats = extractCareerFieldingStats(playerResponse.data, player.name);

    if (stats.length > 0) {
      const lastActive = calculateLastActiveSeason(stats);

      const positions: Record<string, number> = {};
      stats.forEach(s => {
        const pos = s['POS'] ?? 'Unknown';
        positions[pos] = (positions[pos] ?? 0) + 1;
      });

      console.log(`   Stats: ${stats.length} rows`);
      console.log(`   Positions: ${Object.entries(positions).map(([pos, count]) => `${pos}(${count})`).join(', ')}`);
      console.log(`   Last Active: ${lastActive}`);

      results.push({
        name: player.name,
        url: player.url,
        lastActiveSeason: lastActive ?? undefined,
        careerFieldingStats: stats,
      });
    } else {
      console.log(`   Stats: None found`);
    }

    console.log();
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  await fs.writeFile('test_all_players.json', JSON.stringify(results, null, 2));

  console.log(`✓ Test complete!`);
  console.log(`✓ Tested ${limit} players`);
  console.log(`✓ Results saved to test_all_players.json`);
  console.log(`\nTo run full scrape: yarn scrape-all`);
  console.log(`To update only active players: yarn update-all`);
}

testSingleLetter().catch(console.error);
