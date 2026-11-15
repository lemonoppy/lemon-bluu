import { useMemo, useState } from 'react';

import Link from 'next/link';

import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/components/riftbound/AsyncStates';
import { QualifiedBadge } from '@/components/riftbound/Badges';
import { PlayerLink } from '@/components/riftbound/PlayerLink';
import { RiftboundPage } from '@/components/riftbound/RiftboundPage';
import { RiftboundSelect } from '@/components/riftbound/RiftboundSelect';
import { Accordion } from '@/components/ui/accordion';
import type {
  StoreClashResponse,
  StoreClashStanding,
} from '@/lib/riftbound';
import { formatDateOnly } from '@/lib/riftbound';
import { useApi } from '@/lib/use-api';

const TORONTO_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Toronto',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const dayNumber = (dateOnly: string): number => {
  const [year, month, day] = dateOnly.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / 86_400_000;
};

const currentWeek = (season: StoreClashResponse['season']): number | null => {
  if (!season) return null;
  const today = dayNumber(TORONTO_DATE.format(new Date()));
  const start = dayNumber(season.startsOn);
  const elapsed = today - start;
  if (elapsed < 0 || elapsed >= season.weeks * 7) return null;
  return Math.floor(elapsed / 7) + 1;
};

interface StoreGroup {
  store: StoreClashStanding;
  players: StoreClashStanding[];
}

const groupStores = (rows: StoreClashStanding[]): StoreGroup[] => {
  const map = new Map<string, StoreGroup>();
  for (const row of rows) {
    const entry = map.get(row.storeId) ?? { store: row, players: [] };
    if (row.playerId) entry.players.push(row);
    map.set(row.storeId, entry);
  }
  return [...map.values()]
    .map((entry) => ({
      ...entry,
      players: [...entry.players].sort(
        (a, b) => (a.storeRank ?? 999) - (b.storeRank ?? 999),
      ),
    }))
    .sort(
      (a, b) =>
        (a.store.displayOrder ?? 999) - (b.store.displayOrder ?? 999) ||
        a.store.storeName.localeCompare(b.store.storeName),
    );
};

