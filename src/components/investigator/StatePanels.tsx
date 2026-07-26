import { AlertTriangle, FolderSearch, RefreshCw, Send } from "lucide-react";

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-surface/60 ${className}`} />;
}

export function PanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonBlock key={i} className={i === 0 ? "h-4 w-2/3" : "h-3 w-full"} />
      ))}
    </div>
  );
}

export function RuntimeErrorState({
  message = "Unable to connect to Investigation Runtime.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="border border-critical/40 bg-critical/8 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-critical" />
        <div className="min-w-0">
          <div className="font-display text-sm font-semibold text-foreground">{message}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            The Crime Intelligence Runtime did not respond. Your session remains secure.
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

export function EmptyInvestigation({ onSelect }: { onSelect: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-10 text-center">
      <FolderSearch className="size-7 text-khaki/70" />
      <div className="mt-3 font-display text-base font-semibold">
        No active investigation selected.
      </div>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">
        Select an assigned FIR to load case context, copilot reasoning and evidence intelligence.
      </p>
      <button
        onClick={onSelect}
        className="mt-5 border border-primary/60 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-primary transition-colors hover:bg-primary/10"
      >
        Select Investigation
      </button>
    </div>
  );
}
