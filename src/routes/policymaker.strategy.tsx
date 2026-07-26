import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { VizGrid, VizPanel } from "@/components/analyst/Viz";
import { StateOverviewPanel } from "@/components/policymaker/StateOverviewPanel";
import {
  GovChartSkeleton,
  GovEmptyState,
  GovErrorState,
  GovSkeleton,
} from "@/components/policymaker/GovStatePanels";
import { governanceDashboardQuery, strategicIntelligenceQuery } from "@/lib/governance-api";
import { useGovernanceScope } from "@/lib/governance-scope";

export const Route = createFileRoute("/policymaker/strategy")({
  head: () => ({
    meta: [
      { title: "Strategic Intelligence — CORTEX Policymaker" },
      {
        name: "description",
        content:
          "Long-term statewide crime intelligence for Karnataka — crime evolution, five-year trends, seasonality, emerging categories, organized crime growth and infrastructure gaps.",
      },
      { property: "og:title", content: "Strategic Intelligence — CORTEX Policymaker" },
      {
        property: "og:description",
        content: "Five-year statewide trends, emerging categories and infrastructure gaps.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StrategicIntelligencePage,
});

const dirIcon = { rising: TrendingUp, falling: TrendingDown, stable: Minus } as const;
const bandTone: Record<string, string> = {
  severe: "text-maroon",
  elevated: "text-warning",
  moderate: "text-primary",
  low: "text-success",
};

function StrategicIntelligencePage() {
  const { filters, reset } = useGovernanceScope();
  const strategy = useQuery(strategicIntelligenceQuery(filters));
  const dashboard = useQuery(governanceDashboardQuery(filters));
  const data = strategy.data;

  return (
    <div className="grid min-h-[calc(100vh-9rem)] grid-cols-1 gap-px bg-border lg:grid-cols-[288px_minmax(0,1fr)]">
      <div className="order-2 lg:order-1">
        <StateOverviewPanel summary={dashboard.data?.summary} />
      </div>

      <div className="order-1 min-w-0 lg:order-2">
        <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2.5">
          <h1 className="label-official text-xs">Strategic Intelligence</h1>
          <span className="label-meta">Long-term statewide understanding</span>
        </div>

        {strategy.isLoading ? (
          <>
            <GovSkeleton rows={4} />
            <GovChartSkeleton />
          </>
        ) : strategy.isError ? (
          <div className="p-4">
            <GovErrorState onRetry={() => strategy.refetch()} onChangeFilters={reset} />
          </div>
        ) : !data ? (
          <div className="p-4">
            <GovEmptyState onReset={reset} />
          </div>
        ) : (
          <>
            <section className="grid gap-px bg-border md:grid-cols-2">
              {data.insights.map((i) => {
                const Icon = dirIcon[i.direction];
                return (
                  <article key={i.id} className="bg-card p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-display text-sm font-semibold text-foreground">
                        {i.title}
                      </h2>
                      <Icon
                        className={`size-3.5 shrink-0 ${i.direction === "rising" ? "text-maroon" : i.direction === "falling" ? "text-success" : "text-khaki"}`}
                      />
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{i.detail}</p>
                    <div className="mt-3 border-t border-border/60 pt-2">
                      <div className="label-meta">Evidence</div>
                      <ul className="mt-1 space-y-0.5">
                        {i.evidence.map((e) => (
                          <li key={e} className="text-[11px] text-muted-foreground">
                            · {e}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="label-meta !text-[9px] truncate">
                          {i.historicalContext}
                        </span>
                        <span className="shrink-0 font-mono text-[10px] text-gold">
                          {i.confidence}% confidence
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>

            <div className="grid gap-px bg-border lg:grid-cols-2">
              <VizPanel viz={data.fiveYear} />
              <VizPanel viz={data.seasonality} />
            </div>

            <VizGrid charts={data.charts} />

            <section className="grid gap-px border-t border-border bg-border lg:grid-cols-2">
              <div className="bg-card p-4">
                <div className="label-official text-[10px]">District Performance Rankings</div>
                <ol className="mt-2 space-y-1">
                  {data.rankings.slice(0, 10).map((d, i) => (
                    <li
                      key={d.district}
                      className="flex items-center justify-between border-b border-border/50 py-1 text-[11px]"
                    >
                      <span className="truncate">
                        <span className="label-meta mr-2">{String(i + 1).padStart(2, "0")}</span>
                        {d.district}
                      </span>
                      <span className="shrink-0 font-mono text-success">{d.clearance}%</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="bg-card p-4">
                <div className="label-official text-[10px]">Repeat Offender Statistics</div>
                <dl className="mt-2 space-y-2">
                  {data.repeatOffenders.map((r) => (
                    <div key={r.label} className="border border-border p-2">
                      <dt className="label-meta">{r.label}</dt>
                      <dd className="mt-0.5 font-mono text-sm text-primary">{r.value}</dd>
                      <dd className="label-meta !text-[9px]">{r.note}</dd>
                    </div>
                  ))}
                </dl>
                <div className="label-official mt-4 text-[10px]">Infrastructure Gaps</div>
                <ul className="mt-2 space-y-1">
                  {data.infrastructureGaps.map((g) => (
                    <li key={g.district} className="flex items-start justify-between gap-2 text-[11px]">
                      <span className="text-muted-foreground">
                        <span className="text-foreground">{g.district}</span> — {g.gap}
                      </span>
                      <span className={`shrink-0 font-mono text-[10px] uppercase ${bandTone[g.severity]}`}>
                        {g.severity}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
