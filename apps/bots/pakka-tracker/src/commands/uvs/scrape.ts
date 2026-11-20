import { hexColorToInt } from '@lemon-bluu/discord';
import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';

import { extractEventId } from 'src/lib/uvs/client';
import { formatSquadStatusLines } from 'src/lib/uvs/format';
import { scrapePlayerData, timerStatusLabel } from 'src/lib/uvs/scraper';
import { evaluateSquadStatus } from 'src/lib/uvs/squad';
import { SlashCommand } from 'typings/command';

const UVS_COLOR = '#7b5df5';

const execute = async (interaction: ChatInputCommandInteraction) => {
  const eventId = extractEventId(
    interaction.options.getString('event_id', true),
  );

  await interaction.deferReply();

  if (!eventId) {
    await interaction.editReply({
      content: 'Provide a Riftbound event ID or playriftbound.com event URL.',
    });
    return;
  }

  const result = await scrapePlayerData(eventId);

  if (result.players.length === 0) {
    await interaction.editReply({
      content: `Event **${result.event.name}** has no standings available yet.`,
    });
    return;
  }

  const squad = evaluateSquadStatus(result);
  if (!squad) {
    await interaction.editReply({
      content: `No tracked squad members found in **${result.event.name}**.`,
    });
    return;
  }

  const progressStatus = result.isComplete
    ? 'COMPLETE'
    : result.latestRoundStatus === 'COMPLETE'
      ? 'IN PROGRESS'
      : result.latestRoundStatus;

  const embed = new EmbedBuilder()
    .setColor(hexColorToInt(UVS_COLOR))
    .setTitle(
      [result.event.store.name, result.event.name].filter(Boolean).join(' — '),
    )
    .setDescription(
      [
        `**Phase:** ${result.phaseName}`,
        `**Round:** ${result.displayRound} of ${result.totalRounds} (${result.roundsRemaining} remaining)`,
        `**Top cut:** ${result.topCutSize > 0 ? `Top ${result.topCutSize}` : 'No cut'}`,
        `**Players:** ${result.players.length}`,
        `**Status:** ${progressStatus}`,
        timerStatusLabel(result),
      ].join('\n'),
    )
    .setTimestamp();

  const squadLines = formatSquadStatusLines(squad.players, result.topCutSize);
  embed.addFields({
    name: 'Squad Status',
    value: squadLines.join('\n'),
  });

  const { wins, losses, draws } = squad.squadTotals;
  const summaryLines = [
    `Combined Record: ${wins}-${losses}-${draws} (${squad.combinedWinPercent.toFixed(2)}%)`,
    `Combined Points: ${wins * 3 + draws}/${(wins + losses + draws) * 3} (${squad.combinedPointsPercent.toFixed(2)}%)`,
  ];
  if (!result.isComplete && !result.isCutDecided) {
    summaryLines.push(
      squad.thresholdPoints !== undefined
        ? `Estimated cut line: ${squad.thresholdPoints} pts`
        : 'No cut line (event has no top cut)',
    );
  }
  embed.addFields({
    name: 'Squad Summary',
    value: summaryLines.join('\n'),
    inline: false,
  });

  await interaction.editReply({ embeds: [embed] });
};

export const command = {
  command: new SlashCommandBuilder()
    .setName('scrape')
    .setDescription('Scrape a Riftbound event and post standings')
    .addStringOption((option) =>
      option
        .setName('event_id')
        .setDescription('Riftbound event ID or playriftbound.com event URL')
        .setRequired(true),
    ),
  execute,
} satisfies SlashCommand;
