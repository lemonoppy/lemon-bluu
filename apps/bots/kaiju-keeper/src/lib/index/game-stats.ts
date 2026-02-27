import { ElementHandle, Page } from 'puppeteer';
import puppeteer from 'puppeteer';

import { DatabaseClient } from 'src/db/DBClient';
import { logger } from 'src/lib/logger';

import { getTeamForGuild } from 'src/lib/teamInfo';
import { findTeamByName } from 'src/lib/teams';

import { GetBoxScore, GetTeamPage } from './utils';

// Type definitions for game statistics
export interface PassingStat {
  player: string;
  completions: number;
  attempts: number;
  completionPct: number;
  yards: number;
  ypa: number;
  td: number;
  int: number;
  rating: number;
  sacks?: number;
}

export interface RushingStat {
  player: string;
  attempts: number;
  yards: number;
  ypc: number;
  long: number;
  td: number;
}

export interface ReceivingStat {
  player: string;
  receptions: number;
  targets?: number;
  yards: number;
  ypr: number;
  long: number;
  td: number;
}

export interface KickingStat {
  player: string;
  xpMade: number;
  xpAtt: number;
  fgUnder20Made: number;
  fgUnder20Att: number;
  fg20_29Made: number;
  fg20_29Att: number;
  fg30_39Made: number;
  fg30_39Att: number;
  fg40_49Made: number;
  fg40_49Att: number;
  fg50plusMade: number;
  fg50plusAtt: number;
}

export interface PuntingStat {
  player: string;
  punts: number;
  yds: number;
  avg: number;
  lng: number;
  inside20: number;
}

export interface DefensiveStat {
  player: string;
  tck: number;
  tfl: number;
  sack: number;
  ff: number;
  fr: number;
  pd: number;
  int: number;
  sfty: number;
  td: number;
  blkP: number;
  blkXP: number;
  blkFG: number;
}

export interface OtherStat {
  player: string;
  penalties: number;
  yards: number;
  pancakes: number;
  sacksAllowed: number;
}

export interface GameResult {
  season: number;
  week: number;
  home: boolean;
  opponent: string;
  score: number;
  opponentscore: number;
  win: boolean;
}

export interface GameData {
  season: number;
  week: number;
  gameResult?: GameResult;
  passingStats: PassingStat[];
  rushingStats: RushingStat[];
  receivingStats: ReceivingStat[];
  kickingStats: KickingStat[];
  puntingStats: PuntingStat[];
  defenseStats: DefensiveStat[];
  otherStats: OtherStat[];
}

export interface GameInfo {
  id: string;
  side: 'home' | 'away';
  week: number;
}

export interface PlayerStatWithMeta {
  season: number;
  week: number;
  playerId: number | null;
  player: string;
  [key: string]: any;
}

export class GameStatsScraper {
  private static cleanPlayerName(name: string): string {
    return name.replace(/ \(R\)/g, '').replace(/ \(C\)/g, '').trim();
  }

  private static standardizeTeamName(teamName: string): string {
    // Try to find the team in our teams list and return its abbreviation
    const team = findTeamByName(teamName, 'ISFL');
    if (team) {
      return team.abbreviation;
    }
    
    // If not found, return the original name (fallback)
    return teamName;
  }

  private static async extractTableData(
    page: Page,
    selector: string
  ): Promise<ElementHandle[]> {
    return await page.$$(selector);
  }

