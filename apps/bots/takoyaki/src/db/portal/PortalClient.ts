import { Config } from 'src/lib/config/config';
import { DynamicConfig } from 'src/lib/config/dynamicConfig';
import { logger } from 'src/lib/logger';
import { BankAccountHeaderData, BasicUserInfo, IATracker, ManagerInfo, Player, Season } from 'typings/portal';

class PortalApiClient {
  #userInfo: Array<BasicUserInfo> = [];
  #activePlayers: Array<Player> = [];
  #getPlayer: Array<Player> = [];
  #availableSeasons: Array<Season> = [];
  #headerInfo: Array<BankAccountHeaderData> = [];
  #generalManagers: Array<ManagerInfo> = [];
  // #latestBankBalance: Array<BankAccountHeaderData> = [];
  #loaded = false;
  #lastLoadTimestamp = 0;

  async #getData<T>(
    data: Array<T>,
    reload: boolean = false,
    fetchOptions: Parameters<typeof fetch>,
    additionalQueryParams?: Record<string, string>,
  ): Promise<T[]> {
    if (data.length > 0 && !reload) {
      return data;
    }
    const [url, ...options] = fetchOptions;
    const queryParams = new URLSearchParams({
      ...additionalQueryParams,
    });
    logger.debug(
      `PortalClient: Fetching data for ${url}?${queryParams.toString()}`,
    );
    const response = await fetch(
      `${Config.portalApiUrl}/${url}?${queryParams.toString()}`,
      ...options,
    );
    if (!response.ok) {
      logger.error(
        `PortalClient: Failed to fetch data: ${response.statusText} for ${url}`,
      );
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  async getUserInfo(reload: boolean = false): Promise<Array<BasicUserInfo>> {
    this.#userInfo = await this.#getData(this.#userInfo, reload, [`userinfo`]);
    return this.#userInfo;
  }

  async getActivePlayers(
    reload: boolean = false,
  ): Promise<Array<Player>> {
    this.#activePlayers = await this.#getData(
      this.#activePlayers,
      reload,
      ['player'],
      { status: 'active' },
    );
    return this.#activePlayers;
  }

  async getPlayer(
    pid: string,
    reload: boolean = false,
  ): Promise<Player | undefined> {
    const players = await this.#getData(this.#getPlayer, reload, ['player'], {
      pid: pid,
    });
    return players[0];
  }

  async getTPEEvents(
    uid: string
  ): Promise<IATracker> {
    return await this.#getData([],false, ['ia-tracker'], { uid: uid }) as IATracker;
  }

  async getHeaderInfo(
    reload: boolean = false,
  ): Promise<Array<BankAccountHeaderData>> {
    this.#headerInfo = await this.#getData(this.#headerInfo, reload, ['bank/header-info'])

    return this.#headerInfo;
  }

  async getCurrentSeason(
    reload: boolean = false,
  ): Promise<number> {
    if (this.#availableSeasons || reload) {
      const season = await this.#getData(this.#availableSeasons, reload, ['season']);
      // @ts-ignore
      this.#availableSeasons = [season]

      // override the current season in our dynamic config with the latest season if it is greater than what we have
      const currentSeason = DynamicConfig.currentSeason.get();
      const latestSeason = this.#availableSeasons[0].season

      if (latestSeason > currentSeason) {
        await DynamicConfig.currentSeason.set(latestSeason);
      }
    }

    return DynamicConfig.currentSeason.get();
  }

  async getGeneralManagers(
    reload: boolean = false,
  ): Promise<Array<ManagerInfo>> {
    if (this.#generalManagers || reload) {
      this.#generalManagers = await this.#getData(this.#generalManagers, reload, ['manager'])
    }
    return this.#generalManagers;
  }

  async reload(): Promise<void> {
    this.#loaded = false;

    await Promise.all([
      await this.getUserInfo(true),
      await this.getActivePlayers(true),
      await this.getCurrentSeason(true),
      await this.getHeaderInfo(true),
      await this.getGeneralManagers(true),
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

export const PortalClient = new PortalApiClient();
