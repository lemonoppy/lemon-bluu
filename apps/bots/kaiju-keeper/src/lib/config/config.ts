const isDevelopment = process.env.NODE_ENV === 'development';

export const pageSizes = {
  global: 25,
  tpeRank: 15,
  limited: 10,
};

export const inviteLink =
  'https://discord.com/oauth2/authorize?client_id=1384689854566240406';

// Team configuration interface
export interface TeamServerConfig {
  serverIds: string[];
  webhook: string;
}

// Team configuration options
export const TeamConfig = {
  // Method 1: Single search key (team name, abbreviation, or ID)
  teamSearchKey: process.env.TEAM_SEARCH_KEY || 'osaka', // Searches team name, abbreviation, or ID
  
  // Method 2: Team-based mapping with server IDs and webhooks
  // lemonoppy-cdn server: 1121495688681889927
  guildTeamMap: {
    // Team abbreviation -> { serverIds, webhook }
    'osk': {
      serverIds: ['572974643393200128'],
      webhook: process.env.WEBHOOK_OSK || ''
    },
    'nola': {
      serverIds: ['332292285788192788'],
      webhook: process.env.WEBHOOK_NOLA || ''
    },
    'bal': {
      serverIds: ['343463948131106816'],
      webhook: process.env.WEBHOOK_BAL || ''
    },
    'bfb': {
      serverIds: ['748663054778105866', '1121495688681889927'],
      webhook: process.env.WEBHOOK_BFB || ''
    }
    // Add more teams as needed
  } as Record<string, TeamServerConfig>,
  
  // Helper function to get team from server ID
  getTeamFromServerId: (serverId: string): string | null => {
    for (const [teamAbbr, config] of Object.entries(TeamConfig.guildTeamMap)) {
      if (config.serverIds.includes(serverId)) {
        return teamAbbr;
      }
    }
    return null;
  },
  
  // Helper function to get webhook from team
  getWebhookFromTeam: (teamAbbr: string): string | null => {
    const config = TeamConfig.guildTeamMap[teamAbbr.toLowerCase()];
    return config?.webhook || null;
  },
  
  // Helper function to get all team abbreviations
  getAllTeams: (): string[] => {
    return Object.keys(TeamConfig.guildTeamMap);
  },
  
  // Fallback database prefix if team lookup fails
  fallbackDbPrefix: process.env.DB_TABLE_PREFIX || 'kaiju',
};

// Validate team configuration
const validateTeamConfig = () => {
  if (!TeamConfig.teamSearchKey) {
    throw new Error('TEAM_SEARCH_KEY must be provided');
  }
  
  if (TeamConfig.fallbackDbPrefix && !TeamConfig.fallbackDbPrefix.match(/^[a-z][a-z0-9_]*$/)) {
    throw new Error('DB_TABLE_PREFIX must be lowercase letters, numbers, and underscores only');
  }
};

// Run validation on module load
validateTeamConfig();

export const Config = {
  portalApiUrl: `https://portal.sim-football.com/api/isfl/v1`,
  googleSheetUrl: (sheetId: string) =>
    `https://docs.google.com/spreadsheets/d/${sheetId}`,
  devTeamIds: (process.env.DEV_TEAM_IDS ?? '').split(',').filter(Boolean),
  teamGMs: (process.env.GM_IDS ?? '').split(',').filter(Boolean),
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
  SERVER_ADMIN = 1,
  BOT_OWNERS = 2,
}

export const botEmojis = {}