  static async getPassingStats(page: Page, game: GameInfo): Promise<PassingStat[]> {
    const selector = game.side === 'away' 
      ? 'tr[ng-repeat="s in boxscore.aStatsPassing"]'
      : 'tr[ng-repeat="s in boxscore.hStatsPassing"]';
    
    const passingRows = await this.extractTableData(page, selector);
    const passingStats: PassingStat[] = [];

    for (const row of passingRows) {
      const tds = await row.$$('td');
      if (tds.length < 7) continue;

      const player = this.cleanPlayerName(
        await page.evaluate(el => el.textContent?.trim() || '', tds[0])
      );
      
      const compAtt = await page.evaluate(el => el.textContent?.trim() || '', tds[1]);
      const [completions, attempts] = compAtt.split('/').map(Number);

      if (tds.length === 9) {
        const completionPct = parseFloat(await page.evaluate(el => el.textContent?.trim() || '0', tds[2]));
        const yards = parseInt(await page.evaluate(el => el.textContent?.trim() || '0', tds[3]), 10);
        const ypa = parseFloat(await page.evaluate(el => el.textContent?.trim() || '0', tds[4]));
        const td = parseInt(await page.evaluate(el => el.textContent?.trim() || '0', tds[5]), 10);
        const int = parseInt(await page.evaluate(el => el.textContent?.trim() || '0', tds[6]), 10);
        const rating = parseFloat(await page.evaluate(el => el.textContent?.trim() || '0', tds[7]));
        const sacks = parseInt(await page.evaluate(el => el.textContent?.trim() || '0', tds[8]), 10);

        passingStats.push({
          player,
          completions,
          attempts,
          completionPct,
          yards,
          ypa,
          td,
          int,
          rating,
          sacks
        });
      } else {
        const yards = parseInt(await page.evaluate(el => el.textContent?.trim() || '0', tds[2]), 10);
        const ypa = parseFloat(await page.evaluate(el => el.textContent?.trim() || '0', tds[3]));
        const td = parseInt(await page.evaluate(el => el.textContent?.trim() || '0', tds[4]), 10);
        const int = parseInt(await page.evaluate(el => el.textContent?.trim() || '0', tds[5]), 10);
        const rating = parseFloat(await page.evaluate(el => el.textContent?.trim() || '0', tds[6]));
        const completionPct = parseFloat((completions / attempts * 100).toFixed(1));

        passingStats.push({
          player,
          completions,
          attempts,
          completionPct,
          yards,
          ypa,
          td,
          int,
          rating
        });
      }
    }

    return passingStats;
  }

  static async getRushingStats(page: Page, game: GameInfo): Promise<RushingStat[]> {
    const selector = game.side === 'away'
      ? 'tr[ng-repeat="s in boxscore.aStatsRushing"]'
      : 'tr[ng-repeat="s in boxscore.hStatsRushing"]';
    
    const rushingRows = await this.extractTableData(page, selector);
    const rushingStats: RushingStat[] = [];

    for (const row of rushingRows) {
      const tds = await row.$$('td');
      if (tds.length < 6) continue;

      const player = this.cleanPlayerName(
        await page.evaluate(el => el.textContent?.trim() || '', tds[0])
      );
      const attempts = parseInt(await page.evaluate(el => el.textContent?.trim() || '0', tds[1]), 10);
      const yards = parseInt(await page.evaluate(el => el.textContent?.trim() || '0', tds[2]), 10);
      const ypc = parseFloat(await page.evaluate(el => el.textContent?.trim() || '0', tds[3]));
      const long = parseInt(await page.evaluate(el => el.textContent?.trim() || '0', tds[4]), 10);
      const td = parseInt(await page.evaluate(el => el.textContent?.trim() || '0', tds[5]), 10);

      rushingStats.push({
        player,
        attempts,
        yards,
        ypc,
        long,
        td
      });
    }

    return rushingStats;
  }

  static async getReceivingStats(page: Page, game: GameInfo): Promise<ReceivingStat[]> {
    const selector = game.side === 'away'
      ? 'tr[ng-repeat="s in boxscore.aStatsReceiving"]'
      : 'tr[ng-repeat="s in boxscore.hStatsReceiving"]';
    
    const receivingRows = await this.extractTableData(page, selector);
    const receivingStats: ReceivingStat[] = [];

    for (const row of receivingRows) {
      const tds = await row.$$('td');
      if (tds.length < 6) continue;

      const player = this.cleanPlayerName(
        await page.evaluate(el => el.textContent?.trim() || '', tds[0])
      );

      if (tds.length === 7) {
        receivingStats.push({
          player,
          receptions: parseInt(await page.evaluate(el => el.textContent?.trim() || '0', tds[1]), 10),
          targets: parseInt(await page.evaluate(el => el.textContent?.trim() || '0', tds[2]), 10),
          yards: parseInt(await page.evaluate(el => el.textContent?.trim() || '0', tds[3]), 10),
          ypr: parseFloat(await page.evaluate(el => el.textContent?.trim() || '0', tds[4])),
          long: parseInt(await page.evaluate(el => el.textContent?.trim() || '0', tds[5]), 10),
          td: parseInt(await page.evaluate(el => el.textContent?.trim() || '0', tds[6]), 10)
        });
      } else {
        receivingStats.push({
          player,
          receptions: parseInt(await page.evaluate(el => el.textContent?.trim() || '0', tds[1]), 10),
          yards: parseInt(await page.evaluate(el => el.textContent?.trim() || '0', tds[2]), 10),
          ypr: parseFloat(await page.evaluate(el => el.textContent?.trim() || '0', tds[3])),
          long: parseInt(await page.evaluate(el => el.textContent?.trim() || '0', tds[4]), 10),
          td: parseInt(await page.evaluate(el => el.textContent?.trim() || '0', tds[5]), 10)
        });
      }
    }

    return receivingStats;
  }

