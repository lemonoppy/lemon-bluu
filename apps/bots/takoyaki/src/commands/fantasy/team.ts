import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { FantasyClient } from 'src/db/fantasy/FantasyClient';
import { users } from 'src/db/users';
import { BaseEmbed } from 'src/lib/embed';
import { withErrorHandling } from 'src/lib/helpers/command';
import { getGroupDisplayName } from 'src/lib/helpers/fantasyHelpers';
import { SlashCommand } from 'typings/command';
import { FantasyRosteredPlayer } from 'typings/fantasy';

export type FantasyUser = {
  username: string;
  group: number | string;
  score: number;
  rank: number;
  overall: number;
}

const execute = async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply();

  const user = await users.get(interaction.user.id);
  const target = interaction.options.getString('username');
  const name = target || user?.forumName;

  if (!name || !user?.forumName) {
    await interaction.editReply({
      content: 'You need to be input a user or be registered to use this command. Use the /store command to register.',
    });
    return;
  }

  const rosteredPlayers: FantasyRosteredPlayer[] = await FantasyClient.getRosteredPlayers();
  const roster = rosteredPlayers.filter((player) => player.username === name);

  const fantasyUser: FantasyUser[] = await FantasyClient.getUsers();
  const fantasyUserInfo = fantasyUser.find((u) => u.username.toLowerCase() === name.toLowerCase());

  if (!roster.length || !fantasyUserInfo) {
    await interaction.editReply({
      content: 'No fantasy team found for that user. Please check your spelling and try again.',
    });
    return;
  }

  const buildEmbedFields = (roster: FantasyRosteredPlayer[]) => {
    const embeds: any[] = [{
      name: `Total Points: ${fantasyUserInfo.score}`,
      value: `${getGroupDisplayName(fantasyUserInfo.group)}: #${fantasyUserInfo.rank}, Overall: #${fantasyUserInfo.overall}`,
      inline: false
    }];

    roster.forEach((player) => {
      embeds.push({
        name: `${player.name} (${player.position})`,
        value: `**Score: ${player.score}**\nRostered: W${player.start} ${player.end ? `- W${player.end}` : ''}`,
        inline: true
      })
    })

    return embeds
  }

  await interaction.editReply({
    embeds: [
      BaseEmbed(interaction, {
      })
        .setTitle(`${name}'s Fantasy Roster`)
        .addFields(buildEmbedFields(roster))
    ],
  });
  return;
}

export default {
  command: new SlashCommandBuilder()
    .setName('ff-team')
    .setDescription('Look up an ISFL fantasy team')
    .addStringOption((option) =>
      option
        .setName('username')
        .setDescription(
          'The user\'s who\'s team to retrieve. If not provided, will use your stored team.',
        )
        .setRequired(false),
    ),
  execute: withErrorHandling(execute, 'Failed to retrieve team.'),
} satisfies SlashCommand;
