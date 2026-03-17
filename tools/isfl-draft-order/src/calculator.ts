import { DraftEntry, Game, PlayoffGame, Team } from './types';

export type { DraftEntry };

function formatRecord(wins: number, losses: number, ties: number): string {
  const w = String(wins).padStart(2);
  const l = String(losses).padStart(2, '0');
  return `${w}-${l}-${ties}`;
}

type TieResult = {
  ordered: Team[];
  tiebreaker: string;
};

function getH2HWins(abbr: string, opponents: string[], games: Game[]): number {
  let wins = 0;
  for (const g of games) {
    const isOpponent =
      (g.homeTeam === abbr && opponents.includes(g.awayTeam)) ||
      (g.awayTeam === abbr && opponents.includes(g.homeTeam));
    if (!isOpponent) continue;
    if (
      (g.homeTeam === abbr && g.winner === 'home') ||
      (g.awayTeam === abbr && g.winner === 'away')
    ) {
      wins++;
    }
  }
  return wins;
}

function getRecord(
  abbr: string,
  opponents: string[],
  games: Game[],
): { wins: number; losses: number; ties: number } {
  let wins = 0,
    losses = 0,
    ties = 0;
  for (const g of games) {
    const isHome = g.homeTeam === abbr;
    const isAway = g.awayTeam === abbr;
    const vsOpponent =
      (isHome && opponents.includes(g.awayTeam)) ||
      (isAway && opponents.includes(g.homeTeam));
    if (!vsOpponent) continue;
    if (g.winner === 'tie') {
      ties++;
    } else if (
      (isHome && g.winner === 'home') ||
      (isAway && g.winner === 'away')
    ) {
      wins++;
    } else {
      losses++;
    }
  }
  return { wins, losses, ties };
}

function winPct(rec: { wins: number; losses: number; ties: number }): number {
  const played = rec.wins + rec.losses + rec.ties;
  return played === 0 ? 0 : (rec.wins + rec.ties * 0.5) / played;
}

function getOpponents(abbr: string, games: Game[]): Set<string> {
  const opps = new Set<string>();
  for (const g of games) {
    if (g.homeTeam === abbr) opps.add(g.awayTeam);
    if (g.awayTeam === abbr) opps.add(g.homeTeam);
  }
  return opps;
}