  static async getKickingStats(page: Page, game: GameInfo): Promise<KickingStat[]> {
    const selector = game.side === 'away'
      ? 'tr[ng-repeat="s in boxscore.aStatsKicking"]'
      : 'tr[ng-repeat="s in boxscore.hStatsKicking"]';
    
    const kickingRows = await this.extractTableData(page, selector);
    const kickingStats: KickingStat[] = [];

    for (const row of kickingRows) {
      const tds = await row.$$('td');
      if (tds.length < 7) continue;

      const player = this.cleanPlayerName(
        await page.evaluate(el => el.textContent?.trim() || '', tds[0])
      );

      const xp = (await page.evaluate(el => el.textContent?.trim() || '0/0', tds[1])).split('/').map(Number);
      const fgUnder20 = (await page.evaluate(el => el.textContent?.trim() || '0/0', tds[2])).split('/').map(Number);
      const fg20_29 = (await page.evaluate(el => el.textContent?.trim() || '0/0', tds[3])).split('/').map(Number);
      const fg30_39 = (await page.evaluate(el => el.textContent?.trim() || '0/0', tds[4])).split('/').map(Number);
      const fg40_49 = (await page.evaluate(el => el.textContent?.trim() || '0/0', tds[5])).split('/').map(Number);
      const fg50plus = (await page.evaluate(el => el.textContent?.trim() || '0/0', tds[6])).split('/').map(Number);

      kickingStats.push({
        player,
        xpMade: xp[0] || 0,
        xpAtt: xp[1] || 0,
        fgUnder20Made: fgUnder20[0] || 0,
        fgUnder20Att: fgUnder20[1] || 0,
        fg20_29Made: fg20_29[0] || 0,
        fg20_29Att: fg20_29[1] || 0,
        fg30_39Made: fg30_39[0] || 0,
        fg30_39Att: fg30_39[1] || 0,
        fg40_49Made: fg40_49[0] || 0,
        fg40_49Att: fg40_49[1] || 0,
        fg50plusMade: fg50plus[0] || 0,
        fg50plusAtt: fg50plus[1] || 0
      });
    }

    return kickingStats;
  }

  static async getPuntingStats(page: Page, game: GameInfo): Promise<PuntingStat[]> {
    const selector = game.side === 'away'
      ? 'tr[ng-repeat="s in boxscore.aStatsPunting"]'
      : 'tr[ng-repeat="s in boxscore.hStatsPunting"]';
    
    const puntingRows = await this.extractTableData(page, selector);
    const puntingStats: PuntingStat[] = [];

    for (const row of puntingRows) {
      const tds = await row.$$('td');
      if (tds.length < 6) continue;

      const player = this.cleanPlayerName(
        await page.evaluate(el => el.textContent?.trim() || '', tds[0])
      );
      const punts = parseInt(await page.evaluate(el => el.textContent?.trim() || '0', tds[1]), 10);
      const yds = parseInt(await page.evaluate(el => el.textContent?.trim() || '0', tds[2]), 10);
      const avg = parseFloat(await page.evaluate(el => el.textContent?.trim() || '0', tds[3]));
      const lng = parseInt(await page.evaluate(el => el.textContent?.trim() || '0', tds[4]), 10);
      const inside20 = parseInt(await page.evaluate(el => el.textContent?.trim() || '0', tds[5]), 10);

      puntingStats.push({
        player,
        punts,
        yds,
        avg,
        lng,
        inside20
      });
    }

    return puntingStats;
  }

