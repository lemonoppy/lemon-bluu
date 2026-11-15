const isDevelopment = process.env.NODE_ENV === 'development';

const idList = (value: string | undefined) =>
  (value ?? '').split(',').filter(Boolean);

export const Config = {
  token: isDevelopment ? process.env.DEV_TOKEN : process.env.TOKEN,
  clientId: isDevelopment ? process.env.DEV_CLIENT_ID : process.env.CLIENT_ID,
  isDevelopment,

  // Development vs production server/channel IDs
  testServerId: isDevelopment ? process.env.TEST_SERVER_ID : undefined,
  testChannelId: isDevelopment ? process.env.TEST_CHANNEL_ID : undefined,
  errorChannelId: process.env.ERROR_CHANNEL_ID,

  // Role membership lists — comma-separated Discord user IDs
  devTeamIds: idList(process.env.DEV_TEAM_IDS),
  modTeamIds: idList(process.env.MOD_TEAM_IDS),
  adminTeamIds: idList(process.env.ADMIN_TEAM_IDS),

  // Add your bot-specific config below, e.g.:
  // mainServerId: process.env.MAIN_SERVER_ID,
};

export enum UserRole {
  REGULAR = 0,
  MODERATOR = 1,
  ADMIN = 2,
  BOT_OWNER = 3,
}

export const botEmojis = {
  // Add custom guild emojis here, e.g.:
  // success: '<:success:123456789012345678>',
  // error: '<:error:123456789012345678>',
};
