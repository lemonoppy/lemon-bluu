import { CacheType, ChatInputCommandInteraction } from 'discord.js';
import { PortalClient } from 'src/db/portal/PortalClient';
import { PORTAL_URLS } from 'src/lib/config/config';
import { formatBalance, shortenPosition } from 'src/lib/helpers/playerHelpers';
import { findTeamByName } from 'src/lib/teams';
import { BasicUserInfo } from 'typings/portal';

import { BaseEmbed } from './embed';

export async function withUserInfo(
  interaction: ChatInputCommandInteraction<CacheType>,
  user: BasicUserInfo,
) {
  if (!user) {
    await interaction.editReply({
      content: 'Could not find user with that username.',
    });
    return;
  }

  const players = await PortalClient.getActivePlayers();
  const player = players.find((p) => p.uid === user.uid);

  if (!player) {
    await interaction.editReply({
      content: 'Could not find active player with that username.',
    });
    return;
  }

  const formattedBankBalance = `$${player.bankBalance.toLocaleString('en-US')}`;

  // Get the team based on player's current league
  const teamName = player.currentLeague === 'ISFL' ? player.isflTeam : player.dsflTeam;
  const team = teamName ? findTeamByName(teamName) : undefined;

  const playerEmbed = BaseEmbed(interaction, {
    teamColor: team?.colors.primary,
  })
    .setTitle(`${player.firstName} ${player.lastName} (S${player.draftSeason})`)
    .setURL(PORTAL_URLS.player(player.pid))
    .setDescription(`${shortenPosition(player.position)} - ${player.archetype}`)
    .addFields(
      { name: 'Total TPE', value: `${player.totalTPE.toString()}`, inline: true },
      {
        name: 'Banked TPE',
        value: `${player.bankedTPE.toString()}`,
        inline: true,
      },
      { name: 'Bank Balance', value: formattedBankBalance, inline: false },
      {
        name: 'Activity Check',
        value: player.weeklyActivityCheck ? '✅' : '❌',
        inline: true,
      },
      {
        name: 'Weekly Training',
        value: player.weeklyTraining ? '✅' : '❌',
        inline: true,
      },
      {
        name: 'Equipment Purchased',
        value: `${player.equipmentPurchased}/30 TPE ${player.equipmentPurchased === 30 ? ' 🎉' : `(${formatBalance((30 - player.equipmentPurchased) * 450_000)})`}`,
        inline: false,
      },
    )

  await interaction.editReply({ embeds: [playerEmbed] });
}
