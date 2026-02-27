import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { FantasyClient } from 'src/db/fantasy/FantasyClient';
import { users } from 'src/db/users';
import { BaseEmbed } from 'src/lib/embed';
import { withErrorHandling } from 'src/lib/helpers/command';
import { SlashCommand } from 'typings/command';
import { FantasyPlayer, FantasyRosteredPlayer, FantasyUser } from 'typings/fantasy';

// Helper function to normalize player names for comparison
const normalizeName = (name: string) => name.trim().toLowerCase();

const findReplacement = (availablePlayers: FantasyPlayer[], targetPlayer: FantasyPlayer | undefined, position: string[]) => {
  return availablePlayers.filter((player) => {
    return position.includes(player.position) && player.score > (targetPlayer?.score ?? 0);
  }).slice(0, 3)
}

const execute = async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply();

  const forumUser = await users.get(interaction.user.id);

  if (!forumUser || !forumUser?.forumName) {
    await interaction.editReply({
      content: 'You need to be registered to use this command. Use the /store command to register.',
    });
    return;
  }

  const players: FantasyPlayer[] = await FantasyClient.getPlayers();
  players.sort((a, b) => b.score - a.score);

  const fantasyUsers: FantasyUser[] = await FantasyClient.getUsers();

  // Normalize the forum name for comparison (trim and lowercase)
  const normalizedForumName = forumUser.forumName.trim().toLowerCase();

  const user = fantasyUsers.find((user) => user.username.trim().toLowerCase() === normalizedForumName);

  if (!user) {
    // Try to find similar names - simple substring matching
    const similarUsers = fantasyUsers
      .filter((u) => {
        const username = u.username.trim().toLowerCase();
        // Check for substring matches or if any word from forum name is in username
        const forumWords = normalizedForumName.split(' ');
        return forumWords.some(word => word.length >= 3 && username.includes(word));
      })
      .slice(0, 5);

    if (similarUsers.length > 0) {
      await interaction.editReply({
        content: `Team for user "${forumUser.forumName}" not found. Did you mean one of these?\n${similarUsers.map(u => `- ${u.username}`).join('\n')}`,
      });
    } else {
      await interaction.editReply({
        content: `Team for user "${forumUser.forumName}" not found. Please check your forum name registration with /store.`,
      });
    }
    return;
  }

  const rosteredPlayers: FantasyRosteredPlayer[] = await FantasyClient.getRosteredPlayers();
  const groupRosteredPlayers = rosteredPlayers.filter((player) => player.group === user.group && !player.end);
  const roster = groupRosteredPlayers.filter((player) => player.username.trim() === user.username.trim() && !player.end);

  if (!roster.length) {
    await interaction.editReply({
      content: 'Team not found.',
    });
    return;
  }

  const availablePlayers = players.filter((player) => {
    return groupRosteredPlayers.filter((rosteredPlayer) => normalizeName(rosteredPlayer.name) === normalizeName(player.name)).length === 0;
  })

  const worstAt = (positions: string[]) => {
    return roster.filter((player) => positions.includes(player.position))
      .sort((a, b) => {
        const scoreA = players.find(p => normalizeName(p.name) === normalizeName(a.name))?.score ?? 0;
        const scoreB = players.find(p => normalizeName(p.name) === normalizeName(b.name))?.score ?? 0;
        return scoreA - scoreB;
      })[0];
  }


  const buildEmbedField = (replacementPlayers: FantasyPlayer[], target: FantasyRosteredPlayer | undefined, display: string) => {
    // If no player at this position, skip this field
    if (!target) {
      return null;
    }

    if (replacementPlayers.length > 0) {
      const currentPlayer = players.find(player => normalizeName(player.name) === normalizeName(target.name));
      return {
        name: `[${display}] ${target.name} (${target.position}) - ${target.score} points`,
        value: replacementPlayers.map((player) => `${player.name} (${player.position}) - ${player.score} points (+${(player.score - (currentPlayer?.score ?? 0)).toFixed(2)})`).join('\n'),
        inline: false
      }
    }
    else {
      const currentPlayer = players.find(player => normalizeName(player.name) === normalizeName(target.name));
      return {
        name: `[${display}] ${target.name} (${target.position}) - ${currentPlayer?.score ?? 0} points`,
        value: 'Best available player rostered.',
        inline: false
      }
    }
  }

  // Position slot configurations
  const positionSlots: Array<{ positions: string[]; display: string }> = [
    { positions: ['QB'], display: 'QB' },
    { positions: ['RB'], display: 'RB' },
    { positions: ['WR'], display: 'WR' },
    { positions: ['WR', 'TE'], display: 'WR/TE' },
    { positions: ['RB', 'WR', 'TE'], display: 'FLEX' },
    { positions: ['OL'], display: 'OL' },
    { positions: ['DE', 'DT'], display: 'DE/DT' },
    { positions: ['LB'], display: 'LB' },
    { positions: ['CB', 'FS', 'SS', 'S'], display: 'CB/FS/SS' },
    { positions: ['K'], display: 'K' },
  ];

  const buildEmbedFields = () => {
    return positionSlots.map(({ positions, display }) => {
      const target = worstAt(positions);
      const targetPlayer = players.find(p => normalizeName(p.name) === normalizeName(target?.name ?? ''));
      const replacements = findReplacement(availablePlayers, targetPlayer, positions);
      return buildEmbedField(replacements, target, display);
    }).filter(field => field !== null);
  }

  await interaction.editReply({
    embeds: [
      BaseEmbed(interaction, {
      })
        .setTitle(`Top Fantasy Recommendations`)
        .addFields(buildEmbedFields())
    ],
  });
  return;
}

export default {
  command: new SlashCommandBuilder()
    .setName('ff-recs')
    .setDescription('Recommendations for your fantasy team'),
  execute: withErrorHandling(execute, 'Failed to retrieve team recommendations.'),
} satisfies SlashCommand;
