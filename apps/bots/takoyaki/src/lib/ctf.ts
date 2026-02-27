import { ChatInputCommandInteraction } from 'discord.js';

// CTF command authorization - only specific user can use these commands
const AUTHORIZED_CTF_USER_ID = process.env.CTF_AUTHORIZED_USER_ID ?? '';

export const checkCTFAuthorization = (interaction: ChatInputCommandInteraction): boolean => {
  return interaction.user.id === AUTHORIZED_CTF_USER_ID;
};

export const sendUnauthorized = async (interaction: ChatInputCommandInteraction) => {
  await interaction.reply({
    content: '⛔ You are not authorized to use this command.',
    ephemeral: true,
  });
};
