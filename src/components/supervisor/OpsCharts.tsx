import type { OperationalEvent } from "@/lib/decision-types";

const tone: Record<string, string> = {
  info: "text-ws border-ws/40",
  success: "text-success border-success/40",
  warning: "text-warning border-warning/40",
  critical: "text-maroon border-maroon/50",
};

/** Simple runtime-fed series renderers — no aggregation happens here. */
export function OpsBars({
  title,
  points,
  unit,
  accent = "ws",
}: {
  title: string;
  points: { label: string; value: number }[];
  unit?: string;
  accent?: "ws" | "gold" | "maroon";
}) {
  const max = Math.max(1, ...points.map((p) => p.value));
  const border = accent === "gold" ? "border-gold" : accent === "maroon" ? "border-maroon" : "border-ws";
  const bg = accent === "gold" ? "bg-gold/15" : accent === "maroon" ? "bg-maroon/15" : "bg-ws/18";
  return (
    <figure className="bg-card">
      <figcaption className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="label-official text-[11px]">{title}</span>
        {unit && <span className="label-meta !text-[9px]">{unit}</span>}
      </figcaption>
      <div className="flex h-40 items-end gap-1.5 px-3 py-3">
        {points.map((p) => (
          <div key={p.label} className="flex h-full flex-1 flex-col items-center gap-1.5">
            <div className="flex h-full w-full items-end">
              <div
                className={`w-full border-t-2 ${border} ${bg}`}
                style={{ height: `${Math.max(3, (p.value / max) * 100)}%` }}
                title={`${p.label}: ${p.value}`}
              />
            </div>
            <span className="label-meta w-full truncate text-center !text-[9px]">{p.label}</span>
          </div>
        ))}
      </div>
    </figure>
  );
}

export function OpsLine({
  title,
  points,
  unit,
}: {
  title: string;
  points: { label: string; value: number }[];
  unit?: string;
}) {
  const max = Math.max(1, ...points.map((p) => p.value));
  const pts = points.map((p, i) => {
    const x = (i / Math.max(1, points.length - 1)) * 100;
    return `${x},${100 - (p.value / max) * 92}`;
  });
  return (
    <figure className="bg-card">
      <figcaption className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="label-official text-[11px]">{title}</span>
        {unit && <span className="label-meta !text-[9px]">{unit}</span>}
      </figcaption>
      <div className="h-40 px-3 py-3">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-[calc(100%-1rem)] w-full">
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
        </svg>
        <div className="mt-1 flex justify-between">
          {points.map((p) => (
            <span key={p.label} className="label-meta !text-[9px]">
              {p.label}
            </span>
          ))}
        </div>
      </div>
    </figure>
  );
}

export function OperationalTimeline({ events }: { events: OperationalEvent[] }) {
  return (
    <section className="bg-card">
      <div className="border-b border-border px-3 py-2.5">
        <span className="label-official text-xs">Operational Timeline</span>
      </div>
      <ol className="divide-y divide-khaki/12">
        {events.map((e) => (
          <li key={e.id} className={`border-l-2 px-3 py-2.5 ${tone[e.tone]}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] uppercase">{e.kind}</span>
              <span className="label-meta shrink-0 !text-[9px]">
                {new Date(e.at).toISOString().slice(11, 16)}
              </span>
            </div>
            <div className="mt-0.5 text-[11px] text-foreground">{e.title}</div>
            <p className="text-[10px] text-muted-foreground">{e.detail}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
