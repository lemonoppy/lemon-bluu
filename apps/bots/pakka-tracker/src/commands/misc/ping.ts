import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

import { SlashCommand } from 'typings/command';

const execute = async (interaction: ChatInputCommandInteraction) => {
  await interaction.reply({ content: 'Pinging...' });

  const sent = await interaction.fetchReply();
  const latency = sent.createdTimestamp - interaction.createdTimestamp;
  const apiLatency = Math.round(interaction.client.ws.ping);

  await interaction.editReply(
    `🏓 Pong!\n📡 Latency: ${latency}ms\n💓 API Latency: ${apiLatency}ms`,
  );
};

export const command = {
  command: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!'),
  execute,
} satisfies SlashCommand;
