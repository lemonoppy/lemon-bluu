import { ButtonInteraction, EmbedBuilder } from 'discord.js';

import { checkRole } from './role';

const excludedCommands: string[] = [
  // Add command names here that should be hidden from help
];

export const createMainHelpEmbed = async (interaction: ButtonInteraction) => {
  const client = interaction.client;

  const helpEmbed = new EmbedBuilder()
    .setTitle('Available Commands')
    .setDescription('Here are the commands you can use:')
    .setColor('#0099ff');

  for (const [, command] of client.commands) {
    const minRole = command.minRole || 0;

    const hasPermission = await checkRole(interaction.member, minRole);
    if (hasPermission) {
      if (!excludedCommands.includes(command.command.name)) {
        helpEmbed.addFields({
          name: `/${command.command.name}`,
          value: command.command.description || 'No description available.',
          inline: false,
        });
      }
    }
  }

  return helpEmbed;
};

export const createAboutEmbed = async () => {
  return new EmbedBuilder()
    .setTitle('🤖 Discord Bot Template')
    .setDescription('A Discord bot built with Discord.js and TypeScript')
    .addFields({
      name: 'Features',
      value:
        '• Command handling system\n' +
        '• Event handling\n' +
        '• Role-based permissions\n' +
        '• Help command with buttons\n' +
        '• Environment-based configuration',
      inline: false,
    });
};