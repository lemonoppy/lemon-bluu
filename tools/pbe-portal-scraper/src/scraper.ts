import fs from 'fs';

interface PlayerData {
  pid: string;
  username: string;
  name: string;
  position: string;
  archetype: string;
  tpe: string;
  bankAccount: string;
  team: string;
}

interface SimflowPlayer {
  external_id: number | null;
  username: string | null;
  player_name: string | null;
  position: string | null;
  archetype: string | null;
  tpe: number | null;
  drafted: string | null;
  bank_balance: number | null;
  team: {
    team_name: string | null;
  } | null;
}

const PLAYER_LIST_URL =
  'https://pbe-backend-consolidated-46775724cb31.herokuapp.com/simflow/players';
const OUTPUT_COLUMNS: (keyof PlayerData)[] = [
  'pid',
  'username',
  'name',
  'position',
  'archetype',
  'tpe',
  'bankAccount',
  'team',
];

function formatTsv(players: PlayerData[]): string {
  const escapeValue = (value: string): string =>
    /[\t\r\n"]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
  const rows = players.map(player =>
    OUTPUT_COLUMNS.map(column => escapeValue(player[column])).join('\t'),
  );

  return [OUTPUT_COLUMNS.join('\t'), ...rows].join('\n') + '\n';
}

function getSeason(): number {
  const seasonArgument = process.argv[2];

  if (!seasonArgument || !/^\d+$/.test(seasonArgument)) {
    console.error('Usage: yarn scrape <season>');
    console.error('Example: yarn scrape 64');
    process.exit(1);
  }

  const season = Number.parseInt(seasonArgument, 10);

  if (season <= 0) {
    console.error('Error: season must be a positive integer.');
    process.exit(1);
  }

  return season;
}

async function scrapePlayerData(season: number): Promise<PlayerData[]> {
  const draftedSeason = `S${season}`;
  const outputBase = `drafted-players-s${season}`;

  console.log(`Starting scraper for Season ${season}...`);
  console.log('Loading consolidated player list...');

  const response = await fetch(PLAYER_LIST_URL);

  if (!response.ok) {
    throw new Error(`Player list request failed: ${response.status} ${response.statusText}`);
  }

  const players: unknown = await response.json();

  if (!Array.isArray(players)) {
    throw new Error('Player list response was not an array.');
  }

  const draftedPlayers = (players as SimflowPlayer[])
    .filter(player => player.drafted === draftedSeason)
    .map(
      (player): PlayerData => ({
        pid: player.external_id?.toString() ?? '',
        username: player.username ?? '',
        name: player.player_name ?? '',
        position: player.position ?? '',
        archetype: player.archetype ?? '',
        tpe: player.tpe?.toString() ?? '',
        bankAccount: player.bank_balance?.toString() ?? '',
        team: player.team?.team_name ?? '',
      }),
    );

  draftedPlayers.sort((a, b) => {
    const aPid = Number.parseInt(a.pid, 10);
    const bPid = Number.parseInt(b.pid, 10);

    if (Number.isNaN(aPid) && Number.isNaN(bPid)) return a.name.localeCompare(b.name);
    if (Number.isNaN(aPid)) return 1;
    if (Number.isNaN(bPid)) return -1;
    return aPid - bPid;
  });

  fs.writeFileSync(`${outputBase}.json`, JSON.stringify(draftedPlayers, null, 2));
  fs.writeFileSync(`${outputBase}.tsv`, formatTsv(draftedPlayers));

  console.log(
    `Scraping complete! Found ${draftedPlayers.length} players drafted in ${draftedSeason}.`,
  );
  console.log(`Results saved to ${outputBase}.{json,tsv}`);

  return draftedPlayers;
}

const season = getSeason();

scrapePlayerData(season)
  .then(players => {
    console.log(`Total players: ${players.length}`);
  })
  .catch(error => {
    console.error('Scraping failed:', error);
    process.exit(1);
  });
