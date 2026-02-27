import { ButtonInteraction, ComponentType, InteractionResponse, Message } from 'discord.js';
import { TIMEOUTS } from 'src/lib/config/config';
import { logger } from 'src/lib/logger';

/**
 * Creates a button collector with standard behavior
 * - Validates user can interact
 * - Clears buttons on timeout
 * - Uses standard timeout duration
 */
export const createButtonCollector = (
  message: Message | InteractionResponse,
  originalUserId: string,
  onCollect: (interaction: ButtonInteraction) => Promise<void>,
  options: {
    timeout?: number;
    onEnd?: () => Promise<void>;
  } = {}
) => {
  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: options.timeout ?? TIMEOUTS.BUTTON_COLLECTOR,
  });

  collector.on('collect', async (i: ButtonInteraction) => {
    // Only allow the original user to interact
    if (i.user.id !== originalUserId) {
      await i
        .reply({
          content: 'Only the command user can use these buttons.',
          ephemeral: true,
        })
        .catch((error) => {
          logger.error(error);
        });
      return;
    }

    await onCollect(i);
  });

  collector.on('end', async () => {
    if (options.onEnd) {
      await options.onEnd();
    }
  });

  return collector;
};
