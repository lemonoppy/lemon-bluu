const isDevelopment = process.env.NODE_ENV === 'development';

export const Config = {
  token: isDevelopment ? process.env.DEV_TOKEN : process.env.TOKEN,
  clientId: isDevelopment ? process.env.DEV_CLIENT_ID : process.env.CLIENT_ID,
  isDevelopment,

  uvsApiBaseUrl:
    'https://api.cloudflare.riftbound.uvsgames.com/hydraproxy/api/v2',
  eloshowdownApiBaseUrl: 'https://eloshowdown.com/api/v1',
  eloshowdownApiKey: process.env.ELOSHOWDOWN_API_KEY,

  // Ottawa-area stores on the UVS/Riftbound platform that we consider part of
  // the community (Ottawa + Gatineau, Kanata, Carleton Place).
  ottawaStoreIds: [
    5131, // Trinity Hobby (Ottawa)
    735, // Carta Magica (Ottawa)
    1077, // Danireon Cards & Games (Ottawa)
    13898, // Hobbiesville Boutique (Ottawa)
    16413, // Nefarious Comics (Ottawa)
    18371, // Game Breakers Sports Cards (Ottawa)
    19387, // EB Games 1791 (Ottawa)
    13795, // Empire Trading (Ottawa)
    2570, // Imaginaire Ottawa
    3739, // Out of the Box Cards (Nepean)
    3530, // Nabema Collectibles (Orleans/Ottawa)
    4074, // Red Dragon CCG (Ottawa)
    64280, // Hobbiesville Blackwell (Ottawa)
    34222, // Vulcan Collectibles (Ottawa)
    5373, // Wizard's Tower (Ottawa)
    13901, // Multizone Comics and Games (Gatineau)
    15860, // Boutique FDB (Gatineau)
    40164, // EB Games 1865 (Gatineau)
    3268, // Mana Confluence Games (Gatineau)
    18460, // Toys on Fire (Kanata)
    52543, // GT Games Kanata
    2325, // GTgames.ca (Carleton Place)
    15683, // Treasures 'N' More (Carleton Place)
  ],

  // A player counts as "recently played in Ottawa" if their last Ottawa event
  // was within this many days. Non-squad members must meet this to appear on
  // the /ottawa leaderboard.
  ottawaRecentWindowDays: 30,

  // Non-squad players appearing in at least this many Ottawa events are part
  // of the community and eligible for the /ottawa leaderboard. Squad members
  // always appear regardless.
  ottawaCommunityMinEvents: 3,

  // Number of finished Ottawa events to process per job run.
  ottawaMaxEventsPerRun: 1,

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
  eloshowdownRefreshCron: '0 */6 * * *',

  // Events are only processed once they've been finished this long, giving
  // EloShowdown time to ingest the results.
  eloshowdownGraceHours: 12,

  // Events recorded with missing elo are rechecked at most this often...
  eloshowdownRecheckHours: 24,

  // ...and only while the event is younger than this many days.
  eloshowdownRecheckDays: 30,
} as const;
