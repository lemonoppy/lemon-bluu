import {
  ButtonInteraction,
  InteractionEditReplyOptions,
  MessagePayload,
  SlashCommandBuilder,
} from 'discord.js';
import { createButtonCollector } from 'src/lib/helpers/buttonCollector';
import {
  getMainHelpButtons,
  handleHelpButtons,
} from 'src/lib/helpers/buttons/helpButton';
import { logger } from 'src/lib/logger';
import { SlashCommand } from 'typings/command';

export default {
  command: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Display all available commands'),

  execute: async (interaction) => {
    const row = getMainHelpButtons();

    const reply = await interaction.reply({
      content: 'Loading help information...',
      components: [row],
      fetchReply: true,
    });

    const fakeButtonInteraction = {
      customId: 'help_main',
      client: interaction.client,
      user: interaction.user,
      member: interaction.member,
      update: async (
        data: string | MessagePayload | InteractionEditReplyOptions,
      ) => {
        return await interaction.editReply(data);
      },
    } as unknown as ButtonInteraction;

    await handleHelpButtons(fakeButtonInteraction);

    createButtonCollector(
      reply,
      interaction.user.id,
      async (i: ButtonInteraction) => {
        await handleHelpButtons(i);
      },
      {
        onEnd: async () => {
          try {
            await interaction.editReply({
              components: [],
            });
          } catch (error) {
            logger.error(error);
          }
        }
      }
    );
  },
} satisfies SlashCommand;
