import { Events } from 'discord.js';
import { logger } from 'src/lib/logger';
import { BotEvent } from 'typings/event';

export const event = {
  name: Events.Debug,
  execute: (m) => logger.debug(m),
} satisfies BotEvent;
