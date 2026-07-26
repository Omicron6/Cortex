import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { VizPanel } from "@/components/analyst/Viz";
import { StateOverviewPanel } from "@/components/policymaker/StateOverviewPanel";
import {
  GovChartSkeleton,
  GovEmptyState,
  GovErrorState,
  GovSkeleton,
} from "@/components/policymaker/GovStatePanels";
import { governanceDashboardQuery, resourcePlanningQuery } from "@/lib/governance-api";
import { useGovernanceScope } from "@/lib/governance-scope";

export const Route = createFileRoute("/policymaker/resources")({
  head: () => ({
    meta: [
      { title: "Resource Planning — CORTEX Policymaker" },
      {
        name: "description",
        content:
          "Plan future policing investment for Karnataka — officer distribution, station coverage, fleet, technology adoption, forensic capacity, training needs and resource forecast.",
      },
      { property: "og:title", content: "Resource Planning — CORTEX Policymaker" },
      {
        property: "og:description",
        content: "Identify underserved regions and statewide resource gaps.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResourcePlanningPage,
});

const kpiTone: Record<string, string> = {
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  critical: "text-maroon",
  gold: "text-gold",
};

const bandTone: Record<string, string> = {
  severe: "border-maroon/50 text-maroon",
  elevated: "border-warning/50 text-warning",
  moderate: "border-primary/50 text-primary",
  low: "border-success/50 text-success",
};

function ResourcePlanningPage() {
  const { filters, reset } = useGovernanceScope();
  const resources = useQuery(resourcePlanningQuery(filters));
  const dashboard = useQuery(governanceDashboardQuery(filters));
  const data = resources.data;

  return (
    <div className="grid min-h-[calc(100vh-9rem)] grid-cols-1 gap-px bg-border lg:grid-cols-[288px_minmax(0,1fr)]">
      <div className="order-2 lg:order-1">
        <StateOverviewPanel summary={dashboard.data?.summary} />
      </div>

      <div className="order-1 min-w-0 lg:order-2">
        <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2.5">
          <h1 className="label-official text-xs">Resource Planning</h1>
          <span className="label-meta">Capacity, coverage and forecast</span>
        </div>

        {resources.isLoading ? (
          <>
            <GovSkeleton rows={3} />
            <GovChartSkeleton />
          </>
        ) : resources.isError ? (
          <div className="p-4">
            <GovErrorState onRetry={() => resources.refetch()} onChangeFilters={reset} />
          </div>
        ) : !data ? (
          <div className="p-4">
            <GovEmptyState onReset={reset} />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-px border-b border-border bg-border md:grid-cols-3 lg:grid-cols-6">
              {data.stats.map((s) => (
                <div key={s.label} className="bg-card px-3 py-2.5">
                  <div className="label-meta truncate">{s.label}</div>
                  <div className={`mt-1 font-mono text-sm ${kpiTone[s.tone]}`}>{s.value}</div>
                  <div className="label-meta !text-[9px] truncate">{s.delta}</div>
                </div>
              ))}
            </div>

            <div className="grid gap-px bg-border lg:grid-cols-2">
              <VizPanel viz={data.officerDistribution} />
              <VizPanel viz={data.stationCoverage} />
              <VizPanel viz={data.vehicleAllocation} />
              <VizPanel viz={data.technologyAdoption} />
              <VizPanel viz={data.forecast} />
            </div>

            <section className="grid gap-px border-t border-border bg-border lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
              <div className="bg-card p-4">
                <div className="label-official text-[10px]">Underserved Regions</div>
                <div className="mt-2 space-y-2">
                  {data.underserved.map((u) => (
                    <div
                      key={u.district}
                      className="flex flex-wrap items-center justify-between gap-2 border border-border p-2"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-[11px] text-foreground">{u.district}</div>
                        <div className="label-meta">{u.gap}</div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {u.requirement}
                        </span>
                        <span
                          className={`border px-1.5 font-mono text-[9px] uppercase ${bandTone[u.severity]}`}
                        >
                          {u.severity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-card p-4">
                <div className="label-official text-[10px]">Forensic Capacity</div>
                <dl className="mt-2 space-y-1.5">
                  {data.capacity.map((c) => (
                    <div key={c.label} className="border border-border p-2">
                      <dt className="label-meta">{c.label}</dt>
                      <dd className="mt-0.5 font-mono text-xs text-primary">{c.value}</dd>
                      <dd className="label-meta !text-[9px]">{c.note}</dd>
                    </div>
                  ))}
                </dl>
                <div className="label-official mt-4 text-[10px]">Training Requirements</div>
                <dl className="mt-2 space-y-1.5">
                  {data.training.map((t) => (
                    <div key={t.label} className="border border-border p-2">
                      <dt className="label-meta">{t.label}</dt>
                      <dd className="mt-0.5 font-mono text-xs text-gold">{t.value}</dd>
                      <dd className="label-meta !text-[9px]">{t.note}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
