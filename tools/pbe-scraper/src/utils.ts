import fs from 'fs/promises';

import axios from 'axios';
import * as cheerio from 'cheerio';

import { FieldingStatRow, PlayerData } from './types';

export const delay = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

export async function fetchPage(url: string): Promise<string | null> {
  try {
    console.log(`Fetching: ${url}`);
    const response = await axios.get<string>(url);
    return response.data;
  } catch (error) {
    console.error(`Error fetching ${url}:`, (error as Error).message);
    return null;
  }
}

/**
 * Extract Career Fielding Stats from a player page.
 * Pass a `filterPosition` string (e.g. "2B") to only include rows for that position.
 * Omit `filterPosition` (or pass undefined) to include all positions.
 */
export function extractCareerFieldingStats(
  html: string,
  playerName: string,
  filterPosition?: string,
): FieldingStatRow[] {
  const $ = cheerio.load(html);
  type CheerioResult = ReturnType<typeof $>;
  const stats: FieldingStatRow[] = [];
  let careerTable: CheerioResult | null = null;

  $('th.boxtitle').each((_i, element) => {
    const title = $(element).text().trim().toUpperCase();
    if (title.includes('CAREER FIELDING')) {
      const parentTable = $(element).closest('table');
      careerTable = parentTable.next('table');
      return false;
    }
  });

  if (!careerTable || (careerTable as CheerioResult).length === 0) {
    $('td.boxtitle').each((_i, element) => {
      const title = $(element).text().trim().toUpperCase();
      if (title.includes('CAREER FIELDING')) {
        const parentTable = $(element).closest('table');
        careerTable = parentTable.next('table');
        return false;
      }
    });
  }

  if (!careerTable || (careerTable as CheerioResult).length === 0) {
    console.log(`No Career Fielding Stats table found for ${playerName}`);
    return stats;
  }

  const headers: string[] = [];
  let headerRowIndex = -1;

  (careerTable as CheerioResult).find('tr').each((i, row) => {
    const thElements = $(row).find('th');
    const cells = $(row).find('th, td');

    if (thElements.length > 0 || cells.first().text().trim() === 'Year') {
      cells.each((_j, cell) => {
        headers.push($(cell).text().trim());
      });
      headerRowIndex = i;
      return false;
    }
  });

  if (headers.length === 0) {
    console.log(`No headers found in Career Fielding Stats for ${playerName}`);
    return stats;
  }

  (careerTable as CheerioResult).find('tr').each((i, row) => {
    if (i <= headerRowIndex) return;

    const cells = $(row).find('td');
    if (cells.length === 0) return;

    const rowData: FieldingStatRow = {};
    cells.each((j, cell) => {
      const header = headers[j] ?? `column_${j}`;
      rowData[header] = $(cell).text().trim();
    });

    const firstValue = Object.values(rowData)[0];
    if (firstValue && (firstValue.match(/\d{4}/) || firstValue.match(/Total|Career/i))) {
      if (filterPosition === undefined || rowData['POS'] === filterPosition) {
        stats.push(rowData);
      }
    }
  });

  return stats;
}

export async function saveToJson(data: PlayerData[], filename: string): Promise<void> {
  try {
    await fs.writeFile(filename, JSON.stringify(data, null, 2));
    console.log(`\n✓ Data saved to ${filename}`);
    console.log(`Total players: ${data.length}`);
  } catch (error) {
    console.error('Error saving to JSON:', (error as Error).message);
  }
}

const TSV_HEADERS = [
  'Player Name',
  'Player URL',
  'Season',
  'Year/Team/League',
  'POS',
  'G',
  'GS',
  'PO',
  'A',
  'DP',
  'TC',
  'E',
  'PCT',
  'INN',
  'RNG',
  'ZR',
  'EFF',
  'PB',
  'RSTA',
  'RTO',
  'RTO%',
];

export async function saveToTsv(data: PlayerData[], filename: string): Promise<void> {
  try {
    const rows: string[] = [TSV_HEADERS.join('\t')];

    for (const player of data) {
      const season = player.scrapedFromYear ?? player.lastActiveSeason ?? '';
      for (const stat of player.careerFieldingStats) {
        const row = [
          player.name,
          player.url,
          season,
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
          (stat['ZR'] ?? '').replace(/\+/g, ''),
          stat['EFF'] ?? '',
          stat['PB'] ?? '',
          stat['RSTA'] ?? '',
          stat['RTO'] ?? '',
          stat['RTO%'] ?? '',
        ];
        rows.push(row.join('\t'));
      }
    }

    await fs.writeFile(filename, rows.join('\n'));
    console.log(`✓ Data saved to ${filename} (ready for Google Sheets)`);
  } catch (error) {
    console.error('Error saving to TSV:', (error as Error).message);
  }
}
