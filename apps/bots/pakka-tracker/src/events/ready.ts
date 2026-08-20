import { Client, Events } from 'discord.js';

import { logger } from 'src/lib/logger';
import { BotEvent } from 'typings/event';

export const event = {
  name: Events.ClientReady,
  once: true,
  execute: (client: Client) => {
    logger.info(`Ready! Logged in as ${client.user?.tag}`);
  },
} satisfies BotEvent<Events.ClientReady>;
