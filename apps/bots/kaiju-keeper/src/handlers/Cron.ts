import { CronJob } from 'cron';
import { PortalClient } from 'src/db/PortalClient';
import { logger } from 'src/lib/logger';

// Update this file to add cron jobs as well as initial data for the bot.
module.exports = async () => {
  await PortalClient.reload();

  if (process.env.NODE_ENV !== 'production') {
    logger.info('✔ Successfully loaded initial data');
    return;
  }

  // Refresh portal data (players, current season) once a day at midnight
  new CronJob('0 0 * * *', async () => {
    logger.info('Refreshing portal cache...');
    await PortalClient.reload();
    logger.info('Portal cache refreshed');
  }).start();

  logger.info('✔ Successfully loaded initial data and started cron jobs.');
};