  static async getDefenseStats(page: Page, game: GameInfo): Promise<DefensiveStat[]> {
    const selector = game.side === 'away'
      ? 'tr[ng-repeat="s in boxscore.aStatsDef"]'
      : 'tr[ng-repeat="s in boxscore.hStatsDef"]';
    
    const defenseRows = await this.extractTableData(page, selector);
    const defenseStats: DefensiveStat[] = [];

    for (const row of defenseRows) {
      const tds = await row.$$('td');
      if (tds.length < 10) continue;

      const player = this.cleanPlayerName(
        await page.evaluate(el => el.textContent?.trim() || '', tds[0])
      );
      const tck = parseInt(await page.evaluate(el => el.textContent?.trim() || '0', tds[1]), 10);
      const tfl = parseInt(await page.evaluate(el => el.textContent?.trim() || '0', tds[2]), 10);
      const sack = parseInt(await page.evaluate(el => el.textContent?.trim() || '0', tds[3]), 10);
      
      const ff_fr = (await page.evaluate(el => el.textContent?.trim() || '0/0', tds[4])).split('/').map(Number);
      const ff = ff_fr[0] || 0;
      const fr = ff_fr[1] || 0;
      
      const pd = parseInt(await page.evaluate(el => el.textContent?.trim() || '0', tds[5]), 10);
      const intc = parseInt(await page.evaluate(el => el.textContent?.trim() || '0', tds[6]), 10);
      const sfty = parseInt(await page.evaluate(el => el.textContent?.trim() || '0', tds[7]), 10);
      const td = parseInt(await page.evaluate(el => el.textContent?.trim() || '0', tds[8]), 10);
      
      const blk = (await page.evaluate(el => el.textContent?.trim() || '0/0/0', tds[9])).split('/').map(Number);
      const blkP = blk[0] || 0;
      const blkXP = blk[1] || 0;
      const blkFG = blk[2] || 0;

      defenseStats.push({
        player,
        tck,
        tfl,
        sack,
        ff,
        fr,
        pd,
        int: intc,
        sfty,
        td,
        blkP,
        blkXP,
        blkFG
      });
    }

    return defenseStats;
  }

  static async getOtherStats(page: Page, game: GameInfo): Promise<OtherStat[]> {
    const selector = game.side === 'away'
      ? 'tr[ng-repeat="s in boxscore.aStatsOther"]'
      : 'tr[ng-repeat="s in boxscore.hStatsOther"]';
    
    const otherRows = await this.extractTableData(page, selector);
    const otherStats: OtherStat[] = [];

    for (const row of otherRows) {
      const tds = await row.$$('td');
      if (tds.length < 5) continue;

      const player = this.cleanPlayerName(
        await page.evaluate(el => el.textContent?.trim() || '', tds[0])
      );
      const penalties = parseInt(await page.evaluate(el => el.textContent?.trim() || '0', tds[1]), 10);
      const yards = parseInt(await page.evaluate(el => el.textContent?.trim() || '0', tds[2]), 10);
      const pancakes = parseInt(await page.evaluate(el => el.textContent?.trim() || '0', tds[3]), 10);
      const sacksAllowed = parseInt(await page.evaluate(el => el.textContent?.trim() || '0', tds[4]), 10);

      otherStats.push({
        player,
        penalties,
        yards,
        pancakes,
        sacksAllowed
      });
    }

    return otherStats;
  }

