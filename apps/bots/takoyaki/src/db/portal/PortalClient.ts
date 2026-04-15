import { users } from 'src/db/users';
import { Config } from 'src/lib/config/config';
import { DynamicConfig } from 'src/lib/config/dynamicConfig';
import { logger } from 'src/lib/logger';
import { findTeamByName } from 'src/lib/teams';
import { Award, BankAccountHeaderData, BasicUserInfo, GMRecord, IATracker, ManagerInfo, PTTask, PendingTask, Player, PlayerSeasonStat, PortalPasses, PredictionTask, Season, StandingsResponse, TaskListTask, TeamHistoryResponse } from 'typings/portal';

class PortalApiClient {
  #userInfo: Array<BasicUserInfo> = [];
  #activePlayers: Array<Player> = [];
  #getPlayer: Array<Player> = [];
  #availableSeasons: Array<Season> = [];
  #headerInfo: Array<BankAccountHeaderData> = [];
  #generalManagers: Array<ManagerInfo> = [];
  #standings: StandingsResponse | null = null;
  #standingsSeason: number = 0;
  #teamHistory: TeamHistoryResponse | null = null;
  #gmHistory: Array<GMRecord> = [];
  #awards: Array<Award> = [];
  // #latestBankBalance: Array<BankAccountHeaderData> = [];
  #loaded = false;
  #lastLoadTimestamp = 0;