function StoreTable({
  group,
  weeks,
}: {
  group: StoreGroup;
  weeks: number;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase tracking-[0.1em] text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Rank</th>
            <th className="px-3 py-2 font-medium">Player</th>
            <th className="px-3 py-2 text-right font-medium">Weeks</th>
            <th className="px-3 py-2 text-right font-medium">Best 6</th>
            <th className="px-3 py-2 text-right font-medium">Total</th>
            {Array.from({ length: weeks }, (_, index) => (
              <th
                key={index}
                className="px-2 py-2 text-right font-medium whitespace-nowrap"
              >
                W{index + 1}
              </th>
            ))}
            <th className="px-3 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {group.players.map((player) => (
            <tr
              key={player.playerId}
              className={`hover:bg-muted/40 ${
                player.qualified ? 'bg-sky-500/5' : ''
              }`}
            >
              <td className="px-3 py-1.5 tabular-nums text-muted-foreground">
                {player.storeRank ?? '—'}
              </td>
              <td className="px-3 py-1.5">
                <PlayerLink
                  playerId={player.playerId}
                  name={player.displayName}
                />
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums">
                {player.weeksPlayed ?? '—'}
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums font-semibold">
                {player.bestSixPoints ?? '—'}
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
                {player.totalPoints ?? '—'}
              </td>
              {Array.from({ length: weeks }, (_, index) => (
                <td
                  key={index}
                  className="px-2 py-1.5 text-right tabular-nums text-muted-foreground"
                >
                  {player.weeklyPoints[String(index + 1)] ?? '—'}
                </td>
              ))}
              <td className="px-3 py-1.5">
                {player.qualified ? <QualifiedBadge /> : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {group.players.length === 0 && (
        <EmptyState>No results yet for this store.</EmptyState>
      )}
    </div>
  );
}

export default function RiftboundStoreClashPage() {
  const [seasonSlug, setSeasonSlug] = useState<string | null>(null);
  const { state, reload } = useApi<StoreClashResponse>(
    seasonSlug
      ? `/api/riftbound/store-clash?season=${encodeURIComponent(seasonSlug)}`
      : '/api/riftbound/store-clash',
  );

  const data = state.status === 'ok' ? state.data : null;
  const groups = useMemo(
    () => (data ? groupStores(data.standings) : []),
    [data],
  );
  const week = data ? currentWeek(data.season) : null;

  return (
    <RiftboundPage
      title="Store Clash"
      description="Season standings for the Ottawa/Gatineau Store Clash series."
    >
      {state.status === 'loading' && (
        <LoadingState label="Loading Store Clash…" />
      )}
      {state.status === 'error' && (
        <ErrorState label="Could not load Store Clash." onRetry={reload} />
      )}

      {data && !data.season && (
        <EmptyState>No Store Clash seasons have been added yet.</EmptyState>
      )}

      {data?.season && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-semibold">{data.season.name}</h2>
              {week && (
                <span className="text-xs text-muted-foreground">
                  Week {week} of {data.season.weeks}
                </span>
              )}
              <RiftboundSelect
                wrapperClassName="ml-auto"
                value={seasonSlug ?? data.season.slug}
                onChange={(event) => setSeasonSlug(event.target.value)}
              >
                {data.seasons.map((season) => (
                  <option key={season.slug} value={season.slug}>
                    {season.name}
                  </option>
                ))}
              </RiftboundSelect>
            </div>
            <p className="text-sm text-muted-foreground">
              {formatDateOnly(data.season.startsOn)} –{' '}
              {formatDateOnly(
                new Date(
                  Date.parse(`${data.season.startsOn}T12:00:00Z`) +
                    (data.season.weeks * 7 - 1) * 86_400_000,
                )
                  .toISOString()
                  .slice(0, 10),
              )}{' '}
              · Best {data.season.bestWeeks} of {data.season.weeks} weeks · Top
              4 per store qualify · Finals{' '}
              {formatDateOnly(data.season.finalsOn)}
            </p>
            <p className="text-xs text-muted-foreground">
              Points are match points (win 3, draw 1). A player represents the
              store where they played the most qualifying weeks.
            </p>
          </div>

          <section>
            <h2 className="text-sm font-semibold mb-2">Qualifiers</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {groups.map((group) => (
                <div
                  key={group.store.storeId}
                  className="bg-card border border-border rounded-xl p-3 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm">
                      {group.store.storeName}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {group.store.weekday ?? ''}
                    </span>
                  </div>
                  <ol className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                    {group.players.slice(0, 4).map((player) => (
                      <li key={player.playerId}>
                        <span className="tabular-nums">
                          {player.storeRank}.
                        </span>{' '}
                        <PlayerLink
                          playerId={player.playerId}
                          name={player.displayName}
                        />{' '}
                        — {player.bestSixPoints} pts
                      </li>
                    ))}
                    {group.players.length === 0 && <li>No results yet.</li>}
                  </ol>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Full standings</h2>
            {groups.map((group) => (
              <Accordion
                key={group.store.storeId}
                title={`${group.store.storeName}${group.store.weekday ? ` · ${group.store.weekday} ${group.store.startTime ?? ''}` : ''} · ${group.players.length} players`}
              >
                <StoreTable group={group} weeks={data.season?.weeks ?? 8} />
              </Accordion>
            ))}
          </section>

          <p className="text-[11px] text-muted-foreground">
            Add future seasons directly in Postgres using the season/store
            tables. Store Clash standings are live from the PlayRiftbound data
            the bot syncs every 6 hours.
          </p>
        </div>
      )}

      {data && data.season && groups.length === 0 && (
        <EmptyState>No participating stores have standings yet.</EmptyState>
      )}

      <div className="mt-4 text-xs text-muted-foreground">
        <Link href="/riftbound" className="hover:underline">
          ← Back to the leaderboard
        </Link>
      </div>
    </RiftboundPage>
  );
}
