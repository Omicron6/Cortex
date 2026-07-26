import { AlertTriangle, RefreshCw, Send, SlidersHorizontal, Telescope } from "lucide-react";

export function IntelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse bg-surface/60 ${i === 0 ? "h-4 w-2/3" : "h-3 w-full"}`}
        />
      ))}
    </div>
  );
}

export function ChartSkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-px bg-border lg:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-card p-3">
          <div className="h-3 w-1/3 animate-pulse bg-surface/60" />
          <div className="mt-3 flex h-36 items-end gap-1.5">
            {Array.from({ length: 8 }).map((_, j) => (
              <div
                key={j}
                className="flex-1 animate-pulse bg-surface/50"
                style={{ height: `${25 + ((j * 37) % 70)}%`, animationDelay: `${j * 80}ms` }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function IntelErrorState({
  message = "Unable to retrieve intelligence.",
  onRetry,
  onChangeFilters,
}: {
  message?: string;
  onRetry?: () => void;
  onChangeFilters?: () => void;
}) {
  return (
    <div className="border border-critical/40 bg-critical/8 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-critical" />
        <div className="min-w-0">
          <div className="font-display text-sm font-semibold text-foreground">{message}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            The Crime Intelligence Runtime did not return a result for this scope. Your session
            remains secure.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 border border-primary/60 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-primary transition-colors hover:bg-primary/10"
              >
                <RefreshCw className="size-3" />
                Retry
              </button>
            )}
            {onChangeFilters && (
              <button
                onClick={onChangeFilters}
                className="inline-flex items-center gap-1.5 border border-khaki/45 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-khaki transition-colors hover:text-foreground"
              >
                <SlidersHorizontal className="size-3" />
                Change Filters
              </button>
            )}
            <button className="inline-flex items-center gap-1.5 border border-border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground">
              <Send className="size-3" />
              Report Issue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function IntelEmptyState({ onBroaden }: { onBroaden: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-border p-10 text-center">
      <Telescope className="size-7 text-khaki/70" />
      <div className="mt-3 font-display text-base font-semibold">
        No intelligence available for the selected filters.
      </div>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">
        The scope is too narrow for the runtime to produce a statistically meaningful result.
        Broaden the search criteria and re-run the analysis.
      </p>
      <button
        onClick={onBroaden}
        className="mt-5 border border-primary/60 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-primary transition-colors hover:bg-primary/10"
      >
        Broaden Search Criteria
      </button>
    </div>
  );
}
