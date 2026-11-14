import { ParsedEventPage } from '../client';
import { mapTournamentToRows } from '../sync';

const makePage = (
  overrides: Partial<ParsedEventPage> = {},
): ParsedEventPage => ({
  tournament: {
    id: '117163491565579920',
    name: 'Test Skirmish',
    startsAt: '2026-11-14T17:00:00Z',
    endsAt: '2026-11-15T17:00:00Z',
    updatedAt: '2026-11-14T18:00:00Z',
    status: 'COMPLETED',
    tournamentLocation: { latitude: 45.42, longitude: -75.69 },
    config: {
      tournamentType: 'SUMMONER_SKIRMISH',
      structure: 'SWISS_PLUS_SINGLE_ELIM',
      roundCount: 2,
      secondSwissStage: null,
      finalBracketStage: { participantCount: 2 },
    },
    stages: [
      {
        esportsStageId: 'stage1',
        name: null,
        status: 'COMPLETED',
        sections: [
          {
            esportsSectionId: 'section1',
            type: 'SWISS',
            rounds: [
              {
                roundNumber: 1,
                status: 'FINALIZED',
                byeTeamIds: [],
                startedAt: '2026-11-14T17:00:00Z',
                roundDuration: 60,
                matches: [
                  {
                    esportsMatchId: 'match1',
                    structuralId: null,
                    tableNumber: 1,
                    status: 'IN_PROGRESS',
                    strategy: 'DRAWABLE_BEST_OF',
                    teamOutcomes: [
                      { esportsTeamId: 'team2', outcome: 'LOSS' },
                      { esportsTeamId: 'team1', outcome: 'WIN' },
                    ],
                    games: [
                      {
                        esportsGameId: 'game1',
                        number: 1,
                        teamOutcomes: [
                          { esportsTeamId: 'team2', outcome: 'LOSS' },
                          { esportsTeamId: 'team1', outcome: 'WIN' },
                        ],
                      },
                      {
                        esportsGameId: 'game2',
                        number: 2,
                        teamOutcomes: null,
                      },
                    ],
                    teams: [
                      {
                        esportsTeamId: 'team1',
                        players: [
                          {
                            id: 'player1',
                            displayName: 'Alpha',
                            tagLine: 'NA1',
                          },
                        ],
                      },
                      {
                        esportsTeamId: 'team2',
                        players: [
                          {
                            id: 'player2',
                            displayName: 'Beta',
                            tagLine: 'NA1',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    esportsMatchId: 'bye-match',
                    structuralId: null,
                    tableNumber: null,
                    status: 'UNSTARTED',
                    strategy: 'DRAWABLE_BEST_OF',
                    teamOutcomes: null,
                    games: [],
                    teams: [],
                  },
                ],
                endOfRoundStandings: [
                  {
                    rank: 1,
                    esportsTeamId: 'team1',
                    matchPoints: 3,
                    opponentMatchWinPercentage: '0.5',
                    gameWinPercentage: '1',
                    opponentGameWinPercentage: '0.5',
                    matchWins: 1,
                    matchLosses: 0,
                    matchDraws: 0,
                  },
                  {
                    rank: 2,
                    esportsTeamId: 'team2',
                    matchPoints: 0,
                    opponentMatchWinPercentage: '1',
                    gameWinPercentage: '0',
                    opponentGameWinPercentage: '1',
                    matchWins: 0,
                    matchLosses: 1,
                    matchDraws: 0,
                  },
                ],
              },
              {
                roundNumber: 2,
                status: 'FINALIZED',
                byeTeamIds: [],
                startedAt: null,
                roundDuration: 60,
                matches: [],
                endOfRoundStandings: [
                  {
                    rank: 1,
                    esportsTeamId: 'team1',
                    matchPoints: 6,
                    opponentMatchWinPercentage: '0.5',
                    gameWinPercentage: '1',
                    opponentGameWinPercentage: '0.5',
                    matchWins: 2,
                    matchLosses: 0,
                    matchDraws: 0,
                  },
                  {
                    rank: 2,
                    esportsTeamId: 'team2',
                    matchPoints: 0,
                    opponentMatchWinPercentage: '1',
                    gameWinPercentage: '0',
                    opponentGameWinPercentage: '1',
                    matchWins: 0,
                    matchLosses: 2,
                    matchDraws: 0,
                  },
                ],
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
        player: { id: 'player1', displayName: 'Alpha', tagLine: 'NA1' },
      },
      {
        status: 'ACTIVE',
        esportsTeamId: 'team2',
        player: { id: 'player2', displayName: 'Beta', tagLine: 'NA1' },
      },
    ],
  },
  organizer: {
    id: 'org1',
    name: 'Test Store',
    physicalAddress: {
      city: 'Ottawa',
      latitude: 45.42,
      longitude: -75.69,
    },
  },
  ...overrides,
});

describe('mapTournamentToRows', () => {
  it('maps stores, participants, rounds, matches, games, and standings', () => {
    const mapped = mapTournamentToRows(makePage());

    expect(mapped.store).toEqual({
      id: 'org1',
      name: 'Test Store',
      address: {
        city: 'Ottawa',
        latitude: 45.42,
        longitude: -75.69,
      },
    });
    expect(mapped.event).toMatchObject({
      id: '117163491565579920',
      status: 'COMPLETED',
      tournamentType: 'SUMMONER_SKIRMISH',
      structure: 'SWISS_PLUS_SINGLE_ELIM',
      isLocal: true,
    });
    expect(mapped.participants).toHaveLength(2);
    expect(mapped.participants[0]).toMatchObject({
      teamId: 'team1',
      playerId: 'player1',
      finalRank: 1,
      record: '2-0-0',
      matchesPlayed: 2,
    });
    expect(mapped.rounds).toHaveLength(2);
    expect(mapped.matches).toHaveLength(1);
    expect(mapped.matches[0]).toMatchObject({
      matchId: 'match1',
      team1Id: 'team1',
      team2Id: 'team2',
      team1Outcome: 'WIN',
      team2Outcome: 'LOSS',
    });
    expect(mapped.games).toHaveLength(2);
    expect(mapped.games[0]).toMatchObject({
      gameId: 'game1',
      team1Outcome: 'WIN',
      team2Outcome: 'LOSS',
    });
    expect(mapped.games[1].team1Outcome).toBeNull();
    expect(mapped.standings).toHaveLength(4);
  });

  it('marks events outside the Ottawa radius as non-local', () => {
    const page = makePage();
    const mapped = mapTournamentToRows({
      ...page,
      tournament: {
        ...page.tournament,
        tournamentLocation: { latitude: 43.65, longitude: -79.38 },
      },
    });
    expect(mapped.event.isLocal).toBe(false);
  });
});
