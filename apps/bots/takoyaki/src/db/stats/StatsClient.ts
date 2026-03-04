import { PortalClient } from 'src/db/portal/PortalClient';
import Query from 'src/lib/db';
import { logger } from 'src/lib/logger';

type PlayerStatsRow = {
  pid: number;
  passyds: number;
  passtd: number;
  passint: number;
  rushyds: number;
  rushtd: number;
  recyds: number;
  rectd: number;
  recrec: number;
  deftck: number;
  defsack: number;
  defint: number;
};

type EnrichedPlayer = {
  fullName: string;
  team: string;
  stats: PlayerStatsRow;
};

class StatsApiClient {
  #leaderContext: string = '';
  #playerStatsByFullName: Map<string, string> = new Map();
  #playerStatsByLastName: Map<string, string> = new Map();
  #playerStatsByFirstName: Map<string, string> = new Map();

  async reload(): Promise<void> {
    try {
      const season = await PortalClient.getCurrentSeason();
      const activePlayers = await PortalClient.getActivePlayers();

      const pidToPlayer = new Map<number, { fullName: string; team: string; firstName: string; lastName: string }>();
      for (const p of activePlayers) {
        if (p.currentLeague === 'ISFL' && p.isflTeam) {
          pidToPlayer.set(p.pid, {
            fullName: `${p.firstName} ${p.lastName}`,
            team: p.isflTeam.toUpperCase(),
            firstName: p.firstName.toLowerCase(),
            lastName: p.lastName.toLowerCase(),
          });
        }
      }

      const result = await Query<PlayerStatsRow>(
        `
        SELECT pid,
          SUM(passyds) AS passyds, SUM(passtd) AS passtd, SUM(passint) AS passint,
          SUM(rushyds) AS rushyds, SUM(rushtd) AS rushtd,
          SUM(recyds) AS recyds,  SUM(rectd) AS rectd,  SUM(recrec) AS recrec,
          SUM(deftck) AS deftck,  SUM(defsack) AS defsack, SUM(defint) AS defint
        FROM player_stats
        WHERE season = $1
        GROUP BY pid
        `,
        [season],
      );

      const enriched: EnrichedPlayer[] = [];
      const byFullName = new Map<string, string>();
      const lastNameCount = new Map<string, number>();
      const firstNameCount = new Map<string, number>();

      for (const row of result.rows) {
        const player = pidToPlayer.get(row.pid);
        if (!player) continue;

        const statLine = formatStatLine(player.fullName, player.team, row);
        if (!statLine) continue;

        enriched.push({ fullName: player.fullName, team: player.team, stats: row });
        byFullName.set(player.fullName.toLowerCase(), statLine);

        lastNameCount.set(player.lastName, (lastNameCount.get(player.lastName) ?? 0) + 1);
        firstNameCount.set(player.firstName, (firstNameCount.get(player.firstName) ?? 0) + 1);
      }

      // Build last/first name maps — only for unambiguous names
      const byLastName = new Map<string, string>();
      const byFirstName = new Map<string, string>();

      for (const [fullNameKey, statLine] of byFullName) {
        const parts = fullNameKey.split(' ');
        const lastName = parts[parts.length - 1];
        const firstName = parts[0];

        if ((lastNameCount.get(lastName) ?? 0) === 1) {
          byLastName.set(lastName, statLine);
        }
        if ((firstNameCount.get(firstName) ?? 0) === 1) {
          byFirstName.set(firstName, statLine);
        }
      }

      this.#playerStatsByFullName = byFullName;
      this.#playerStatsByLastName = byLastName;
      this.#playerStatsByFirstName = byFirstName;

      const top5 = (key: keyof PlayerStatsRow): string =>
        [...enriched]
          .filter((r) => (r.stats[key] as number) > 0)
          .sort((a, b) => (b.stats[key] as number) - (a.stats[key] as number))
          .slice(0, 5)
          .map((r) => `${r.fullName} (${r.team}) ${(r.stats[key] as number).toLocaleString('en-US')}`)
          .join(' | ');

      this.#leaderContext = [
        `Current ISFL Season ${season} Stat Leaders:`,
        `Passing Yards: ${top5('passyds')}`,
        `Passing TDs: ${top5('passtd')}`,
        `Rushing Yards: ${top5('rushyds')}`,
        `Rushing TDs: ${top5('rushtd')}`,
        `Receiving Yards: ${top5('recyds')}`,
        `Receiving TDs: ${top5('rectd')}`,
        `Tackles: ${top5('deftck')}`,
        `Sacks: ${top5('defsack')}`,
        `Interceptions: ${top5('defint')}`,
      ].join('\n');

      logger.info(`StatsClient: Loaded stats for ${enriched.length} ISFL players (season ${season})`);
    } catch (error) {
      logger.error('StatsClient: Failed to reload stats:', error);
      this.#leaderContext = '';
      this.#playerStatsByFullName = new Map();
      this.#playerStatsByLastName = new Map();
      this.#playerStatsByFirstName = new Map();
    }
  }

  getLeaderContext(): string {
    return this.#leaderContext;
  }

  /**
   * Scans the question text for a player name mention (full name, last name, or first name).
   * Returns the formatted stat line if found, or null.
   */
  findPlayerInText(question: string): string | null {
    const q = question.toLowerCase();

    // 1. Full name match (longest-first to avoid partial shadowing)
    const fullNames = [...this.#playerStatsByFullName.keys()].sort(
      (a, b) => b.length - a.length,
    );
    for (const name of fullNames) {
      if (q.includes(name)) return this.#playerStatsByFullName.get(name)!;
    }

    // 2. Last name match (unambiguous only)
    for (const [lastName, statLine] of this.#playerStatsByLastName) {
      if (containsWord(q, lastName)) return statLine;
    }

    // 3. First name match (unambiguous only)
    for (const [firstName, statLine] of this.#playerStatsByFirstName) {
      if (containsWord(q, firstName)) return statLine;
    }

    return null;
  }
}

function containsWord(text: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`).test(text);
}

function formatStatLine(
  fullName: string,
  team: string,
  row: PlayerStatsRow,
): string | null {
  const parts: string[] = [];

  if (row.passyds > 0)
    parts.push(
      `${row.passyds.toLocaleString('en-US')} pass yds, ${row.passtd} pass TDs, ${row.passint} INTs`,
    );
  if (row.rushyds > 0)
    parts.push(
      `${row.rushyds.toLocaleString('en-US')} rush yds, ${row.rushtd} rush TDs`,
    );
  if (row.recyds > 0)
    parts.push(
      `${row.recyds.toLocaleString('en-US')} rec yds (${row.recrec} rec), ${row.rectd} rec TDs`,
    );
  if (row.deftck > 0)
    parts.push(`${row.deftck} tackles, ${row.defsack} sacks, ${row.defint} INTs`);

  if (parts.length === 0) return null;
  return `${fullName} (${team}): ${parts.join('; ')}`;
}

export const StatsClient = new StatsApiClient();

// TODO: Inject team standings (W/L records) into /ask context once a standings
// endpoint is available or standings are computed from game results in the DB.
