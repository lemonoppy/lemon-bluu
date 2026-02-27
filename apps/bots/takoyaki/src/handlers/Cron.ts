import { CronJob } from 'cron';
import { Client, TextBasedChannel } from 'discord.js';
import { FantasyClient } from 'src/db/fantasy/FantasyClient';
import { PortalClient } from 'src/db/portal/PortalClient';
import { SheetsClient } from 'src/db/sheets/SheetsClient';
import { Config } from 'src/lib/config/config';
import { logger } from 'src/lib/logger';

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
  await Promise.all([
    PortalClient.reload(),
    FantasyClient.reload(),
  ]);

  const isProduction = process.env.NODE_ENV === 'production';

  // Check for errors and reload if needed every 30 minutes (production only)
  if (isProduction) {
    new CronJob('0 */30 * * *', async () => {
      await PortalClient.reloadIfError();
    }).start();

    // Full reload every day at midnight (00:00) (production only)
    new CronJob('0 0 * * *', async () => {
      const errorChannel = client.channels.cache.get(Config.botErrorChannelId) as TextBasedChannel | undefined;
      await withCronErrorHandling(
        'Daily Cache Reload',
        async () => {
          await Promise.all([
            PortalClient.reload(),
            FantasyClient.reload(),
          ]);
        },
        errorChannel
      );
    }).start();
  }

  // Daily TPE Tracker Refresh every day at 8 AM
  new CronJob('0 8 * * *', async () => {
    const errorChannel = client.channels.cache.get(Config.botErrorChannelId) as TextBasedChannel | undefined;
    await withCronErrorHandling(
      'Daily TPE Tracker Refresh',
      async () => await SheetsClient.refreshTPETrackerViaWebApp('daily'),
      errorChannel
    );
  }).start();

  // Weekly TPE Tracker Refresh every Monday at 8 AM
  new CronJob('0 8 * * 1', async () => {
    const errorChannel = client.channels.cache.get(Config.botErrorChannelId) as TextBasedChannel | undefined;
    await withCronErrorHandling(
      'Weekly TPE Tracker Refresh',
      async () => await SheetsClient.refreshTPETrackerViaWebApp('weekly'),
      errorChannel
    );
  }).start();

  logger.info('✔ Successfully loaded initial data and started cron jobs.');
};
