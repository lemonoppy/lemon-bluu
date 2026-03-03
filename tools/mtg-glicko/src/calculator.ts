import fs from 'fs';

import * as glicko2 from 'glicko2';

import { games } from './data';

// Glicko-2 settings
const GLICKO_SETTINGS = {
  tau: 0.5,
  rating: 1500,
  rd: 200,
  vol: 0.06,
};

const glicko = new glicko2.Glicko2(GLICKO_SETTINGS);

const FROM_DRAFT = 1;
const TO_DRAFT = 21;

const PLAYER_NAMES = [
  'Nelson',
  'Hersh',
  'Luka',
  'Markus',
  'Jake',
  'Sam',
  'Kyle',
  'Boudsey',
  'Ana',
];

const OUTPUT_FILE = 'output/mtg_glicko_data.json';

 
const PLAYERS: Record<string, any> = {};

 
const getPlayer = (name: string): any => {
  if (!PLAYERS[name]) {
    PLAYERS[name] = glicko.makePlayer(GLICKO_SETTINGS.rating);
  }
  return PLAYERS[name];
};

 
const HISTORY: Record<string, any>[] = [];

async function run() {
  for (let draft = FROM_DRAFT; draft <= TO_DRAFT; draft++) {
    const matches = games
      .filter(match => match.draft === draft)
       
      .map(match => [getPlayer(match.pB), getPlayer(match.pA), match.sB] as [any, any, number]);

    glicko.updateRatings(matches);

     
    const output: Record<string, any> = { draft };

    PLAYER_NAMES.forEach(player => {
      output[player] = PLAYERS[player] ? PLAYERS[player].getRating() : -1;
    });

    HISTORY.push(output);
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(HISTORY, null, 2), 'utf8');
  console.log(`JSON output complete: ${OUTPUT_FILE}`);
  console.log(`Drafts processed: ${FROM_DRAFT}–${TO_DRAFT}`);
  console.log('\nFinal ratings:');
  PLAYER_NAMES.forEach(player => {
    const rating = PLAYERS[player]?.getRating().toFixed(1) ?? 'N/A';
    console.log(`  ${player}: ${rating}`);
  });
}

run().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
