import { useMemo } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/router';

import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/components/riftbound/AsyncStates';
import {
  EventStatusBadge,
  OutcomeBadge,
} from '@/components/riftbound/Badges';
import { PlayerLink } from '@/components/riftbound/PlayerLink';
import { RiftboundPage } from '@/components/riftbound/RiftboundPage';
import { Accordion } from '@/components/ui/accordion';
import type { EventDetailResponse, EventMatch } from '@/lib/riftbound';
import {
  eventTypeLabel,
  formatDateTime,
  formatPercent,
  formatRecord,
  formatSigned,
} from '@/lib/riftbound';
import { useApi } from '@/lib/use-api';

function MatchTable({ matches }: { matches: EventMatch[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase tracking-[0.1em] text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Table</th>
            <th className="px-3 py-2 font-medium">Player</th>
            <th className="px-3 py-2 text-center font-medium">Score</th>
            <th className="px-3 py-2 font-medium">Player</th>
            <th className="px-3 py-2 font-medium">Result</th>
            <th className="px-3 py-2 font-medium">State</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {matches.map((match) => {
            const final =
              match.team1.outcome != null || match.team2.outcome != null;
            const winner1 = match.team1.outcome === 'WIN';
            const winner2 = match.team2.outcome === 'WIN';
            return (
              <tr key={match.matchId} className="hover:bg-muted/40">
                <td className="px-3 py-1.5 text-muted-foreground tabular-nums">
                  {match.tableNumber ?? '—'}
                </td>
                <td
                  className={`px-3 py-1.5 ${winner1 ? 'font-semibold text-emerald-600 dark:text-emerald-400' : ''}`}
                >
                  <PlayerLink
                    playerId={match.team1.playerId}
                    name={match.team1.displayName}
                  />
                </td>
                <td className="px-3 py-1.5 text-center tabular-nums whitespace-nowrap">
                  {match.games > 0
                    ? `${match.team1.gamesWon}–${match.team2.gamesWon}`
                    : '—'}
                </td>
                <td
                  className={`px-3 py-1.5 ${winner2 ? 'font-semibold text-emerald-600 dark:text-emerald-400' : ''}`}
                >
                  <PlayerLink
                    playerId={match.team2.playerId}
                    name={match.team2.displayName}
                  />
                </td>
                <td className="px-3 py-1.5">
                  <OutcomeBadge outcome={match.team1.outcome} />
                  {match.ties > 0 && (
                    <span className="text-[11px] text-muted-foreground ml-1">
                      {match.ties} tie{match.ties === 1 ? '' : 's'}
                    </span>
                  )}
                </td>
                <td className="px-3 py-1.5 text-xs text-muted-foreground">
                  {final
                    ? 'Final'
                    : match.state === 'in_progress'
                      ? 'In progress'
                      : 'Pending'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function RiftboundEventPage() {
  const router = useRouter();
  const id = typeof router.query.id === 'string' ? router.query.id : null;
  const { state, reload } = useApi<EventDetailResponse>(
    id ? `/api/riftbound/events/${id}` : null,
  );

  const data = state.status === 'ok' ? state.data : null;
  const hasElo = data?.standings.some((row) => row.eloChange != null) ?? false;
  const byRound = useMemo(() => {
    const map = new Map<number, EventMatch[]>();
    for (const match of data?.matches ?? []) {
      const list = map.get(match.roundNumber) ?? [];
      list.push(match);
      map.set(match.roundNumber, list);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [data]);

  return (
    <RiftboundPage
      title={data?.event.name ?? 'Event'}
      description={
        data
          ? `${eventTypeLabel(data.event.tournamentType)} at ${data.event.store?.name ?? 'an unknown store'}`
          : undefined
      }
    >
      <Link
        href="/riftbound/events"
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        ← All events
      </Link>

      {state.status === 'loading' && <LoadingState label="Loading event…" />}
      {state.status === 'not-found' && (
        <EmptyState>Event not found.</EmptyState>
      )}
      {state.status === 'error' && (
        <ErrorState label="Could not load this event." onRetry={reload} />
      )}

      {data && (
        <div className="space-y-6 mt-3">
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <EventStatusBadge
                status={data.event.status}
                playerCount={data.standings.length}
              />
              <span className="text-xs text-muted-foreground">
                {formatDateTime(data.event.startsAt)}
              </span>
              <a
                href={`https://playriftbound.com/en-US/events/${data.event.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground ml-auto"
              >
                PlayRiftbound ↗
              </a>
            </div>
            <div className="text-sm text-muted-foreground">
              {data.event.store ? (
                <>
                  <span className="text-foreground">
                    {data.event.store.name}
                  </span>
                  {(data.event.store.address?.formattedAddress ??
                  data.event.location?.formattedAddress)
                    ? ` — ${data.event.store.address?.formattedAddress ?? data.event.location?.formattedAddress}`
                    : ''}
                </>
              ) : (
                'No store recorded'
              )}
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
              <span>{eventTypeLabel(data.event.tournamentType)}</span>
              <span>{data.event.structure ?? 'Unknown structure'}</span>
              <span>{data.event.roundCount ?? '—'} Swiss rounds</span>
              <span>Top {data.event.topCut ?? '—'}</span>
              <span>
                Synced {formatDateTime(data.event.lastFetchedAt)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              ['Players', data.standings.length],
              ['Rounds', data.rounds.length],
              ['Matches', data.matches.length],
              ['Standings round', data.standingsRound ?? '—'],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="bg-card border border-border rounded-xl p-3 shadow-sm"
              >
                <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  {label}
                </div>
                <div className="text-xl font-semibold tabular-nums">
                  {value}
                </div>
              </div>
            ))}
          </div>

          {data.event.status === 'UNAVAILABLE' && (
            <EmptyState>
              PlayRiftbound did not provide results for this event.
            </EmptyState>
          )}

          {data.standings.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold mb-2">
                {data.event.status === 'COMPLETED'
                  ? 'Final standings'
                  : `Standings after round ${data.standingsRound ?? '—'}`}
              </h2>
              <div className="overflow-x-auto rounded-xl border border-border shadow-sm bg-card">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase tracking-[0.1em] text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Rank</th>
                      <th className="px-3 py-2 font-medium">Player</th>
                      <th className="px-3 py-2 font-medium">Record</th>
                      <th className="px-3 py-2 text-right font-medium">Pts</th>
                      <th className="px-3 py-2 text-right font-medium">OMW%</th>
                      <th className="px-3 py-2 text-right font-medium">GW%</th>
                      <th className="px-3 py-2 text-right font-medium">OGW%</th>
                      {hasElo && (
                        <th className="px-3 py-2 text-right font-medium">
                          Elo Δ
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.standings.map((row) => (
                      <tr key={row.playerId} className="hover:bg-muted/40">
                        <td className="px-3 py-1.5 tabular-nums text-muted-foreground">
                          {row.rank ?? '—'}
                        </td>
                        <td className="px-3 py-1.5">
                          <PlayerLink
                            playerId={row.playerId}
                            name={row.displayName}
                          />
                          {row.tagLine && (
                            <span className="text-[11px] text-muted-foreground ml-1">
                              #{row.tagLine}
                            </span>
                          )}
                          {row.status === 'DROPPED' && (
                            <span className="text-[11px] text-amber-600 ml-1">
                              dropped
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 tabular-nums text-muted-foreground">
                          {formatRecord(row.wins, row.losses, row.draws)}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums">
                          {row.matchPoints ?? '—'}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
                          {formatPercent(row.omw)}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
                          {formatPercent(row.gw)}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
                          {formatPercent(row.ogw)}
                        </td>
                        {hasElo && (
                          <td className="px-3 py-1.5 text-right tabular-nums">
                            {formatSigned(row.eloChange)}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {data.standings.length === 0 &&
            data.event.status !== 'UNAVAILABLE' && (
              <EmptyState>No results recorded for this event.</EmptyState>
            )}

          {byRound.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold mb-2">Rounds</h2>
              {byRound.map(([roundNumber, matches], index) => {
                const round = data.rounds.find(
                  (entry) => entry.roundNumber === roundNumber,
                );
                return (
                  <Accordion
                    key={roundNumber}
                    title={`Round ${roundNumber}${round?.sectionType ? ` · ${round.sectionType}` : ''} · ${matches.length} matches`}
                    defaultOpen={index === byRound.length - 1}
                  >
                    <MatchTable matches={matches} />
                  </Accordion>
                );
              })}
            </section>
          )}

          {data.rounds.length > 0 && (
            <p className="text-[11px] text-muted-foreground">
              Round statuses:{' '}
              {data.rounds
                .map((round) => `R${round.roundNumber} ${round.status ?? '—'}`)
                .join(' · ')}
            </p>
          )}
        </div>
      )}
    </RiftboundPage>
  );
}
