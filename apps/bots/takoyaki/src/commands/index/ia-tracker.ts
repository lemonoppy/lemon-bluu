import {
  SlashCommandBuilder,
} from 'discord.js';
import { PortalClient } from 'src/db/portal/PortalClient';
import { PORTAL_URLS } from 'src/lib/config/config';
import { BaseEmbed } from 'src/lib/embed';
import { withErrorHandling } from 'src/lib/helpers/command';
import { logger } from 'src/lib/logger';

import { findTeamByName } from 'src/lib/teams';
import { SlashCommand } from 'typings/command';
import { IATracker, Player } from 'typings/portal';

export default {
  command: new SlashCommandBuilder()
    .setName('ia-tracker')
    .addStringOption((option) =>
      option
        .setName('team')
        .setDescription(
          'The team to retrieve.',
        )
        .addChoices(
          { name: 'MIN', value: 'MIN' },
          { name: 'LON', value: 'LON' },
          { name: 'KCC', value: 'KCC' },
          { name: 'POR', value: 'POR' },
          { name: 'NOR', value: 'NOR' },
          { name: 'BBB', value: 'BBB' },
          { name: 'TIJ', value: 'TIJ' },
          { name: 'DAL', value: 'DAL' },
        )
        .setRequired(true),
    )
    .setDescription('Get a team\'s IA trackers.'),
  execute: withErrorHandling(async (interaction) => {
    await interaction.deferReply();

      const targetTeam = interaction.options.getString('team') ?? ''
      const team = findTeamByName(targetTeam)

      if (!team) {
        await interaction.editReply({
          content:
            'Could not find team. Please check your spelling, store your user, or create an active player.',
        });
        return;
      }

      let seasonStartDate: Date | undefined;
      try {
        const season: Response = await fetch(PORTAL_URLS.api.season)

        if (season.ok) {
          const result: {
            id: number;
            season: number;
            startDate: string;
            endDate: string;
            ended: boolean;
          }  = await season.json();

          seasonStartDate = new Date(result.startDate);
          seasonStartDate.setHours(0, 0, 0, 0);
          seasonStartDate.setDate(seasonStartDate.getDate() - 1);
        }
      } catch (error) { /* empty */ }


      const players = await PortalClient.getActivePlayers(true);
      logger.debug(players)
      const teamPlayers = players.filter((p) => p.dsflTeam === team.abbreviation && p.currentLeague === 'DSFL');

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const buildPlayers = async (players: Player[])=> {
        const playerInfo: {
          full: string[],
          warning: string[],
          inactive: string[]
        } = {
          full: [],
          warning: [],
          inactive: [],
        }

        const warningDate = new Date()
        warningDate.setHours(0, 0, 0, 0);
        warningDate.setDate(warningDate.getDate() + 7);

        for (const player of players) {
          try {
            const tpeEvents: IATracker = await PortalClient.getTPEEvents(player.uid.toString());

            const IADate = new Date(tpeEvents?.latestDate ?? '1970-01-01T00:00:00Z');
            IADate.setDate(IADate.getDate() + 14);

            const displayDate: string =`${IADate.getMonth() + 1 }/${IADate.getDate() + (IADate.getHours() >= 20 ? 1 : 0)}/${IADate.getFullYear()}`;

            const buildString = (player: Player, displayDate: string, isNotEligible: boolean = false) => {
              const prefix = isNotEligible ? '[NE] ' : '';
              return `${prefix}${player.firstName} ${player.lastName}: ${displayDate}`
            }

            const getCategory = (): 'full' | 'warning' | 'inactive' => {
              // QBs always rosterable
              if (player.position === 'Quarterback') return 'full';
              if (IADate >= warningDate) return 'full';
              if (IADate >= today) return 'warning';

              return 'inactive';
            }

            const category = getCategory();
            const isNotEligible = category === 'inactive' && seasonStartDate && IADate < seasonStartDate;
            playerInfo[category].push(buildString(player, displayDate, isNotEligible));
          } catch (error) {
            logger.error(`Failed to get TPE events for ${player.firstName} ${player.lastName}:`, error);
          }
        }
        return playerInfo
      }

      const playerInfo = await buildPlayers(teamPlayers);

      const embeds = [];

      // Only add the main embed if there are players
      if (playerInfo.full.length > 0) {
        embeds.push(
          BaseEmbed(interaction, {
            teamColor: team.colors.primary
          })
            .setTitle(`${team.location} ${team.name}: ${today.toDateString()}`)
            .setDescription(playerInfo.full.join('\n'))
        );
      }

      // Only add warning embed if there are warnings
      if (playerInfo.warning.length > 0) {
        embeds.push(
          BaseEmbed(interaction, {
            teamColor: "#EED202" // Warning Yellow
          })
            .setTitle(`IA Warning (7 days)`)
            .setDescription(playerInfo.warning.join('\n'))
        );
      }

      // Only add "Inactives" embed if there are inactive players
      if (playerInfo.inactive.length > 0) {
        embeds.push(
          BaseEmbed(interaction, {
            teamColor: "#ff0f0f" // Alert Red
          })
            .setTitle(`Inactives`)
            .setDescription(playerInfo.inactive.join('\n'))
        );
      }

      await interaction.editReply({ embeds });
  }, 'An error occurred while fetching team IAs.'),
} satisfies SlashCommand;
