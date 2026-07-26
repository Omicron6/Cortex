import { RotateCcw } from "lucide-react";
import { useGovernanceScope, type GovernanceSearch } from "@/lib/governance-scope";
import type { StateSummary } from "@/lib/governance-types";

const FY = ["FY 2021-22", "FY 2022-23", "FY 2023-24", "FY 2024-25", "FY 2025-26"];
const DISTRICTS = [
  "Bengaluru City",
  "Bengaluru Rural",
  "Mysuru",
  "Mangaluru",
  "Belagavi",
  "Kalaburagi",
  "Hubballi-Dharwad",
  "Tumakuru",
  "Ballari",
  "Vijayapura",
  "Shivamogga",
  "Davanagere",
];
const CATEGORIES = [
  "Cyber Crime",
  "Women Safety",
  "Juvenile Crime",
  "Organized Crime",
  "Financial Crime",
  "Traffic",
  "Violent Crime",
  "Narcotics",
];
const SEGMENTS = ["Urban", "Rural"];

const bandTone: Record<string, string> = {
  severe: "text-maroon border-maroon/50",
  elevated: "text-warning border-warning/50",
  moderate: "text-primary border-primary/50",
  low: "text-success border-success/50",
};

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value?: string;
  options: string[];
  onChange: (v: string | undefined) => void;
}) {
  return (
    <label className="block">
      <span className="label-meta">{label}</span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="mt-1 h-8 w-full border border-input bg-background px-2 font-mono text-[11px] text-foreground outline-none focus:border-gold/60 focus:ring-1 focus:ring-ring"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="border border-border bg-card px-3 py-2">
      <div className="label-meta truncate">{label}</div>
      <div className={`mt-1 font-mono text-sm ${tone ?? "text-foreground"}`}>{value}</div>
    </div>
  );
}

export function StateOverviewPanel({ summary }: { summary?: StateSummary | null }) {
  const { search, setFilter, reset, activeCount } = useGovernanceScope();

  return (
    <aside className="h-full bg-sidebar">
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2.5">
        <span className="label-official text-xs">Karnataka State Overview</span>
        <span className="label-meta">{summary?.financialYear ?? "FY 2025-26"}</span>
      </div>

      <div className="space-y-2 p-3">
        <div className="grid grid-cols-2 gap-2">
          <Stat
            label="Registered Crimes"
            value={summary ? summary.totalCrimes.toLocaleString("en-IN") : "—"}
            tone="text-gold"
          />
          <Stat
            label="Active Investigations"
            value={summary ? summary.activeInvestigations.toLocaleString("en-IN") : "—"}
          />
          <Stat
            label="Pending Cases"
            value={summary ? summary.pendingCases.toLocaleString("en-IN") : "—"}
            tone="text-warning"
          />
          <Stat
            label="Solved Cases"
            value={summary ? summary.solvedCases.toLocaleString("en-IN") : "—"}
            tone="text-success"
          />
          <Stat
            label="Clearance Rate"
            value={summary ? `${summary.clearanceRate}%` : "—"}
            tone="text-primary"
          />
          <Stat
            label="Officer Strength"
            value={summary ? summary.officerStrength.toLocaleString("en-IN") : "—"}
          />
        </div>

        <section className="border border-border bg-card p-3">
          <div className="label-tech">District Risk Distribution</div>
          <div className="mt-2 space-y-1.5">
            {(summary?.riskDistribution ?? []).map((r) => (
              <div key={r.band} className="flex items-center gap-2">
                <span className={`w-20 border px-1.5 font-mono text-[10px] uppercase ${bandTone[r.band]}`}>
                  {r.band}
                </span>
                <div className="h-1.5 flex-1 bg-surface/60">
                  <div
                    className={`h-1.5 ${r.band === "severe" ? "bg-maroon" : r.band === "elevated" ? "bg-warning" : r.band === "moderate" ? "bg-primary" : "bg-success"}`}
                    style={{ width: `${Math.min(100, r.districts * 18)}%` }}
                  />
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">{r.districts}</span>
              </div>
            ))}
            {!summary && <div className="h-12 animate-pulse bg-surface/50" />}
          </div>
        </section>

        <section className="border border-border bg-card p-3">
          <div className="label-tech">Top Crime Categories</div>
          <ul className="mt-2 space-y-1">
            {(summary?.topCategories ?? []).map((c) => (
              <li key={c.label} className="flex items-center justify-between text-[11px]">
                <span className="truncate text-muted-foreground">{c.label}</span>
                <span className="font-mono text-primary">{c.value}%</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="border border-border bg-card p-3">
          <div className="label-tech">Top Performing Districts</div>
          <ul className="mt-2 space-y-1">
            {(summary?.topDistricts ?? []).map((d) => (
              <li key={d.district} className="flex items-center justify-between text-[11px]">
                <span className="truncate text-muted-foreground">{d.district}</span>
                <span className="font-mono text-success">{d.clearance}%</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="border border-maroon/35 bg-maroon/5 p-3">
          <div className="label-tech !text-maroon">High Risk Districts</div>
          <ul className="mt-2 space-y-1">
            {(summary?.highRiskDistricts ?? []).map((d) => (
              <li key={d.district} className="flex items-center justify-between text-[11px]">
                <span className="truncate text-foreground">{d.district}</span>
                <span className="font-mono text-maroon">{d.score}</span>
              </li>
            ))}
            {summary && summary.highRiskDistricts.length === 0 && (
              <li className="text-[11px] text-muted-foreground">No severe districts in scope.</li>
            )}
          </ul>
        </section>

        <section className="border border-border bg-card p-3">
          <div className="flex items-center justify-between">
            <div className="label-tech">Quick Filters</div>
            {activeCount > 0 && (
              <button
                onClick={reset}
                className="inline-flex items-center gap-1 font-mono text-[10px] uppercase text-khaki hover:text-foreground"
              >
                <RotateCcw className="size-3" />
                Reset
              </button>
            )}
          </div>
          <div className="mt-2 space-y-2">
            <Select label="Financial Year" value={search.fy} options={FY} onChange={(v) => setFilter("fy", v)} />
            <Select
              label="District"
              value={search.district}
              options={DISTRICTS}
              onChange={(v) => setFilter("district", v)}
            />
            <Select
              label="Crime Category"
              value={search.category}
              options={CATEGORIES}
              onChange={(v) => setFilter("category", v)}
            />
            <div>
              <span className="label-meta">Segment</span>
              <div className="mt-1 flex gap-2">
                {SEGMENTS.map((s) => {
                  const active = search.segment === s;
                  return (
                    <button
                      key={s}
                      onClick={() => setFilter("segment", active ? undefined : s)}
                      className={`flex-1 border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors ${
                        active
                          ? "border-gold/60 bg-gold/10 text-gold"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <p className="label-meta mt-2 !text-[9px]">
            Selected filters apply to every report in this workspace.
          </p>
        </section>
      </div>
    </aside>
  );
}

export type { GovernanceSearch };
