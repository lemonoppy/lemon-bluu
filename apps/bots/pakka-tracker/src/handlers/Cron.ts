import { CronJob } from 'cron';

import { Config } from 'src/lib/config/config';
import { processOttawaEvents } from 'src/lib/eloshowdown/service';
import { logger } from 'src/lib/logger';

module.exports = async () => {
  if (process.env.NODE_ENV !== 'production') {
    logger.info('Cron handler loaded (skipping production jobs in dev)');
    return;
  }

  // Backfill / refresh Ottawa event results daily.
  new CronJob('0 9 * * *', async () => {
    logger.info('Running daily Ottawa events job');
    await processOttawaEvents({ maxEvents: Config.ottawaMaxEventsPerRun });
  }).start();

  logger.info('Successfully started cron jobs');
};
