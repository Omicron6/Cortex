import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { NetworkGraphView } from "@/components/analyst/NetworkGraphView";
import { IntelErrorState, IntelSkeleton } from "@/components/analyst/StatePanels";
import { networkQuery } from "@/lib/intelligence-api";
import { useAnalystScope } from "@/lib/analyst-filters";

export const Route = createFileRoute("/analyst/cni")({
  head: () => ({
    meta: [
      { title: "Crime Network Intelligence — CORTEX" },
      {
        name: "description",
        content:
          "Organised crime ecosystems rendered from the Knowledge Graph: groups, associates, vehicles, handsets, accounts and shared evidence.",
      },
      { property: "og:title", content: "Crime Network Intelligence — CORTEX" },
      { property: "og:description", content: "Interactive organised-crime network graph." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CniPage,
});

function CniPage() {
  const { filters, reset } = useAnalystScope();
  const network = useQuery(networkQuery(filters));

  return (
    <div className="p-4">
      <header className="mb-4">
        <h1 className="font-display text-lg font-semibold">Crime Network Intelligence</h1>
        <div className="label-meta mt-1">
          Organised criminal ecosystems · nodes, edges, clusters and risk scores served by the
          Knowledge Graph
        </div>
        <div className="ksp-rule mt-3 h-px w-24 opacity-70" />
      </header>

      {network.isLoading ? (
        <IntelSkeleton rows={10} />
      ) : network.isError ? (
        <IntelErrorState onRetry={() => network.refetch()} onChangeFilters={reset} />
      ) : network.data ? (
        <>
          <NetworkGraphView graph={network.data} />
          <section className="mt-4 bg-card">
            <div className="border-b border-border px-3 py-2.5">
              <span className="label-official text-xs">Entity Inventory</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {["Node", "Type", "Cluster", "Risk", "Linkage"].map((c) => (
                      <th key={c} className="label-tech px-3 py-2 text-left font-normal">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {network.data.nodes.map((n) => (
                    <tr key={n.id} className="border-b border-khaki/12 hover:bg-primary/8">
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-foreground">
                        {n.label}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                        {n.type}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-khaki">{n.cluster}</td>
                      <td
                        className={`px-3 py-2 font-mono text-[11px] ${n.risk > 0.75 ? "text-maroon" : "text-ws"}`}
                      >
                        {n.risk.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-muted-foreground">{n.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