  static async getGameResult(page: Page, season: number, game: GameInfo): Promise<GameResult> {
    // Extract team names and scores from the scoreboard table
    const scoreboardTable = await page.$('table.Box');
    if (!scoreboardTable) {
      throw new Error('Scoreboard table not found');
    }

    // Get team rows (skip header)
    const teamRows = await scoreboardTable.$$('tr');
    if (teamRows.length < 3) {
      throw new Error('Invalid scoreboard structure');
    }

    // Extract away team data (first data row)
    const awayRow = teamRows[1];
    const awayCells = await awayRow.$$('td');
    const awayTeam = await page.evaluate(el => el.textContent?.trim() || '', awayCells[0]);
    const awayScore = parseInt(await page.evaluate(el => el.textContent?.trim() || '0', awayCells[6]), 10);

    // Extract home team data (second data row)
    const homeRow = teamRows[2];
    const homeCells = await homeRow.$$('td');
    const homeTeam = await page.evaluate(el => el.textContent?.trim() || '', homeCells[0]);
    const homeScore = parseInt(await page.evaluate(el => el.textContent?.trim() || '0', homeCells[6]), 10);

    // Determine result from Kaiju perspective
    const isHome = game.side === 'home';
    let opponent: string;
    let score: number;
    let opponentscore: number;
    let win: boolean;

    if (isHome) {
      // Kaiju is home team
      opponent = this.standardizeTeamName(awayTeam);
      score = homeScore;
      opponentscore = awayScore;
      win = homeScore > awayScore;
    } else {
      // Kaiju is away team
      opponent = this.standardizeTeamName(homeTeam);
      score = awayScore;
      opponentscore = homeScore;
      win = awayScore > homeScore;
    }

    return {
      season,
      week: game.week,
      home: isHome,
      opponent,
      score,
      opponentscore,
      win
    };
  }

  static async scrapeGameStats(season: number, game: GameInfo): Promise<GameData> {
    const browser = await puppeteer.launch({ 
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });
    const page = await browser.newPage();
    
    try {
      await page.goto(GetBoxScore(season, 'ISFL', parseInt(game.id)), {
        waitUntil: 'networkidle0',
        timeout: 30000
      });
      await page.setViewport({ width: 1080, height: 1024 });

      const [
        gameResult,
        passingStats,
        rushingStats,
        receivingStats,
        kickingStats,
        puntingStats,
        defenseStats,
        otherStats
      ] = await Promise.all([
        this.getGameResult(page, season, game),
        this.getPassingStats(page, game),
        this.getRushingStats(page, game),
        this.getReceivingStats(page, game),
        this.getKickingStats(page, game),
        this.getPuntingStats(page, game),
        this.getDefenseStats(page, game),
        this.getOtherStats(page, game)
      ]);

      return {
        season,
        week: game.week,
        gameResult,
        passingStats,
        rushingStats,
        receivingStats,
        kickingStats,
        puntingStats,
        defenseStats,
        otherStats
      };
    } catch (error) {
      logger.error(`Error scraping game ${game.id}:`, error);
      throw error;
    } finally {
      await browser.close();
    }
  }

  static async getGameIds(season: number, guildId?: string | null, preseasonGames: number = 4): Promise<GameInfo[]> {
    const browser = await puppeteer.launch({ 
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });
    const page = await browser.newPage();
    
    try {
      const team = getTeamForGuild(guildId || null);

      await page.goto(GetTeamPage(season, team), {
        waitUntil: 'networkidle0',
        timeout: 30000
      });
      await page.setViewport({ width: 1080, height: 1024 });

      const gameIds = await page.$$eval('a[href^="../Boxscores/Boxscore.html?id="]', anchors =>
        anchors
          .map(a => {
            const tr = a.closest('tr');
            if (!tr) return null;
            const tds = tr.querySelectorAll('td');
            if (tds.length < 2) return null;
            const match = a.getAttribute('href')?.match(/id=(\d+)/);
            if (!match) return null;
            return {
              id: match[1],
              side: tds[1].textContent?.includes('@') ? 'away' : 'home'
            };
          })
          .filter(obj => obj !== null)
      );

      return gameIds.slice(preseasonGames).map((game, index) => ({
        id: game!.id,
        side: game!.side as 'home' | 'away',
        week: index + 1
      }));
    } catch (error) {
      logger.error(`Error fetching game IDs for season ${season}:`, error);
      throw error;
    } finally {
      await browser.close();
    }
  }

