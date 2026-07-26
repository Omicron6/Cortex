import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Gauge } from "lucide-react";
import { OperationalTimeline, OpsBars, OpsLine } from "@/components/supervisor/OpsCharts";
import { OpsErrorState, OpsSkeleton } from "@/components/supervisor/OpsStatePanels";
import { operationsQuery } from "@/lib/decision-api";
import { useSupervisorScope } from "@/lib/supervisor-scope";

export const Route = createFileRoute("/supervisor/operations")({
  head: () => ({
    meta: [
      { title: "District Operations — CORTEX Supervisor" },
      {
        name: "description",
        content:
          "District-level operational overview for Karnataka State Police — crime trend, pendency, officer workload, response times, patrol coverage and station performance.",
      },
      { property: "og:title", content: "District Operations — CORTEX Supervisor" },
      {
        property: "og:description",
        content: "Station performance, workload and response metrics from the runtime.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DistrictOperationsView,
});

const bandTone: Record<string, string> = {
  severe: "text-maroon",
  elevated: "text-warning",
  moderate: "text-khaki",
  low: "text-success",
};

function DistrictOperationsView() {
  const { district } = useSupervisorScope();
  const ops = useQuery(operationsQuery(district));

  if (ops.isLoading) return <OpsSkeleton rows={12} />;
  if (ops.isError || !ops.data)
    return (
      <div className="p-4">
        <OpsErrorState onRetry={() => ops.refetch()} />
      </div>
    );

  const data = ops.data;

  return (
    <div className="grid gap-px bg-border">
      <header className="flex flex-wrap items-center justify-between gap-3 bg-card px-4 py-3">
        <div className="min-w-0">
          <h1 className="label-official flex items-center gap-2 text-sm">
            <Gauge className="size-4 text-ws" />
            District Operations — {data.district}
          </h1>
          <p className="label-meta mt-1">{data.riskScore.note}</p>
        </div>
        <div className="text-right">
          <div className="label-meta">District risk score</div>
          <div className={`font-display text-lg font-bold ${bandTone[data.riskScore.band]}`}>
            {data.riskScore.score} · {data.riskScore.band.toUpperCase()}
          </div>
        </div>
      </header>

      <div className="grid gap-px bg-border lg:grid-cols-2">
        <OpsLine title="Crime Trend" points={data.crimeTrend} unit="incidents / month" />
        <OpsBars title="Pending Investigations" points={data.pendingInvestigations} unit="cases" />
        <OpsBars
          title="Officer Workload"
          points={data.officerWorkload}
          unit="cases per officer"
          accent="maroon"
        />
        <OpsBars
          title="Resource Utilisation"
          points={data.resourceUtilisation}
          unit="%"
          accent="gold"
        />
        <OpsLine title="Response Times" points={data.responseTimes} unit="minutes" />
        <OpsBars title="Patrol Coverage" points={data.patrolCoverage} unit="%" />
      </div>

      <section className="bg-card">
        <div className="border-b border-border px-3 py-2.5">
          <span className="label-official text-xs">Police Station Performance</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border">
                {["Station", "Disposal", "Pending", "Response", "Patrol", "Band"].map((h) => (
                  <th key={h} className="label-meta px-3 py-2 font-normal">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-khaki/12">
              {data.stations.map((s) => (
                <tr key={s.id} className="transition-colors hover:bg-surface/25">
                  <td className="px-3 py-2 text-[11px] text-foreground">{s.name}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-ws">{s.disposalRate}%</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                    {s.pending}
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                    {s.responseMinutes} min
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                    {s.patrolCoverage}%
                  </td>
                  <td
                    className={`px-3 py-2 font-mono text-[10px] uppercase ${bandTone[s.band]}`}
                  >
                    {s.band}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <OperationalTimeline events={data.emergencyIncidents} />
    </div>
  );
}
