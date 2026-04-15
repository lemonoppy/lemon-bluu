import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { UserRole } from 'src/lib/config/config';
import { postTPEReminders } from 'src/lib/tpeTasks';
import { SlashCommand } from 'typings/command';

export const command = {
  command: new SlashCommandBuilder()
    .setName('tpe-tasks')
    .setDescription('Look up TODO tpe tasks.'),
  execute: async (interaction) => {
  	await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  	await postTPEReminders();

    await interaction.editReply({ content: `TPE Reminders posted` });
  },
	minRole: UserRole.BOT_OWNERS,
} satisfies SlashCommand;