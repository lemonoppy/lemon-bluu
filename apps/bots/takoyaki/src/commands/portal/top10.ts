import { SlashCommandBuilder } from 'discord.js';
import { PortalClient } from 'src/db/portal/PortalClient';
import { BaseEmbed } from 'src/lib/embed';
import { formatBalance } from 'src/lib/helpers/playerHelpers';
import { SlashCommand } from 'typings/command';

export default {
  command: new SlashCommandBuilder()
    .setName('top10')
    .setDescription('Top ten richest users in the ISFL.'),
  execute: async (interaction) => {
    const headerInfo = await PortalClient.getHeaderInfo();

    const bankRankings = headerInfo
      .sort((a, b) => b.bankBalance - a.bankBalance)

    const embedFields = [];
    for (let i = 0; i < 10; i++) {
      embedFields.push({
        name: `#${i + 1} ${bankRankings[i].username}`,
        value: `${formatBalance(bankRankings[i].bankBalance)}`,
        inline: true,
      })
    }

    await interaction.reply({
      embeds: [
        BaseEmbed(interaction, { teamColor: undefined })
          .setTitle(`Top 10`)
          .addFields(
            embedFields
          ),
      ],
      ephemeral: false,
    });
  },
} satisfies SlashCommand;
