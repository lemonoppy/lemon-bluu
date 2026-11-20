const isDevelopment = process.env.NODE_ENV === 'development';

export const Config = {
  token: isDevelopment ? process.env.DEV_TOKEN : process.env.TOKEN,
  clientId: isDevelopment ? process.env.DEV_CLIENT_ID : process.env.CLIENT_ID,
  isDevelopment,

  // Riot's Riftbound events site (replaced the UVS store platform). Event
  // pages are server-rendered; the event list is a persisted-query GraphQL
  // endpoint that rejects freeform queries.
  riftboundBaseUrl: 'https://playriftbound.com',
  riftboundGqlUrl: 'https://playriftbound.com/api/gql',

  // The site sends this persisted query ID for its event search. It changes
  // when Riot ships a new search operation.
  // shortcut: hardcoded hash, re-capture it from the events page network tab
  // when event discovery starts returning PERSISTED_QUERY_NOT_IN_LIST.
  riftboundSearchHash:
    '868030f676276bec926c740aada7129713d4097f6e2dd7c3a0451c4fb43852eb',

  // Ottawa + Gatineau, Kanata and Carleton Place all fall within 50 km.
  ottawaCoords: { latitude: 45.413, longitude: -75.7011 },
  ottawaSearchRadiusMeters: 50_000,

  // PlayRiftbound's event history starts around Oct 1 2026. Discovery always
  // starts here so events missed while the bot was down are backfilled.
  riftboundHistoryStartDate: '2026-10-01T00:00:00.000Z',
  riftboundSyncCron: '0 * * * *',
  // Bounds each sync run; the rest are picked up next run.
  riftboundSyncMaxEventsPerRun: 50,
  riftboundSyncRecheckMinutes: 30,
  riftboundCompletedRecheckHours: 24,
  riftboundSyncDelayMs: 400,

  eloshowdownApiBaseUrl: 'https://eloshowdown.com/api/v1',
  eloshowdownApiKey: process.env.ELOSHOWDOWN_API_KEY,

  // A player counts as "recently played in Ottawa" if their last Ottawa event
  // was within this many days. Non-squad members must meet this to appear on
  // the /ottawa leaderboard.
  ottawaRecentWindowDays: 30,

  // Non-squad players appearing in at least this many Ottawa events are part
  // of the community and eligible for the /ottawa leaderboard. Squad members
  // always appear regardless.
  ottawaCommunityMinEvents: 3,

  // Max completed Ottawa events to enrich with elo per job run. The
  // EloShowdown request budget stops the run earlier when needed.
  ottawaMaxEventsPerRun: 50,

  // Delay between EloShowdown API requests to stay within the rate limit.
  eloshowdownRequestDelayMs: 300,

  // Max EloShowdown requests per job run. When exhausted the job stops
  // gracefully and resumes on a later run.
  eloshowdownMaxRequestsPerRun: 50,

  // Squad members' elo is refreshed at most this often (per member) unless
  // they appear in a processed event.
  eloshowdownSquadRefreshHours: 6,

  // Tracked community players whose elo history is older than this are
  // re-fetched each run (oldest first) using leftover request budget. This
  // keeps current_elo in sync with EloShowdown, which recomputes/adjusts elo
  // for already-recorded matches over time.
  eloshowdownStaleRefreshHours: 12,

  // Cron schedule for the dedicated stale elo history refresh (production only).
  eloshowdownRefreshCron: '45 */6 * * *',

  // Cron schedule for the elo event backfill (production only).
  eloshowdownEventCron: '15 * * * *',

  // Events are only processed once they've been finished this long, giving
  // EloShowdown time to ingest the results.
  eloshowdownGraceHours: 12,

  // Events recorded with missing elo are rechecked at most this often...
  eloshowdownRecheckHours: 24,

  // ...and only while the event is younger than this many days.
  eloshowdownRecheckDays: 30,
} as const;
