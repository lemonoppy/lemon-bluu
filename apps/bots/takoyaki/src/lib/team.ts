import { CacheType, ChatInputCommandInteraction } from 'discord.js';

import { PortalClient } from 'src/db/portal/PortalClient';
import { shortenPosition } from 'src/lib/helpers/playerHelpers';
import standings from 'src/lib/index/standings';
import { playerSorter } from 'src/lib/playerSorter';
import { ManagerInfo, Player, Team } from 'typings/portal';

import { BaseEmbed } from './embed';

// Position category helpers
const isOffensivePosition = (position: string) =>
  ['Quarterback', 'Running Back', 'Wide Receiver', 'Tight End', 'Offensive Lineman'].includes(position);

const isDefensivePosition = (position: string) =>
  ['Defensive End', 'Defensive Tackle', 'Linebacker', 'Cornerback', 'Safety'].includes(position);

const calculateAverageTPE = (players: Player[]) =>
  players.length > 0
    ? players.reduce((acc, player) => acc + player.totalTPE, 0) / players.length
    : 0;

export async function createRosterEmbed(
  interaction: ChatInputCommandInteraction<CacheType>,
  teamInfo: Team,
  managerInfo?: ManagerInfo[],
) {
  const players = await PortalClient.getActivePlayers();
  const rosterPlayers = playerSorter(players
    .filter(
      (player) =>
        player.currentLeague &&
        player.currentLeague === teamInfo.league &&
        (player.currentLeague === 'ISFL' ? player.isflTeam === teamInfo.abbreviation : player.dsflTeam === teamInfo.abbreviation),
    ))

  const prospects = playerSorter(players
    .filter(
      (player) =>
        player.isflTeam === teamInfo.abbreviation &&
        player.currentLeague &&
        player.currentLeague === 'DSFL',
    ))

  const offensivePlayers = rosterPlayers.filter(p => isOffensivePosition(p.position));
  const defensivePlayers = rosterPlayers.filter(p => isDefensivePosition(p.position));

  const averageTPE = calculateAverageTPE(rosterPlayers);
  const averageOffense = calculateAverageTPE(offensivePlayers);
  const averageDefense = calculateAverageTPE(defensivePlayers);

  const kickers = rosterPlayers
    .filter((player) => player.position === 'Kicker')
    .sort((a, b) => b.totalTPE - a.totalTPE);

  const rosterEmbed = BaseEmbed(interaction, {
    teamColor: teamInfo.colors.primary,
  }).setTitle(`${teamInfo.location} ${teamInfo.name} Roster`);

  if (managerInfo) {
    rosterEmbed.addFields({
      name: 'General Managers',
      value: `${managerInfo[0].username} | ${managerInfo[1].username}`,
      inline: false,
    });
  }

  const stringMaker = (player: Player) => {
    return `[S${player.draftSeason}] ${shortenPosition(player.position)} - ${player.firstName} ${player.lastName} - #${player.jerseyNumber} (${player.totalTPE} TPE)`
  }

  const offense = offensivePlayers.map(stringMaker).join('\n');
  const defense = defensivePlayers.map(stringMaker).join('\n');
  const kickerText = kickers.map(stringMaker).join('\n');

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
  if (teamInfo.league === 'ISFL') {
    rosterEmbed.addFields({
      name: 'Prospects',
      value: prospects
        .map(
          (player) =>
            stringMaker(player)
        )
        .join('\n'),
      inline: false,
    });
  }

  return rosterEmbed;
}


export async function createStatsEmbed(
  interaction: ChatInputCommandInteraction<CacheType>,
  teamInfo: Team,
  season: number,
) {
  const seasonStandings = await standings(season, teamInfo.league);
  const allTeams = []
  for (const conference of Object.values(seasonStandings)) {
    allTeams.push(...conference);
  }

  const teamStats = allTeams.find((team) => team.name.toUpperCase().includes(teamInfo.location.toUpperCase()));

  if (!teamStats) {
    await interaction.editReply({
      content: `Could not find team with abbreviation ${teamInfo.abbreviation} for season ${season}.`,
    });
    return;
  }

  return BaseEmbed(interaction, {
    logoUrl: teamInfo.logoUrl,
    teamColor: teamInfo.colors.primary,
  })
    .setTitle(`S${season} ${teamInfo.location} ${teamInfo.name}`)
    .addFields(
      {
        name: `S${season} Record`,
        value: `${teamStats.wins}-${teamStats.losses}-${teamStats.ties}`,
        inline: false,
      },
      {
        name: 'Conference',
        value: `${teamStats.conferenceRecord.wins}-${teamStats.conferenceRecord.losses}-${teamStats.conferenceRecord.ties}`,
        inline: false,
      },
      {
        name: 'Points For',
        value: `${teamStats.pointsFor}`,
        inline: false,
      },
      {
        name: 'Points Against',
        value: `${teamStats.pointsAgainst}`,
        inline: false,
      },
      {
        name: 'Streak',
        value: `${teamStats.streak}`,
        inline: false,
      },
    );
}