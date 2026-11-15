import Link from 'next/link';

import { cn } from '@/lib/utils';

export function PlayerLink({
  playerId,
  name,
  className,
}: {
  playerId: string | null;
  name: string | null;
  className?: string;
}) {
  const label = name ?? 'Unknown';
  if (!playerId) return <span className={className}>{label}</span>;
  return (
    <Link
      href={`/riftbound/players/${playerId}`}
      className={cn('hover:underline underline-offset-2', className)}
    >
      {label}
    </Link>
  );
}
