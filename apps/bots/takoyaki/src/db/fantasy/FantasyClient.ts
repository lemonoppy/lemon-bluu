import { DynamicConfig } from 'src/lib/config/dynamicConfig';
import { loadGoogleSpreadsheet } from 'src/lib/googleSpreadsheetLoader';
import { logger } from 'src/lib/logger';
import {
  FantasyAdpPlayer,
  FantasyPlayer,
  FantasyRosteredPlayer,
  FantasyUser,
} from 'typings/fantasy';

type sheetInfo = {
  sheet: string;
  range: string;
  type: 'adp' | 'players' | 'users' | 'rostered-player';
  sheetId?: string;
};

const FANTASY_ADP_SHEET_ID = '1UjWlGattioFkZeVr7dZqxBX74MueMJCmUAt_1InAwFg';

const SHEET_RANGES: {
  [key: string]: sheetInfo;
} = {
  ADP: {
    sheet: 'FantasyADP',
    range: 'O4:T',
    type: 'adp',
    sheetId: FANTASY_ADP_SHEET_ID,
  },
  PLAYERS: {
    sheet: 'Player Scores',
    range: 'A4:E',
    type: 'players',
  },
  USERS: {
    sheet: 'Users Scores',
    range: 'A2:E',
    type: 'users',
  },
  ROSTERED_PLAYERS: {
    sheet: 'Rosters',
    range: 'A2:I',
    type: 'rostered-player',
  },
};

class PortalApiClient {
  #adpPlayers: Array<FantasyAdpPlayer> = [];
  #players: Array<FantasyPlayer> = [];
  #rosteredPlayers: Array<FantasyRosteredPlayer> = [];
  #users: Array<FantasyUser> = [];

  #loaded = false;
  #lastLoadTimestamp = 0;

  async #getData<T>(
    data: Array<T>,
    reload: boolean = true,
    sheetInfo: sheetInfo,
  ): Promise<T[]> {
    if (data.length > 0 && !reload) {
      return data;
    }

    const currentFantasySheetId =
      sheetInfo.sheetId ?? DynamicConfig.fantasySheetId.get();
    const { GoogleSpreadsheet } = await loadGoogleSpreadsheet();
    const doc = new GoogleSpreadsheet(currentFantasySheetId, {
      apiKey: process.env.GOOGLE_API_KEY ?? '',
    });

    const sheetResponseData: T[] = [];

    try {
      // Load document properties and worksheets
      await doc.loadInfo();
      const sheet = doc.sheetsByTitle[sheetInfo.sheet];
      const rows = await sheet.getCellsInRange(sheetInfo.range);

      // Process the data
      rows.forEach((row: string[]) => {
        if (row[0] && row[0].length > 0 && row[0] !== 'Player') {
          switch (sheetInfo.type) {
            case 'adp': {
              const adp = parseFloat(row[3]?.replace(/,/g, ''));
              const median = parseFloat(row[4]?.replace(/,/g, ''));
              const count = parseInt(row[5]?.replace(/,/g, ''));

              if (
                !Number.isFinite(adp) ||
                !Number.isFinite(median) ||
                !Number.isFinite(count)
              ) {
                break;
              }

              const adpPlayer: FantasyAdpPlayer = {
                player: row[0],
                team: row[1],
                position: row[2],
                adp,
                median,
                count,
              };
              sheetResponseData.push(adpPlayer as T);
              break;
            }
            case 'players': {
              const fantasyPlayer: FantasyPlayer = {
                name: row[0],
                position: row[1],
                team: row[2],
                score: parseFloat(row[4].replace(/,/g, '')),
              };
              sheetResponseData.push(fantasyPlayer as T);
              break;
            }
            case 'users': {
              const groupValue = row[1];
              const parsedGroup = parseInt(groupValue);
              const fantasyUser: FantasyUser = {
                username: row[0],
                group: isNaN(parsedGroup) ? groupValue : parsedGroup,
                score: parseFloat(row[2].replace(/,/g, '')),
                rank: parseInt(row[3]),
                overall: parseInt(row[4]),
              };
              sheetResponseData.push(fantasyUser as T);
              break;
            }
            case 'rostered-player': {
              const groupValue = row[1];
              const parsedGroup = parseInt(groupValue);
              const rosteredPlayer: FantasyRosteredPlayer = {
                username: row[0],
                group: isNaN(parsedGroup) ? groupValue : parsedGroup,
                rosterPosition: row[2],
                name: row[3],
                position: row[4],
                team: row[5],
                start: parseInt(row[6]),
                end: row[7] ? parseInt(row[7]) : undefined,
                score: parseFloat(row[8].replace(/,/g, '')),
              };
              sheetResponseData.push(rosteredPlayer as T);
              break;
            }
          }
        }
      });
    } catch (error) {
      logger.error(error);
    }

    return sheetResponseData;
  }

  async getAdpPlayers(
    reload: boolean = true,
  ): Promise<Array<FantasyAdpPlayer>> {
    this.#adpPlayers = await this.#getData(
      this.#adpPlayers,
      reload,
      SHEET_RANGES.ADP,
    );
    return this.#adpPlayers;
  }

  async getPlayers(reload: boolean = true): Promise<Array<FantasyPlayer>> {
    this.#players = await this.#getData(
      this.#players,
      reload,
      SHEET_RANGES.PLAYERS,
    );
    return this.#players;
  }

  async getRosteredPlayers(
    reload: boolean = true,
  ): Promise<Array<FantasyRosteredPlayer>> {
    this.#rosteredPlayers = await this.#getData(
      this.#rosteredPlayers,
      reload,
      SHEET_RANGES.ROSTERED_PLAYERS,
    );
    return this.#rosteredPlayers;
  }

  async getUsers(reload: boolean = true): Promise<Array<FantasyUser>> {
    this.#users = await this.#getData(this.#users, reload, SHEET_RANGES.USERS);
    return this.#users;
  }

  async reload(): Promise<void> {
    this.#loaded = false;

    await Promise.all([
      await this.getAdpPlayers(true),
      await this.getPlayers(true),
      await this.getUsers(true),
      await this.getRosteredPlayers(true),
    ]);

    this.#lastLoadTimestamp = Date.now();
    this.#loaded = true;
  }

  async reloadIfError() {
    if (
      !this.#loaded ||
      Date.now() - this.#lastLoadTimestamp >= 30 * 60 * 1000 // 12 hours in milliseconds
    ) {
      this.reload();
    }
  }
}

export const FantasyClient = new PortalApiClient();
