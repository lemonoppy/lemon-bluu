import { readdirSync } from 'fs';
import { join } from 'path';

import { Client, Collection, GatewayIntentBits } from 'discord.js';
import 'dotenv/config';

import { Config } from 'src/lib/config/config';
import { logger } from 'src/lib/logger';
import { SlashCommand } from 'typings/command';

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.commands = new Collection<string, SlashCommand>();
client.cooldowns = new Collection<string, number>();

const handlersDir = join(__dirname, './handlers');
readdirSync(handlersDir).forEach((handler) => {
  if (!handler.endsWith('.js') && !handler.endsWith('.ts')) return;

  require(`${handlersDir}/${handler}`)(client);
});

if (!Config.token) {
  logger.error(
    `No bot token configured for ${Config.isDevelopment ? 'development' : 'production'} environment. Check your .env file.`,
  );
  process.exit(1);
}

client
  .login(Config.token)
  .catch((error) => {
    logger.error(error, 'Failed to log in');
    process.exit(1);
  });
