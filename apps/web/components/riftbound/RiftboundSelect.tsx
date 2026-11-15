import type { ComponentPropsWithoutRef } from 'react';

import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';

export function RiftboundSelect({
  className,
  wrapperClassName,
  children,
  ...props
}: ComponentPropsWithoutRef<'select'> & { wrapperClassName?: string }) {
  return (
    <div className={cn('relative', wrapperClassName)}>
      <select
        {...props}
        className={cn(
          'appearance-none rounded-md border border-border bg-background py-1.5 pl-2.5 pr-8 text-sm outline-none focus:border-[var(--accent-color)]',
          className,
        )}
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
