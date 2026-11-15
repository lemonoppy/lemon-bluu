import { readdirSync } from 'fs';
import { join } from 'path';

import { Client, Collection, GatewayIntentBits } from 'discord.js';
import 'dotenv/config';

import { Config } from 'src/lib/config/config';
import { logger } from 'src/lib/logger';
import { SlashCommand } from 'typings/command';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection<string, SlashCommand>();
client.cooldowns = new Collection<string, number>();

const handlersDir = join(__dirname, './handlers');

const main = async () => {
  if (!Config.token) {
    logger.error(
      `No bot token configured for ${Config.isDevelopment ? 'development' : 'production'} environment. Check your .env file.`,
    );
    process.exit(1);
  }

  // Await handlers so the Cron handler's initial data load finishes before login.
  await Promise.all(
    readdirSync(handlersDir)
      .filter((handler) => handler.endsWith('.js') || handler.endsWith('.ts'))
      .map((handler) => require(`${handlersDir}/${handler}`)(client)),
  );

  await client.login(Config.token).catch((error) => {
    logger.error(error, 'Failed to log in');
    process.exit(1);
  });
};

main().catch((error) => {
  logger.error(error, 'Startup failed');
  process.exit(1);
});
