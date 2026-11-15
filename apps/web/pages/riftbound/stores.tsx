import { useMemo, useState } from 'react';

import Link from 'next/link';

import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/components/riftbound/AsyncStates';
import { Badge } from '@/components/riftbound/Badges';
import { RiftboundPage } from '@/components/riftbound/RiftboundPage';
import type { StoresResponse } from '@/lib/riftbound';
import { formatDate } from '@/lib/riftbound';
import { useApi } from '@/lib/use-api';

export default function RiftboundStoresPage() {
  const { state, reload } = useApi<StoresResponse>('/api/riftbound/stores');
  const [search, setSearch] = useState('');

  const stores = useMemo(() => {
    if (state.status !== 'ok') return [];
    const query = search.trim().toLowerCase();
    if (!query) return state.data.stores;
    return state.data.stores.filter(
      (store) =>
        store.name.toLowerCase().includes(query) ||
        (store.address ?? '').toLowerCase().includes(query),
    );
  }, [state, search]);

  return (
    <RiftboundPage
      title="Stores"
      description="Stores hosting tracked Riftbound events in Ottawa/Gatineau."
    >
      {state.status === 'loading' && <LoadingState label="Loading stores…" />}
      {state.status === 'error' && (
        <ErrorState label="Could not load stores." onRetry={reload} />
      )}

      {state.status === 'ok' && (
        <>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search stores or addresses…"
            className="w-full sm:w-72 rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-[var(--accent-color)] mb-4"
          />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stores.map((store) => {
              const mapUrl =
                store.latitude != null && store.longitude != null
                  ? `https://www.google.com/maps/search/?api=1&query=${store.latitude},${store.longitude}`
                  : store.googlePlaceId
                    ? `https://www.google.com/maps/search/?api=1&query_place_id=${store.googlePlaceId}`
                    : null;
              return (
                <div
                  key={store.id}
                  className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/riftbound/events?store=${store.id}`}
                      className="font-semibold hover:underline underline-offset-2"
                    >
                      {store.name}
                    </Link>
                    {store.liveEvents > 0 && <Badge tone="live">Live</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {store.address ?? 'Address not available.'}
                  </p>
                  <div className="text-xs text-muted-foreground mt-auto flex flex-wrap gap-x-4 gap-y-1">
                    <span>
                      {store.eventCount} event{store.eventCount === 1 ? '' : 's'}
                    </span>
                    <span>Last {formatDate(store.lastEventAt)}</span>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <Link
                      href={`/riftbound/events?store=${store.id}`}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Events →
                    </Link>
                    {mapUrl && (
                      <a
                        href={mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        Map ↗
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {stores.length === 0 && (
            <EmptyState>No stores match that search.</EmptyState>
          )}
        </>
      )}
    </RiftboundPage>
  );
}
