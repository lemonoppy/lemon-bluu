import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { withErrorHandling } from 'src/lib/errorHandling';
import { SlashCommand } from 'typings/command';

const execute = async (interaction: ChatInputCommandInteraction) => {
  await interaction.reply({
    content: 'Pinging...',
  });

  const sent = await interaction.fetchReply();

  const latency = sent.createdTimestamp - interaction.createdTimestamp;
  const apiLatency = Math.round(interaction.client.ws.ping);

  await interaction.editReply(
    `🏓 Pong!\n📡 Latency: ${latency}ms\n💓 API Latency: ${apiLatency}ms`
  );
};

export default {
  command: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!'),
  execute: withErrorHandling(execute, 'Failed to get ping information.'),
} satisfies SlashCommand;