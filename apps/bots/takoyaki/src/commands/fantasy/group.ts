import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { FantasyClient } from 'src/db/fantasy/FantasyClient';
import { users } from 'src/db/users';
import { BaseEmbed } from 'src/lib/embed';
import { withErrorHandling } from 'src/lib/helpers/command';
import { getGroupDisplayName, normalizeGroupSearchKey } from 'src/lib/helpers/fantasyHelpers';
import { SlashCommand } from 'typings/command';
import { FantasyUser } from 'typings/fantasy';

const execute = async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply();

  const forumUser = await users.get(interaction.user.id);

  const fantasyUsers: FantasyUser[] = await FantasyClient.getUsers();
  const groupInput = interaction.options.getNumber('group');
  const searchKey = groupInput ?? forumUser?.forumName;

  if (!searchKey) {
    await interaction.editReply({
      content:
        'You need to be registered to use this command. Use the /store command to register.',
    });
    return;
  }

  let user: FantasyUser | undefined = undefined;

  if (typeof searchKey === 'number') {
    // First try to find by the number itself
    user = fantasyUsers.find((user) => user.group === searchKey);

    // If not found, try the special name mapping as a fallback (for charity reward groups)
    if (!user) {
      const normalizedKey = normalizeGroupSearchKey(searchKey);
      if (normalizedKey !== searchKey) {
        user = fantasyUsers.find((user) => user.group === normalizedKey);
      }
    }
  }
  if (typeof searchKey === 'string') {
    user = fantasyUsers.find(
      (user) => user.username.toLowerCase() === searchKey.toLowerCase(),
    );
  }

  if (!user) {
    if (typeof searchKey === 'number') {
      await interaction.editReply({
        content: `Group for Group ${searchKey} not found.`,
      });
      return;
    }
    await interaction.editReply({
      content: `Group for user ${searchKey} not found.`,
    });
    return;
  }

  const groupMates = fantasyUsers.filter(
    (fantasyUser) => fantasyUser.group === user?.group,
  );
  groupMates.sort((a, b) => b.score - a.score);

  const buildEmbedFields = (fantasyUsers: FantasyUser[]) => {
    const embeds: any[] = [];

    for (let x = 0; x < fantasyUsers.length; x++) {
      embeds.push({
        name: `#${x + 1} ${fantasyUsers[x].username} ${
          x === 0 ? '🥇' : x === 1 ? '🥈' : x === 2 ? '🥉' : ''
        }`,
        value: `${fantasyUsers[x].score} points ${
          x === 0
            ? ''
            : `(${(
                fantasyUsers[x - 1].score - fantasyUsers[x].score
              ).toFixed(2)} points behind)`
        }`,
        inline: false,
      });
    }

    return embeds;
  };

  await interaction.editReply({
    embeds: [
      BaseEmbed(interaction, {})
        .setTitle(`Fantasy Football ${getGroupDisplayName(user.group)}`)
        .addFields(buildEmbedFields(groupMates)),
    ],
  });
  return;
};

export default {
  command: new SlashCommandBuilder()
    .setName('ff-group')
    .setDescription('Check in on your fantasy group')
    .addNumberOption((option) =>
      option
        .setName('group')
        .setDescription(
          'The group of players to retrieve. If not provided, will default to your group.',
        )
        .setRequired(false),
    ),
  execute: withErrorHandling(execute, 'Failed to retrieve group.'),
} satisfies SlashCommand;