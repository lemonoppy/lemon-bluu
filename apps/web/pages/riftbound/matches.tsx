import { useEffect, useMemo, useState } from 'react';

import Link from 'next/link';
import { useDebounce } from 'use-debounce';

import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/components/riftbound/AsyncStates';
import { OutcomeBadge } from '@/components/riftbound/Badges';
import { PlayerLink } from '@/components/riftbound/PlayerLink';
import { RiftboundPage } from '@/components/riftbound/RiftboundPage';
import { RiftboundSelect } from '@/components/riftbound/RiftboundSelect';
import { Button } from '@/components/ui/button';
import type { EventsResponse, MatchesResponse } from '@/lib/riftbound';
import { formatDate } from '@/lib/riftbound';
import { useApi } from '@/lib/use-api';

export default function RiftboundMatchesPage() {
  const eventsApi = useApi<EventsResponse>('/api/riftbound/events');
  const [player, setPlayer] = useState('');
  const [debouncedPlayer] = useDebounce(player, 300);
  const [event, setEvent] = useState('all');
  const [store, setStore] = useState('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [debouncedPlayer, event, store]);

  const events = useMemo(
    () =>
      eventsApi.state.status === 'ok' ? eventsApi.state.data.events : [],
    [eventsApi.state],
  );
  const stores = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of events) {
      if (item.storeId && item.storeName) map.set(item.storeId, item.storeName);
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [events]);

  const params = new URLSearchParams({ page: String(page) });
  if (debouncedPlayer.trim()) params.set('player', debouncedPlayer.trim());
  if (event !== 'all') params.set('event', event);
  if (store !== 'all') params.set('store', store);

  const { state, reload } = useApi<MatchesResponse>(
    `/api/riftbound/matches?${params.toString()}`,
  );
  const data = state.status === 'ok' ? state.data : null;

  return (
    <RiftboundPage
      title="Match history"
      description="Every recorded match in the Ottawa/Gatineau Riftbound scene."
    >
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <input
          value={player}
          onChange={(event) => setPlayer(event.target.value)}
          placeholder="Filter by player name…"
          className="w-full sm:w-56 rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-[var(--accent-color)]"
        />
        <RiftboundSelect
          value={event}
          onChange={(e) => setEvent(e.target.value)}
          className="max-w-[280px]"
        >
          <option value="all">All events</option>
          {events
            .filter((item) => item.matchCount > 0)
            .map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
        </RiftboundSelect>
        <RiftboundSelect
          value={store}
          onChange={(e) => setStore(e.target.value)}
        >
          <option value="all">All stores</option>
          {stores.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </RiftboundSelect>
        {data && (
          <span className="text-xs text-muted-foreground ml-auto tabular-nums">
            {data.pagination.total} matches
          </span>
        )}
      </div>

      {state.status === 'loading' && <LoadingState label="Loading matches…" />}
      {state.status === 'error' && (
        <ErrorState label="Could not load matches." onRetry={reload} />
      )}

      {data && (
        <>
          <div className="overflow-x-auto rounded-xl border border-border shadow-sm bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-[0.1em] text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Event</th>
                  <th className="px-3 py-2 text-right font-medium">Round</th>
                  <th className="px-3 py-2 font-medium">Player</th>
                  <th className="px-3 py-2 text-center font-medium">Score</th>
                  <th className="px-3 py-2 font-medium">Player</th>
                  <th className="px-3 py-2 font-medium">Store</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.matches.map((match) => {
                  const winner1 = match.team1.outcome === 'WIN';
                  const winner2 = match.team2.outcome === 'WIN';
                  return (
                    <tr key={match.matchId} className="hover:bg-muted/40">
                      <td className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">
                        {formatDate(match.startsAt)}
                      </td>
                      <td className="px-3 py-1.5">
                        <Link
                          href={`/riftbound/events/${match.eventId}`}
                          className="hover:underline underline-offset-2"
                        >
                          {match.eventName}
                        </Link>
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
                        {match.roundNumber}
                        {match.tableNumber != null
                          ? ` / T${match.tableNumber}`
                          : ''}
                      </td>
                      <td
                        className={`px-3 py-1.5 ${winner1 ? 'font-semibold text-emerald-600 dark:text-emerald-400' : ''}`}
                      >
                        <PlayerLink
                          playerId={match.team1.playerId}
                          name={match.team1.displayName}
                        />
                      </td>
                      <td className="px-3 py-1.5 text-center whitespace-nowrap">
                        <span className="tabular-nums">
                          {match.games > 0
                            ? `${match.team1.gamesWon}–${match.team2.gamesWon}`
                            : '—'}
                        </span>
                        {match.team1.outcome && (
                          <span className="ml-1">
                            <OutcomeBadge outcome={match.team1.outcome} />
                          </span>
                        )}
                      </td>
                      <td
                        className={`px-3 py-1.5 ${winner2 ? 'font-semibold text-emerald-600 dark:text-emerald-400' : ''}`}
                      >
                        <PlayerLink
                          playerId={match.team2.playerId}
                          name={match.team2.displayName}
                        />
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground">
                        {match.storeName ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {data.matches.length === 0 && (
              <EmptyState>No matches match those filters.</EmptyState>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 mt-3">
            <Button
              variant="outline"
              size="sm"
              disabled={data.pagination.page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              Previous
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums">
              Page {data.pagination.page} of {data.pagination.totalPages} ·{' '}
              {data.pagination.total} matches
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={data.pagination.page >= data.pagination.totalPages}
              onClick={() => setPage((value) => value + 1)}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </RiftboundPage>
  );
}
