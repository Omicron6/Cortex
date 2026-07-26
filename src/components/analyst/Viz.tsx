import type { Visualization } from "@/lib/intelligence-types";

/**
 * Pure rendering layer for runtime-supplied visualizations.
 * No aggregation, statistics or derivation happens here — the shapes arrive
 * fully computed from the Crime Intelligence Runtime.
 */

function Frame({
  viz,
  children,
  height = "h-44",
}: {
  viz: Visualization;
  children: React.ReactNode;
  height?: string;
}) {
  return (
    <figure className="bg-card">
      <figcaption className="flex items-start justify-between gap-3 border-b border-border px-3 py-2">
        <div className="min-w-0">
          <div className="label-official truncate text-[11px]">{viz.title}</div>
          {viz.note && <div className="label-meta mt-0.5 truncate">{viz.note}</div>}
        </div>
        <span className="label-meta shrink-0 !text-[9px]">{viz.id}</span>
      </figcaption>
      <div className={`${height} animate-viz-in px-3 py-3`}>{children}</div>
    </figure>
  );
}

function max(viz: Visualization) {
  return Math.max(1, ...viz.points.map((p) => Math.max(p.value, p.secondary ?? 0)));
}

function TimeSeries({ viz, trend = false }: { viz: Visualization; trend?: boolean }) {
  const m = max(viz);
  const pts = viz.points.map((p, i) => {
    const x = (i / Math.max(1, viz.points.length - 1)) * 100;
    const y = 100 - (p.value / m) * 92;
    return `${x},${y}`;
  });
  return (
    <div className="flex h-full flex-col">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
        {[25, 50, 75].map((g) => (
          <line key={g} x1="0" y1={g} x2="100" y2={g} className="stroke-grid" strokeWidth="0.3" />
        ))}
        <polyline
          points={pts.join(" ")}
          fill="none"
          className="stroke-ws"
          strokeWidth="1.2"
          vectorEffect="non-scaling-stroke"
        />
        <polygon points={`0,100 ${pts.join(" ")} 100,100`} className="fill-ws/12" />
        {trend &&
          viz.points.map((p, i) => (
            <circle
              key={p.label}
              cx={(i / Math.max(1, viz.points.length - 1)) * 100}
              cy={100 - (p.value / m) * 92}
              r="1.1"
              className="fill-gold"
              vectorEffect="non-scaling-stroke"
            />
          ))}
      </svg>
      <div className="mt-2 flex justify-between">
        {viz.points.map((p) => (
          <span key={p.label} className="label-meta !text-[9px]">
            {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function Bars({ viz }: { viz: Visualization }) {
  const m = max(viz);
  return (
    <div className="flex h-full items-end gap-1.5">
      {viz.points.map((p) => (
        <div key={p.label} className="group flex h-full flex-1 flex-col items-center gap-1.5">
          <div className="flex h-full w-full items-end">
            <div
              className="w-full border-t-2 border-ws bg-ws/18 transition-colors group-hover:bg-ws/32"
              style={{ height: `${Math.max(2, (Math.abs(p.value) / m) * 100)}%` }}
              title={`${p.label}: ${p.value}${viz.unit ? ` ${viz.unit}` : ""}`}
            />
          </div>
          <span className="label-meta w-full truncate text-center !text-[9px]">{p.label}</span>
        </div>
      ))}
    </div>
  );
}

function Comparison({ viz }: { viz: Visualization }) {
  const m = max(viz);
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 items-end gap-2">
        {viz.points.map((p) => (
          <div key={p.label} className="flex h-full flex-1 flex-col items-center gap-1.5">
            <div className="flex h-full w-full items-end gap-0.5">
              <div
                className="flex-1 border-t-2 border-ws bg-ws/20"
                style={{ height: `${(p.value / m) * 100}%` }}
              />
              <div
                className="flex-1 border-t-2 border-khaki bg-khaki/15"
                style={{ height: `${((p.secondary ?? 0) / m) * 100}%` }}
              />
            </div>
            <span className="label-meta w-full truncate text-center !text-[9px]">{p.label}</span>
          </div>
        ))}
      </div>
      {viz.legend && (
        <div className="mt-2 flex gap-4">
          <span className="flex items-center gap-1.5 font-mono text-[9px] text-ws">
            <span className="size-2 bg-ws/50" />
            {viz.legend[0]}
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[9px] text-khaki">
            <span className="size-2 bg-khaki/50" />
            {viz.legend[1]}
          </span>
        </div>
      )}
    </div>
  );
}

const SLICE = ["stroke-ws", "stroke-gold", "stroke-steel", "stroke-khaki", "stroke-maroon"];

function Pie({ viz }: { viz: Visualization }) {
  const total = viz.points.reduce((s, p) => s + p.value, 0) || 1;
  let acc = 0;
  const c = 2 * Math.PI * 34;
  return (
    <div className="flex h-full items-center gap-4">
      <svg viewBox="0 0 100 100" className="h-full shrink-0">
        {viz.points.map((p, i) => {
          const frac = p.value / total;
          const dash = `${frac * c} ${c}`;
          const rot = acc * 360 - 90;
          acc += frac;
          return (
            <circle
              key={p.label}
              cx="50"
              cy="50"
              r="34"
              fill="none"
              strokeWidth="15"
              strokeDasharray={dash}
              transform={`rotate(${rot} 50 50)`}
              className={SLICE[i % SLICE.length]}
              opacity="0.75"
            />
          );
        })}
      </svg>
      <ul className="min-w-0 flex-1 space-y-1">
        {viz.points.map((p, i) => (
          <li key={p.label} className="flex items-center gap-2">
            <span
              className={`size-2 shrink-0 ${SLICE[i % SLICE.length].replace("stroke-", "bg-")}/70`}
            />
            <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
              {p.label}
            </span>
            <span className="font-mono text-[10px] text-foreground">
              {((p.value / total) * 100).toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Heatmap({ viz }: { viz: Visualization }) {
  return (
    <div className="grid h-full grid-cols-2 gap-1 sm:grid-cols-4">
      {viz.points.map((p) => (
        <div
          key={p.label}
          className="relative flex min-h-10 flex-col justify-between border border-khaki/15 p-1.5"
          style={{
            backgroundColor: `color-mix(in oklab, var(--ws-accent) ${Math.round(p.value * 62)}%, transparent)`,
          }}
          title={`${p.label}: ${p.value}`}
        >
          <span className="truncate font-mono text-[9px] text-foreground/85">{p.label}</span>
          <span className="font-mono text-[10px] text-foreground">{p.value.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}

function Matrix({ viz }: { viz: Visualization }) {
  const m = viz.matrix;
  if (!m) return null;
  return (
    <div className="h-full overflow-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th />
            {m.cols.map((c) => (
              <th key={c} className="label-meta px-1 pb-1 !text-[9px] font-normal">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {m.rows.map((r, i) => (
            <tr key={r}>
              <th className="label-meta whitespace-nowrap pr-2 text-right !text-[9px] font-normal">
                {r}
              </th>
              {m.values[i].map((v, j) => (
                <td
                  key={j}
                  className="border border-khaki/12 p-1 text-center font-mono text-[10px] text-foreground"
                  style={{
                    backgroundColor:
                      v >= 0
                        ? `color-mix(in oklab, var(--ws-accent) ${Math.round(v * 55)}%, transparent)`
                        : `color-mix(in oklab, var(--maroon) ${Math.round(-v * 60)}%, transparent)`,
                  }}
                >
                  {v.toFixed(2)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function VizPanel({ viz, height }: { viz: Visualization; height?: string }) {
  return (
    <Frame viz={viz} height={height ?? (viz.kind === "matrix" ? "h-52" : "h-44")}>
      {viz.kind === "timeseries" && <TimeSeries viz={viz} />}
      {viz.kind === "trendline" && <TimeSeries viz={viz} trend />}
      {viz.kind === "bar" && <Bars viz={viz} />}
      {viz.kind === "comparison" && <Comparison viz={viz} />}
      {viz.kind === "pie" && <Pie viz={viz} />}
      {viz.kind === "heatmap" && <Heatmap viz={viz} />}
      {viz.kind === "matrix" && <Matrix viz={viz} />}
    </Frame>
  );
}

export function VizGrid({ charts }: { charts: Visualization[] }) {
  return (
    <div className="grid gap-px bg-border lg:grid-cols-2">
      {charts.map((c) => (
        <VizPanel key={c.id} viz={c} />
      ))}
    </div>
  );
}
