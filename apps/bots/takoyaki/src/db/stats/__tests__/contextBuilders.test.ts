import {
  buildAllTimeLeadersContext,
  buildHallOfFameContext,
  formatCareerSummary,
} from 'src/db/stats/StatsClient';
import { HallOfFameMember, PlayerSeasonStat } from 'typings/portal';

const member = (overrides: Partial<HallOfFameMember>): HallOfFameMember => ({
  pid: 1,
  name: 'Example Player',
  position: 'Defensive Tackle',
  positionCode: 'DT',
  inductionSeason: 60,
  inductionTeam: 'OCO',
  careerStartSeason: 40,
  careerEndSeason: 52,
  awardCount: 5,
  careerAwards: [],
  regularSeasonStats: [],
  ...overrides,
});

describe('buildHallOfFameContext', () => {
  it('groups members by position and includes position-relevant stats', () => {
    const dt = member({
      name: 'Paulie Wag',
      careerAwards: [{ type: 'Pro Bowl', count: 3, seasons: ['S55'] }],
      regularSeasonStats: [
        { key: 'defSack', label: 'Sacks', value: 87, cohortAverage: 70 },
        { key: 'passYds', label: 'Passing Yards', value: 0, cohortAverage: 0 },
      ],
    });
    const qb = member({ pid: 2, name: 'Ace QB', position: 'Quarterback', positionCode: 'QB' });

    const context = buildHallOfFameContext([qb, dt]);

    expect(context).toContain('QB: Ace QB');
    expect(context).toContain('DT: Paulie Wag');
    expect(context).toContain('3x Pro Bowl');
    expect(context).toContain('87 sacks');
    expect(context).not.toContain('passing yards');
  });
});

describe('buildAllTimeLeadersContext', () => {
  it('formats leaders with abbreviated positions and skips empty groups', () => {
    const context = buildAllTimeLeadersContext([
      {
        label: 'DL sacks',
        leaders: [
          { name: 'Dan Miller', position: 'Defensive Tackle', value: 131 },
          { name: 'David Moyes', position: 'Defensive End', value: 112 },
        ],
      },
      { label: 'Empty Group', leaders: [] },
    ]);

    expect(context).toContain('DL sacks: Dan Miller (DT) 131, David Moyes (DE) 112');
    expect(context).not.toContain('Empty Group');
  });

  it('returns an empty string when no data is available', () => {
    expect(buildAllTimeLeadersContext([{ label: 'DL sacks', leaders: [] }])).toBe('');
  });
});

describe('formatCareerSummary', () => {
  const stat = (overrides: Partial<PlayerSeasonStat>): PlayerSeasonStat => ({
    season: 60,
    seasonState: 'RegularSeason',
    passYds: 0,
    passTD: 0,
    passInt: 0,
    rushYds: 0,
    rushTD: 0,
    recRec: 0,
    recYds: 0,
    recTD: 0,
    defTck: 0,
    defSack: 0,
    defInt: 0,
    ...overrides,
  });

  it('sums regular-season totals across seasons', () => {
    const summary = formatCareerSummary([
      stat({ season: 59, passYds: 4000, passTD: 30 }),
      stat({ season: 60, passYds: 4500, passTD: 35, passInt: 10 }),
      stat({ season: 60, seasonState: 'PostSeason', passYds: 900, passTD: 9 }),
    ]);

    expect(summary).toBe(
      'Career (S59-S60, 2 regular seasons): 8,500 pass yds, 65 pass TDs, 10 INTs',
    );
  });

  it('returns null when there is nothing to summarize', () => {
    expect(formatCareerSummary([stat({})])).toBeNull();
  });
});
