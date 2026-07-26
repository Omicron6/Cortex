import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { DistrictMap } from "@/components/supervisor/DistrictMap";
import { OpsErrorState, OpsSkeleton } from "@/components/supervisor/OpsStatePanels";
import { deploymentQuery } from "@/lib/decision-api";
import { useSupervisorScope } from "@/lib/supervisor-scope";

export const Route = createFileRoute("/supervisor/deployment")({
  head: () => ({
    meta: [
      { title: "Force Deployment — CORTEX Supervisor" },
      {
        name: "description",
        content:
          "Runtime-generated force deployment plans for Karnataka State Police districts — personnel, reserve units, checkpoints, drones and medical support on a district map.",
      },
      { property: "og:title", content: "Force Deployment — CORTEX Supervisor" },
      {
        property: "og:description",
        content: "Personnel, units, checkpoints and coverage rendered from the deployment service.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ForceDeployment,
});

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="bg-card p-3">
      <div className="label-official text-[11px]">{title}</div>
      <ul className="mt-2 space-y-1">
        {items.map((i) => (
          <li key={i} className="flex gap-1.5 text-[11px] text-muted-foreground">
            <span className="text-khaki">·</span>
            <span>{i}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ForceDeployment() {
  const { district, search } = useSupervisorScope();
  const deployment = useQuery(deploymentQuery(district, search.template));

  if (deployment.isLoading) return <OpsSkeleton rows={12} />;
  if (deployment.isError || !deployment.data)
    return (
      <div className="p-4">
        <OpsErrorState onRetry={() => deployment.refetch()} />
      </div>
    );

  const { plan, personnelSummary, mapLayers, scenarioLabel, district: d } = deployment.data;

  return (
    <div className="grid gap-px bg-border">
      <header className="flex flex-wrap items-center justify-between gap-3 bg-card px-4 py-3">
        <div className="min-w-0">
          <h1 className="label-official flex items-center gap-2 text-sm">
            <Users className="size-4 text-gold" />
            Force Deployment — {d}
          </h1>
          <p className="label-meta mt-1">{scenarioLabel}</p>
        </div>
        <span className="label-meta">
          generated {new Date(deployment.data.generatedAt).toISOString().slice(11, 16)}
        </span>
      </header>

      <div className="grid gap-px bg-border sm:grid-cols-3 lg:grid-cols-6">
        {personnelSummary.map((s) => (
          <div key={s.label} className="bg-card px-3 py-2.5">
            <div className="label-meta">{s.label}</div>
            <div className="mt-1 font-mono text-lg text-gold">{s.value}</div>
          </div>
        ))}
      </div>

      <DistrictMap layers={mapLayers} title={`${d} — Deployment Map`} />

      <div className="grid gap-px bg-border lg:grid-cols-2">
        <section className="bg-card">
          <div className="border-b border-border px-3 py-2">
            <span className="label-official text-[11px]">Recommended Personnel</span>
          </div>
          <ul className="divide-y divide-khaki/12">
            {plan.personnel.map((p) => (
              <li key={p.role} className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate text-[11px] text-foreground">{p.role}</span>
                  <span className="label-meta !text-[9px]">{p.source}</span>
                </span>
                <span className="font-mono text-sm text-gold">{p.count}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-card">
          <div className="border-b border-border px-3 py-2">
            <span className="label-official text-[11px]">Police Stations Involved</span>
          </div>
          <ul className="divide-y divide-khaki/12">
            {plan.stations.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate text-[11px] text-foreground">{s.name}</span>
                  <span className="label-meta !text-[9px]">{s.commander}</span>
                </span>
                <span className="font-mono text-[11px] text-ws">{s.contribution}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-card">
          <div className="border-b border-border px-3 py-2">
            <span className="label-official text-[11px]">Rapid Response Teams</span>
          </div>
          <ul className="divide-y divide-khaki/12">
            {plan.rapidResponseTeams.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate text-[11px] text-foreground">{t.label}</span>
                  <span className="label-meta !text-[9px]">Staging · {t.stagingPoint}</span>
                </span>
                <span className="font-mono text-[11px] text-maroon">{t.strength}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-card">
          <div className="border-b border-border px-3 py-2">
            <span className="label-official text-[11px]">Checkpoint Locations</span>
          </div>
          <ul className="divide-y divide-khaki/12">
            {plan.checkpoints.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate text-[11px] text-foreground">{c.location}</span>
                  <span className="label-meta !text-[9px]">{c.window}</span>
                </span>
                <span className="font-mono text-[11px] text-ws">{c.strength}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-px bg-border md:grid-cols-2 xl:grid-cols-3">
        <List title="Reserve Units" items={plan.reserveUnits} />
        <List title="Traffic Diversions" items={plan.trafficDiversions} />
        <List title="Surveillance Coverage" items={plan.surveillanceCoverage} />
        <List title="Drone Deployment" items={plan.droneDeployment} />
        <List title="Medical Support" items={plan.medicalSupport} />
        <List title="Communication Units" items={plan.communicationUnits} />
      </div>
    </div>
  );
}
