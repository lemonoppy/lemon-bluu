import { CronJob } from 'cron';
import { logger } from 'src/lib/logger';

// Update this file to add cron jobs as well as initial data for the bot.
module.exports = async () => {
  await Promise.all([
    // PortalClient.reload(),
  ]);

  if (process.env.NODE_ENV !== 'production') {
    logger.info('✔ Successfully loaded initial data');
    return;
  }

  new CronJob('0 */30 * * *', async () => {
    // PortalClient.reloadIfError();
  }).start();

  logger.info('✔ Successfully loaded initial data and started cron jobs.');
};
