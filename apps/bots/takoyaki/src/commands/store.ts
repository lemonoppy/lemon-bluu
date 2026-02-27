import { SlashCommandBuilder } from 'discord.js';
import { getUserByFuzzy } from 'src/db/portal';
import { PortalClient } from 'src/db/portal/PortalClient';
import { UserInfo, users } from 'src/db/users';
import { BaseEmbed } from 'src/lib/embed';
import { findTeamByName } from 'src/lib/teams';
import { SlashCommand } from 'typings/command';

export default {
  command: new SlashCommandBuilder()
    .setName('store')
    .addStringOption((option) =>
      option
        .setName('username')
        .setDescription('Your username on the forum.')
        .setRequired(true),
    )
    .setDescription('Store user info in the database.'),
  execute: async (interaction) => {
    await interaction.deferReply();
    const target = interaction.options.getString('username', true);

    const isOverwritingStoredInfo = await users.has(interaction.user.id);
    const user = await getUserByFuzzy(target);

    if (!user) {
      await interaction.editReply({
        content:
          'Could not find user with that username. Please check your spelling and try again.',
      });
      return;
    }

    const players = await PortalClient.getActivePlayers();
    const player = players.find((p) => p.uid === user.uid);

    let team;

    if (player?.currentLeague === 'ISFL' && player?.isflTeam)
      team = findTeamByName(player?.isflTeam);

    if (player?.currentLeague === 'DSFL' && player?.dsflTeam)
      team = findTeamByName(player?.dsflTeam);

    const userInfo: UserInfo = {
      discordId: interaction.user.id,
      forumName: target,
      forumUserId: user.uid,
      pid: player?.pid ?? 0,
      team: team?.abbreviation ?? undefined,
    };

    await users.set(interaction.user.id, userInfo);

    await interaction.editReply({
      embeds: [
        BaseEmbed(interaction, { teamColor: team ? team.colors.primary : undefined })
          .setDescription(
            isOverwritingStoredInfo
              ? `Updated user info for ${interaction.user.toString()}.`
              : `Stored user info for ${interaction.user.toString()}.`,
          )
          .addFields(
            { name: 'User', value: user.username },
            { name: 'Player', value: player ?
                ('S' + player.draftSeason + ' ' + player.firstName + ' ' + player.lastName + ' (' + player.position + ')') :
                '-'
            },
            { name: 'Team', value: team ? (team.location + ' ' + team.name) : '-' },
          ),
      ],
    });
  },
} satisfies SlashCommand;