  static async scrapeWeekStats(
    season: number,
    week: number,
    playerIdMap: Record<string, number> = {},
    guildId?: string | null,
    preseasonGames: number = 4
  ): Promise<{
    gameData: GameData[];
    playerIdMap: Record<string, number>;
    newPlayerCount: number;
  }> {
    logger.info(`Starting week ${week} of season ${season} scraping...`);
    
    let newPlayerCount = 0;
    const normalizePlayerName = (name: string): string => {
      return name ? name.replace(/[.]/g, '').trim() : '';
    };

    const getOrCreatePlayerId = async (playerName: string): Promise<number | null> => {
      if (!playerName) return null;
      
      const normalized = normalizePlayerName(playerName);
      if (!normalized || normalized === '{{sname}}') return null;
      
      if (!playerIdMap[normalized]) {
        const playerIdResult = await DatabaseClient.createOrUpdatePlayer(normalized, undefined, undefined, guildId ?? undefined);
        if (typeof playerIdResult === 'number') {
          playerIdMap[normalized] = playerIdResult;
          newPlayerCount++;
        } else {
          logger.error(`Failed to create player ${normalized}:`, {
            error: playerIdResult,
            message: playerIdResult?.message || 'Unknown error',
            type: playerIdResult?.type || 'Unknown type'
          });
          return null;
        }
      }
      
      return playerIdMap[normalized];
    };

    let weekGame: any;
    try {
      const gameIds = await this.getGameIds(season, guildId, preseasonGames);
      weekGame = gameIds.find(game => game.week === week);
      
      if (!weekGame) {
        throw new Error(`Week ${week} not found for season ${season}`);
      }
    } catch (error) {
      logger.error('Error getting game IDs:', error);
      throw error;
    }

    const gameData: GameData[] = [];
    
    try {
      const data = await this.scrapeGameStats(season, weekGame);
      gameData.push(data);
    } catch (error) {
      logger.error(`Failed to scrape week ${week} game ${weekGame.id}:`, error);
      throw error;
    }

    // Add player IDs and season/week to all stats
    try {
      for (const game of gameData) {
        for (const stat of game.passingStats) {
          (stat as any).season = game.season;
          (stat as any).week = game.week;
          (stat as any).playerId = await getOrCreatePlayerId(stat.player);
        }
        for (const stat of game.rushingStats) {
          (stat as any).season = game.season;
          (stat as any).week = game.week;
          (stat as any).playerId = await getOrCreatePlayerId(stat.player);
        }
        for (const stat of game.receivingStats) {
          (stat as any).season = game.season;
          (stat as any).week = game.week;
          (stat as any).playerId = await getOrCreatePlayerId(stat.player);
        }
        for (const stat of game.kickingStats) {
          (stat as any).season = game.season;
          (stat as any).week = game.week;
          (stat as any).playerId = await getOrCreatePlayerId(stat.player);
        }
        for (const stat of game.puntingStats) {
          (stat as any).season = game.season;
          (stat as any).week = game.week;
          (stat as any).playerId = await getOrCreatePlayerId(stat.player);
        }
        for (const stat of game.defenseStats) {
          (stat as any).season = game.season;
          (stat as any).week = game.week;
          (stat as any).playerId = await getOrCreatePlayerId(stat.player);
        }
        for (const stat of game.otherStats) {
          (stat as any).season = game.season;
          (stat as any).week = game.week;
          (stat as any).playerId = await getOrCreatePlayerId(stat.player);
        }
      }
    } catch (error) {
      logger.error('Error processing player IDs:', error);
      throw error;
    }

    return { gameData, playerIdMap, newPlayerCount };
  }

