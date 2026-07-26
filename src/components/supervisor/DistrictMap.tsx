import { useMemo, useState } from "react";
import { Layers, Minus, Move, Plus, RotateCcw } from "lucide-react";
import type { MapLayer, MapLayerKind } from "@/lib/decision-types";

/**
 * GIS-style district map. Pure renderer for runtime-supplied layers — no
 * geospatial computation, clustering or heat estimation happens here.
 */

const KIND_STYLE: Record<MapLayerKind, { dot: string; stroke: string; glyph: string }> = {
  station: { dot: "fill-ws", stroke: "stroke-ws", glyph: "▣" },
  hotspot: { dot: "fill-maroon", stroke: "stroke-maroon", glyph: "◉" },
  patrol: { dot: "fill-steel", stroke: "stroke-steel", glyph: "→" },
  incident: { dot: "fill-warning", stroke: "stroke-warning", glyph: "✦" },
  sensitive: { dot: "fill-gold", stroke: "stroke-gold", glyph: "▲" },
  closure: { dot: "fill-khaki", stroke: "stroke-khaki", glyph: "✕" },
  deployment: { dot: "fill-gold", stroke: "stroke-gold", glyph: "◆" },
  infrastructure: { dot: "fill-khaki", stroke: "stroke-khaki", glyph: "⬢" },
};

interface Props {
  layers: MapLayer[];
  title?: string;
  height?: string;
  showHeat?: boolean;
}

