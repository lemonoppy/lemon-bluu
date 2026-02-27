import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { FantasyClient } from 'src/db/fantasy/FantasyClient';
import { BaseEmbed } from 'src/lib/embed';
import { withErrorHandling } from 'src/lib/helpers/command';
import { SlashCommand } from 'typings/command';
import { FantasyPlayer } from 'typings/fantasy';

// Position group mappings
const POSITION_FILTERS: Record<string, string[]> = {
  'QB': ['QB'],
  'RB': ['RB'],
  'WR': ['WR'],
  'WR/TE': ['WR', 'TE'],
  'FLEX': ['RB', 'WR', 'TE'],
  'OL': ['OL'],
  'K': ['K'],
  'DL': ['DE', 'DT'],
  'LB': ['LB'],
  'DB': ['CB', 'FS', 'SS'],
};

const execute = async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply();

  const players: FantasyPlayer[] = await FantasyClient.getPlayers();
  players.sort((a, b) => b.score - a.score);

  const position = interaction.options.getString('position') ?? '';

  // Filter players by position using the mapping, or return all if no filter
  const allowedPositions = POSITION_FILTERS[position];
  const filteredPlayers = allowedPositions
    ? players.filter((player) => allowedPositions.includes(player.position))
    : players;

  const buildEmbedFields = (players: FantasyPlayer[]) => {
    const embeds: any[] = [];

    for (let i = 0; i < 10; i++) {
      if (players[i]) {
        embeds.push({
          name: `#${i + 1}. ${players[i].name} (${players[i].position} ${
            players[i].team
          })`,
          value: `${players[i].score} points`,
          inline: false,
        });
      }
    }
    return embeds;
  };

  await interaction.editReply({
    embeds: [
      BaseEmbed(interaction, {}).setTitle(`Top Scoring ${position} Players`)
        .addFields(buildEmbedFields(filteredPlayers)),
    ],
  });
  return;
};

export default {
  command: new SlashCommandBuilder()
    .setName('ff-players')
    .setDescription('Top fantasy players this season')
    .addStringOption((option) =>
      option
        .setName('position')
        .setDescription(
          'The position of players to retrieve. If not provided, will default to all players.',
        )
        .addChoices(
          { name: 'QB', value: 'QB' },
          { name: 'RB', value: 'RB' },
          { name: 'WR', value: 'WR' },
          { name: 'WR/TE', value: 'WR/TE' },
          { name: 'Flex', value: 'FLEX' },
          { name: 'OL', value: 'OL' },
          { name: 'K', value: 'K' },
          { name: 'DL', value: 'DL' },
          { name: 'LB', value: 'LB' },
          { name: 'DB', value: 'DB' },
        )
        .setRequired(false),
    ),
  execute: withErrorHandling(
    execute,
    'Failed to retrieve group players.',
  ),
} satisfies SlashCommand;
