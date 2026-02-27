const isDevelopment = process.env.NODE_ENV === 'development';

export const pageSizes = {
  global: 25,
  tpeRank: 15,
  limited: 10,
};

export const inviteLink =
  'https://discord.com/oauth2/authorize?client_id=1226241466871840818&permissions=414464723008&integration_type=0&scope=bot+applications.commands';

export const PORTAL_URLS = {
  BASE: 'https://portal.sim-football.com',
  player: (pid: number) => `https://portal.sim-football.com/player/${pid}`,
  user: (uid: number) => `https://portal.sim-football.com/user/${uid}`,
  api: {
    season: 'https://portal.sim-football.com/api/isfl/v1/season',
  },
} as const;

export const TIMEOUTS = {
  BUTTON_COLLECTOR: 60_000, // 1 minute
  CACHE_REFRESH: 30 * 60 * 1000, // 30 minutes
} as const;

export const Config = {
  portalApiUrl: `https://portal.sim-football.com/api/isfl/v1`,
  googleSheetUrl: (sheetId: string) =>
    `https://docs.google.com/spreadsheets/d/${sheetId}`,
  devTeamIds: (process.env.DEV_TEAM_IDS ?? '').split(',').filter(Boolean),
  dsflGMIDs: (process.env.GM_IDS ?? '').split(',').filter(Boolean),
  indexUpdateServerId: isDevelopment
    ? process.env.TEST_SERVER_ID
    : process.env.UPDATE_SERVER_ID,
  indexUpdateChannelId: isDevelopment
    ? process.env.TEST_CHANNEL_ID
    : process.env.UPDATE_CHANNEL_ID,
  botErrorChannelId: process.env.BOT_ERROR_CHANNEL_ID,
  botCDNChannelId: process.env.CDN_CHANNEL_ID,
};

export enum UserRole {
  REGULAR = 0,
  SHEET_UPDATER = 1,
  SERVER_ADMIN = 2,
  BOT_OWNERS = 3,
}

export const botEmojis = {}