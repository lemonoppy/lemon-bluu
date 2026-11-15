import { useEffect, useMemo, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/router';

import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/components/riftbound/AsyncStates';
import { EventStatusBadge } from '@/components/riftbound/Badges';
import { PlayerLink } from '@/components/riftbound/PlayerLink';
import { RiftboundPage } from '@/components/riftbound/RiftboundPage';
import { RiftboundSelect } from '@/components/riftbound/RiftboundSelect';
import type { EventsResponse } from '@/lib/riftbound';
import { eventTypeLabel, formatDate } from '@/lib/riftbound';
import { useApi } from '@/lib/use-api';

type StatusFilter = 'all' | 'live' | 'completed' | 'unavailable';

export default function RiftboundEventsPage() {
  const router = useRouter();
  const { state, reload } = useApi<EventsResponse>('/api/riftbound/events');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [store, setStore] = useState('all');

  useEffect(() => {
    if (router.isReady && typeof router.query.store === 'string') {
      setStore(router.query.store);
    }
  }, [router.isReady, router.query.store]);

  const events = useMemo(
    () => (state.status === 'ok' ? state.data.events : []),
    [state],
  );
  const stores = useMemo(() => {
    const map = new Map<string, string>();
    for (const event of events) {
      if (event.storeId && event.storeName) map.set(event.storeId, event.storeName);
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [events]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return events.filter((event) => {
      if (store !== 'all' && event.storeId !== store) return false;
      if (status === 'live' && event.status !== 'IN_PROGRESS') return false;
      if (status === 'completed' && event.status !== 'COMPLETED') return false;
      if (status === 'unavailable' && event.status !== 'UNAVAILABLE') return false;
      if (!query) return true;
      return (
        event.name.toLowerCase().includes(query) ||
        (event.storeName ?? '').toLowerCase().includes(query)
      );
    });
  }, [events, search, status, store]);

  return (
    <RiftboundPage
      title="Events"
      description="Every tracked Ottawa/Gatineau Riftbound event, including live rounds."
    >
      {state.status === 'loading' && <LoadingState label="Loading events…" />}
      {state.status === 'error' && (
        <ErrorState label="Could not load events." onRetry={reload} />
      )}

      {state.status === 'ok' && (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search events or stores…"
              className="w-full sm:w-64 rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-[var(--accent-color)]"
            />
            <div className="flex gap-1">
              {(
                [
                  ['all', 'All'],
                  ['live', 'Live'],
                  ['completed', 'Completed'],
                  ['unavailable', 'Unavailable'],
                ] as [StatusFilter, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setStatus(key)}
                  className={`px-3 py-1.5 rounded-md text-xs border transition-colors ${
                    status === key
                      ? 'bg-foreground text-background border-foreground'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {label}
                </button>
              ))}
            </div>
            <RiftboundSelect
              value={store}
              onChange={(event) => setStore(event.target.value)}
            >
              <option value="all">All stores</option>
              {stores.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </RiftboundSelect>
            <span className="text-xs text-muted-foreground ml-auto">
              {filtered.length} events
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border shadow-sm bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-[0.1em] text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Event</th>
                  <th className="px-3 py-2 font-medium">Store</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 text-right font-medium">Players</th>
                  <th className="px-3 py-2 text-right font-medium">Matches</th>
                  <th className="px-3 py-2 font-medium">Winner</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((event) => (
                  <tr
                    key={event.id}
                    className={`hover:bg-muted/40 transition-colors ${
                      event.status === 'IN_PROGRESS' ? 'bg-emerald-500/5' : ''
                    }`}
                  >
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                      {formatDate(event.startsAt)}
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/riftbound/events/${event.id}`}
                        className="font-medium hover:underline underline-offset-2"
                      >
                        {event.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {event.storeName ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {eventTypeLabel(event.tournamentType)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {event.playerCount}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {event.matchCount}
                    </td>
                    <td className="px-3 py-2">
                      {event.winnerName ? (
                        <PlayerLink
                          playerId={event.winnerPlayerId}
                          name={event.winnerName}
                        />
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <EventStatusBadge
                        status={event.status}
                        playerCount={event.playerCount}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <EmptyState>No events match those filters.</EmptyState>
            )}
          </div>
        </>
      )}
    </RiftboundPage>
  );
}
