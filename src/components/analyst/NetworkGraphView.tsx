import { useMemo, useState } from "react";
import { Maximize2, Minus, Plus, RotateCcw } from "lucide-react";
import type { NetworkGraph, NetworkNode } from "@/lib/intelligence-types";

/**
 * Interactive renderer for a runtime-supplied network graph.
 * Layout is deterministic placement of returned nodes — no graph generation,
 * no clustering, no scoring happens on the client.
 */
export function NetworkGraphView({
  graph,
  height = 420,
}: {
  graph: NetworkGraph;
  height?: number;
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [selected, setSelected] = useState<NetworkNode | null>(null);
  const [collapsed, setCollapsed] = useState<string[]>([]);

  const clusters = graph.clusters.length
    ? graph.clusters
    : [{ id: "all", label: "Network", risk: 0, members: graph.nodes.length, districts: [] }];

  const positions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    clusters.forEach((c, ci) => {
      const members = graph.nodes.filter((n) => n.cluster === c.id || clusters.length === 1);
      const angleBase = (ci / clusters.length) * Math.PI * 2;
      const cx = 500 + Math.cos(angleBase) * (clusters.length > 1 ? 210 : 0);
      const cy = 260 + Math.sin(angleBase) * (clusters.length > 1 ? 110 : 0);
      members.forEach((n, i) => {
        if (i === 0) {
          map.set(n.id, { x: cx, y: cy });
          return;
        }
        const a = ((i - 1) / Math.max(1, members.length - 1)) * Math.PI * 2;
        map.set(n.id, { x: cx + Math.cos(a) * 110, y: cy + Math.sin(a) * 78 });
      });
    });
    return map;
  }, [graph, clusters]);

  const hidden = (id: string) => {
    const node = graph.nodes.find((n) => n.id === id);
    return node ? collapsed.includes(node.cluster) && !id.endsWith("-N0") : false;
  };

  return (
    <div className="grid gap-px bg-border xl:grid-cols-[minmax(0,1fr)_260px]">
      <div className="relative overflow-hidden bg-card">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="label-official text-xs">Network Graph</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setZoom((z) => Math.min(2.4, z + 0.2))}
              className="flex size-6 items-center justify-center border border-border text-muted-foreground hover:text-primary"
              aria-label="Zoom in"
            >
              <Plus className="size-3" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
              className="flex size-6 items-center justify-center border border-border text-muted-foreground hover:text-primary"
              aria-label="Zoom out"
            >
              <Minus className="size-3" />
            </button>
            <button
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              className="flex size-6 items-center justify-center border border-border text-muted-foreground hover:text-primary"
              aria-label="Reset view"
            >
              <RotateCcw className="size-3" />
            </button>
          </div>
        </div>

        <svg
          viewBox="0 0 1000 520"
          style={{ height }}
          className="w-full cursor-grab active:cursor-grabbing"
          onPointerDown={(e) => setDrag({ x: e.clientX - pan.x, y: e.clientY - pan.y })}
          onPointerMove={(e) => drag && setPan({ x: e.clientX - drag.x, y: e.clientY - drag.y })}
          onPointerUp={() => setDrag(null)}
          onPointerLeave={() => setDrag(null)}
        >
          <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
            {graph.edges.map((e, i) => {
              const a = positions.get(e.from);
              const b = positions.get(e.to);
              if (!a || !b || hidden(e.from) || hidden(e.to)) return null;
              return (
                <line
                  key={i}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  className={e.type === "cross-cluster link" ? "stroke-gold/50" : "stroke-steel/45"}
                  strokeWidth={0.6 + e.weight * 1.6}
                />
              );
            })}
            {graph.nodes.map((n) => {
              const p = positions.get(n.id);
              if (!p || hidden(n.id)) return null;
              const hub = n.type === "Group";
              const r = hub ? 13 : 6 + n.risk * 4;
              return (
                <g
                  key={n.id}
                  transform={`translate(${p.x} ${p.y})`}
                  onClick={() => setSelected(n)}
                  className="cursor-pointer"
                >
                  <circle
                    r={r}
                    className={
                      n.risk > 0.75
                        ? "fill-maroon/35 stroke-maroon"
                        : hub
                          ? "fill-gold/25 stroke-gold"
                          : "fill-ws/20 stroke-ws"
                    }
                    strokeWidth="1"
                  />
                  <text
                    x={r + 4}
                    y="3"
                    className="fill-khaki font-mono"
                    style={{ fontSize: hub ? 11 : 8 }}
                  >
                    {n.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        <div className="flex flex-wrap items-center gap-3 border-t border-border px-3 py-2">
          {graph.relationshipTypes.slice(0, 7).map((t) => (
            <span key={t} className="label-meta !text-[9px]">
              {t}
            </span>
          ))}
        </div>
      </div>

      <aside className="grid content-start gap-px bg-border">
        <div className="bg-card p-3">
          <div className="label-official text-xs">Clusters</div>
          <ul className="mt-2 space-y-1.5">
            {clusters.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() =>
                    setCollapsed((prev) =>
                      prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id],
                    )
                  }
                  className="w-full border border-border px-2 py-1.5 text-left transition-colors hover:border-ws/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-mono text-[11px] text-ws">{c.label}</span>
                    <span className="label-meta shrink-0 !text-[9px]">
                      {collapsed.includes(c.id) ? "expand" : "collapse"}
                    </span>
                  </div>
                  <div className="label-meta mt-0.5">
                    {c.members} nodes · risk {c.risk.toFixed(2)}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-card p-3">
          <div className="label-official flex items-center gap-2 text-xs">
            <Maximize2 className="size-3.5 text-khaki" />
            Node Detail
          </div>
          {selected ? (
            <dl className="mt-2 space-y-1.5">
              <div>
                <dt className="label-meta">Label</dt>
                <dd className="font-mono text-[11px] text-foreground">{selected.label}</dd>
              </div>
              <div>
                <dt className="label-meta">Type</dt>
                <dd className="text-[11px] text-muted-foreground">{selected.type}</dd>
              </div>
              <div>
                <dt className="label-meta">Risk score</dt>
                <dd
                  className={`font-mono text-[11px] ${selected.risk > 0.75 ? "text-maroon" : "text-ws"}`}
                >
                  {selected.risk.toFixed(2)}
                </dd>
              </div>
              <div>
                <dt className="label-meta">Linkage</dt>
                <dd className="text-[11px] text-muted-foreground">{selected.detail}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Select a node to inspect its runtime-supplied attributes.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
