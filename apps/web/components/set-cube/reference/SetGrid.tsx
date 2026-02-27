import Link from 'next/link';

import type { ScryfallSet } from '@/lib/set-cube/types';

interface Props {
  sets: ScryfallSet[];
}

export default function SetGrid({ sets }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {sets.map((set) => (
        <Link
          key={set.code}
          href={`/set/reference/${set.code}`}
          className="flex flex-col items-center gap-2 p-3 bg-card border border-border rounded-xl hover:border-accent hover:shadow-md transition-all group shadow-sm"
        >
          <div className="w-10 h-10 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={set.icon_svg_uri}
              alt={set.name}
              width={36}
              height={36}
              className="opacity-40 group-hover:opacity-80 dark:opacity-60 dark:group-hover:opacity-100 transition-opacity"
              style={{
                filter: 'var(--set-icon-filter, invert(16%) sepia(61%) saturate(1600%) hue-rotate(208deg) brightness(80%))',
              }}
            />
          </div>
          <div className="text-center">
            <p className="text-xs font-medium text-muted-foreground group-hover:text-foreground dark:text-foreground transition-colors line-clamp-2">
              {set.name}
            </p>
            <p className="text-[10px] text-muted-foreground dark:text-foreground/60 mt-0.5">
              {set.code.toUpperCase()} · {set.released_at?.slice(0, 4)}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
