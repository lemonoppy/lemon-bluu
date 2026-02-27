import { GoogleSpreadsheet } from 'google-spreadsheet';
import { DynamicConfig } from 'src/lib/config/dynamicConfig';
import { logger } from 'src/lib/logger';
import { FantasyPlayer, FantasyRosteredPlayer, FantasyUser } from 'typings/fantasy';

type sheetInfo = {
  sheet: string;
  range: string;
  type: 'players' | 'users' | 'rostered-player';
}

const SHEET_RANGES: {
  [key: string]: sheetInfo;
} = {
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
}

class PortalApiClient {
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

    const currentFantasySheetId = DynamicConfig.fantasySheetId.get();
    const doc = new GoogleSpreadsheet(currentFantasySheetId, {
      apiKey: process.env.GOOGLE_API_KEY ?? '',
    });

    const sheetResponseData: T[] = [];

    try {
      // Load document properties and worksheets
      await doc.loadInfo();
      const sheet = doc.sheetsByTitle[sheetInfo.sheet];
      const rows = await sheet.getCellsInRange(sheetInfo.range)

      // Process the data
      rows.forEach((row: string[]) => {
        if (row[0] && row[0].length > 0) {
          switch (sheetInfo.type) {
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

  async getPlayers(
    reload: boolean = true,
  ): Promise<Array<FantasyPlayer>> {
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

  async getUsers(
    reload: boolean = true,
  ): Promise<Array<FantasyUser>> {
    this.#users = await this.#getData(
      this.#users,
      reload,
      SHEET_RANGES.USERS,
    );
    return this.#users;
  }

  async reload(): Promise<void> {
    this.#loaded = false;

    await Promise.all([
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
