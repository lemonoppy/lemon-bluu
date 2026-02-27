import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
} from 'discord.js';

import { createAboutEmbed, createMainHelpEmbed } from 'src/lib/help';

export const getMainHelpButtons = () => {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('help_main')
      .setLabel('Commands')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('help_about')
      .setLabel('About')
      .setStyle(ButtonStyle.Secondary),
  );
};

export const handleHelpButtons = async (interaction: ButtonInteraction) => {
  const customId = interaction.customId;

  switch (customId) {
    case 'help_main':
      const helpEmbed = await createMainHelpEmbed(interaction);
      await interaction.update({
        embeds: [helpEmbed],
        components: [getMainHelpButtons()],
      });
      break;

    case 'help_about':
      const aboutEmbed = await createAboutEmbed();
      await interaction.update({
        embeds: [aboutEmbed],
        components: [getMainHelpButtons()],
      });
      break;

    default:
      break;
  }
};