import React, { useState } from 'react';

export function Accordion({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted/40 transition-colors"
      >
        {title}
        <span className="text-muted-foreground text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="border-t border-border">{children}</div>}
    </div>
  );
}
