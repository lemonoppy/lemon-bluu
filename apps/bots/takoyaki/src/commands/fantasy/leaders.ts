import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from 'discord.js';
import { FantasyClient } from 'src/db/fantasy/FantasyClient';
import { BaseEmbed } from 'src/lib/embed';
import { withErrorHandling } from 'src/lib/helpers/command';
import { getGroupDisplayName } from 'src/lib/helpers/fantasyHelpers';
import { SlashCommand } from 'typings/command';
import { FantasyUser } from 'typings/fantasy';

const execute = async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply();

  const users: FantasyUser[] = await FantasyClient.getUsers();
  users.sort((a, b) => a.overall - b.overall);

  const embeds: any[] = [];

  const buildEmbedFields = (users: FantasyUser[]) => {
    for (let i = 0; i < 10; i++) {
      if (users[i]) {
        embeds.push({
          name: `#${i + 1}. ${users[i].username} (${getGroupDisplayName(users[i].group)}) ${
            i === 0 ? '🏆' : ''
          }`,
          value: `**Score: ${users[i].score}** | Group Rank: ${
            users[i].rank
          } ${users[i].rank > 1 ? '😔' : ''}`,
          inline: false,
        });
      }
    }
    return embeds;
  };

  await interaction.editReply({
    embeds: [
      BaseEmbed(interaction, {})
        .setTitle(`Top 10 Fantasy Players`)
        .addFields(buildEmbedFields(users)),
    ],
  });
  return;
};

export default {
  command: new SlashCommandBuilder()
    .setName('ff-top')
    .setDescription('Top 10 fantasy players this season'),
  execute: withErrorHandling(execute, 'Failed to retrieve leaders.'),
} satisfies SlashCommand;