// Returns teams ordered worst→best
function resolveTie(tied: Team[], games: Game[], depth = 0): TieResult {
  if (tied.length <= 1) return { ordered: tied, tiebreaker: '' };
  if (depth > 10) {
    // Safety valve
    return { ordered: [...tied].sort(() => Math.random() - 0.5), tiebreaker: 'Coinflip' };
  }

  const abbrevs = tied.map(t => t.abbreviation);

  // 1. Head-to-head
  const h2hGames = games.filter(
    g => abbrevs.includes(g.homeTeam) && abbrevs.includes(g.awayTeam),
  );

  if (h2hGames.length > 0) {
    const opponents = (abbr: string) => abbrevs.filter(a => a !== abbr);
    const h2hWins = tied.map(t => ({
      team: t,
      wins: getH2HWins(t.abbreviation, opponents(t.abbreviation), h2hGames),
    }));

    const allEqual = h2hWins.every(x => x.wins === h2hWins[0].wins);

    if (!allEqual) {
      if (tied.length === 2) {
        return {
          ordered: [...h2hWins].sort((a, b) => a.wins - b.wins).map(x => x.team),
          tiebreaker: 'H2H',
        };
      } else {
        // 3+ teams: find the unique best (most H2H wins), place at end, recurse on rest.
        // If the best is tied between multiple teams, H2H cannot break the tie — fall through.
        const maxWins = Math.max(...h2hWins.map(x => x.wins));
        const tiedAtMax = h2hWins.filter(x => x.wins === maxWins);

        if (tiedAtMax.length === 1) {
          const best = tiedAtMax[0].team;
          const rest = tied.filter(t => t.abbreviation !== best.abbreviation);
          const { ordered: restOrdered } = resolveTie(rest, games, depth + 1);
          return { ordered: [...restOrdered, best], tiebreaker: 'H2H' };
        }

        // No unique best — check for unique worst
        const minWins = Math.min(...h2hWins.map(x => x.wins));
        const tiedAtMin = h2hWins.filter(x => x.wins === minWins);
        if (tiedAtMin.length === 1) {
          const worst = tiedAtMin[0].team;
          const rest = tied.filter(t => t.abbreviation !== worst.abbreviation);
          const { ordered: restOrdered } = resolveTie(rest, games, depth + 1);
          return { ordered: [worst, ...restOrdered], tiebreaker: 'H2H' };
        }
        // No unique best or worst → fall through to next tiebreaker
      }
    }
  }

  // 2. Point Differential
  const pdSorted = [...tied].sort((a, b) => a.diff - b.diff);
  if (!pdSorted.every(t => t.diff === pdSorted[0].diff)) {
    return { ordered: pdSorted, tiebreaker: 'PD' };
  }

  // 3. Common Opponents Record
  const opponentSets = tied.map(t => getOpponents(t.abbreviation, games));
  const commonOpps = [...opponentSets[0]].filter(
    opp => !abbrevs.includes(opp) && opponentSets.every(s => s.has(opp)),
  );

  if (commonOpps.length > 0) {
    const copEntries = tied.map(t => ({
      team: t,
      pct: winPct(getRecord(t.abbreviation, commonOpps, games)),
    }));
    const allCOPEqual = copEntries.every(x => x.pct === copEntries[0].pct);

    if (!allCOPEqual) {
      return {
        ordered: [...copEntries].sort((a, b) => a.pct - b.pct).map(x => x.team),
        tiebreaker: 'COP',
      };
    }
  }

  // 4. Coinflip
  console.log(
    `Coinflip used for: ${tied.map(t => `${t.location} ${t.name}`).join(', ')}`,
  );
  return {
    ordered: [...tied].sort(() => Math.random() - 0.5),
    tiebreaker: 'Coinflip',
  };
}

// Sort teams worst→best within a group (same bracket slot / same wins bucket)
function sortGroup(
  teams: Team[],
  games: Game[],
): Array<{ team: Team; tiebreaker?: string }> {
  if (teams.length === 0) return [];
  if (teams.length === 1) return [{ team: teams[0] }];

  // Group by wins first
  const byWins = new Map<number, Team[]>();
  for (const team of teams) {
    if (!byWins.has(team.wins)) byWins.set(team.wins, []);
    byWins.get(team.wins)!.push(team);
  }

  const result: Array<{ team: Team; tiebreaker?: string }> = [];
  for (const wins of [...byWins.keys()].sort((a, b) => a - b)) {
    const group = byWins.get(wins)!;
    if (group.length === 1) {
      result.push({ team: group[0] });
    } else {
      const { ordered, tiebreaker } = resolveTie(group, games);
      for (const team of ordered) {
        result.push({ team, tiebreaker: tiebreaker || undefined });
      }
    }
  }

  return result;
}

function getPlayoffInfo(postseason: PlayoffGame[]): {
  playoffTeams: Set<string>;
  eliminationWeek: Map<string, number>;
} {
  const playoffTeams = new Set<string>();
  const eliminationWeek = new Map<string, number>();

  if (postseason.length === 0) {
    return { playoffTeams, eliminationWeek };
  }

  const maxWeek = Math.max(...postseason.map(g => g.week));

  for (const game of postseason) {
    playoffTeams.add(game.homeTeam);
    playoffTeams.add(game.awayTeam);
    const loser = game.winner === 'home' ? game.awayTeam : game.homeTeam;
    const existing = eliminationWeek.get(loser);
    if (existing === undefined || game.week > existing) {
      eliminationWeek.set(loser, game.week);
    }
  }

  // Champion: the team that never lost — assign maxWeek + 1
  for (const team of playoffTeams) {
    if (!eliminationWeek.has(team)) {
      eliminationWeek.set(team, maxWeek + 1);
    }
  }

  return { playoffTeams, eliminationWeek };
}

const PLAYOFF_PER_CONF = 3;

