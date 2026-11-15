import { useMemo, useState } from 'react';

import Link from 'next/link';

import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/components/riftbound/AsyncStates';
import {
  CommunityBadge,
  SquadBadge,
} from '@/components/riftbound/Badges';
import { PlayerLink } from '@/components/riftbound/PlayerLink';
import { RiftboundPage } from '@/components/riftbound/RiftboundPage';
import type {
  LeaderboardPlayer,
  LeaderboardResponse,
} from '@/lib/riftbound';
import { formatDate, shortPlayerId } from '@/lib/riftbound';
import { useApi } from '@/lib/use-api';

type Mode = 'linked' | 'squad' | 'all';

function StatTile({
  label,
  value,
  detail,
  href,
}: {
  label: string;
  value: string | number;
  detail?: string;
  href?: string;
}) {
  const inner = (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm h-full">
      <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="text-2xl font-semibold mt-1 tabular-nums">{value}</div>
      {detail && (
        <div className="text-xs text-muted-foreground mt-1">{detail}</div>
      )}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function nameCounts(players: LeaderboardPlayer[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const player of players) {
    const key = player.displayName.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

export default function RiftboundLeaderboardPage() {
  const { state, reload } = useApi<LeaderboardResponse>(
    '/api/riftbound/leaderboard',
  );
  const [mode, setMode] = useState<Mode>('linked');
  const [search, setSearch] = useState('');

  const data = state.status === 'ok' ? state.data : null;
  const duplicates = useMemo(
    () => (data ? nameCounts(data.players) : new Map<string, number>()),
    [data],
  );
  const squadCount = useMemo(
    () => data?.players.filter((player) => player.isSquad).length ?? 0,
    [data],
  );

  const players = useMemo(() => {
    if (!data) return [];
    const query = search.trim().toLowerCase();
    return data.players
      .filter((player) =>
        mode === 'linked'
          ? player.eloshowdownPlayerId != null
          : mode === 'squad'
            ? player.isSquad
            : true,
      )
      .filter(
        (player) =>
          !query ||
          player.displayName.toLowerCase().includes(query) ||
          (player.tagLine ?? '').toLowerCase().includes(query),
      );
  }, [data, mode, search]);

  return (
    <RiftboundPage
      title="Ottawa Riftbound"
      description="Elo leaderboard, events, and match history for the Ottawa/Gatineau Riftbound community."
    >
      {state.status === 'loading' && <LoadingState label="Loading players…" />}
      {state.status === 'error' && (
        <ErrorState label="Could not load the leaderboard." onRetry={reload} />
      )}
      {state.status === 'not-found' && (
        <EmptyState>No player data yet.</EmptyState>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            <StatTile
              label="Events"
              value={data.stats.events}
              detail={`${data.stats.completedEvents} completed · ${data.stats.liveEvents} live`}
              href="/riftbound/events"
            />
            <StatTile
              label="Players"
              value={data.stats.players}
              detail={`${data.stats.linkedPlayers} linked to EloShowdown`}
            />
            <StatTile label="Matches" value={data.stats.matches} />
            <StatTile label="Games" value={data.stats.games} />
            <StatTile
              label="Stores"
              value={data.stats.stores}
              href="/riftbound/stores"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex gap-1">
              <button
                onClick={() => setMode('linked')}
                className={`px-3 py-1.5 rounded-md text-xs border transition-colors ${
                  mode === 'linked'
                    ? 'bg-foreground text-background border-foreground'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                Linked ({data.stats.linkedPlayers})
              </button>
              <button
                onClick={() => setMode('squad')}
                className={`px-3 py-1.5 rounded-md text-xs border transition-colors ${
                  mode === 'squad'
                    ? 'bg-foreground text-background border-foreground'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                Squad ({squadCount})
              </button>
              <button
                onClick={() => setMode('all')}
                className={`px-3 py-1.5 rounded-md text-xs border transition-colors ${
                  mode === 'all'
                    ? 'bg-foreground text-background border-foreground'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                All players ({data.players.length})
              </button>
            </div>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search players…"
              className="w-full sm:w-64 rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-[var(--accent-color)]"
            />
          </div>

          <div className="overflow-x-auto rounded-xl border border-border shadow-sm bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-[0.1em] text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Rank</th>
                  <th className="px-3 py-2 font-medium">Player</th>
                  <th className="px-3 py-2 font-medium text-right">Elo</th>
                  <th className="px-3 py-2 font-medium text-right">Events</th>
                  <th className="px-3 py-2 font-medium">Last event</th>
                  <th className="px-3 py-2 font-medium">Tags</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {players.map((player) => {
                  const duplicate =
                    (duplicates.get(player.displayName.toLowerCase()) ?? 0) > 1;
                  return (
                    <tr
                      key={player.playerId}
                      className="hover:bg-muted/40 transition-colors"
                    >
                      <td className="px-3 py-2 tabular-nums text-muted-foreground">
                        {player.rank ?? '—'}
                      </td>
                      <td className="px-3 py-2">
                        <PlayerLink
                          playerId={player.playerId}
                          name={player.displayName}
                          className="font-medium"
                        />
                        {duplicate && (
                          <span className="text-[11px] text-muted-foreground ml-1">
                            …{shortPlayerId(player.playerId)}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {player.currentElo ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {player.localEvents}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {formatDate(player.lastEventAt)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {player.isSquad && <SquadBadge />}
                          {player.communityEligible && <CommunityBadge />}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {players.length === 0 && (
              <EmptyState>No players match that search.</EmptyState>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 mt-3 text-[11px] text-muted-foreground">
            <span>
              Active = squad or 3+ completed local events in the last 30 days.
            </span>
            <Link href="/riftbound/store-clash" className="hover:underline">
              Store Clash standings →
            </Link>
          </div>
        </>
      )}
    </RiftboundPage>
  );
}
