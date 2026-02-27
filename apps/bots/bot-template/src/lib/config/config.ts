const isDevelopment = process.env.NODE_ENV === 'development';

export const Config = {
  // Development vs production server/channel IDs
  testServerId: isDevelopment ? process.env.TEST_SERVER_ID : undefined,
  testChannelId: isDevelopment ? process.env.TEST_CHANNEL_ID : undefined,
  errorChannelId: process.env.ERROR_CHANNEL_ID,

  // Role membership lists — populate from env or hardcode
  devTeamIds: [] as string[],
  modTeamIds: [] as string[],
  adminTeamIds: [] as string[],

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
