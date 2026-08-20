import { readdirSync } from 'fs';
import { join } from 'path';

import { Client } from 'discord.js';
import { logger } from 'src/lib/logger';
import { BotEvent } from 'typings/event';

module.exports = (client: Client) => {
  const eventsDir = join(__dirname, '../events');

  readdirSync(eventsDir).forEach((file) => {
    if (!file.endsWith('.js') && !file.endsWith('.ts')) return;
    const loaded = require(`${eventsDir}/${file}`);
    const event: BotEvent = loaded.default ?? loaded.event ?? loaded;

    if (event.once) {
      client.once(event.name, event.execute);
    } else {
      client.on(event.name, event.execute);
    }
    logger.info(`Successfully loaded event ${event.name}`);
  });
};
