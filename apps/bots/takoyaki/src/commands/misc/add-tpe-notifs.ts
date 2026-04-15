import { SlashCommandBuilder } from 'discord.js';
import { users } from 'src/db/users';
import { BaseEmbed } from 'src/lib/embed';
import { findTeamByName } from 'src/lib/teams';
import { SlashCommand } from 'typings/command';

export const command = {
  command: new SlashCommandBuilder()
    .setName('enable-tpe-notifications')
    .addBooleanOption((option) =>
      option
        .setName('enable')
        .setDescription('Enable or disable TPE notifications.')
        .setRequired(true),
    )
    .setDescription('Enable or disable max earner TPE notifications.'),
  execute: async (interaction) => {
    await interaction.deferReply();
    const target = interaction.options.getBoolean('enable', true);

		const userInfo = await users.get(interaction.user.id);
    if (!userInfo) {
      await interaction.editReply({
        content:
          'Could not find your username. Please store your user info with /store before enabling TPE notifications.',
      });
      return;
    }

		const team = findTeamByName(userInfo?.team ?? '');
		userInfo.tpeNotifications = target;
		await users.set(interaction.user.id, userInfo);

    await interaction.editReply({
      embeds: [
        BaseEmbed(interaction, { teamColor: team ? team.colors.primary : undefined })
          .setDescription(
						target ?
							`Enabled TPE notifications for ${interaction.user.toString()}.` :
							`Disabled TPE notifications for ${interaction.user.toString()}.`
          )
      ],
    });
  },
} satisfies SlashCommand;