  async #getData<T>(
    data: T | null,
    reload: boolean = false,
    fetchOptions: Parameters<typeof fetch>,
    additionalQueryParams?: Record<string, string>,
  ): Promise<T> {
    if (data !== null && !reload) {
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
    return response.json() as Promise<T>;
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

  async getStandings(season: number, reload: boolean = false): Promise<StandingsResponse | null> {
    if (this.#standings && this.#standingsSeason === season && !reload) {
      return this.#standings;
    }
    logger.debug(`PortalClient: Fetching standings for season ${season}`);
    const response = await fetch(`${Config.portalApiUrl}/standings?season=${season}`);
    if (!response.ok) {
      logger.error(`PortalClient: Failed to fetch standings: ${response.statusText}`);
      return null;
    }
    this.#standings = await response.json();
    this.#standingsSeason = season;
    return this.#standings;
  }

  async getTeamHistory(reload: boolean = false): Promise<TeamHistoryResponse | null> {
    if (this.#teamHistory && !reload) return this.#teamHistory;
    logger.debug('PortalClient: Fetching team history');
    const response = await fetch(`${Config.portalApiUrl}/team-history/records`);
    if (!response.ok) {
      logger.error(`PortalClient: Failed to fetch team history: ${response.statusText}`);
      return null;
    }
    this.#teamHistory = await response.json();
    return this.#teamHistory;
  }

  async getGMHistory(reload: boolean = false): Promise<Array<GMRecord>> {
    this.#gmHistory = await this.#getData(this.#gmHistory, reload, ['gm-history/records']);
    return this.#gmHistory;
  }

  async getAwards(reload: boolean = false): Promise<Array<Award>> {
    this.#awards = await this.#getData(this.#awards, reload, ['awards']);
    return this.#awards;
  }

  getCurrentSeasonInfo(): Season | null {
    return this.#availableSeasons[0] ?? null;
  }

  async getPlayerCareerStats(pid: number): Promise<PlayerSeasonStat[]> {
    logger.debug(`PortalClient: Fetching career stats for pid ${pid}`);
    const response = await fetch(`${Config.portalApiUrl}/player/stats?pid=${pid}`);
    if (!response.ok) {
      logger.error(`PortalClient: Failed to fetch career stats for pid ${pid}: ${response.statusText}`);
      return [];
    }
    return response.json();
  }

	async updatePlayerAssignment() {
		const players = await this.getActivePlayers(true);
		const activePlayersMap = new Map<number, Player>();
			players.forEach((player) => {
				activePlayersMap.set(player.uid, player);
			});

			for await (const [, value] of users.iterator()) {
				const player = activePlayersMap.get(value.forumUserId);
				const team = findTeamByName(player?.currentLeague === 'ISFL' ? player?.isflTeam ?? '' : player?.dsflTeam ?? '');

				const userInfo = value;
				userInfo.pid = player?.pid ?? 0
				userInfo.team = team?.abbreviation ?? undefined
				userInfo.isflTeam = player?.isflTeam ?? undefined
			}
	}

	async getPlayerTasks(uids: number[]): Promise<PendingTask[]> {
		if (uids.length === 0) {
			return [];
		}

		const now = new Date();
		const upcomingSunday = new Date(now);
		upcomingSunday.setDate(now.getDate() + (7 - now.getDay()) % 7);
		upcomingSunday.setHours(23, 59, 59, 999);
		const upcomingFriday = new Date(now);
		upcomingFriday.setDate(now.getDate() + (5 - now.getDay() + 7) % 7);
		upcomingFriday.setHours(19, 59, 59, 999);

		const season = await this.getCurrentSeason();

		const teamTasks: Record<number, TaskListTask[]> = {};

		for (const uid of uids) {
			const { hasPTPass, hasOTPass } = await this.#getData<PortalPasses>(null, true, ['bank/transactions/passes'], { uid: uid.toString(), season: season.toString() });
			const predictionTasks = await this.#getData<PredictionTask[]>(null, true, ['predictions/list-tasks'], { userId: uid.toString(), includeInactive: 'false' });
			const ptTasks = await this.#getData<PTTask[]>(null, true, ['threads/tpe-checklist'], { userId: uid.toString(), currentSeason: season.toString() });
			const players = await this.getActivePlayers();

			const playerMap = new Map<number, Player>();
			players.forEach((player) => {
				playerMap.set(player.uid, player);
			});
			const player = playerMap.get(3743);
			const allTasks: TaskListTask[] = []

			predictionTasks.forEach((task) => {
				allTasks.push({
					id: task.id,
					name: task.title,
					done: task.hasSubmitted,
					pass: false,
					type: 'Prediction',
					openDate: task.openDate,
					closeDate: task.closeDate
				})
			})

			ptTasks.forEach((task) => {
				const type = task.subject.includes('PT') ? 'PT' : task.subject.includes('Offseason Task') ? 'OT' : 'Other'

				allTasks.push({
					id: task.tid,
					name: task.subject,
					done: task.done,
					pass: type === 'PT' ? hasPTPass : type === 'OT' ? hasOTPass : false,
					type: type,
					closeDate: (type !== 'PT' && type !== 'OT') ? upcomingFriday.toISOString() : upcomingSunday.toISOString(),
				})
			})

			allTasks.push({
				id: 0,
				name: 'Weekly Activity Check',
				done: !!player?.weeklyActivityCheck,
				pass: false,
				type: 'Activity',
				closeDate: upcomingSunday.toISOString(),
			})
			allTasks.push({
				id: 1,
				name: 'Weekly Training',
				done: !!player?.weeklyTraining,
				pass: false,
				type: 'Activity',
				closeDate: upcomingSunday.toISOString(),
			})
			teamTasks[uid] = allTasks;
		}

		const pendingTasks = this.getPendingTasks(teamTasks);

		logger.info(`Compiled pending tasks: ${JSON.stringify(pendingTasks)}`);
		return pendingTasks;
	}

	async getPendingTasks(teamTasks: Record<number, TaskListTask[]>): Promise<PendingTask[]> {
		const taskMap = new Map<string, PendingTask>();
		for (const [uid, tasks] of Object.entries(teamTasks)) {
			for (const task of tasks) {
				const isComplete = task.done || task.pass;
				if (isComplete) continue;

				const key = `${task.type}-${task.id}`;
				if (!taskMap.has(key)) {
					taskMap.set(key, {
						taskId: task.id,
						taskName: task.name,
						type: task.type,
						closeDate: task.closeDate,
						pendingUids: [],
					});
				}
				taskMap.get(key)!.pendingUids.push(Number(uid));
			}
		}

		return Array.from(taskMap.values()).sort((a, b) =>
			(a.closeDate ?? '').localeCompare(b.closeDate ?? '')
		);
	}

  async reload(): Promise<void> {
    this.#loaded = false;

    await Promise.all([
      this.getUserInfo(true),
      this.getActivePlayers(true),
      this.getCurrentSeason(true),
      this.getHeaderInfo(true),
      this.getGeneralManagers(true),
      this.getTeamHistory(true),
      this.getGMHistory(true),
      this.getAwards(true),
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
