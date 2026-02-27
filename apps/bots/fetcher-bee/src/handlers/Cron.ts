import { CronJob } from 'cron';
import { AttachmentBuilder, Client, TextChannel } from 'discord.js';
import { getRandomCube, trackCubeSelection } from 'src/lib/cubes';
import { processPackImage } from 'src/lib/imageProcessor';
import { logger } from 'src/lib/logger';
import { Cube } from 'typings/cube';

module.exports = async (client: Client) => {
  // Load initial data
  logger.info('✔ Successfully loaded initial data');

  if (process.env.NODE_ENV !== 'production') {
    logger.info('Development mode: Cron jobs will still be started for testing');
  }
  /**
   * Schedule a follow-up pack image with a greyed out card
   * @param cube The cube to generate follow-up for
   * @param cubeKey The cube key
   * @param channel The Discord channel to post to
   * @param delayMs Delay in milliseconds before posting follow-up
   */
  const scheduleFollowUpImage = (
    cube: Cube,
    cubeKey: string,
    channel: TextChannel,
    delayMs: number = 3 * 60 * 1000 // 3 minutes
  ) => {
    setTimeout(async () => {
      try {
        logger.info(`Generating P1P2 image for ${cubeKey}...`);

        // Generate a new random integer for the follow-up pack image
        const followUpRandomInt = Math.floor(Math.random() * 1000000);
        const followUpImageUrl = `https://www.cubecobra.com/cube/samplepackimage/${cube.id}/${followUpRandomInt}.png`;

        // Process the image to grey out a random card
        const processedImageBuffer = await processPackImage(followUpImageUrl);

        // Create attachment
        const attachment = new AttachmentBuilder(processedImageBuffer, {
          name: `${cube.setCode}_follow_up.png`
        });

        await channel.send({
          content: `**🐝 Fetcher Bee passes you a Pack!**\n*One card has been picked...*`,
          files: [attachment]
        });

        logger.info(`Posted follow-up image for ${cubeKey}`);
      } catch (error) {
        logger.error(`Error posting follow-up image for ${cubeKey}:`, error);
      }
    }, delayMs);
  };

  new CronJob('30 12 * * *', async () => {
    try {
      logger.info('Starting daily rp1p1 posting...');

      const channelId = process.env.RP1P1_CHANNEL_ID;
      if (!channelId) {
        logger.warn('RP1P1_CHANNEL_ID not configured, skipping hourly rp1p1');
        return;
      }

      const channel = client.channels.cache.get(channelId) as TextChannel;
      if (!channel) {
        logger.error(`Channel with ID ${channelId} not found`);
        return;
      }

      const { key, cube } = getRandomCube(true);

      // Track the cube selection with bot user info
      await trackCubeSelection(
        key,
        client.user?.id || 'bot',
        'Fetcher Bee'
      );

      // Generate a random integer for the pack image
      const randomInt = Math.floor(Math.random() * 1000000);

      // Construct the CubeCobra sample pack image URL
      const imageUrl = `https://www.cubecobra.com/cube/samplepackimage/${cube.id}/${randomInt}.png`;

      await channel.send({
        content: `**🐝 Fetcher Bee sends a Gift**\n**[[${cube.setCode}] ${key}](<https://www.cubecobra.com/cube/overview/${cube.id}>)** - ${cube.description}\n${imageUrl}`,
      });

      logger.info(`Posted hourly rp1p1 for ${key} to channel ${channelId}`);

      // Schedule follow-up image only for cubes with default layout
      if (cube.hasDefaultLayout) {
        scheduleFollowUpImage(cube, key, channel);
        logger.info(`Scheduled follow-up image for ${key} in 3 minutes`);
      } else {
        logger.info(`Skipping follow-up image for ${key} (non-default layout)`);
      }

    } catch (error) {
      logger.error('Error posting hourly rp1p1:', error);
    }
  }).start();

  logger.info('✔ Successfully loaded initial data and started cron jobs.');
};