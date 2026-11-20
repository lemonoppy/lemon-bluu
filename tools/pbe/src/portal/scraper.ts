import fs from 'fs';
import path from 'path';

import { dataDirectory } from '../shared/paths';

import { PortalSession, openPortalSession } from './browser';

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

/** Subset of a row from `ajax/player_list_data.php` that this tool uses. */
interface PortalRow {
  name: string;
  username: string;
  team: string;
  positions: string;
  build: string;
  tpe: number | string;
  p_bank: string;
}

interface PortalResponse {
  total: number;
  rows: PortalRow[];
}

const PLAYER_LIST_PAGE_URL = 'https://pbe.simflow.io/view/player_list.php';
const PLAYER_LIST_URL = 'https://pbe.simflow.io/ajax/player_list_data.php';
const PAGE_SIZE = 100;
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

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

function decodeHtml(value: string): string {
  return value.replace(
    /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,
    (match, entity: string) => {
      if (entity.startsWith('#x') || entity.startsWith('#X')) {
        return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
      }
      if (entity.startsWith('#')) {
        return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
      }
      return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
    },
  );
}

function stripTags(html: string): string {
  return decodeHtml(html.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function formatTsv(players: PlayerData[]): string {
  const escapeValue = (value: string): string =>
    /[\t\r\n"]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
  const rows = players.map((player) =>
    OUTPUT_COLUMNS.map((column) => escapeValue(player[column])).join('\t'),
  );

  return [OUTPUT_COLUMNS.join('\t'), ...rows].join('\n') + '\n';
}

function getSeason(): number {
  const seasonArgument = process.argv[2];

  if (!seasonArgument || !/^\d+$/.test(seasonArgument)) {
    console.error('Usage: yarn pbe:portal <season>');
    console.error('Example: yarn pbe:portal 64');
    process.exit(1);
  }

  const season = Number.parseInt(seasonArgument, 10);

  if (season <= 0) {
    console.error('Error: season must be a positive integer.');
    process.exit(1);
  }

  return season;
}

function parseRow(row: PortalRow): PlayerData {
  // name: <a href='/view/player.php?pid=1011' ...>Lewdvig Kochschroder</a>
  const pid = /[?&]pid=(\d+)/.exec(row.name)?.[1] ?? '';

  // username: nested dropdown; the toggle link holds the display name.
  const usernameHtml =
    /<a[^>]*dropdown-toggle[^>]*>([\s\S]*?)<\/a>/.exec(row.username)?.[1] ??
    row.username;

  // team: <a ... title='Chicago Kingpins'><img ...> <small>CHI</small></a>
  const teamTitle = /<a[^>]*\btitle=(['"])(.*?)\1/.exec(row.team)?.[2];

  return {
    pid,
    username: stripTags(usernameHtml),
    name: stripTags(row.name),
    position: row.positions ?? '',
    archetype: row.build ?? '',
    tpe: String(row.tpe ?? ''),
    bankAccount: (row.p_bank ?? '').replace(/[^0-9.-]/g, ''),
    team: teamTitle ? decodeHtml(teamTitle) : stripTags(row.team),
  };
}

function buildPlayerListUrl(
  season: number,
  offset: number,
  limit: number,
): string {
  const url = new URL(PLAYER_LIST_URL);
  url.search = new URLSearchParams({
    offset: String(offset),
    limit: String(limit),
    sorts: JSON.stringify([{ field: 'ape', order: 'desc' }]),
    search: '',
    league: 'ALL',
    retired: 'Exclude',
    filler: 'Exclude',
    class: String(season),
    type: 'All',
  }).toString();

  return url.toString();
}

function parsePortalResponse(text: string): PortalResponse | undefined {
  try {
    const data = JSON.parse(text) as PortalResponse;

    return Array.isArray(data.rows) && typeof data.total === 'number'
      ? data
      : undefined;
  } catch {
    return undefined;
  }
}

async function fetchPage(
  session: PortalSession,
  season: number,
  offset: number,
): Promise<PortalResponse> {
  const result = await session.fetchText(
    buildPlayerListUrl(season, offset, PAGE_SIZE),
  );
  const data = parsePortalResponse(result.text);

  if (!data) {
    const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(result.text)?.[1];

    throw new Error(
      'Player list response was not the expected JSON.\n' +
        `  status: ${result.status}\n` +
        `  final url: ${result.url}\n` +
        `  title: ${title ? stripTags(title) : '(none)'}`,
    );
  }

  return data;
}

async function scrapePlayerData(season: number): Promise<PlayerData[]> {
  const outputBase = path.join(
    dataDirectory('portal'),
    `drafted-players-s${season}`,
  );

  console.log(`Starting scraper for Season ${season}...`);

  const session = await openPortalSession(
    PLAYER_LIST_PAGE_URL,
    buildPlayerListUrl(season, 0, 1),
    (text) => parsePortalResponse(text) !== undefined,
  );
  const playersByPid = new Map<string, PlayerData>();
  let offset = 0;
  let total = Infinity;

  try {
    while (offset < total) {
      console.log(`Loading players ${offset + 1}+ ...`);
      const page = await fetchPage(session, season, offset);
      total = page.total;

      if (page.rows.length === 0) break;

      for (const row of page.rows) {
        const player = parseRow(row);
        playersByPid.set(player.pid || `row-${playersByPid.size}`, player);
      }

      offset += page.rows.length;
    }
  } finally {
    await session.close();
  }

  const draftedPlayers = [...playersByPid.values()];

  if (draftedPlayers.length !== total && Number.isFinite(total)) {
    console.warn(
      `Warning: portal reported ${total} players but ${draftedPlayers.length} were collected.`,
    );
  }

  draftedPlayers.sort((a, b) => {
    const aPid = Number.parseInt(a.pid, 10);
    const bPid = Number.parseInt(b.pid, 10);

    if (Number.isNaN(aPid) && Number.isNaN(bPid)) {
      return a.name.localeCompare(b.name);
    }
    if (Number.isNaN(aPid)) return 1;
    if (Number.isNaN(bPid)) return -1;
    return aPid - bPid;
  });

  fs.writeFileSync(
    `${outputBase}.json`,
    JSON.stringify(draftedPlayers, null, 2),
  );
  fs.writeFileSync(`${outputBase}.tsv`, formatTsv(draftedPlayers));

  console.log(
    `Scraping complete! Found ${draftedPlayers.length} players in class S${season}.`,
  );
  console.log(`Results saved to ${outputBase}.{json,tsv}`);

  return draftedPlayers;
}

const season = getSeason();

scrapePlayerData(season)
  .then((players) => {
    console.log(`Total players: ${players.length}`);
  })
  .catch((error) => {
    console.error('Scraping failed:', error);
    process.exit(1);
  });
