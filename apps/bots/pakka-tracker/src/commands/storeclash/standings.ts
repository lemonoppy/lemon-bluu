import { hexColorToInt } from '@lemon-bluu/discord';
import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';

import { logger } from 'src/lib/logger';
import {
  StoreClashSeason,
  StoreClashStanding,
  getCurrentStoreClashSeason,
  getStoreClashSeasons,
  getStoreClashStandings,
  getStoreClashStores,
  parseWeeklyPoints,
} from 'src/lib/store-clash/standings';
import { SlashCommand } from 'typings/command';

const STORE_CLASH_COLOR = '#7b5df5';

const TORONTO_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Toronto',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const formatDate = (value: Date | string | null): string => {
  if (!value) return 'TBD';
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

const dayNumber = (value: Date): number => {
  const [year, month, day] = TORONTO_DATE.format(value)
    .split('-')
    .map(Number);
  return Date.UTC(year, month - 1, day) / 86_400_000;
};

type SeasonMeta = Pick<
  StoreClashSeason,
  'starts_on' | 'weeks' | 'best_weeks' | 'finals_on'
>;

const currentWeek = (season: SeasonMeta): number | null => {
  const start = season.starts_on instanceof Date
    ? season.starts_on
    : new Date(season.starts_on);
  const elapsed = dayNumber(new Date()) - dayNumber(start);
  if (elapsed < 0 || elapsed >= season.weeks * 7) return null;
  return Math.floor(elapsed / 7) + 1;
};

const seasonDescription = (season: SeasonMeta): string => {
  const start = season.starts_on instanceof Date
    ? season.starts_on
    : new Date(season.starts_on);
  const end = new Date(start.getTime());
  end.setUTCDate(end.getUTCDate() + season.weeks * 7 - 1);
  const week = currentWeek(season);
  return [
    `${formatDate(start)} – ${formatDate(end)}`,
    `Best ${season.best_weeks} of ${season.weeks} weeks • Top 4 per store qualify`,
    `Finals: ${formatDate(season.finals_on)}${week ? ` • Week ${week} of ${season.weeks}` : ''}`,
  ].join('\n');
};

const groupByStore = (
  rows: StoreClashStanding[],
): { store: StoreClashStanding; players: StoreClashStanding[] }[] => {
  const stores = new Map<
    string,
    { store: StoreClashStanding; players: StoreClashStanding[] }
  >();
  for (const row of rows) {
    const entry = stores.get(row.store_id) ?? { store: row, players: [] };
    if (row.player_id) entry.players.push(row);
    stores.set(row.store_id, entry);
  }
  return [...stores.values()].sort(
    (a, b) =>
      (a.store.display_order ?? 999) - (b.store.display_order ?? 999) ||
      a.store.store_name.localeCompare(b.store.store_name),
  );
};

const playerLine = (player: StoreClashStanding): string =>
  `${player.store_rank}. ${player.display_name} — ${player.best_six_points} pts (${player.weeks_played} wks)${player.qualified ? ' ✅' : ''}`;

