import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { StateOverviewPanel } from "@/components/policymaker/StateOverviewPanel";
import { ExecutiveBriefPanel } from "@/components/policymaker/ExecutiveBriefPanel";
import { ExecutiveAssistant } from "@/components/policymaker/ExecutiveAssistant";
import { PolicySimulationPanel } from "@/components/policymaker/PolicySimulationPanel";
import {
  GovChartSkeleton,
  GovEmptyState,
  GovErrorState,
  GovSkeleton,
} from "@/components/policymaker/GovStatePanels";
import { VizGrid } from "@/components/analyst/Viz";
import { governanceDashboardQuery } from "@/lib/governance-api";
import { useGovernanceScope } from "@/lib/governance-scope";

export const Route = createFileRoute("/policymaker/")({
  head: () => ({
    meta: [
      { title: "Governance Workspace — CORTEX Policymaker" },
      {
        name: "description",
        content:
          "Adaptive Governance Intelligence Engine for Karnataka — statewide KPIs, district comparison, policy simulation and executive briefs for the Home Department and DGP office.",
      },
      { property: "og:title", content: "Governance Workspace — CORTEX Policymaker" },
      {
        property: "og:description",
        content: "Executive crime intelligence for statewide policing strategy.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: GovernanceWorkspace,
});

const kpiTone: Record<string, string> = {
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  critical: "text-maroon",
  gold: "text-gold",
};

function GovernanceWorkspace() {
  const { filters, reset } = useGovernanceScope();
  const dashboard = useQuery(governanceDashboardQuery(filters));
  const data = dashboard.data;

  return (
    <div className="grid min-h-[calc(100vh-9rem)] grid-cols-1 gap-px bg-border lg:grid-cols-[288px_minmax(0,1fr)] xl:grid-cols-[288px_minmax(0,1fr)_340px]">
      <div className="order-2 lg:order-1">
        <StateOverviewPanel summary={data?.summary} />
      </div>

      <div className="order-1 min-w-0 lg:order-2">
        <ExecutiveAssistant
          filters={filters}
          scopeLabel={data?.summary.scopeLabel ?? "Karnataka statewide"}
        />

        <section>
          <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2.5">
            <h1 className="label-official text-xs">Governance Dashboard</h1>
            <span className="label-meta">
              {data
                ? `${data.summary.recordsAnalysed.toLocaleString("en-IN")} records analysed`
                : "loading scope"}
            </span>
          </div>

          {dashboard.isLoading ? (
            <>
              <GovSkeleton rows={3} />
              <GovChartSkeleton />
            </>
          ) : dashboard.isError ? (
            <div className="p-4">
              <GovErrorState onRetry={() => dashboard.refetch()} onChangeFilters={reset} />
            </div>
          ) : !data ? (
            <div className="p-4">
              <GovEmptyState onReset={reset} />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-px border-b border-border bg-border md:grid-cols-4">
                {data.kpis.map((k) => (
                  <div key={k.label} className="bg-card px-3 py-2.5">
                    <div className="label-meta truncate">{k.label}</div>
                    <div className={`mt-1 font-mono text-base ${kpiTone[k.tone]}`}>{k.value}</div>
                    <div className="label-meta !text-[9px] truncate">{k.delta}</div>
                  </div>
                ))}
              </div>

              <VizGrid charts={data.charts} />

              <section className="border-t border-border">
                <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2.5">
                  <span className="label-official text-xs">District Statistics</span>
                  <span className="label-meta">{data.districtStats.length} districts</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] border-collapse text-[11px]">
                    <thead className="sticky top-0 bg-surface/70">
                      <tr>
                        {["District", "Crimes", "Clearance", "Conviction", "YoY", "Risk"].map((h) => (
                          <th
                            key={h}
                            className="label-meta border-b border-border px-3 py-2 text-left font-normal"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.districtStats.map((d) => (
                        <tr key={d.district} className="border-b border-border/60">
                          <td className="px-3 py-1.5 text-foreground">{d.district}</td>
                          <td className="px-3 py-1.5 font-mono text-muted-foreground">
                            {d.crimes.toLocaleString("en-IN")}
                          </td>
                          <td className="px-3 py-1.5 font-mono text-success">{d.clearance}%</td>
                          <td className="px-3 py-1.5 font-mono text-gold">{d.conviction}%</td>
                          <td
                            className={`px-3 py-1.5 font-mono ${d.growth > 0 ? "text-maroon" : "text-success"}`}
                          >
                            {d.growth > 0 ? "+" : ""}
                            {d.growth}%
                          </td>
                          <td className="px-3 py-1.5 font-mono uppercase text-khaki">{d.band}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <PolicySimulationPanel filters={filters} />
            </>
          )}
        </section>
      </div>

      <div className="order-3">
        <ExecutiveBriefPanel
          brief={data?.brief}
          recommendations={data?.recommendations}
          loading={dashboard.isLoading}
        />
      </div>
    </div>
  );
}
