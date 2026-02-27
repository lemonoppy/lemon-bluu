import { ButtonInteraction, EmbedBuilder } from 'discord.js';
import { LeagueType } from 'src/db/portal/shared';

import { inviteLink } from './config/config';
import { checkRole } from './role';
import { Teams } from './teams';

const getTeamsByLeague = (leagueType: LeagueType) => {
  return Object.values(Teams).filter((team) => team.league === leagueType);
};

const excludedCommands = [
  'update-cache',
  'update-config',
  'update-schedule',
  'ia-tracker',
  'debug-perms',
  'link-backup',
  'show-backups',
  'unlink-backup'
]

export const createTeamListEmbed = (leagueType: LeagueType) => {
  const teams = getTeamsByLeague(leagueType);
  const embed = new EmbedBuilder()
    .setTitle(`${leagueType} Teams`)
    .setDescription('List of teams and their abbreviations')
    .setColor('#0099ff');

  teams.forEach((team) => {
    embed.addFields({
      name: team.location + ' ' + team.name,
      value: `Abbr: ${team.abbreviation}`,
      inline: true,
    });
  });

  return embed;
};

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

  helpEmbed.addFields({
    name: 'Invite the bot',
    value: `[Click here to invite the bot to your server](${inviteLink})`,
    inline: false,
  });

  return helpEmbed;
};

const takoyakiVersion = '0.10.0'
export const createAboutEmbed = async () => {
  return new EmbedBuilder()
    .setTitle('🍋 🐙 Takoyaki v'+takoyakiVersion)
    .setDescription('Latest Version of Takoyaki: 5/29/25')
    .addFields({
      name: 'Feedback',
      value:
        'Fill out this form to provide feedback, suggestions, or bug reports: [Form Link](https://forms.gle/6Qn3dndjHxo5f23H7)',
      inline: false,
    })
    .addFields({
      name: 'Takoyaki Updates: v'+takoyakiVersion,
      value:
        'Latest Updates\n' +
        '• Added /league-schedule command\n' +
        '• Added /draftsheets command\n' +
        '• Added /retire command\n' +
        '• Added /firstrounders command\n' +
        '• Added /ia-tracker command for DSFL HO\n',
      inline: false,
    });
};
