import { logger } from 'src/lib/logger';

// Update this file to add cron jobs and initial data loading.
// Import { CronJob } from 'cron'; when you need scheduled tasks.
module.exports = async () => {
  // Load initial data here (e.g. warm up a cache, fetch from an API)
  await Promise.all([
    // myClient.reload(),
  ]);

  if (process.env.NODE_ENV !== 'production') {
    logger.info('✔ Cron handler loaded (skipping production jobs in dev)');
    return;
  }

  // Add production cron jobs here, e.g.:
  // new CronJob('0 */6 * * *', async () => {
  //   await myClient.reload();
  // }).start();

  logger.info('✔ Successfully started cron jobs');
};
