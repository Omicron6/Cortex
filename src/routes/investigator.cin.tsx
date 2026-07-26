import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { cinQuery } from "@/lib/investigation-api";
import {
  EmptyInvestigation,
  PanelSkeleton,
  RuntimeErrorState,
} from "@/components/investigator/StatePanels";

export const Route = createFileRoute("/investigator/cin")({
  head: () => ({
    meta: [
      { title: "Criminal Intelligence Network — CORTEX" },
      {
        name: "description",
        content:
          "Case-scoped criminal intelligence network: entity nodes, relationship edges and risk scores served by the Crime Knowledge Graph.",
      },
      { property: "og:title", content: "Criminal Intelligence Network — CORTEX" },
      { property: "og:description", content: "Entity graph for the selected investigation." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CinPage,
});

function CinPage() {
  const { caseId } = Route.useSearch();
  const navigate = useNavigate();
  const cin = useQuery(cinQuery(caseId ?? ""));

  if (!caseId)
    return (
      <div className="p-6">
        <EmptyInvestigation onSelect={() => navigate({ to: "/investigator" })} />
      </div>
    );

  return (
    <div className="p-4">
      <header className="mb-4">
        <h1 className="font-display text-lg font-semibold">Criminal Intelligence Network</h1>
        <div className="label-meta mt-1">Case {caseId} · graph served by Knowledge Graph API</div>
        <div className="ksp-rule mt-3 h-px w-24 opacity-70" />
      </header>

      {cin.isLoading ? (
        <PanelSkeleton rows={8} />
      ) : cin.isError ? (
        <RuntimeErrorState onRetry={() => cin.refetch()} />
      ) : (
        <div className="grid gap-px bg-border lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <span className="label-official text-xs">Entity Nodes</span>
              <span className="label-meta">{cin.data?.nodes.length} nodes</span>
            </div>
            <ul className="divide-y divide-khaki/12">
              {cin.data?.nodes.map((n) => (
                <li key={n.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="font-mono text-[11px] text-khaki">{n.id}</span>
                  <span className="min-w-0 flex-1 truncate text-xs text-foreground">{n.label}</span>
                  <span className="label-meta">{n.type}</span>
                  <span
                    className={`font-mono text-[11px] ${
                      n.risk > 0.75 ? "text-maroon" : n.risk > 0.55 ? "text-gold" : "text-primary"
                    }`}
                  >
                    {n.risk.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <aside className="bg-card">
            <div className="border-b border-border px-4 py-2.5">
              <span className="label-official text-xs">Relationships</span>
            </div>
            <ul className="divide-y divide-khaki/12">
              {cin.data?.edges.map((e, i) => (
                <li key={i} className="px-4 py-2.5">
                  <div className="font-mono text-[11px] text-ws">
                    {e.from} → {e.to}
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">{e.type}</span>
                    <span className="font-mono text-[10px] text-gold">{e.weight.toFixed(2)}</span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-border px-4 py-2.5">
              <span className="label-meta">
                Types: {cin.data?.relationshipTypes.join(" · ")}
              </span>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
