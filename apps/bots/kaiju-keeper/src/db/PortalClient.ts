import { Config } from 'src/lib/config/config';
import { DynamicConfig } from 'src/lib/config/dynamicConfig';
import { logger } from 'src/lib/logger';
import { PortalPlayer, Season } from 'typings/portal';

class PortalApiClient {
  #activePlayers: Array<PortalPlayer> = [];
  #allPlayers: Array<PortalPlayer> = [];
  #availableSeasons: Array<Season> = [];
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
    }
    return response.json();
  }

  async getPlayers(
    reload: boolean = false,
  ): Promise<Array<PortalPlayer>> {
    this.#activePlayers = await this.#getData(
      this.#activePlayers,
      reload,
      ['player'],
      { status: 'active' },
    );
    return this.#activePlayers;
  }

  async getAllPlayers(
    reload: boolean = false,
  ): Promise<Array<PortalPlayer>> {
    this.#allPlayers = await this.#getData(
      this.#allPlayers,
      reload,
      ['player'],
      {}, // No status filter - get all players
    );
    return this.#allPlayers;
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


  async reload(): Promise<void> {
    this.#loaded = false;

    await Promise.all([
      await this.getCurrentSeason(true),
      await this.getPlayers(true)
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
