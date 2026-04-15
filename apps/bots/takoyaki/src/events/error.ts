import { Events } from 'discord.js';
import { logger } from 'src/lib/logger';
import { BotEvent } from 'typings/event';

export const event = {
  name: Events.Error,
  execute: (m) => logger.error(m),
} satisfies BotEvent;
