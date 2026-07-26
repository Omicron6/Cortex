import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { VizGrid, VizPanel } from "@/components/analyst/Viz";
import { StateOverviewPanel } from "@/components/policymaker/StateOverviewPanel";
import {
  GovChartSkeleton,
  GovEmptyState,
  GovErrorState,
  GovSkeleton,
} from "@/components/policymaker/GovStatePanels";
import { governanceDashboardQuery, policyImpactQuery } from "@/lib/governance-api";
import { useGovernanceScope } from "@/lib/governance-scope";

export const Route = createFileRoute("/policymaker/impact")({
  head: () => ({
    meta: [
      { title: "Policy Impact — CORTEX Policymaker" },
      {
        name: "description",
        content:
          "Evaluate historical policing policy outcomes in Karnataka — CCTV deployment, cyber awareness, patrol expansion, special operations and women safety initiatives with before/after evidence.",
      },
      { property: "og:title", content: "Policy Impact — CORTEX Policymaker" },
      {
        property: "og:description",
        content: "Before/after evaluation of implemented policing interventions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PolicyImpactPage,
});

function PolicyImpactPage() {
  const { filters, reset } = useGovernanceScope();
  const impact = useQuery(policyImpactQuery(filters));
  const dashboard = useQuery(governanceDashboardQuery(filters));
  const data = impact.data;

  return (
    <div className="grid min-h-[calc(100vh-9rem)] grid-cols-1 gap-px bg-border lg:grid-cols-[288px_minmax(0,1fr)]">
      <div className="order-2 lg:order-1">
        <StateOverviewPanel summary={dashboard.data?.summary} />
      </div>

      <div className="order-1 min-w-0 lg:order-2">
        <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2.5">
          <h1 className="label-official text-xs">Policy Impact Evaluation</h1>
          <span className="label-meta">Historical outcome analysis</span>
        </div>

        {impact.isLoading ? (
          <>
            <GovSkeleton rows={3} />
            <GovChartSkeleton count={2} />
          </>
        ) : impact.isError ? (
          <div className="p-4">
            <GovErrorState onRetry={() => impact.refetch()} onChangeFilters={reset} />
          </div>
        ) : !data ? (
          <div className="p-4">
            <GovEmptyState onReset={reset} />
          </div>
        ) : (
          <>
            <VizGrid charts={data.charts} />

            <div className="grid gap-px bg-border">
              {data.evaluations.map((e) => (
                <article key={e.id} className="bg-card">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
                    <div className="min-w-0">
                      <h2 className="truncate font-display text-sm font-semibold">{e.policy}</h2>
                      <div className="label-meta mt-0.5">
                        {e.district} · {e.period} · {e.id}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <div className="text-right">
                        <div className="label-meta">Before</div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {e.before.toLocaleString("en-IN")}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="label-meta">After</div>
                        <div className="font-mono text-xs text-foreground">
                          {e.after.toLocaleString("en-IN")}
                        </div>
                      </div>
                      <div
                        className={`border px-2 py-1 font-mono text-[11px] ${e.changePct < 0 ? "border-success/50 text-success" : "border-maroon/50 text-maroon"}`}
                      >
                        {e.changePct > 0 ? "+" : ""}
                        {e.changePct}%
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-px bg-border lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
                    <div className="bg-card">
                      <VizPanel viz={e.trend} />
                    </div>
                    <div className="bg-card p-4">
                      <div className="label-tech">KPIs</div>
                      <dl className="mt-2 space-y-1.5">
                        {e.kpis.map((k) => (
                          <div key={k.label} className="flex items-start justify-between gap-2">
                            <dt className="label-meta">{k.label}</dt>
                            <dd className="text-right text-[11px] text-foreground">
                              {k.value}
                              <span className="label-meta !text-[9px] block">{k.note}</span>
                            </dd>
                          </div>
                        ))}
                      </dl>
                      <div className="label-tech mt-3">Supporting Data</div>
                      <ul className="mt-1 space-y-0.5">
                        {e.evidence.map((ev) => (
                          <li key={ev} className="text-[11px] text-muted-foreground">
                            · {ev}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3 border-t border-border/60 pt-2 font-mono text-[10px] text-gold">
                        {e.confidence}% confidence
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
