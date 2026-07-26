import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AciePanel } from "@/components/analyst/AciePanel";
import { IntelSummaryPanel } from "@/components/analyst/IntelSummaryPanel";
import { ScopePanel } from "@/components/analyst/ScopePanel";
import { VizGrid } from "@/components/analyst/Viz";
import {
  ChartSkeletonGrid,
  IntelEmptyState,
  IntelErrorState,
  IntelSkeleton,
} from "@/components/analyst/StatePanels";
import { dashboardQuery } from "@/lib/intelligence-api";
import { useAnalystScope } from "@/lib/analyst-filters";

export const Route = createFileRoute("/analyst/")({
  head: () => ({
    meta: [
      { title: "Intelligence Workspace — CORTEX Crime Analyst" },
      {
        name: "description",
        content:
          "Adaptive Crime Intelligence Engine for Karnataka State Police analysts — statewide patterns, hotspots, networks and forecasts generated on demand.",
      },
      { property: "og:title", content: "Intelligence Workspace — CORTEX Crime Analyst" },
      {
        property: "og:description",
        content: "AI-generated statewide crime intelligence, not a static BI dashboard.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: IntelligenceWorkspace,
});

const kpiTone: Record<string, string> = {
  primary: "text-ws",
  success: "text-success",
  warning: "text-warning",
  critical: "text-maroon",
  gold: "text-gold",
};

function IntelligenceWorkspace() {
  const { filters, reset } = useAnalystScope();
  const dashboard = useQuery(dashboardQuery(filters));

  return (
    <div className="grid min-h-[calc(100vh-6rem)] grid-cols-1 gap-px bg-border lg:grid-cols-[288px_minmax(0,1fr)] xl:grid-cols-[288px_minmax(0,1fr)_320px]">
      <div className="order-2 lg:order-1">
        <ScopePanel />
      </div>

      <div className="order-1 min-w-0 lg:order-2">
        <AciePanel
          filters={filters}
          scopeLabel={dashboard.data?.scopeLabel ?? "Karnataka statewide"}
        />

        <section className="border-t border-border">
          <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2.5">
            <span className="label-official text-xs">Scope Intelligence Dashboard</span>
            <span className="label-meta">
              {dashboard.data
                ? `${dashboard.data.recordsAnalysed.toLocaleString()} records analysed`
                : "loading scope"}
            </span>
          </div>

          {dashboard.isLoading ? (
            <>
              <IntelSkeleton rows={3} />
              <ChartSkeletonGrid />
            </>
          ) : dashboard.isError ? (
            <div className="p-4">
              <IntelErrorState onRetry={() => dashboard.refetch()} onChangeFilters={reset} />
            </div>
          ) : !dashboard.data ? (
            <div className="p-4">
              <IntelEmptyState onBroaden={reset} />
            </div>
          ) : (
            <>
              <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
                {dashboard.data.kpis.map((k) => (
                  <div key={k.label} className="bg-card px-4 py-3">
                    <div className="label-meta">{k.label}</div>
                    <div className={`mt-2 font-mono text-xl ${kpiTone[k.tone]}`}>{k.value}</div>
                    <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                      {k.delta}
                    </div>
                  </div>
                ))}
              </div>
              <VizGrid charts={dashboard.data.charts} />
            </>
          )}
        </section>
      </div>

      <div className="order-3">
        {dashboard.isLoading ? (
          <IntelSkeleton rows={10} />
        ) : dashboard.data ? (
          <IntelSummaryPanel data={dashboard.data} />
        ) : (
          <div className="p-4">
            <div className="label-meta">No intelligence summary for this scope.</div>
          </div>
        )}
      </div>
    </div>
  );
}
