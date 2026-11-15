import { Button } from '@/components/ui/button';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground text-sm py-16">
      <span className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      {label}
    </div>
  );
}

export function ErrorState({
  label = 'Failed to load this page.',
  onRetry,
}: {
  label?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="py-16 text-center space-y-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="py-12 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
