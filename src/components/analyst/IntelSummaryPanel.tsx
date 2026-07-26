import { Activity, AlertOctagon, Flame, ListChecks, TrendingUp } from "lucide-react";
import type { IntelligenceDashboard } from "@/lib/intelligence-types";

const tone: Record<string, string> = {
  info: "text-ws border-ws/40",
  success: "text-success border-success/40",
  warning: "text-warning border-warning/40",
  critical: "text-maroon border-maroon/50",
};

const band: Record<string, string> = {
  severe: "text-maroon",
  elevated: "text-warning",
  moderate: "text-khaki",
  low: "text-success",
};

export function IntelSummaryPanel({ data }: { data: IntelligenceDashboard }) {
  return (
    <aside className="grid content-start gap-px bg-border">
      <section className="bg-card">
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <span className="label-official flex items-center gap-2 text-xs">
            <Activity className="size-3.5 text-ws" />
            Intelligence Summary
          </span>
          <span className="label-meta">live</span>
        </div>

        <div className="grid grid-cols-2 gap-px bg-border">
          <div className="bg-card px-3 py-2.5">
            <div className="label-meta">Active clusters</div>
            <div className="mt-1 font-mono text-lg text-ws">{data.clusters.length}</div>
          </div>
          <div className="bg-card px-3 py-2.5">
            <div className="label-meta">Hotspots</div>
            <div className="mt-1 font-mono text-lg text-maroon">{data.hotspots.length}</div>
          </div>
        </div>

        <div className="border-t border-border px-3 py-2.5">
          <div className="label-meta flex items-center gap-1.5">
            <Flame className="size-3 text-maroon" />
            Top hotspots
          </div>
          <ul className="mt-2 space-y-1.5">
            {data.hotspots.slice(0, 4).map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-[11px] text-foreground">{h.name}</span>
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                  {h.incidents} · {h.trend === "rising" ? "▲" : h.trend === "falling" ? "▼" : "■"}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-border px-3 py-2.5">
          <div className="label-meta">Most active crime types</div>
          <ul className="mt-2 space-y-1">
            {data.activeCrimeTypes.slice(0, 5).map((c) => (
              <li key={c.label} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
                  {c.label}
                </span>
                <span className="font-mono text-[10px] text-ws">{c.value}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-border px-3 py-2.5">
          <div className="label-meta">District risk levels</div>
          <ul className="mt-2 space-y-1">
            {data.riskLevels.slice(0, 6).map((r) => (
              <li key={r.district} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
                  {r.district}
                </span>
                <span className={`font-mono text-[10px] uppercase ${band[r.band]}`}>{r.band}</span>
                <span className="w-7 text-right font-mono text-[10px] text-foreground">
                  {r.score}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-border px-3 py-2.5">
          <div className="label-meta flex items-center gap-1.5">
            <AlertOctagon className="size-3 text-maroon" />
            Organized crime alerts
          </div>
          <ul className="mt-2 space-y-2">
            {data.organizedCrimeAlerts.map((a) => (
              <li key={a.id} className={`border-l-2 pl-2 ${tone[a.tone]}`}>
                <div className="text-[11px] text-foreground">{a.title}</div>
                <p className="text-[10px] text-muted-foreground">{a.detail}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-border px-3 py-2.5">
          <div className="label-meta flex items-center gap-1.5">
            <TrendingUp className="size-3 text-gold" />
            Repeat offender growth
          </div>
          <div className="mt-2 flex h-14 items-end gap-1">
            {data.repeatOffenderGrowth.map((g) => (
              <div key={g.label} className="flex h-full flex-1 flex-col items-center gap-1">
                <div className="flex min-h-0 w-full flex-1 items-end">
                  <div
                    className="w-full border-t-2 border-gold bg-gold/15"
                    style={{
                      height: `${Math.max(6, (g.value / Math.max(...data.repeatOffenderGrowth.map((x) => x.value))) * 100)}%`,
                    }}
                  />
                </div>
                <span className="label-meta !text-[8px]">{g.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-border px-3 py-2.5">
          <div className="label-meta">Emerging threats</div>
          <ul className="mt-2 space-y-2">
            {data.threats.map((t) => (
              <li key={t.id} className={`border-l-2 pl-2 ${tone[t.tone]}`}>
                <div className="text-[11px] text-foreground">{t.title}</div>
                <p className="text-[10px] text-muted-foreground">{t.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-card">
        <div className="border-b border-border px-3 py-2.5">
          <span className="label-official flex items-center gap-2 text-xs">
            <ListChecks className="size-3.5 text-gold" />
            AI Recommendations
          </span>
        </div>
        <ul className="divide-y divide-khaki/12">
          {data.recommendations.map((r) => (
            <li key={r.id} className="px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] text-khaki">{r.id}</span>
                <span
                  className={`font-mono text-[9px] uppercase ${
                    r.priority === "Immediate"
                      ? "text-maroon"
                      : r.priority === "High"
                        ? "text-warning"
                        : "text-muted-foreground"
                  }`}
                >
                  {r.priority}
                </span>
              </div>
              <div className="mt-1 text-[11px] text-foreground">{r.action}</div>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{r.rationale}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-card">
        <div className="border-b border-border px-3 py-2.5">
          <span className="label-official text-xs">Intelligence Timeline</span>
        </div>
        <ol className="divide-y divide-khaki/12">
          {data.timeline.map((e) => (
            <li key={e.id} className="px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className={`font-mono text-[10px] ${tone[e.tone].split(" ")[0]}`}>
                  {e.title}
                </span>
                <span className="label-meta shrink-0 !text-[9px]">
                  {new Date(e.at).toISOString().slice(11, 16)}
                </span>
              </div>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{e.detail}</p>
            </li>
          ))}
        </ol>
      </section>
    </aside>
  );
}
