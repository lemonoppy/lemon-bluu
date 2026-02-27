import { SlashCommandBuilder } from 'discord.js';
import { getUserByFuzzy } from 'src/db/portal';
import { PortalClient } from 'src/db/portal/PortalClient';
import { users } from 'src/db/users';
import { PORTAL_URLS } from 'src/lib/config/config';
import { BaseEmbed } from 'src/lib/embed';
import { formatBalance } from 'src/lib/helpers/playerHelpers';
import { logger } from 'src/lib/logger';
import { SlashCommand } from 'typings/command';

export default {
  command: new SlashCommandBuilder()
    .setName('balance')
    .addStringOption((option) =>
      option
        .setName('username')
        .setDescription('Username to check the balance of.')
    )
    .setDescription('Look up the balance of any user in the portal.'),
  execute: async (interaction) => {
    const target = interaction.options.getString('username', false);
    const currentUserInfo = await users.get(interaction.user.id);
    const name = target || currentUserInfo?.forumName;

    if (!name) {
      await interaction
        .editReply({
          content: 'No player name provided or stored.',
        })
        .catch((error) => {
          logger.error(error);
        });
      return;
    }

    const user = await getUserByFuzzy(name);

    if (!user) {
      await interaction.reply({
        content:
          'Could not find user with that username. Please check your spelling and try again.',
        ephemeral: false,
      });
      return;
    }

    const headerInfo = await PortalClient.getHeaderInfo();

    const bankRankings = headerInfo
      .sort((a, b) => b.bankBalance - a.bankBalance)

    const userRank = bankRankings.findIndex((header) => header.uid === user.uid);
    const userPercentile  = ((bankRankings.length - userRank)/bankRankings.length) * 100;

    await interaction.reply({
      embeds: [
        BaseEmbed(interaction, { teamColor: undefined })
          .setTitle(`Bank Balance: ${name}`)
          .setURL(PORTAL_URLS.user(user.uid))
          .setThumbnail(bankRankings[userRank].avatar)
          .addFields(
            { name: 'Rank', value: `Rank ${userRank + 1}` },
            { name: 'Percentile', value: `${userPercentile.toFixed(2)}%` },
            { name: 'Balance', value: formatBalance(bankRankings[userRank].bankBalance) },
          ),
      ],
      ephemeral: false,
    });
  },
} satisfies SlashCommand;