  static async scrapeSeasonStats(
    season: number,
    playerIdMap: Record<string, number> = {},
    onProgressUpdate?: (progress: { current: number; total: number; game: GameInfo }) => void,
    guildId?: string | null,
    preseasonGames: number = 4
  ): Promise<{
    gameData: GameData[];
    playerIdMap: Record<string, number>;
    newPlayerCount: number;
  }> {
    logger.info(`Starting season ${season} scraping...`);
    
    let newPlayerCount = 0;
    const normalizePlayerName = (name: string): string => {
      return name ? name.replace(/[.]/g, '').trim() : '';
    };

    const getOrCreatePlayerId = async (playerName: string): Promise<number | null> => {
      if (!playerName) return null;
      
      const normalized = normalizePlayerName(playerName);
      if (!normalized || normalized === '{{sname}}') return null;
      
      if (!playerIdMap[normalized]) {
        const playerIdResult = await DatabaseClient.createOrUpdatePlayer(normalized, undefined, undefined, guildId ?? undefined);
        if (typeof playerIdResult === 'number') {
          playerIdMap[normalized] = playerIdResult;
          newPlayerCount++;
        } else {
          logger.error(`Failed to create player ${normalized}:`, {
            error: playerIdResult,
            message: playerIdResult?.message || 'Unknown error',
            type: playerIdResult?.type || 'Unknown type'
          });
          return null;
        }
      }
      
      return playerIdMap[normalized];
    };

    const gameIds = await this.getGameIds(season, guildId, preseasonGames);
    const gameData: GameData[] = [];

    for (let i = 0; i < gameIds.length; i++) {
      const game = gameIds[i];
      onProgressUpdate?.({ current: i + 1, total: gameIds.length, game });
      
      try {
        const data = await this.scrapeGameStats(season, game);
        gameData.push(data);
      } catch (error) {
        logger.error(`Failed to scrape game ${game.id}:`, error);
      }
    }

    // Add player IDs and season/week to all stats
    for (const game of gameData) {
      
      for (const stat of game.passingStats) {
        (stat as any).season = game.season;
        (stat as any).week = game.week;
        (stat as any).playerId = await getOrCreatePlayerId(stat.player);
      }
      for (const stat of game.rushingStats) {
        (stat as any).season = game.season;
        (stat as any).week = game.week;
        (stat as any).playerId = await getOrCreatePlayerId(stat.player);
      }
      for (const stat of game.receivingStats) {
        (stat as any).season = game.season;
        (stat as any).week = game.week;
        (stat as any).playerId = await getOrCreatePlayerId(stat.player);
      }
      for (const stat of game.kickingStats) {
        (stat as any).season = game.season;
        (stat as any).week = game.week;
        (stat as any).playerId = await getOrCreatePlayerId(stat.player);
      }
      for (const stat of game.puntingStats) {
        (stat as any).season = game.season;
        (stat as any).week = game.week;
        (stat as any).playerId = await getOrCreatePlayerId(stat.player);
      }
      for (const stat of game.defenseStats) {
        (stat as any).season = game.season;
        (stat as any).week = game.week;
        (stat as any).playerId = await getOrCreatePlayerId(stat.player);
      }
      for (const stat of game.otherStats) {
        (stat as any).season = game.season;
        (stat as any).week = game.week;
        (stat as any).playerId = await getOrCreatePlayerId(stat.player);
      }
    }

    return { gameData, playerIdMap, newPlayerCount };
  }

  static async saveStatsToDatabase(
    gameData: GameData[],
    insertIntoDatabase: (category: string, stats: any[]) => Promise<void>
  ): Promise<void> {
    // Save game results first
    const gameResults = gameData.filter(g => g.gameResult).map(g => g.gameResult!);
    if (gameResults.length > 0) {
      await insertIntoDatabase('games', gameResults);
      logger.info(`Saved ${gameResults.length} game results to database`);
    }

    // Then save player stats
    const categories = [
      { name: 'passing', data: gameData.flatMap(g => g.passingStats) },
      { name: 'rushing', data: gameData.flatMap(g => g.rushingStats) },
      { name: 'receiving', data: gameData.flatMap(g => g.receivingStats) },
      { name: 'kicking', data: gameData.flatMap(g => g.kickingStats) },
      { name: 'punting', data: gameData.flatMap(g => g.puntingStats) },
      { name: 'defense', data: gameData.flatMap(g => g.defenseStats) },
      { name: 'other', data: gameData.flatMap(g => g.otherStats) }
    ];

    for (const category of categories) {
      if (category.data.length > 0) {
        await insertIntoDatabase(category.name, category.data);
        logger.info(`Saved ${category.data.length} ${category.name} stats to database`);
      }
    }
  }
}

export default GameStatsScraper;