import {
  buildEventData,
  extractEventId,
  extractFlightPayload,
  parseEventName,
  parseEventPage,
  parseEventRegistrants,
} from '../client';

const TOURNAMENT = {
  __typename: 'CompeteTournament',
  id: '117163491565579920',
  name: 'Test Skirmish',
  startsAt: '2026-11-14T17:00:00Z',
  endsAt: '2026-11-15T17:00:00Z',
  status: 'IN_PROGRESS',
  config: {
    structure: 'SWISS_PLUS_SINGLE_ELIM',
    roundCount: 5,
    secondSwissStage: null,
    finalBracketStage: { participantCount: 4 },
  },
  stages: [
    {
      status: 'IN_PROGRESS',
      sections: [
        {
          type: 'SWISS',
          rounds: [
            {
              roundNumber: 1,
              status: 'FINALIZED',
              startedAt: '2026-11-14T17:00:00Z',
              roundDuration: 60,
              matches: [{}],
              endOfRoundStandings: [
                {
                  rank: 1,
                  esportsTeamId: 'team1',
                  matchPoints: 9,
                  opponentMatchWinPercentage: '0.5',
                  gameWinPercentage: '1',
                  opponentGameWinPercentage: '0.5',
                  matchWins: 3,
                  matchLosses: 0,
                  matchDraws: 0,
                },
              ],
            },
            {
              roundNumber: 2,
              status: 'IN_PROGRESS',
              startedAt: '2026-11-14T18:00:00Z',
              roundDuration: 60,
              matches: [{}],
              endOfRoundStandings: null,
            },
          ],
        },
      ],
    },
  ],
  tournamentParticipants: [
    {
      status: 'ACTIVE',
      esportsTeamId: 'team1',
      player: {
        id: '01a0a2a2-d619-7f6a-bb8f-5b299d704e97',
        displayName: 'BNutty',
        tagLine: 'NA1',
      },
    },
  ],
};

const ORGANIZER = { __typename: 'OrganizerSummary', name: 'Test Store' };

const makePage = (): string => {
  const flight = `${JSON.stringify(TOURNAMENT)}${JSON.stringify(ORGANIZER)}`;
  return `<script>self.__next_f.push([1,${JSON.stringify(flight)}])</script>`;
};

const makeUpcomingPage = (): string => {
  const flight = `${JSON.stringify([
    ['$', 'h1', null, { className: 'next-error-h1', children: 404 }],
  ])}${JSON.stringify([
    ['$', 'h1', null, { className: 'title', children: 'Upcoming Skirmish' }],
  ])}${JSON.stringify({
    config: { __typename: 'RiftboundTournamentConfig' },
    players: [
      {
        __typename: 'TournamentRegistrant',
        status: 'REGISTERED',
        player: { id: 'player1', displayName: 'Alice', tagLine: 'NA1' },
      },
      {
        __typename: 'TournamentRegistrant',
        status: 'DROPPED',
        player: { id: 'player2', displayName: 'Bob', tagLine: 'NA1' },
      },
    ],
  })}`;
  return `<script>self.__next_f.push([1,${JSON.stringify(flight)}])</script>`;
};

describe('extractEventId', () => {
  it('accepts a bare event id', () => {
    expect(extractEventId('117163491565579920')).toBe('117163491565579920');
  });

  it('accepts a playriftbound.com event URL', () => {
    expect(
      extractEventId(
        'https://playriftbound.com/en-US/events/117163491565579920',
      ),
    ).toBe('117163491565579920');
  });

  it('rejects unrelated input', () => {
    expect(extractEventId('https://example.com/events')).toBeNull();
    expect(extractEventId('not an id')).toBeNull();
  });
});

describe('parseEventPage', () => {
  it('extracts the tournament and organizer from the flight payload', () => {
    const page = parseEventPage(makePage());
    expect(page.tournament.name).toBe('Test Skirmish');
    expect(page.organizer?.name).toBe('Test Store');
  });

  it('returns an empty flight payload for unrelated HTML', () => {
    expect(extractFlightPayload('<html></html>')).toBe('');
    expect(() => parseEventPage('<html></html>')).toThrow();
  });
});

describe('parseEventRegistrants', () => {
  it('extracts registrants from a not-yet-started event page', () => {
    expect(parseEventRegistrants(makeUpcomingPage())).toEqual([
      {
        __typename: 'TournamentRegistrant',
        status: 'REGISTERED',
        player: { id: 'player1', displayName: 'Alice', tagLine: 'NA1' },
      },
      {
        __typename: 'TournamentRegistrant',
        status: 'DROPPED',
        player: { id: 'player2', displayName: 'Bob', tagLine: 'NA1' },
      },
    ]);
  });

  it('returns no registrants for a started event page', () => {
    expect(parseEventRegistrants(makePage())).toEqual([]);
  });
});

describe('parseEventName', () => {
  it('reads the event name from the page header', () => {
    expect(parseEventName(makeUpcomingPage())).toBe('Upcoming Skirmish');
  });

  it('returns null when there is no header', () => {
    expect(parseEventName('<html></html>')).toBeNull();
  });
});

describe('buildEventData', () => {
  const event = buildEventData(parseEventPage(makePage()));

  it('maps event metadata and caps the end time', () => {
    expect(event.id).toBe('117163491565579920');
    expect(event.name).toBe('Test Skirmish');
    expect(event.store).toEqual({ id: 0, name: 'Test Store' });
    expect(event.end_datetime).toBe('2026-11-15T05:00:00.000Z');
  });

  it('maps rounds, standings, and the running timer', () => {
    const [swiss, cut] = event.tournament_phases;
    expect(swiss.rounds.map((round) => round.status)).toEqual([
      'COMPLETE',
      'IN_PROGRESS',
      'UPCOMING',
      'UPCOMING',
      'UPCOMING',
    ]);
    expect(swiss.rounds[0].standings[0]).toMatchObject({
      rank: 1,
      record: '3-0-0',
      points: 9,
      user_event_status: {
        best_identifier: 'BNutty',
        user: { id: '01a0a2a2-d619-7f6a-bb8f-5b299d704e97' },
      },
    });
    // Bracket stage doesn't exist yet, so it's synthesized from the config.
    expect(cut.rank_required_to_enter_phase).toBe(4);
    expect(cut.rounds).toHaveLength(0);
    expect(event.timer_is_running).toBe(true);
    expect(event.timer_end_datetime).toBe('2026-11-14T19:00:00.000Z');
  });
});
