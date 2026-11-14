import { CronJob } from 'cron';

import { Config } from 'src/lib/config/config';
import {
  processOttawaEvents,
  refreshStalePlayerElos,
} from 'src/lib/eloshowdown/service';
import { logger } from 'src/lib/logger';
import { syncRiftboundEvents } from 'src/lib/uvs/sync';

module.exports = async () => {
  if (process.env.NODE_ENV !== 'production') {
    logger.info('Cron handler loaded (skipping production jobs in dev)');
    return;
  }

  // Discover and ingest PlayRiftbound events/matches for the Ottawa area.
  new CronJob(Config.riftboundSyncCron, async () => {
    logger.info('Running Riftbound event sync');
    try {
      await syncRiftboundEvents();
    } catch (error) {
      logger.error({ error }, 'Riftbound event sync failed');
    }
  }).start();

  // Backfill / refresh elo for finished Ottawa events from the stored history.
  new CronJob(Config.eloshowdownEventCron, async () => {
    logger.info('Running Ottawa events elo job');
    try {
      await processOttawaEvents({ maxEvents: Config.ottawaMaxEventsPerRun });
    } catch (error) {
      logger.error({ error }, 'Ottawa events elo job failed');
    }
  }).start();

  // Keep tracked players' current_elo in sync with EloShowdown, which
  // recomputes elo over time.
  new CronJob(Config.eloshowdownRefreshCron, async () => {
    logger.info('Running stale elo history refresh');
    try {
      await refreshStalePlayerElos();
    } catch (error) {
      logger.error({ error }, 'Stale elo history refresh failed');
    }
  }).start();

  logger.info('Successfully started cron jobs');
};
