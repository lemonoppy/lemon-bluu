const isDevelopment = process.env.NODE_ENV === 'development';

export const Config = {
  token: isDevelopment ? process.env.DEV_TOKEN : process.env.TOKEN,
  clientId: isDevelopment ? process.env.DEV_CLIENT_ID : process.env.CLIENT_ID,
  isDevelopment,

  uvsApiBaseUrl:
    'https://api.cloudflare.riftbound.uvsgames.com/hydraproxy/api/v2',
} as const;
