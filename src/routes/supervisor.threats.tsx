import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { DistrictMap } from "@/components/supervisor/DistrictMap";
import { OpsErrorState, OpsSkeleton } from "@/components/supervisor/OpsStatePanels";
import { threatsQuery } from "@/lib/decision-api";
import { useSupervisorScope } from "@/lib/supervisor-scope";

export const Route = createFileRoute("/supervisor/threats")({
  head: () => ({
    meta: [
      { title: "Threat Intelligence — CORTEX Supervisor" },
      {
        name: "description",
        content:
          "Live district threat picture for Karnataka State Police supervisors — hotspots, gang activity, communal alerts, cyber and financial crime signals.",
      },
      { property: "og:title", content: "Threat Intelligence — CORTEX Supervisor" },
      {
        property: "og:description",
        content: "Threats requiring immediate command attention, updated in real time.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ThreatIntelligence,
});

const bandTone: Record<string, string> = {
  severe: "text-maroon border-maroon/50",
  elevated: "text-warning border-warning/45",
  moderate: "text-khaki border-khaki/45",
  low: "text-success border-success/45",
};

function ThreatIntelligence() {
  const { district } = useSupervisorScope();
  const threats = useQuery(threatsQuery(district));

  if (threats.isLoading) return <OpsSkeleton rows={12} />;
  if (threats.isError || !threats.data)
    return (
      <div className="p-4">
        <OpsErrorState onRetry={() => threats.refetch()} />
      </div>
    );

  const data = threats.data;

  return (
    <div className="grid gap-px bg-border">
      <header className="flex flex-wrap items-center justify-between gap-3 bg-card px-4 py-3">
        <div className="min-w-0">
          <h1 className="label-official flex items-center gap-2 text-sm">
            <ShieldAlert className="size-4 text-maroon" />
            Threat Intelligence — {data.district}
          </h1>
          <p className="label-meta mt-1">
            Streaming from the Decision Intelligence Runtime · refreshed every 30s
          </p>
        </div>
        <span className="label-meta">
          updated {new Date(data.generatedAt).toISOString().slice(11, 16)}
        </span>
      </header>

      <div className="grid gap-px bg-border xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-px bg-border md:grid-cols-2">
          {data.threats.map((t) => (
            <article key={t.id} className={`border-l-2 bg-card p-3 ${bandTone[t.band]}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] text-khaki">
                  {t.id} · {t.category}
                </span>
                <span className="font-mono text-[9px] uppercase">{t.band}</span>
              </div>
              <h2 className="mt-1 font-display text-sm font-semibold text-foreground">{t.title}</h2>
              <p className="mt-1 text-[11px] text-muted-foreground">{t.detail}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="label-meta !text-[9px]">
                  confidence {t.confidence.toFixed(2)}
                </span>
                <span className="label-meta !text-[9px]">
                  {new Date(t.updatedAt).toISOString().slice(11, 16)}
                </span>
              </div>
            </article>
          ))}
        </div>

        <aside className="bg-card">
          <div className="border-b border-border px-3 py-2.5">
            <span className="label-official text-xs">District Risk Map</span>
          </div>
          <ul className="divide-y divide-khaki/12">
            {data.riskLevels.map((r) => (
              <li key={r.district} className="flex items-center gap-2 px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
                  {r.district}
                </span>
                <div className="h-1 w-16 bg-surface/70">
                  <div
                    className={`h-1 ${r.band === "severe" ? "bg-maroon" : r.band === "elevated" ? "bg-warning" : "bg-ws"}`}
                    style={{ width: `${r.score}%` }}
                  />
                </div>
                <span className="w-7 text-right font-mono text-[10px] text-foreground">
                  {r.score}
                </span>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      <DistrictMap layers={data.mapLayers} title={`${data.district} — Threat Picture`} />
    </div>
  );
}
