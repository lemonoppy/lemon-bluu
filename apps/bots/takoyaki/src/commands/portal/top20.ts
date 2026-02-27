import { SlashCommandBuilder } from 'discord.js';
import { PortalClient } from 'src/db/portal/PortalClient';
import { BaseEmbed } from 'src/lib/embed';
import { formatBalance } from 'src/lib/helpers/playerHelpers';
import { SlashCommand } from 'typings/command';

export default {
  command: new SlashCommandBuilder()
    .setName('top20')
    .setDescription('Who are the 1%?'),
  execute: async (interaction) => {
    const headerInfo = await PortalClient.getHeaderInfo();

    const bankRankings = headerInfo
      .sort((a, b) => b.bankBalance - a.bankBalance)

    const embedFields = [];
    for (let i = 0; i < 20; i++) {
      embedFields.push({
        name: `#${i + 1} ${bankRankings[i].username}`,
        value: `${formatBalance(bankRankings[i].bankBalance)}`,
        inline: true,
      })
    }

    await interaction.reply({
      embeds: [
        BaseEmbed(interaction, { teamColor: undefined })
          .setTitle(`Top 20`)
          .addFields(
            embedFields
          ),
      ],
      ephemeral: false,
    });
  },
} satisfies SlashCommand;