export function DistrictMap({
  layers,
  title = "Interactive District Map",
  height = "h-[420px]",
  showHeat = true,
}: Props) {
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const [heat, setHeat] = useState(showHeat);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [selected, setSelected] = useState<{ label: string; detail: string; id: string } | null>(
    null,
  );

  const visible = useMemo(() => layers.filter((l) => !hidden[l.id]), [layers, hidden]);
  const hotspots = useMemo(
    () => visible.filter((l) => l.kind === "hotspot").flatMap((l) => l.features),
    [visible],
  );

  const size = 100 / zoom;
  const viewBox = `${pan.x} ${pan.y} ${size} ${size}`;

  return (
    <section className="bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
        <span className="label-official text-xs">{title}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom((z) => Math.min(4, Number((z + 0.4).toFixed(2))))}
            className="flex size-7 items-center justify-center border border-border text-muted-foreground transition-colors hover:border-ws/50 hover:text-foreground"
            aria-label="Zoom in"
          >
            <Plus className="size-3" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(1, Number((z - 0.4).toFixed(2))))}
            className="flex size-7 items-center justify-center border border-border text-muted-foreground transition-colors hover:border-ws/50 hover:text-foreground"
            aria-label="Zoom out"
          >
            <Minus className="size-3" />
          </button>
          <button
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            className="flex size-7 items-center justify-center border border-border text-muted-foreground transition-colors hover:border-ws/50 hover:text-foreground"
            aria-label="Reset view"
          >
            <RotateCcw className="size-3" />
          </button>
          <button
            onClick={() => setHeat((h) => !h)}
            className={`ml-1 flex h-7 items-center gap-1.5 border px-2 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${
              heat
                ? "border-maroon/55 bg-maroon/12 text-maroon"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            Heatmap
          </button>
        </div>
      </div>

      <div className="grid gap-px bg-border lg:grid-cols-[minmax(0,1fr)_190px]">
        <div className={`relative ${height} overflow-hidden bg-background`}>
          <div className="pointer-events-none absolute inset-0 bg-blueprint opacity-30" />
          <svg
            viewBox={viewBox}
            preserveAspectRatio="xMidYMid slice"
            className={`relative h-full w-full ${drag ? "cursor-grabbing" : "cursor-grab"}`}
            onPointerDown={(e) => setDrag({ x: e.clientX, y: e.clientY })}
            onPointerUp={() => setDrag(null)}
            onPointerLeave={() => setDrag(null)}
            onPointerMove={(e) => {
              if (!drag) return;
              const dx = ((e.clientX - drag.x) / 400) * size;
              const dy = ((e.clientY - drag.y) / 400) * size;
              setPan((p) => ({
                x: Math.max(-20, Math.min(100, p.x - dx)),
                y: Math.max(-20, Math.min(100, p.y - dy)),
              }));
              setDrag({ x: e.clientX, y: e.clientY });
            }}
          >
            {Array.from({ length: 11 }).map((_, i) => (
              <g key={i}>
                <line x1={i * 10} y1="0" x2={i * 10} y2="100" className="stroke-grid" strokeWidth="0.15" />
                <line x1="0" y1={i * 10} x2="100" y2={i * 10} className="stroke-grid" strokeWidth="0.15" />
              </g>
            ))}

            {/* tactical radar sweep */}
            <circle cx="50" cy="50" r="34" className="stroke-ws/20" fill="none" strokeWidth="0.2" />
            <circle cx="50" cy="50" r="20" className="stroke-ws/15" fill="none" strokeWidth="0.2" />

            {heat &&
              hotspots.map((f) => (
                <circle
                  key={`heat-${f.id}`}
                  cx={f.x}
                  cy={f.y}
                  r={4 + (f.intensity ?? 0.4) * 9}
                  style={{
                    fill: `color-mix(in oklab, var(--maroon) ${Math.round((f.intensity ?? 0.4) * 55)}%, transparent)`,
                  }}
                />
              ))}

            {visible.map((layer) =>
              layer.features.map((f) => {
                const style = KIND_STYLE[layer.kind];
                return (
                  <g key={`${layer.id}-${f.id}`}>
                    {f.path && (
                      <polyline
                        points={[{ x: f.x, y: f.y }, ...f.path].map((p) => `${p.x},${p.y}`).join(" ")}
                        fill="none"
                        className={`${style.stroke} opacity-70`}
                        strokeWidth="0.4"
                        strokeDasharray={layer.kind === "closure" ? "1.5 1.2" : undefined}
                      />
                    )}
                    <circle
                      cx={f.x}
                      cy={f.y}
                      r={1.4}
                      className={`${style.dot} cursor-pointer`}
                      onClick={() => setSelected({ id: f.id, label: f.label, detail: f.detail })}
                    />
                    <circle
                      cx={f.x}
                      cy={f.y}
                      r={2.8}
                      fill="none"
                      className={`${style.stroke} opacity-45`}
                      strokeWidth="0.25"
                    />
                  </g>
                );
              }),
            )}
          </svg>

          <div className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-1.5 border border-border bg-card/85 px-2 py-1">
            <Move className="size-3 text-khaki" />
            <span className="label-meta !text-[9px]">
              drag to pan · zoom ×{zoom.toFixed(1)}
            </span>
          </div>

          {selected && (
            <div className="absolute right-2 top-2 max-w-56 border border-ws/40 bg-card/95 p-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] text-khaki">{selected.id}</span>
                <button
                  onClick={() => setSelected(null)}
                  className="font-mono text-[10px] text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>
              <div className="mt-1 text-[11px] text-foreground">{selected.label}</div>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{selected.detail}</p>
            </div>
          )}
        </div>

        <div className="bg-card">
          <div className="flex items-center gap-1.5 border-b border-border px-3 py-2">
            <Layers className="size-3 text-ws" />
            <span className="label-tech">Layers</span>
          </div>
          <ul className="divide-y divide-khaki/12">
            {layers.map((l) => {
              const off = hidden[l.id];
              return (
                <li key={l.id}>
                  <button
                    onClick={() => setHidden((h) => ({ ...h, [l.id]: !h[l.id] }))}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-surface/30"
                  >
                    <span
                      className={`size-2 shrink-0 ${off ? "bg-muted-foreground/30" : KIND_STYLE[l.kind].dot.replace("fill-", "bg-")}`}
                    />
                    <span
                      className={`min-w-0 flex-1 truncate text-[11px] ${off ? "text-muted-foreground/50 line-through" : "text-foreground"}`}
                    >
                      {l.label}
                    </span>
                    <span className="font-mono text-[9px] text-khaki">{l.features.length}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
