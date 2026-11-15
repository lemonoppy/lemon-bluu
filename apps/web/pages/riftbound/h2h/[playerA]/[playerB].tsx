import Link from 'next/link';
import { useRouter } from 'next/router';

import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/components/riftbound/AsyncStates';
import { OutcomeBadge } from '@/components/riftbound/Badges';
import { RiftboundPage } from '@/components/riftbound/RiftboundPage';
import type { H2HResponse } from '@/lib/riftbound';
import { formatDate } from '@/lib/riftbound';
import { useApi } from '@/lib/use-api';

export default function RiftboundH2HPage() {
  const router = useRouter();
  const playerA =
    typeof router.query.playerA === 'string' ? router.query.playerA : null;
  const playerB =
    typeof router.query.playerB === 'string' ? router.query.playerB : null;
  const { state, reload } = useApi<H2HResponse>(
    playerA && playerB
      ? `/api/riftbound/h2h?playerA=${encodeURIComponent(playerA)}&playerB=${encodeURIComponent(playerB)}`
      : null,
  );

  const data = state.status === 'ok' ? state.data : null;

  return (
    <RiftboundPage
      title={
        data
          ? `${data.playerA.displayName} vs ${data.playerB.displayName}`
          : 'Head-to-head'
      }
      description={
        data
          ? `${data.playerA.wins}–${data.playerB.wins} in ${data.matches.length} recorded matches`
          : undefined
      }
    >
      <Link
        href={data ? `/riftbound/players/${data.playerA.playerId}` : '/riftbound'}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        ← Back to player
      </Link>

      {state.status === 'loading' && <LoadingState label="Loading matchup…" />}
      {state.status === 'not-found' && (
        <EmptyState>One or both players were not found.</EmptyState>
      )}
      {state.status === 'error' && (
        <ErrorState label="Could not load this matchup." onRetry={reload} />
      )}

      {data && (
        <div className="space-y-6 mt-3">
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-center gap-4 text-center">
              <div>
                <Link
                  href={`/riftbound/players/${data.playerA.playerId}`}
                  className="font-semibold hover:underline underline-offset-2"
                >
                  {data.playerA.displayName}
                </Link>
                <div className="text-3xl font-bold tabular-nums">
                  {data.playerA.wins}
                </div>
              </div>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                vs
                {data.draws > 0 && (
                  <div className="normal-case tracking-normal mt-1">
                    {data.draws} draw{data.draws === 1 ? '' : 's'}
                  </div>
                )}
              </div>
              <div>
                <Link
                  href={`/riftbound/players/${data.playerB.playerId}`}
                  className="font-semibold hover:underline underline-offset-2"
                >
                  {data.playerB.displayName}
                </Link>
                <div className="text-3xl font-bold tabular-nums">
                  {data.playerB.wins}
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border shadow-sm bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-[0.1em] text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Event</th>
                  <th className="px-3 py-2 text-right font-medium">Round</th>
                  <th className="px-3 py-2 text-center font-medium">
                    {data.playerA.displayName}
                  </th>
                  <th className="px-3 py-2 text-center font-medium">Score</th>
                  <th className="px-3 py-2 text-center font-medium">
                    {data.playerB.displayName}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.matches.map((match) => (
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
                    <td className="px-3 py-1.5 text-center">
                      <OutcomeBadge outcome={match.aOutcome} />
                    </td>
                    <td className="px-3 py-1.5 text-center tabular-nums">
                      {match.aGames}–{match.bGames}
                      {match.ties > 0 ? ` (${match.ties} tie)` : ''}
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <OutcomeBadge outcome={match.bOutcome} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.matches.length === 0 && (
              <EmptyState>These players have not met yet.</EmptyState>
            )}
          </div>
        </div>
      )}
    </RiftboundPage>
  );
}
