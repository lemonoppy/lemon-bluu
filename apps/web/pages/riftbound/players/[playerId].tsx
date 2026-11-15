import { useMemo, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/router';

import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/components/riftbound/AsyncStates';
import {
  CommunityBadge,
  OutcomeBadge,
  SquadBadge,
} from '@/components/riftbound/Badges';
import { EloChart } from '@/components/riftbound/EloChart';
import { PlayerLink } from '@/components/riftbound/PlayerLink';
import { RiftboundPage } from '@/components/riftbound/RiftboundPage';
import { Tabs } from '@/components/riftbound/Tabs';
import type {
  PlayerMatchRow,
  PlayerProfileResponse,
} from '@/lib/riftbound';
import {
  formatDate,
  formatPercent,
  formatRecord,
  formatSigned,
  shortPlayerId,
} from '@/lib/riftbound';
import { useApi } from '@/lib/use-api';

type PlayerTab = 'overview' | 'matchups' | 'events' | 'matches';

function MatchTable({ matches }: { matches: PlayerMatchRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border shadow-sm bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase tracking-[0.1em] text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Date</th>
            <th className="px-3 py-2 font-medium">Event</th>
            <th className="px-3 py-2 text-right font-medium">Round</th>
            <th className="px-3 py-2 font-medium">Opponent</th>
            <th className="px-3 py-2 font-medium">Result</th>
            <th className="px-3 py-2 text-right font-medium">Games</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {matches.map((match) => (
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
              </td>
              <td className="px-3 py-1.5">
                <PlayerLink
                  playerId={match.opponentPlayerId}
                  name={match.opponentName ?? 'Unknown'}
                />
              </td>
              <td className="px-3 py-1.5">
                <OutcomeBadge outcome={match.outcome} />
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums">
                {match.games > 0
                  ? `${match.gamesWon}–${match.gamesLost}`
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {matches.length === 0 && <EmptyState>No matches recorded.</EmptyState>}
    </div>
  );
}

export default function RiftboundPlayerPage() {
  const router = useRouter();
  const playerId =
    typeof router.query.playerId === 'string' ? router.query.playerId : null;
  const { state, reload } = useApi<PlayerProfileResponse>(
    playerId ? `/api/riftbound/players/${playerId}` : null,
  );
  const [tab, setTab] = useState<PlayerTab>('overview');
  const [matchupSort, setMatchupSort] = useState<'matches' | 'wins'>('matches');

  const data = state.status === 'ok' ? state.data : null;
  const byes = useMemo(
    () => data?.matches.filter((match) => match.isBye).length ?? 0,
    [data],
  );

  const recentMatches = useMemo(() => {
    if (!data) return [];
    const eventIds = new Set<string>();
    for (const match of data.matches) {
      eventIds.add(match.eventId);
      if (eventIds.size === 3) break;
    }
    return data.matches.filter((match) => eventIds.has(match.eventId));
  }, [data]);

  const matchups = useMemo(() => {
    if (!data) return [];
    return [...data.matchups].sort((a, b) =>
      matchupSort === 'matches'
        ? b.matches - a.matches ||
          b.wins - a.wins ||
          a.opponentName.localeCompare(b.opponentName)
        : b.wins - a.wins ||
          b.matches - a.matches ||
          a.opponentName.localeCompare(b.opponentName),
    );
  }, [data, matchupSort]);

  return (
    <RiftboundPage
      title={data?.player.displayName ?? 'Player'}
      description={
        data
          ? `${data.player.eventsPlayed} events · ${data.player.matchesPlayed} matches in Ottawa/Gatineau`
          : undefined
      }
    >
      <Link
        href="/riftbound"
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        ← Leaderboard
      </Link>

      {state.status === 'loading' && <LoadingState label="Loading player…" />}
      {state.status === 'not-found' && (
        <EmptyState>Player not found.</EmptyState>
      )}
      {state.status === 'error' && (
        <ErrorState label="Could not load this player." onRetry={reload} />
      )}

      {data && (
        <div className="space-y-6 mt-3">
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">
                {data.player.displayName}
              </span>
              {data.player.tagLine && (
                <span className="text-xs text-muted-foreground">
                  #{data.player.tagLine}
                </span>
              )}
              <span className="text-[11px] text-muted-foreground">
                …{shortPlayerId(data.player.playerId)}
              </span>
              {data.player.isSquad && <SquadBadge />}
              {data.player.communityEligible && <CommunityBadge />}
              <span className="ml-auto text-sm tabular-nums">
                {data.player.currentElo != null
                  ? `${data.player.currentElo} elo`
                  : 'Unrated'}
              </span>
            </div>
            {data.player.eloshowdownPlayerId == null && (
              <p className="text-xs text-muted-foreground">
                Not linked to EloShowdown yet. Event and match results are
                complete; Elo data will appear when linking catches up.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              ['Events', data.player.eventsPlayed],
              ['Matches', data.player.matchesPlayed],
              [
                'Record',
                formatRecord(
                  data.player.wins,
                  data.player.losses,
                  data.player.draws,
                ),
              ],
              ['Win rate', formatPercent(data.player.winRate)],
              ['Best finish', data.player.bestFinish ?? '—'],
              ['Peak elo', data.player.peakElo ?? '—'],
            ].map(([label, value]) => {
              const detail =
                label === 'Record'
                  ? `${byes} ${byes === 1 ? 'bye' : 'byes'}`
                  : null;
              return (
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
                  {detail && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {detail}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <Tabs
            active={tab}
            onChange={(key) => setTab(key as PlayerTab)}
            tabs={[
              { key: 'overview', label: 'Overview' },
              {
                key: 'matchups',
                label: 'Matchups',
                count: data.matchups.length,
              },
              { key: 'events', label: 'Events', count: data.events.length },
              { key: 'matches', label: 'Matches', count: data.matches.length },
            ]}
          />

          {tab === 'overview' && (
            <div className="space-y-6">
              <EloChart points={data.eloHistory} />
              <section>
                <h2 className="text-sm font-semibold mb-2">Recent matches</h2>
                <MatchTable matches={recentMatches} />
              </section>
              <section>
                <h2 className="text-sm font-semibold mb-2">Recent events</h2>
                <div className="overflow-x-auto rounded-xl border border-border shadow-sm bg-card">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left text-xs uppercase tracking-[0.1em] text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">Date</th>
                        <th className="px-3 py-2 font-medium">Event</th>
                        <th className="px-3 py-2 text-right font-medium">
                          Finish
                        </th>
                        <th className="px-3 py-2 font-medium">Record</th>
                        <th className="px-3 py-2 text-right font-medium">
                          Elo Δ
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.events.slice(0, 5).map((event) => (
                        <tr key={event.eventId} className="hover:bg-muted/40">
                          <td className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">
                            {formatDate(event.startsAt)}
                          </td>
                          <td className="px-3 py-1.5">
                            <Link
                              href={`/riftbound/events/${event.eventId}`}
                              className="hover:underline underline-offset-2"
                            >
                              {event.eventName}
                            </Link>
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums">
                            {event.finalRank ?? '—'}
                          </td>
                          <td className="px-3 py-1.5 tabular-nums text-muted-foreground">
                            {event.record ??
                              formatRecord(
                                event.wins,
                                event.losses,
                                event.draws,
                              )}
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums">
                            {formatSigned(event.eloChange)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {tab === 'matchups' && (
            <div className="space-y-3">
              <div className="flex gap-1">
                {(['matches', 'wins'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setMatchupSort(mode)}
                    className={`px-3 py-1.5 rounded-md text-xs border transition-colors ${
                      matchupSort === mode
                        ? 'bg-foreground text-background border-foreground'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {mode === 'matches' ? 'Most played' : 'Most wins'}
                  </button>
                ))}
              </div>
              <div className="overflow-x-auto rounded-xl border border-border shadow-sm bg-card">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase tracking-[0.1em] text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Opponent</th>
                      <th className="px-3 py-2 text-right font-medium">
                        Matches
                      </th>
                      <th className="px-3 py-2 text-right font-medium">W</th>
                      <th className="px-3 py-2 text-right font-medium">L</th>
                      <th className="px-3 py-2 text-right font-medium">D</th>
                      <th className="px-3 py-2 text-right font-medium">W%</th>
                      <th className="px-3 py-2 font-medium">Last played</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {matchups.map((matchup) => (
                      <tr
                        key={
                          matchup.opponentPlayerId ?? matchup.opponentName
                        }
                        className="hover:bg-muted/40"
                      >
                        <td className="px-3 py-1.5">
                          {matchup.opponentPlayerId ? (
                            <Link
                              href={`/riftbound/h2h/${data.player.playerId}/${matchup.opponentPlayerId}`}
                              className="hover:underline underline-offset-2"
                            >
                              {matchup.opponentName}
                            </Link>
                          ) : (
                            matchup.opponentName
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums">
                          {matchup.matches}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums">
                          {matchup.wins}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums">
                          {matchup.losses}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums">
                          {matchup.draws}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
                          {formatPercent(
                            matchup.matches > 0
                              ? matchup.wins / matchup.matches
                              : null,
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">
                          {formatDate(matchup.lastPlayedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {matchups.length === 0 && (
                  <EmptyState>No opponents recorded.</EmptyState>
                )}
              </div>
            </div>
          )}

          {tab === 'events' && (
            <div className="overflow-x-auto rounded-xl border border-border shadow-sm bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-[0.1em] text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Event</th>
                    <th className="px-3 py-2 font-medium">Store</th>
                    <th className="px-3 py-2 text-right font-medium">
                      Finish
                    </th>
                    <th className="px-3 py-2 font-medium">Record</th>
                    <th className="px-3 py-2 text-right font-medium">Pts</th>
                    <th className="px-3 py-2 text-right font-medium">Elo Δ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.events.map((event) => (
                    <tr key={event.eventId} className="hover:bg-muted/40">
                      <td className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">
                        {formatDate(event.startsAt)}
                      </td>
                      <td className="px-3 py-1.5">
                        <Link
                          href={`/riftbound/events/${event.eventId}`}
                          className="hover:underline underline-offset-2"
                        >
                          {event.eventName}
                        </Link>
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground">
                        {event.storeName ?? '—'}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        {event.finalRank ?? '—'}
                      </td>
                      <td className="px-3 py-1.5 tabular-nums text-muted-foreground">
                        {event.record ??
                          formatRecord(event.wins, event.losses, event.draws)}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        {event.points ?? '—'}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        {formatSigned(event.eloChange)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'matches' && <MatchTable matches={data.matches} />}
        </div>
      )}
    </RiftboundPage>
  );
}
