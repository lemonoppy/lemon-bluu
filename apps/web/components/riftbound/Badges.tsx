import { cn } from '@/lib/utils';

type Tone = 'muted' | 'live' | 'warning' | 'win' | 'loss' | 'draw' | 'accent';

const toneClasses: Record<Tone, string> = {
  muted: 'border-border bg-muted text-muted-foreground',
  live: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  warning:
    'border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-400',
  win: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  loss: 'border-rose-500/30 bg-rose-500/15 text-rose-600 dark:text-rose-400',
  draw: 'border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-400',
  accent: 'border-sky-500/30 bg-sky-500/15 text-sky-600 dark:text-sky-400',
};

export function Badge({
  children,
  tone = 'muted',
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap',
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function EventStatusBadge({
  status,
  playerCount,
}: {
  status: string;
  playerCount?: number;
}) {
  if (status === 'IN_PROGRESS') {
    return (
      <Badge tone="live">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Live
      </Badge>
    );
  }
  if (status === 'UNAVAILABLE') {
    return <Badge tone="warning">Unavailable</Badge>;
  }
  if (status === 'COMPLETED' && playerCount === 0) {
    return <Badge>No results</Badge>;
  }
  return <Badge>{status === 'COMPLETED' ? 'Completed' : status}</Badge>;
}

export function OutcomeBadge({ outcome }: { outcome: string | null }) {
  if (outcome === 'WIN') return <Badge tone="win">W</Badge>;
  if (outcome === 'LOSS') return <Badge tone="loss">L</Badge>;
  if (outcome === 'DRAW' || outcome === 'TIE') {
    return <Badge tone="draw">D</Badge>;
  }
  return <Badge>—</Badge>;
}

export function QualifiedBadge() {
  return <Badge tone="accent">Top 4</Badge>;
}

export function SquadBadge() {
  return <Badge tone="warning">⭐ Squad</Badge>;
}

export function CommunityBadge() {
  return <Badge tone="accent">Active</Badge>;
}
