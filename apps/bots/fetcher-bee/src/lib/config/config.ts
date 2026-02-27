const isDevelopment = process.env.NODE_ENV === 'development';

export const Config = {
  // Add your bot configuration here
  // Example: API URLs, guild IDs, channel IDs, etc.
  devTeamIds: [] as string[],
  modTeamIds: [] as string[],
  adminTeamIds: [] as string[],

  // Development vs Production server/channel IDs
  testServerId: isDevelopment ? process.env.TEST_SERVER_ID : undefined,
  testChannelId: isDevelopment ? process.env.TEST_CHANNEL_ID : undefined,

  errorServerId: isDevelopment ? process.env.TEST_SERVER_ID : undefined,
  errorChannelId: isDevelopment ? process.env.TEST_CHANNEL_ID : undefined,

  // Add your production server/channel IDs here
  // mainServerId: 'your_main_server_id',
  // mainChannelId: 'your_main_channel_id',
};

export enum UserRole {
  REGULAR = 0,
  MODERATOR = 1,
  ADMIN = 2,
  BOT_OWNER = 3,
}

export const botEmojis = {
  // Add custom emojis here
  // success: '<:success:123456789>',
  // error: '<:error:123456789>',
};