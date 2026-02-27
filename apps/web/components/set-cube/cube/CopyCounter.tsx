import { MinusIcon, PlusIcon } from '@heroicons/react/24/outline';

interface Props {
  value: number;
  onChange: (value: number) => void;
}

export default function CopyCounter({ value, onChange }: Props) {
  return (
    <span className="inline-flex items-center gap-1">
      <button
        onClick={() => onChange(value - 1)}
        disabled={value <= 1}
        className="w-5 h-5 rounded flex items-center justify-center bg-muted hover:bg-muted/80 border border-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Decrease"
      >
        <MinusIcon className="w-3 h-3 text-muted-foreground" />
      </button>
      <span className="w-6 text-center text-sm font-mono text-foreground">{value}</span>
      <button
        onClick={() => onChange(value + 1)}
        className="w-5 h-5 rounded flex items-center justify-center bg-muted hover:bg-muted/80 border border-border transition-colors"
        aria-label="Increase"
      >
        <PlusIcon className="w-3 h-3 text-muted-foreground" />
      </button>
    </span>
  );
}
