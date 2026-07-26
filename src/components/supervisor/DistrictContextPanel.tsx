import {
  CalendarClock,
  CloudSun,
  Radio,
  Siren,
  TrafficCone,
  Building2,
} from "lucide-react";
import type { DistrictOverview } from "@/lib/decision-types";
import { DISTRICTS, OPERATIONAL_TEMPLATES } from "@/lib/supervisor-scope";

const bandTone: Record<string, string> = {
  severe: "text-maroon border-maroon/50",
  elevated: "text-warning border-warning/45",
  moderate: "text-khaki border-khaki/45",
  low: "text-success border-success/45",
};

const statusTone: Record<string, string> = {
  Ready: "text-success",
  Standby: "text-ws",
  Committed: "text-warning",
  Depleted: "text-maroon",
};

const alertTone: Record<string, string> = {
  info: "text-ws border-ws/40",
  success: "text-success border-success/40",
  warning: "text-warning border-warning/40",
  critical: "text-maroon border-maroon/50",
};

interface Props {
  data: DistrictOverview;
  district: string;
  activeTemplate?: string;
  onDistrictChange: (d: string) => void;
  onTemplate: (id: string, scenario: string) => void;
}

export function DistrictContextPanel({
  data,
  district,
  activeTemplate,
  onDistrictChange,
  onTemplate,
}: Props) {
  return (
    <aside className="grid content-start gap-px bg-border">
      <section className="bg-card">
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <span className="label-official flex items-center gap-2 text-xs">
            <Building2 className="size-3.5 text-gold" />
            District Overview
          </span>
          <span className="label-meta">live</span>
        </div>

        <div className="border-b border-border px-3 py-2.5">
          <label className="label-meta" htmlFor="ops-district">
            District
          </label>
          <select
            id="ops-district"
            value={district}
            onChange={(e) => onDistrictChange(e.target.value)}
            className="mt-1.5 h-8 w-full border border-input bg-background px-2 font-mono text-[11px] text-foreground outline-none focus:border-primary/60 focus:ring-1 focus:ring-ring"
          >
            {DISTRICTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div className={`mx-3 mt-3 border-l-2 px-2 ${bandTone[data.threatLevel.band]}`}>
          <div className="label-meta">Current threat level</div>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="font-display text-lg font-bold uppercase">
              {data.threatLevel.label}
            </span>
            <span className="font-mono text-[11px]">score {data.threatLevel.score}</span>
          </div>
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-px bg-border">
          {[
            ["Available personnel", `${data.personnel.available.toLocaleString()}`],
            ["Total sanctioned", `${data.personnel.total.toLocaleString()}`],
            ["Police stations", String(data.stations)],
            ["Active investigations", data.activeInvestigations.toLocaleString()],
            ["Pending cases", data.pendingCases.toLocaleString()],
            ["Emergency incidents", String(data.emergencyIncidents)],
          ].map(([k, v]) => (
            <div key={k} className="bg-card px-3 py-2">
              <dt className="label-meta">{k}</dt>
              <dd className="mt-1 font-mono text-sm text-foreground">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="border-t border-border px-3 py-2.5">
          <div className="label-meta">Crime trend · {data.crimeTrend.window}</div>
          <div className="mt-1 flex items-center gap-2 font-mono text-[11px]">
            <span
              className={
                data.crimeTrend.direction === "rising"
                  ? "text-maroon"
                  : data.crimeTrend.direction === "falling"
                    ? "text-success"
                    : "text-khaki"
              }
            >
              {data.crimeTrend.direction === "rising"
                ? "▲"
                : data.crimeTrend.direction === "falling"
                  ? "▼"
                  : "■"}{" "}
              {data.crimeTrend.direction}
            </span>
            <span className="text-muted-foreground">{data.crimeTrend.delta}</span>
          </div>
        </div>

        <div className="border-t border-border px-3 py-2.5">
          <div className="label-meta flex items-center gap-1.5">
            <CloudSun className="size-3 text-khaki" />
            Weather
          </div>
          <div className="mt-1 font-mono text-[11px] text-foreground">
            {data.weather.summary} · {data.weather.temperature}
          </div>
          <p className="mt-0.5 text-[10px] text-muted-foreground">{data.weather.advisory}</p>
        </div>

        <div className="border-t border-border px-3 py-2.5">
          <div className="label-meta flex items-center gap-1.5">
            <CalendarClock className="size-3 text-gold" />
            Major events
          </div>
          <ul className="mt-2 space-y-2">
            {data.majorEvents.map((e) => (
              <li key={e.id} className="border-l-2 border-gold/40 pl-2">
                <div className="text-[11px] text-foreground">{e.name}</div>
                <p className="font-mono text-[10px] text-muted-foreground">
                  {e.venue} · {e.expectedCrowd.toLocaleString()} expected
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-border px-3 py-2.5">
          <div className="label-meta flex items-center gap-1.5">
            <TrafficCone className="size-3 text-warning" />
            Traffic alerts
          </div>
          <ul className="mt-2 space-y-1.5">
            {data.trafficAlerts.map((a) => (
              <li key={a.id} className={`border-l-2 pl-2 text-[10px] ${alertTone[a.severity]}`}>
                <span className="text-muted-foreground">{a.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-card">
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <span className="label-official flex items-center gap-2 text-xs">
            <Radio className="size-3.5 text-ws" />
            Current Operational Status
          </span>
        </div>
        <ul className="divide-y divide-khaki/12">
          {data.units.map((u) => (
            <li key={u.label} className="px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-[11px] text-foreground">{u.label}</span>
                <span className={`font-mono text-[9px] uppercase ${statusTone[u.status]}`}>
                  {u.status}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-1 flex-1 bg-surface/70">
                  <div
                    className="h-1 bg-ws"
                    style={{ width: `${Math.round((u.ready / u.total) * 100)}%` }}
                  />
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {u.ready}/{u.total}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-card">
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <span className="label-official flex items-center gap-2 text-xs">
            <Siren className="size-3.5 text-gold" />
            Quick Operational Templates
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5 p-3">
          {OPERATIONAL_TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => onTemplate(t.id, t.scenario)}
              className={`border px-2 py-1 font-mono text-[10px] transition-colors ${
                activeTemplate === t.id
                  ? "border-gold/60 bg-gold/12 text-gold"
                  : "border-khaki/30 text-khaki hover:border-gold/50 hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="px-3 pb-3 text-[10px] text-muted-foreground">
          Selecting a template fills the engine context with the matching operational scenario.
        </p>
      </section>
    </aside>
  );
}
