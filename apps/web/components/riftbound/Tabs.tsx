import { cn } from '@/lib/utils';

export interface TabItem {
  key: string;
  label: string;
  count?: number;
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: TabItem[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Sections"
      className="flex flex-wrap gap-1 border-b border-border mb-4"
    >
      {tabs.map((tab) => {
        const selected = tab.key === active;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.key)}
            className={cn(
              'px-3 py-2 text-xs uppercase tracking-[0.12em] transition-colors border-b-2 -mb-px',
              selected
                ? 'border-[var(--accent-color)] text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {tab.label}
            {tab.count != null ? ` (${tab.count})` : ''}
          </button>
        );
      })}
    </div>
  );
}
