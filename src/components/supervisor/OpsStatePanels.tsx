import { AlertTriangle, RefreshCw, Send, SlidersHorizontal, Radar } from "lucide-react";

export function OpsSkeleton({ rows = 4 }: { rows?: number }) {
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

export function OpsErrorState({
  message = "Unable to retrieve operational intelligence.",
  onRetry,
  onModify,
}: {
  message?: string;
  onRetry?: () => void;
  onModify?: () => void;
}) {
  return (
    <div className="border border-critical/40 bg-critical/8 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-critical" />
        <div className="min-w-0">
          <div className="font-display text-sm font-semibold text-foreground">{message}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            The Decision Intelligence Runtime did not return a result for this district. Your
            session remains secure and no operational data was lost.
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
            {onModify && (
              <button
                onClick={onModify}
                className="inline-flex items-center gap-1.5 border border-khaki/45 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-khaki transition-colors hover:text-foreground"
              >
                <SlidersHorizontal className="size-3" />
                Modify Scenario
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

export function ScenarioEmptyState({
  suggestions,
  onSelect,
}: {
  suggestions: string[];
  onSelect: (s: string) => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-border p-8 text-center">
      <Radar className="size-7 text-gold/70" />
      <div className="mt-3 font-display text-base font-semibold">
        Describe an operational situation to begin.
      </div>
      <p className="mt-1 max-w-md text-xs text-muted-foreground">
        No active operational scenario. The engine will analyse district resources, historical
        events, crime trends and threat levels, then return a decision brief for your approval.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-1.5">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => onSelect(s)}
            className="max-w-xs border border-khaki/30 px-2 py-1 text-left font-mono text-[10px] text-khaki transition-colors hover:border-gold/50 hover:text-foreground"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