const execute = async (interaction: ChatInputCommandInteraction) => {
  const subcommand = interaction.options.getSubcommand();
  await interaction.deferReply();

  try {
    if (subcommand === 'seasons') {
      const seasonsResult = await getStoreClashSeasons();
      if (seasonsResult.isErr()) throw seasonsResult.error;
      const seasons = seasonsResult.value;
      if (seasons.length === 0) {
        await interaction.editReply({ content: 'No Store Clash seasons yet.' });
        return;
      }
      const lines = seasons.map((season) => {
        const week = currentWeek(season);
        return `**${season.name}** (\`${season.slug}\`) — ${formatDate(season.starts_on)} • ${season.weeks} weeks${week ? ` • week ${week}` : ''} • finals ${formatDate(season.finals_on)}`;
      });
      const embed = new EmbedBuilder()
        .setColor(hexColorToInt(STORE_CLASH_COLOR))
        .setTitle('Store Clash Seasons')
        .setDescription(lines.join('\n'))
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const seasonSlug = interaction.options.getString('season');
    const currentResult = await getCurrentStoreClashSeason();
    if (currentResult.isErr()) throw currentResult.error;
    const slug = seasonSlug ?? currentResult.value?.slug;
    if (!slug) {
      await interaction.editReply({ content: 'No active Store Clash season.' });
      return;
    }

    const standingsResult = await getStoreClashStandings(slug);
    if (standingsResult.isErr()) throw standingsResult.error;
    const rows = standingsResult.value;
    if (rows.length === 0) {
      await interaction.editReply({
        content: `No Store Clash standings found for season \`${slug}\`.`,
      });
      return;
    }

    const season = rows[0];
    const stores = groupByStore(rows);
    const storeId = interaction.options.getString('store');
    const embed = new EmbedBuilder()
      .setColor(hexColorToInt(STORE_CLASH_COLOR))
      .setTitle(`${season.season_name} — Standings`)
      .setDescription(seasonDescription(season))
      .setFooter({ text: 'Source: PlayRiftbound' })
      .setTimestamp();

    if (storeId) {
      const selected = stores.find((entry) => entry.store.store_id === storeId);
      if (!selected) {
        await interaction.editReply({
          content: 'That store is not in this season.',
        });
        return;
      }
      const lines = selected.players.slice(0, 8).flatMap((player, index) => {
        const weekly = parseWeeklyPoints(player.weekly_points);
        const weeks = Object.entries(weekly)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([week, points]) => `W${week} ${points}`)
          .join(' · ');
        const cut = index === 4 ? ['— top 4 qualify —'] : [];
        return [...cut, playerLine(player), weekly ? `   ${weeks}` : ''];
      });
      embed.addFields({
        name: `${selected.store.store_name}${selected.store.weekday ? ` — ${selected.store.weekday} ${selected.store.start_time}` : ''}`,
        value: lines.filter(Boolean).join('\n') || 'No results yet',
      });
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    for (const entry of stores) {
      const lines = entry.players.slice(0, 4).map(playerLine);
      embed.addFields({
        name: `${entry.store.store_name}${entry.store.weekday ? ` (${entry.store.weekday})` : ''}`,
        value: lines.join('\n') || 'No results yet',
        inline: false,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error(error, 'Failed to build Store Clash standings');
    await interaction.editReply({
      content: 'Failed to load Store Clash standings.',
    });
  }
};

const autocomplete = async (interaction: AutocompleteInteraction) => {
  const focused = interaction.options.getFocused(true);
  try {
    if (focused.name === 'season') {
      const seasonsResult = await getStoreClashSeasons();
      if (seasonsResult.isErr()) throw seasonsResult.error;
      const query = focused.value.toLowerCase();
      await interaction.respond(
        seasonsResult.value
          .filter(
            (season) =>
              season.slug.toLowerCase().includes(query) ||
              season.name.toLowerCase().includes(query),
          )
          .slice(0, 25)
          .map((season) => ({
            name: `${season.name} (${season.slug})`,
            value: season.slug,
          })),
      );
      return;
    }

    if (focused.name === 'store') {
      const currentResult = await getCurrentStoreClashSeason();
      if (currentResult.isErr()) throw currentResult.error;
      const slug =
        interaction.options.getString('season') ?? currentResult.value?.slug;
      if (!slug) {
        await interaction.respond([]);
        return;
      }
      const storesResult = await getStoreClashStores(slug);
      if (storesResult.isErr()) throw storesResult.error;
      const query = focused.value.toLowerCase();
      await interaction.respond(
        storesResult.value
          .filter((store) => store.store_name.toLowerCase().includes(query))
          .slice(0, 25)
          .map((store) => ({
            name: store.store_name,
            value: store.store_id,
          })),
      );
      return;
    }

    await interaction.respond([]);
  } catch (error) {
    logger.error(error, 'Store Clash autocomplete failed');
    await interaction.respond([]).catch(() => undefined);
  }
};

export const command = {
  command: new SlashCommandBuilder()
    .setName('storeclash')
    .setDescription('Show Store Clash season standings')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('standings')
        .setDescription('Standings for a Store Clash season')
        .addStringOption((option) =>
          option
            .setName('season')
            .setDescription('Season slug (defaults to the current season)')
            .setAutocomplete(true),
        )
        .addStringOption((option) =>
          option
            .setName('store')
            .setDescription('Show one store in detail')
            .setAutocomplete(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('seasons')
        .setDescription('List Store Clash seasons'),
    ),
  execute,
  autocomplete,
} satisfies SlashCommand;
