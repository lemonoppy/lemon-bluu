import { PortalClient } from 'src/db/portal/PortalClient';
import Query from 'src/lib/db';
import { suffix } from 'src/lib/format';
import { logger } from 'src/lib/logger';
import { Award, CareerLeader, GMRecord, HallOfFameMember, PlayerSeasonStat, StandingsResponse, TeamHistoryRecord } from 'typings/portal';

const DSFL_TEAMS = new Set(['KCC', 'LON', 'MIN', 'DAL', 'POR', 'BBB', 'NOR', 'TIJ']);

const POSITION_ORDER = ['QB', 'RB', 'WR', 'TE', 'OL', 'DE', 'DT', 'LB', 'CB', 'S', 'K', 'Fullback'];

const POSITION_KEY_STATS: Record<string, string[]> = {
  QB: ['passYds', 'passTD'],
  RB: ['rushYds', 'rushTD', 'recYds'],
  WR: ['recRec', 'recYds', 'recTD'],
  TE: ['recRec', 'recYds', 'recTD'],
  OL: ['otherPancakes'],
  DE: ['defSack', 'defTck'],
  DT: ['defSack', 'defTck'],
  LB: ['defTck', 'defSack', 'defInt'],
  CB: ['defInt', 'defPD', 'defTck'],
  S: ['defInt', 'defPD', 'defTck'],
  K: ['kFGM', 'kFGPct'],
  Fullback: ['otherPancakes'],
};

const RANKING_STATS: Record<string, Array<[string, string]>> = {
  QB: [['passYds', 'pass yds'], ['passTD', 'pass TDs'], ['passCmp', 'completions'], ['passRat', 'passer rating']],
  RB: [['rushYds', 'rush yds'], ['rushTD', 'rush TDs'], ['recYds', 'rec yds'], ['scrimmageYds', 'scrimmage yds']],
  WR: [['recRec', 'receptions'], ['recYds', 'rec yds'], ['recTD', 'rec TDs']],
  TE: [['recRec', 'receptions'], ['recYds', 'rec yds'], ['recTD', 'rec TDs']],
  OL: [['otherPancakes', 'pancakes']],
  DE: [['defSack', 'sacks'], ['defTck', 'tackles'], ['defTFL', 'TFL'], ['defFF', 'forced fumbles']],
  DT: [['defSack', 'sacks'], ['defTck', 'tackles'], ['defTFL', 'TFL'], ['defFF', 'forced fumbles']],
  LB: [['defTck', 'tackles'], ['defSack', 'sacks'], ['defInt', 'INTs'], ['defFF', 'forced fumbles']],
  CB: [['defInt', 'INTs'], ['defPD', 'passes defended'], ['defTck', 'tackles']],
  S: [['defInt', 'INTs'], ['defPD', 'passes defended'], ['defTck', 'tackles']],
  K: [['kFGM', 'FG made'], ['kFGPct', 'FG%'], ['kXPM', 'XP made']],
};

const CAREER_LEADER_GROUPS = [
  { label: 'QB passing yards', positions: ['QB'], category: 'passing', sortBy: 'passYds' },
  { label: 'RB rushing yards', positions: ['RB', 'FB'], category: 'rushing', sortBy: 'rushYds' },
  { label: 'WR receiving yards', positions: ['WR'], category: 'receiving', sortBy: 'recYds' },
  { label: 'TE receiving yards', positions: ['TE'], category: 'receiving', sortBy: 'recYds' },
  { label: 'OL pancakes', positions: ['C', 'G', 'T'], category: 'blocking', sortBy: 'otherPancakes' },
  { label: 'DL sacks', positions: ['DE', 'DT'], category: 'defense', sortBy: 'defSack' },
  { label: 'LB tackles', positions: ['LB'], category: 'defense', sortBy: 'defTck' },
  { label: 'DB interceptions', positions: ['CB', 'S'], category: 'defense', sortBy: 'defInt' },
  { label: 'K field goals made', positions: ['K'], category: 'kicking', sortBy: 'fieldGoalsMade' },
];

type PlayerStatsRow = {
  pid: number;
  games: number;
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
  position: string;
  stats: PlayerStatsRow;
};

export type PlayerMatch = { context: string; pid: number | null };

