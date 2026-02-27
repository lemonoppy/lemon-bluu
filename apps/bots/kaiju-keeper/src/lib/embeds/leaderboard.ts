import { ChatInputCommandInteraction } from 'discord.js';
import { BaseEmbed } from 'src/lib/embed';
import { toTitleCase } from 'src/lib/stringHelpers';
import { sumStatsByKeys } from 'src/lib/sumStats';
import { resolveTeam } from 'src/lib/teamResolver';
import { AggregateTypes } from 'typings/records.typings';

export async function createLeaderboardEmbed(interaction: ChatInputCommandInteraction, {
  statNames,
  chosenStat,
  data,
  activeOnly = false,
  aggregateType = 'single game',
  category = 'defensive',
  guildId,
} : {
  statNames: { [key: string]: string };
  chosenStat: string;
  data: any[];
  activeOnly: boolean;
  aggregateType?: AggregateTypes;
  category?: string;
  guildId?: string;
}) {
  const teamResult = await resolveTeam(guildId);
  const team = teamResult.isOk() ? teamResult.value : null;

  const embedFields = []

  let stats = data;

  if (aggregateType === 'franchise') {
    stats = Object.values(sumStatsByKeys(data, ['pid'], ['id', 'season', 'week', 'totalYards', 'scrimmageYards']))
  } else if (aggregateType === 'season') {
    stats = Object.values(sumStatsByKeys(data, ['pid', 'season'], ['id', 'week', 'totalYards', 'scrimmageYards']))
  }

  // Helper for formatting numbers with comma separator
  function formatNumber(n: number | string) {
    const num = typeof n === 'string' ? Number(n) : n;
    if (isNaN(num)) return n;
    return num.toLocaleString();
  }

  let sortedStats = stats.sort((a, b) => {
    if (Number(a[chosenStat]) === undefined || Number(b[chosenStat]) === undefined) {
      return 0; // If either stat is undefined, treat them as equal
    }
    return Number(b[chosenStat]) - Number(a[chosenStat]); // Sort in descending order
  })

  if (activeOnly) {
    sortedStats = sortedStats.filter(player => player.onteam);
  }

  // Format numbers in sortedStats for the chosenStat
  sortedStats = sortedStats.map(stat => ({
    ...stat,
    [chosenStat]: formatNumber(stat[chosenStat])
  }));

  const aggregateAppend = (season?: number, week?: number) => {
    switch (aggregateType) {
      case 'franchise':
        return '';
      case 'season':
        return ` S${season}`;
      case 'single game':
      default:
        return ` S${season} W${week}`;
    }
  }

  for (let i = 0; i < 10 && i < sortedStats.length; i++) {
    if (!sortedStats[i][chosenStat] || sortedStats[i][chosenStat] === 0) {
      continue; // Skip if the stat is undefined or null
    }
    embedFields.push({
      name: `#${i + 1}${aggregateAppend(sortedStats[i].season, sortedStats[i].week)} - ${sortedStats[i].firstname} ${sortedStats[i].lastname}`,
      value: `${sortedStats[i][chosenStat]} ${statNames[chosenStat]} - ${sortedStats[i].position}${!activeOnly && sortedStats[i].onteam ? ' (Active) ✨' : ''}`,
      inline: false,
    });
  }

  return BaseEmbed(interaction, {})
    .setTitle(`${activeOnly ? 'Active ' : ''}${team?.name || ''} ${toTitleCase(aggregateType)} ${toTitleCase(category)} Leaders - ${statNames[chosenStat]}`).addFields(embedFields)
}