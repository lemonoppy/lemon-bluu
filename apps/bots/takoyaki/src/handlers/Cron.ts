import { CronJob } from 'cron';
import { Client, TextBasedChannel } from 'discord.js';
import { FantasyClient } from 'src/db/fantasy/FantasyClient';
import { PortalClient } from 'src/db/portal/PortalClient';
import { SheetsClient } from 'src/db/sheets/SheetsClient';
import { StatsClient } from 'src/db/stats/StatsClient';
import { Config } from 'src/lib/config/config';
import { logger } from 'src/lib/logger';
import { postTPEReminders } from 'src/lib/tpeTasks';

const CRON_STARTUP_FLAG = Symbol.for('@lemon-bluu/takoyaki/cronJobsStarted');

/**
 * Wrapper for cron jobs that handles error reporting and success notifications
 */
async function withCronErrorHandling(
  taskName: string,
  task: () => Promise<void>,
  errorChannel: TextBasedChannel | undefined
) {
  try {
    logger.info(`Starting ${taskName}...`);
    await task();
    logger.info(`${taskName} completed`);

    // Post success message to error channel
    if (errorChannel?.isTextBased() && 'send' in errorChannel) {
      await errorChannel.send({
        content: `✅ **${taskName} Successful**\n` +
                 `Completed at: <t:${Math.floor(Date.now() / 1000)}:F>`,
      });
    }
  } catch (error) {
    logger.error(`${taskName} failed:`, error);

    // Post error message to error channel
    if (errorChannel?.isTextBased() && 'send' in errorChannel) {
      await errorChannel.send({
        content: `❌ **${taskName} Failed**\n` +
                 `Failed at: <t:${Math.floor(Date.now() / 1000)}:F>\n` +
                 `Error: \`${error instanceof Error ? error.message : String(error)}\``,
      });
    }
  }
}

// Update this file to add cron jobs as well as initial data for the bot.
module.exports = async (client: Client) => {
  if ((globalThis as any)[CRON_STARTUP_FLAG]) {
    logger.warn('Cron handler already initialized; skipping duplicate registration.');
    return;
  }
  (globalThis as any)[CRON_STARTUP_FLAG] = true;

  await Promise.all([
    PortalClient.reload(),
    FantasyClient.reload(),
  ]);
  await StatsClient.reload();

  const isProduction = process.env.NODE_ENV === 'production';
  const cronJobs: CronJob[] = [];

  // Check for errors and reload if needed every 30 minutes (production only)
  if (isProduction) {
    cronJobs.push(
      new CronJob('0 */30 * * *', async () => {
        await PortalClient.reloadIfError();
      }, null, false),
    );

    // Full reload every day at midnight (00:00) (production only)
    cronJobs.push(
      new CronJob('0 0 * * *', async () => {
        const errorChannel = Config.botErrorChannelId ? client.channels.cache.get(Config.botErrorChannelId) as TextBasedChannel | undefined : undefined;
        await withCronErrorHandling(
          'Daily Cache Reload',
          async () => {
            await Promise.all([
              PortalClient.reload(),
              FantasyClient.reload(),
            ]);
            await StatsClient.reload();
          },
          errorChannel
        );
      }, null, false),
    );
  }

  // Daily TPE Task TODO every day at 6 PM
  cronJobs.push(
    new CronJob('0 18 * * *', async () => {
      const errorChannel = Config.botErrorChannelId ? client.channels.cache.get(Config.botErrorChannelId) as TextBasedChannel | undefined : undefined;
      await withCronErrorHandling(
        'Daily TPE TODO Refresh',
        async () => await postTPEReminders(),
        errorChannel
      );
    }, null, false),
  );

  // Daily TPE Tracker Refresh every day at 8 AM
  cronJobs.push(
    new CronJob('0 8 * * *', async () => {
      const errorChannel = Config.botErrorChannelId ? client.channels.cache.get(Config.botErrorChannelId) as TextBasedChannel | undefined : undefined;
      await withCronErrorHandling(
        'Daily TPE Tracker Refresh',
        async () => await SheetsClient.refreshTPETrackerViaWebApp('daily'),
        errorChannel
      );
    }, null, false),
  );

  // Weekly TPE Tracker Refresh every Monday at 8 AM
  cronJobs.push(
    new CronJob('0 8 * * 1', async () => {
      const errorChannel = Config.botErrorChannelId ? client.channels.cache.get(Config.botErrorChannelId) as TextBasedChannel | undefined : undefined;
      await withCronErrorHandling(
        'Weekly TPE Tracker Refresh',
        async () => await SheetsClient.refreshTPETrackerViaWebApp('weekly'),
        errorChannel
      );
    }, null, false),
  );

  // Weekly Player Assignment Refresh every Monday at 9 AM
  cronJobs.push(
    new CronJob('0 9 * * 1', async () => {
      const errorChannel = Config.botErrorChannelId ? client.channels.cache.get(Config.botErrorChannelId) as TextBasedChannel | undefined : undefined;
      await withCronErrorHandling(
        'Weekly Player Assignment Refresh',
        async () => await PortalClient.updatePlayerAssignment(),
        errorChannel
      );
    }, null, false),
  );

  cronJobs.forEach((job) => job.start());

  logger.info('✔ Successfully loaded initial data and started cron jobs.');
};