class StatsApiClient {
  #leaderContext: string = '';
  #standingsContext: string = '';
  #teamHistoryContext: string = '';
  #gmHistoryContext: string = '';
  #awardsContext: string = '';
  #hallOfFameContext: string = '';
  #allTimeLeadersContext: string = '';
  #seasonContext: string = '';
  #currentSeason: number = 0;
  #playerContextByFullName: Map<string, string> = new Map();
  #playerContextByLastName: Map<string, string> = new Map();
  #playerContextByFirstName: Map<string, string> = new Map();
  #playerPidByFullName: Map<string, number> = new Map();
  #positionByPid: Map<number, string> = new Map();
  #hallOfFameByPid: Map<number, HallOfFameMember> = new Map();

  async reload(): Promise<void> {
    try {
      const season = await PortalClient.getCurrentSeason();

      // Fetch all data in parallel; supplemental sources fail independently
      const [activePlayers, result, standings, teamHistory, gmHistory, rawAwards, hallOfFame, leaderGroups] = await Promise.all([
        PortalClient.getActivePlayers(),
        Query<PlayerStatsRow>(
          `
          SELECT pid,
            COUNT(*) AS games,
            SUM(passyds) AS passyds, SUM(passtd) AS passtd, SUM(passint) AS passint,
            SUM(rushyds) AS rushyds, SUM(rushtd) AS rushtd,
            SUM(recyds) AS recyds,  SUM(rectd) AS rectd,  SUM(recrec) AS recrec,
            SUM(deftck) AS deftck,  SUM(defsack) AS defsack, SUM(defint) AS defint
          FROM player_stats
          WHERE season = $1
          GROUP BY pid
          `,
          [season],
        ),
        PortalClient.getStandings(season).catch(() => null),
        PortalClient.getTeamHistory().catch(() => null),
        PortalClient.getGMHistory().catch(() => [] as GMRecord[]),
        PortalClient.getAwards().catch(() => [] as Award[]),
        PortalClient.getHallOfFame().catch(() => [] as HallOfFameMember[]),
        Promise.all(
          CAREER_LEADER_GROUPS.map(async (group) => ({
            label: group.label,
            leaders: await PortalClient.getCareerLeaders(
              group.positions,
              group.category,
              group.sortBy,
            ).catch(() => [] as CareerLeader[]),
          })),
        ),
      ]);

      // Filter DSFL team awards
      const awards = rawAwards.filter((a) => !a.team || !DSFL_TEAMS.has(a.team));

      // Build per-player award history lookup (all-time, ISFL only)
      const awardsByNameKey = new Map<string, Award[]>();
      for (const award of awards) {
        if (!award.firstName || !award.lastName) continue;
        const key = `${award.firstName} ${award.lastName}`.toLowerCase();
        if (!awardsByNameKey.has(key)) awardsByNameKey.set(key, []);
        awardsByNameKey.get(key)!.push(award);
      }

      this.#hallOfFameByPid = new Map(hallOfFame.map((member) => [member.pid, member]));
      this.#positionByPid = new Map(
        hallOfFame.map((member) => [member.pid, member.positionCode]),
      );

      // Build pidToPlayer map (active ISFL players only)
      const pidToPlayer = new Map<number, { fullName: string; team: string; position: string; firstName: string; lastName: string }>();
      for (const p of activePlayers) {
        if (p.currentLeague === 'ISFL' && p.isflTeam) {
          pidToPlayer.set(p.pid, {
            fullName: `${p.firstName} ${p.lastName}`,
            team: p.isflTeam.toUpperCase(),
            position: abbreviatePosition(p.position),
            firstName: p.firstName.toLowerCase(),
            lastName: p.lastName.toLowerCase(),
          });
          this.#positionByPid.set(p.pid, abbreviatePosition(p.position));
        }
      }

      const enriched: EnrichedPlayer[] = [];
      const byFullName = new Map<string, string>();
      const byPid = new Map<string, number>();
      const lastNameCount = new Map<string, number>();
      const firstNameCount = new Map<string, number>();

      // Active players with current season stats
      for (const row of result.rows) {
        const player = pidToPlayer.get(row.pid);
        if (!player) continue;

        const statLine = formatStatLine(player.fullName, player.team, player.position, row);
        if (!statLine) continue;

        enriched.push({ fullName: player.fullName, team: player.team, position: player.position, stats: row });

        const key = player.fullName.toLowerCase();
        const playerAwards = awardsByNameKey.get(key);
        const awardsLine = playerAwards?.length ? formatPlayerAwards(playerAwards) : '';
        byFullName.set(key, awardsLine ? `${statLine}\n${awardsLine}` : statLine);
        byPid.set(key, row.pid);

        lastNameCount.set(player.lastName, (lastNameCount.get(player.lastName) ?? 0) + 1);
        firstNameCount.set(player.firstName, (firstNameCount.get(player.firstName) ?? 0) + 1);
      }

      // Retired players — in awards but not active stats
      for (const [nameKey, playerAwards] of awardsByNameKey) {
        if (byFullName.has(nameKey)) continue;

        const latest = [...playerAwards].sort((a, b) => b.season - a.season)[0];
        const retiredLine = `${latest.firstName} ${latest.lastName} (${latest.team ?? 'Unknown'}, ${latest.playerPosition ? abbreviatePosition(latest.playerPosition) : 'Unknown'}, retired)`;
        byFullName.set(nameKey, `${retiredLine}\n${formatPlayerAwards(playerAwards)}`);
        byPid.set(nameKey, latest.pid);
        if (latest.playerPosition && !this.#positionByPid.has(latest.pid)) {
          this.#positionByPid.set(latest.pid, abbreviatePosition(latest.playerPosition));
        }

        const parts = nameKey.split(' ');
        const ln = parts[parts.length - 1];
        const fn = parts[0];
        lastNameCount.set(ln, (lastNameCount.get(ln) ?? 0) + 1);
        firstNameCount.set(fn, (firstNameCount.get(fn) ?? 0) + 1);
      }

      // Disambiguation maps — unambiguous last/first names only
      const byLastName = new Map<string, string>();
      const byFirstName = new Map<string, string>();
      for (const [fullNameKey, context] of byFullName) {
        const parts = fullNameKey.split(' ');
        const ln = parts[parts.length - 1];
        const fn = parts[0];
        if ((lastNameCount.get(ln) ?? 0) === 1) byLastName.set(ln, context);
        if ((firstNameCount.get(fn) ?? 0) === 1) byFirstName.set(fn, context);
      }

      this.#playerContextByFullName = byFullName;
      this.#playerContextByLastName = byLastName;
      this.#playerContextByFirstName = byFirstName;
      this.#playerPidByFullName = byPid;
      this.#currentSeason = season;

      const top5 = (key: keyof PlayerStatsRow): string =>
        [...enriched]
          .filter((r) => (r.stats[key] as number) > 0)
          .sort((a, b) => (b.stats[key] as number) - (a.stats[key] as number))
          .slice(0, 5)
          .map((r) => `${r.fullName} (${r.team}, ${r.position}) ${(r.stats[key] as number).toLocaleString('en-US')}`)
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

      const maxGames = enriched.length ? Math.max(...enriched.map((r) => r.stats.games)) : 0;
      this.#seasonContext = maxGames > 0
        ? `Season ${season}: through Week ${maxGames} of 16${maxGames >= 16 ? ' (regular season complete)' : ''}.`
        : `Season ${season} in progress.`;
      this.#standingsContext = standings ? buildStandingsContext(standings) : '';
      this.#teamHistoryContext = teamHistory ? buildTeamHistoryContext(teamHistory.records) : '';
      this.#gmHistoryContext = gmHistory.length ? buildGMContext(gmHistory) : '';
      this.#awardsContext = awards.length ? buildAwardsContext(awards, season) : '';
      this.#hallOfFameContext = hallOfFame.length ? buildHallOfFameContext(hallOfFame) : '';
      this.#allTimeLeadersContext = buildAllTimeLeadersContext(leaderGroups);

      logger.info(`StatsClient: Loaded ${enriched.length} active + ${byFullName.size - enriched.length} retired players (season ${season})`);
    } catch (error) {
      logger.error('StatsClient: Failed to reload stats:', error);
      this.#leaderContext = '';
      this.#standingsContext = '';
      this.#teamHistoryContext = '';
      this.#gmHistoryContext = '';
      this.#awardsContext = '';
      this.#hallOfFameContext = '';
      this.#allTimeLeadersContext = '';
      this.#seasonContext = '';
      this.#playerContextByFullName = new Map();
      this.#playerContextByLastName = new Map();
      this.#playerContextByFirstName = new Map();
      this.#playerPidByFullName = new Map();
      this.#positionByPid = new Map();
      this.#hallOfFameByPid = new Map();
    }
  }

  getCurrentSeason(): number {
    return this.#currentSeason;
  }

  getLeaderContext(): string {
    return this.#leaderContext;
  }

  getSeasonContext(): string {
    return this.#seasonContext;
  }

  getStandingsContext(): string {
    return this.#standingsContext;
  }

  getTeamHistoryContext(): string {
    return this.#teamHistoryContext;
  }

  getGMHistoryContext(): string {
    return this.#gmHistoryContext;
  }

  getAwardsContext(): string {
    return this.#awardsContext;
  }

  getHallOfFameContext(): string {
    return this.#hallOfFameContext;
  }

  getAllTimeLeadersContext(): string {
    return this.#allTimeLeadersContext;
  }

  getHallOfFameContextFor(pid: number): string {
    const member = this.#hallOfFameByPid.get(pid);
    if (!member) return '';

    const awards = member.careerAwards
      .map((award) => `${award.count}x ${award.type} (${award.seasons.join(', ')})`)
      .join('; ');
    const stats = member.regularSeasonStats
      .filter((stat) => POSITION_KEY_STATS[member.positionCode]?.includes(stat.key))
      .map((stat) => `${formatNumber(stat.value)} ${stat.label.toLowerCase()} (position cohort avg ${formatNumber(stat.cohortAverage)})`)
      .join(', ');

    return [
      `Hall of Fame: inducted S${member.inductionSeason}, career S${member.careerStartSeason}-S${member.careerEndSeason}.`,
      awards ? `Career awards: ${awards}.` : '',
      stats ? `Career stats: ${stats}.` : '',
    ].filter(Boolean).join(' ');
  }

  async getPlayerRankingsContext(pid: number): Promise<string> {
    const position = this.#positionByPid.get(pid);
    const stats = position ? RANKING_STATS[position] : undefined;
    if (!position || !stats) return '';

    const rankings = await PortalClient.getPlayerRankings(pid, position).catch(() => null);
    if (!rankings) return '';

    const parts = stats.flatMap(([key, label]) => {
      const entry = rankings[key]?.[0];
      return entry
        ? [`${label} ${formatNumber(entry.value)} (${suffix(entry.rank)} among ${position}s)`]
        : [];
    });
    return parts.length
      ? `Career ranks (regular season, same-era ${position}s): ${parts.join(', ')}`
      : '';
  }

  /**
   * Scans the question text for up to 3 player name mentions.
   * Returns contexts including current season stats and full career awards.
   */
  findPlayersInText(question: string): PlayerMatch[] {
    const q = question.toLowerCase();
    const foundKeys = new Set<string>();
    const results: PlayerMatch[] = [];

    const add = (context: string, fullKey: string, pid: number | null) => {
      if (!foundKeys.has(fullKey) && results.length < 3) {
        foundKeys.add(fullKey);
        results.push({ context, pid });
      }
    };

    // 1. Full name matches (longest first to avoid partial shadowing)
    const fullNames = [...this.#playerContextByFullName.keys()].sort(
      (a, b) => b.length - a.length,
    );
    for (const name of fullNames) {
      if (q.includes(name)) {
        add(
          this.#playerContextByFullName.get(name)!,
          name,
          this.#playerPidByFullName.get(name) ?? null,
        );
      }
    }

    // 2. Last name matches (unambiguous only)
    for (const [lastName, context] of this.#playerContextByLastName) {
      if (containsWord(q, lastName)) {
        const fullKey =
          [...this.#playerContextByFullName.keys()].find((k) => k.endsWith(` ${lastName}`)) ??
          lastName;
        add(context, fullKey, this.#playerPidByFullName.get(fullKey) ?? null);
      }
    }

    // 3. First name matches (unambiguous only)
    for (const [firstName, context] of this.#playerContextByFirstName) {
      if (containsWord(q, firstName)) {
        const fullKey =
          [...this.#playerContextByFullName.keys()].find((k) => k.startsWith(`${firstName} `)) ??
          firstName;
        add(context, fullKey, this.#playerPidByFullName.get(fullKey) ?? null);
      }
    }

    return results;
  }
}

function containsWord(text: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`).test(text);
}

function abbreviatePosition(position: string): string {
  const map: Record<string, string> = {
    'Quarterback': 'QB',
    'Running Back': 'RB',
    'Wide Receiver': 'WR',
    'Tight End': 'TE',
    'Offensive Lineman': 'OL',
    'Defensive End': 'DE',
    'Defensive Tackle': 'DT',
    'Linebacker': 'LB',
    'Cornerback': 'CB',
    'Safety': 'S',
    'Kicker': 'K',
  };
  return map[position] ?? position;
}

function formatNumber(value: number): string {
  return Number.isInteger(value)
    ? value.toLocaleString('en-US')
    : value.toFixed(1);
}

export function buildHallOfFameContext(members: HallOfFameMember[]): string {
  const byPosition = new Map<string, HallOfFameMember[]>();
  for (const member of members) {
    if (!byPosition.has(member.positionCode)) byPosition.set(member.positionCode, []);
    byPosition.get(member.positionCode)!.push(member);
  }

  const lines = ['Hall of Fame (regular-season career totals):'];
  for (const position of POSITION_ORDER) {
    const group = byPosition.get(position);
    if (!group) continue;

    const entries = [...group]
      .sort((a, b) => b.inductionSeason - a.inductionSeason)
      .map((member) => {
        const awards = member.careerAwards
          .slice(0, 3)
          .map((award) => `${award.count}x ${award.type}`)
          .join(', ');
        const stats = member.regularSeasonStats
          .filter((stat) => POSITION_KEY_STATS[position]?.includes(stat.key))
          .map((stat) => `${formatNumber(stat.value)} ${stat.label.toLowerCase()}`)
          .join(', ');
        const details = [awards, stats].filter(Boolean).join('; ');
        return `${member.name} (HoF S${member.inductionSeason}, S${member.careerStartSeason}-S${member.careerEndSeason})${details ? `: ${details}` : ''}`;
      });

    lines.push(`${position}: ${entries.join(' | ')}`);
  }
  return lines.join('\n');
}

export function buildAllTimeLeadersContext(
  groups: Array<{ label: string; leaders: CareerLeader[] }>,
): string {
  const lines = ['All-Time Career Leaders (regular season):'];
  for (const { label, leaders } of groups) {
    if (!leaders.length) continue;
    lines.push(
      `${label}: ${leaders
        .map((leader) => `${leader.name} (${abbreviatePosition(leader.position)}) ${formatNumber(leader.value)}`)
        .join(', ')}`,
    );
  }
  return lines.length > 1 ? lines.join('\n') : '';
}

function formatStatLine(
  fullName: string,
  team: string,
  position: string,
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
  return `${fullName} (${team}, ${position}, ${row.games} GP): ${parts.join('; ')}`;
}

function formatPlayerAwards(playerAwards: Award[]): string {
  const byType = new Map<string, number[]>();
  for (const a of playerAwards) {
    if (!byType.has(a.type)) byType.set(a.type, []);
    byType.get(a.type)!.push(a.season);
  }
  const parts = [...byType.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([type, seasons]) => {
      const sorted = [...new Set(seasons)].sort((a, b) => b - a);
      return `${type} (${sorted.map((s) => `S${s}`).join(', ')})`;
    });
  return `Career awards: ${parts.join('; ')}`;
}

export function formatPrevStatLine(stat: PlayerSeasonStat): string | null {
  const parts: string[] = [];
  if (stat.passYds > 0)
    parts.push(`${stat.passYds.toLocaleString('en-US')} pass yds, ${stat.passTD} TDs, ${stat.passInt} INTs`);
  if (stat.rushYds > 0)
    parts.push(`${stat.rushYds.toLocaleString('en-US')} rush yds, ${stat.rushTD} TDs`);
  if (stat.recYds > 0)
    parts.push(`${stat.recYds.toLocaleString('en-US')} rec yds (${stat.recRec} rec), ${stat.recTD} TDs`);
  if (stat.defTck > 0)
    parts.push(`${stat.defTck} tackles, ${stat.defSack} sacks, ${stat.defInt} INTs`);
  return parts.length ? parts.join('; ') : null;
}

export function formatCareerSummary(stats: PlayerSeasonStat[]): string | null {
  const regular = stats.filter((s) => s.seasonState === 'RegularSeason');
  if (!regular.length) return null;

  const sum = (key: keyof PlayerSeasonStat) =>
    regular.reduce((total, s) => total + (s[key] as number), 0);

  const parts: string[] = [];
  if (sum('passYds') > 0)
    parts.push(`${sum('passYds').toLocaleString('en-US')} pass yds, ${sum('passTD')} pass TDs, ${sum('passInt')} INTs`);
  if (sum('rushYds') > 0)
    parts.push(`${sum('rushYds').toLocaleString('en-US')} rush yds, ${sum('rushTD')} rush TDs`);
  if (sum('recYds') > 0)
    parts.push(`${sum('recYds').toLocaleString('en-US')} rec yds (${sum('recRec')} rec), ${sum('recTD')} rec TDs`);
  if (sum('defTck') > 0)
    parts.push(`${sum('defTck')} tackles, ${sum('defSack')} sacks, ${sum('defInt')} INTs`);
  if (!parts.length) return null;

  const seasons = regular.map((s) => s.season);
  return `Career (S${Math.min(...seasons)}-S${Math.max(...seasons)}, ${regular.length} regular seasons): ${parts.join('; ')}`;
}

export const StatsClient = new StatsApiClient();


function buildStandingsContext(standings: StandingsResponse): string {
  const byConference = new Map<string, typeof standings.regularSeason>();
  for (const team of standings.regularSeason) {
    const conf = team.conference ?? 'Unknown';
    if (!byConference.has(conf)) byConference.set(conf, []);
    byConference.get(conf)!.push(team);
  }

  const lines = [`Season ${standings.season} Standings:`];
  for (const [conf, teams] of [...byConference.entries()].sort()) {
    const sorted = [...teams].sort((a, b) => b.pct - a.pct || b.diff - a.diff);
    lines.push(
      `${conf}: ${sorted.map((t) => `${t.abbreviation} ${t.wins}-${t.losses}${t.ties ? `-${t.ties}` : ''}`).join(', ')}`,
    );
  }

  const champion = standings.postseason
    .filter((g) => g.winner !== null)
    .sort((a, b) => b.week - a.week)[0];
  if (champion?.winner) {
    const winner = champion.winner === 'home' ? champion.homeTeam : champion.awayTeam;
    lines.push(`Season ${standings.season} Champion: ${winner}`);
  }

  return lines.join('\n');
}

function buildTeamHistoryContext(records: TeamHistoryRecord[]): string {
  const fmt = (r: TeamHistoryRecord) =>
    `${r.abbreviation} ${r.regWins}-${r.regLosses}${r.championships ? ` (${r.championships} titles)` : ''}`;

  const isfl = records.filter((r) => r.league === 'ISFL');
  const dsfl = records.filter((r) => r.league === 'DSFL');

  const lines = ['All-Time Records:'];
  if (isfl.length) lines.push(`ISFL: ${isfl.map(fmt).join(' | ')}`);
  if (dsfl.length) lines.push(`DSFL: ${dsfl.map(fmt).join(' | ')}`);
  return lines.join('\n');
}

function buildAwardsContext(awards: Award[], currentSeason: number): string {
  // awards are pre-filtered to ISFL only; show last 15 seasons, cap each type to 8 winners
  const minSeason = currentSeason - 14;
  const recent = awards.filter((a) => a.season >= minSeason);

  const byType = new Map<string, Array<{ season: number; name: string; team: string | null; position: string | null }>>();
  for (const a of recent) {
    if (!byType.has(a.type)) byType.set(a.type, []);
    const name =
      a.firstName && a.lastName ? `${a.firstName} ${a.lastName}` : (a.username ?? 'Unknown');
    byType.get(a.type)!.push({
      season: a.season,
      name,
      team: a.team,
      position: a.playerPosition ? abbreviatePosition(a.playerPosition) : null,
    });
  }

  const lines = [`Award History (Seasons ${minSeason}-${currentSeason}):`];
  for (const [type, winners] of [...byType.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const sorted = [...winners].sort((a, b) => b.season - a.season).slice(0, 8);
    lines.push(
      `${type}: ${sorted
        .map((w) => {
          const tag = [w.team, w.position].filter(Boolean).join(', ');
          return `${w.name}${tag ? ` (${tag})` : ''} S${w.season}`;
        })
        .join(', ')}`,
    );
  }
  return lines.join('\n');
}

function buildGMContext(records: GMRecord[]): string {
  const isfl = records.filter((r) => r.league === 'ISFL');
  if (!isfl.length) return '';

  const fmt = (r: GMRecord) =>
    `${r.username}: ${r.championships} titles, ${r.regWins}-${r.regLosses} reg, ${r.seasons} seasons`;

  const top = isfl.slice(0, 25);

  const qualified = isfl.filter((r) => r.regGames >= 16);
  const bottom = [...qualified]
    .sort((a, b) => a.regWins / a.regGames - b.regWins / b.regGames)
    .slice(0, 15);

  const lines = ['ISFL GM Records:'];
  lines.push(`Top (by championships): ${top.map(fmt).join(' | ')}`);
  if (bottom.length) lines.push(`Bottom (by win rate, min 1 season): ${bottom.map(fmt).join(' | ')}`);
  return lines.join('\n');
}