function makeDraftEntry(
  pick: number,
  team: Team,
  tiebreaker?: string,
  extra?: Partial<DraftEntry>,
): DraftEntry {
  return {
    pick,
    team: `${team.location} ${team.name}`,
    abbreviation: team.abbreviation,
    record: formatRecord(team.wins, team.losses, team.ties),
    madePlayoffs: false,
    tiebreaker,
    ...extra,
  };
}

// Completed season: use actual postseason bracket
function buildActualDraftOrder(
  teams: Team[],
  games: Game[],
  postseason: PlayoffGame[],
): DraftEntry[] {
  const { playoffTeams, eliminationWeek } = getPlayoffInfo(postseason);

  const nonPlayoffTeams = teams.filter(t => !playoffTeams.has(t.abbreviation));
  const playoffTeamsList = teams.filter(t => playoffTeams.has(t.abbreviation));

  const sortedNonPlayoff = sortGroup(nonPlayoffTeams, games);

  const byEliminationWeek = new Map<number, Team[]>();
  for (const team of playoffTeamsList) {
    const week = eliminationWeek.get(team.abbreviation)!;
    if (!byEliminationWeek.has(week)) byEliminationWeek.set(week, []);
    byEliminationWeek.get(week)!.push(team);
  }

  const entries: DraftEntry[] = [];
  let pick = 1;

  for (const e of sortedNonPlayoff) {
    entries.push(makeDraftEntry(pick++, e.team, e.tiebreaker));
  }

  for (const week of [...byEliminationWeek.keys()].sort((a, b) => a - b)) {
    const sorted = sortGroup(byEliminationWeek.get(week)!, games);
    for (const e of sorted) {
      entries.push(
        makeDraftEntry(pick++, e.team, e.tiebreaker, {
          madePlayoffs: true,
          eliminatedRound: week,
        }),
      );
    }
  }

  return entries;
}

// In-progress season: project top 3 per conference as playoff teams,
// paired by conference seed (seed 3 pair → seed 2 pair → seed 1 pair)
function buildProjectedDraftOrder(teams: Team[], games: Game[]): DraftEntry[] {
  // Group by conference
  const byConf = new Map<string, Team[]>();
  for (const t of teams) {
    if (!byConf.has(t.conference)) byConf.set(t.conference, []);
    byConf.get(t.conference)!.push(t);
  }
  const conferences = [...byConf.keys()].sort();

  // Sort each conference worst→best to determine seeding
  const confRanked = new Map<string, Team[]>();
  for (const conf of conferences) {
    confRanked.set(
      conf,
      sortGroup(byConf.get(conf)!, games).map(e => e.team),
    );
  }

  // Bottom 4 from each conference = non-playoff teams; sort all 8 worst→best
  const nonPlayoff: Team[] = [];
  for (const conf of conferences) {
    const ranked = confRanked.get(conf)!;
    nonPlayoff.push(...ranked.slice(0, ranked.length - PLAYOFF_PER_CONF));
  }
  const sortedNonPlayoff = sortGroup(nonPlayoff, games);

  const entries: DraftEntry[] = [];
  let pick = 1;

  for (const e of sortedNonPlayoff) {
    entries.push(makeDraftEntry(pick++, e.team, e.tiebreaker));
  }

  // Playoff pairs: seed 3 (WC round), seed 2 (Conference round), seed 1 (Championship)
  // projectedRound: 1=WC, 2=Conference, 3=Championship
  for (let i = 0; i < PLAYOFF_PER_CONF; i++) {
    const projectedRound = (i + 1) as 1 | 2 | 3;
    const pairTeams = conferences.map(conf => {
      const ranked = confRanked.get(conf)!;
      return ranked[ranked.length - PLAYOFF_PER_CONF + i];
    });

    const sorted = sortGroup(pairTeams, games);
    for (const e of sorted) {
      entries.push(
        makeDraftEntry(pick++, e.team, e.tiebreaker, {
          madePlayoffs: true,
          projectedRound,
        }),
      );
    }
  }

  return entries;
}

export function buildDraftOrder(
  teams: Team[],
  games: Game[],
  postseason: PlayoffGame[],
): DraftEntry[] {
  return postseason.length > 0
    ? buildActualDraftOrder(teams, games, postseason)
    : buildProjectedDraftOrder(teams, games);
}
