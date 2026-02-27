import { SlashCommandBuilder } from 'discord.js';
import { PortalClient } from 'src/db/PortalClient';
import { BaseEmbed } from 'src/lib/embed';
import { shortenPosition } from 'src/lib/helpers/playerHelpers';
import { logger } from 'src/lib/logger';

import { playerSorter } from 'src/lib/playerSorter';
import { getTeamForGuild } from 'src/lib/teamInfo';
import { SlashCommand } from 'typings/command';
import { PortalPlayer } from 'typings/portal';

export default {
  command: new SlashCommandBuilder()
    .setName('roster')
    .setDescription('Get current team roster'),
  execute: async (interaction) => {
    try {
      await interaction.deferReply();

      const currentTeam = getTeamForGuild(interaction.guildId);

      const players = await PortalClient.getPlayers();
      const ISFLTeam = playerSorter(players.filter(player => player.currentLeague === 'ISFL' && player.isflTeam === currentTeam.abbreviation));
      const DSFLTeam = playerSorter(players.filter(player => player.currentLeague === 'DSFL' && player.isflTeam === currentTeam.abbreviation));


      const rosterEmbed = BaseEmbed(interaction, {
        teamColor: currentTeam.colors.primary,
        logoUrl: currentTeam.logoUrl,
      }).setTitle(`${currentTeam.location} ${currentTeam.name} Roster`);

      const averageTPE =
        ISFLTeam.reduce((acc, player) => acc + player.totalTPE, 0) /
        ISFLTeam.length;
      const averageOffense =
        ISFLTeam
          .filter(
            (player) =>
              player.position === 'Quarterback' ||
              player.position === 'Running Back' ||
              player.position === 'Wide Receiver' ||
              player.position === 'Tight End' ||
              player.position === 'Offensive Lineman',
          )
          .reduce((acc, player) => acc + player.totalTPE, 0) /
        ISFLTeam.filter(
          (player) =>
            player.position === 'Quarterback' ||
            player.position === 'Running Back' ||
            player.position === 'Wide Receiver' ||
            player.position === 'Tight End' ||
            player.position === 'Offensive Lineman',
        ).length;
      const averageDefense =
        ISFLTeam
          .filter(
            (player) =>
              player.position === 'Defensive End' ||
              player.position === 'Defensive Tackle' ||
              player.position === 'Linebacker' ||
              player.position === 'Cornerback' ||
              player.position === 'Safety',
          )
          .reduce((acc, player) => acc + player.totalTPE, 0) /
        ISFLTeam.filter(
          (player) =>
            player.position === 'Defensive End' ||
            player.position === 'Defensive Tackle' ||
            player.position === 'Linebacker' ||
            player.position === 'Cornerback' ||
            player.position === 'Safety',
        ).length;

      const kickers = ISFLTeam
        .filter((player) => player.position === 'Kicker')
        .sort((a, b) => b.totalTPE - a.totalTPE);

      const stringMaker = (player: PortalPlayer) => {
        return `[S${player.draftSeason}] ${shortenPosition(player.position)} - ${player.firstName} ${player.lastName} - #${player.jerseyNumber} (${player.totalTPE} TPE)`
      }

      const offense = ISFLTeam
        .map(
          (player) => {
            if (player.position === 'Quarterback' ||
              player.position === 'Running Back' ||
              player.position === 'Wide Receiver' ||
              player.position === 'Tight End' ||
              player.position === 'Offensive Lineman') {
              return stringMaker(player)
            }
          }
        )
        .join('\n')

      const defense = ISFLTeam
        .map(
          (player) => {
            if (player.position === 'Defensive End' ||
              player.position === 'Defensive Tackle' ||
              player.position === 'Linebacker' ||
              player.position === 'Cornerback' ||
              player.position === 'Safety') {
              return stringMaker(player)
            }
          }
        )
        .join('\n')

      const kickerText = ISFLTeam
        .map(
          (player) => {
            if (player.position === 'Kicker') {
              return stringMaker(player)
            }
          }
        )
        .join('\n')

      rosterEmbed
        .addFields({
          name: 'Offense',
          value: offense.toString(),
          inline: false,
        })
        .addFields({
          name: 'Defense',
          value: defense.toString(),
          inline: false,
        })
        .addFields({
          name: 'Kicker(s)',
          value: kickerText.toString(),
          inline: false,
        })
        .addFields({
          name: 'Average TPE',
          value: `${averageTPE.toFixed(2)}`,
          inline: true,
        })
        .addFields({
          name: 'Offense',
          value: `${averageOffense.toFixed(2)}`,
          inline: true,
        })
        .addFields({
          name: 'Defense',
          value: `${averageDefense.toFixed(2)}`,
          inline: true,
        })
        .addFields({
          name: 'Kicker',
          value: `${kickers[0]?.totalTPE || 0}`,
          inline: false,
        })

      rosterEmbed.addFields({
        name: 'Prospects',
        value: DSFLTeam
          .map(
            (player) =>
              stringMaker(player)
          )
          .join('\n'),
        inline: false,
      });


      await interaction.editReply({
        embeds: [rosterEmbed],
      });

    } catch (error) {
      logger.error(error);
      await interaction.editReply({
        content: 'An error occurred while fetching team info.',
      });
      return;
    }
  },
} satisfies SlashCommand;
