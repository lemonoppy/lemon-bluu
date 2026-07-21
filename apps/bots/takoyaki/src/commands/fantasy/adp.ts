import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { FantasyClient } from 'src/db/fantasy/FantasyClient';
import { BaseEmbed } from 'src/lib/embed';
import { withErrorHandling } from 'src/lib/helpers/command';
import { SlashCommand } from 'typings/command';

const POSITION_FILTERS: Record<string, string[]> = {
  QB: ['QB'],
  RB: ['RB'],
  WR: ['WR'],
  'TE/WR': ['TE', 'WR'],
  FLEX: ['RB', 'WR', 'TE'],
  OL: ['OL'],
  K: ['K'],
  'DE/DT': ['DE', 'DT'],
  LB: ['LB'],
  'CB/FS/SS': ['CB', 'FS', 'SS'],
};

const POSITION_COLORS: Record<string, string> = {
  QB: '🟥',
  RB: '🟩',
  WR: '🟦',
  TE: '🟧',
  OL: '⬜',
  K: '🟪',
  DE: '🟫',
  DT: '🟫',
  LB: '🟨',
  CB: '🟦',
  FS: '🟦',
  SS: '🟦',
};

const execute = async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply();

  const position = interaction.options.getString('position');
  const allowedPositions = position ? POSITION_FILTERS[position] : undefined;
  const players = (await FantasyClient.getAdpPlayers())
    .filter(
      (player) =>
        !allowedPositions || allowedPositions.includes(player.position),
    )
    .sort((a, b) => a.adp - b.adp)
    .slice(0, 20);

  if (players.length === 0) {
    await interaction.editReply(
      `No fantasy ADP data found${position ? ` for ${position}` : ''}.`,
    );
    return;
  }

  const title = position
    ? `Top 20 Fantasy ADP — ${position}`
    : 'Top 20 Fantasy ADP';

  await interaction.editReply({
    embeds: [
      BaseEmbed(interaction, {})
        .setTitle(title)
        .setDescription(
          players
            .map(
              (player, index) =>
                `${POSITION_COLORS[player.position] ?? '⬜'} **${index + 1}. ${
                  player.player
                }** (${player.team} · ${
                  player.position
                }) — ADP **${player.adp.toFixed(2)}** · Med ${
                  player.median
                } · n=${player.count}`,
            )
            .join('\n'),
        ),
    ],
  });
};

export const command = {
  command: new SlashCommandBuilder()
    .setName('ff-adp')
    .setDescription('Top 20 fantasy players by average draft position')
    .addStringOption((option) =>
      option
        .setName('position')
        .setDescription('Filter players by a fantasy position group')
        .addChoices(
          { name: 'QB', value: 'QB' },
          { name: 'RB', value: 'RB' },
          { name: 'WR', value: 'WR' },
          { name: 'TE/WR', value: 'TE/WR' },
          { name: 'Flex (RB, WR, TE)', value: 'FLEX' },
          { name: 'OL', value: 'OL' },
          { name: 'K', value: 'K' },
          { name: 'DE/DT', value: 'DE/DT' },
          { name: 'LB', value: 'LB' },
          { name: 'CB/FS/SS', value: 'CB/FS/SS' },
        )
        .setRequired(false),
    ),
  execute: withErrorHandling(execute, 'Failed to retrieve fantasy ADP.'),
} satisfies SlashCommand;
