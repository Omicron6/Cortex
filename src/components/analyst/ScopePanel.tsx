import { RotateCcw, SlidersHorizontal, Zap } from "lucide-react";
import { useAnalystScope, type AnalystSearch } from "@/lib/analyst-filters";

const DISTRICTS = [
  "Bengaluru City",
  "Bengaluru Rural",
  "Mysuru",
  "Mangaluru",
  "Belagavi",
  "Kalaburagi",
  "Hubballi-Dharwad",
  "Tumakuru",
];

const STATIONS = [
  "Cubbon Park PS",
  "Indiranagar PS",
  "Mysuru North PS",
  "Mangaluru City PS",
  "Hubballi Market PS",
];

const CATEGORIES = ["Property Crime", "Body Offence", "Cyber Crime", "Narcotics", "Economic Offence"];
const HEADS = ["Theft", "Robbery", "Fraud", "Assault", "Possession"];
const SUB_HEADS = ["Chain Snatching", "Vehicle Theft", "OTP Fraud", "Mule Account", "House Break-in"];
const OFFICERS = ["PSI R. Nagaraj", "PI S. Manjunath", "ACP L. Devraj", "DySP A. Kulkarni"];
const STATUSES = ["Under Investigation", "Accused Identified", "Chargesheeted", "Disposed"];
const STAGES = ["Registered", "Evidence Collection", "Witness Examination", "Chargesheet", "Court"];
const SEVERITIES = ["Critical", "High", "Medium", "Low"];

const TAGS = [
  "Repeat Offenders",
  "Gang Activity",
  "Financial Crimes",
  "Cyber Crimes",
  "Violent Crimes",
  "Organized Crimes",
];

const QUICK = [
  "Today's Crime Summary",
  "Weekly Intelligence",
  "Monthly Trends",
  "Top Hotspots",
  "Repeat Offenders",
  "Gang Expansion",
  "Emerging Threats",
  "Officer Performance",
  "Crime Growth",
];

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
        className="mt-1 h-8 w-full border border-input bg-background px-2 font-mono text-[11px] text-foreground outline-none focus:border-primary/60"
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

export function ScopePanel() {
  const { search, setFilter, toggleTag, reset, activeCount } = useAnalystScope();
  const s = search as AnalystSearch;

  return (
    <aside className="flex h-full flex-col bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <span className="label-official flex items-center gap-2 text-xs">
          <SlidersHorizontal className="size-3.5 text-ws" />
          Intelligence Scope
        </span>
        <button
          onClick={reset}
          className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-primary"
        >
          <RotateCcw className="size-3" />
          Reset
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-2.5 border-b border-border p-3">
          <Select label="District" value={s.district} options={DISTRICTS} onChange={(v) => setFilter("district", v)} />
          <Select label="Police Station" value={s.station} options={STATIONS} onChange={(v) => setFilter("station", v)} />
          <Select label="Crime Category" value={s.category} options={CATEGORIES} onChange={(v) => setFilter("category", v)} />
          <Select label="Crime Head" value={s.head} options={HEADS} onChange={(v) => setFilter("head", v)} />
          <Select label="Crime Sub Head" value={s.subHead} options={SUB_HEADS} onChange={(v) => setFilter("subHead", v)} />

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="label-meta">From</span>
              <input
                type="date"
                value={s.from ?? ""}
                onChange={(e) => setFilter("from", e.target.value || undefined)}
                className="mt-1 h-8 w-full border border-input bg-background px-2 font-mono text-[10px] text-foreground outline-none focus:border-primary/60"
              />
            </label>
            <label className="block">
              <span className="label-meta">To</span>
              <input
                type="date"
                value={s.to ?? ""}
                onChange={(e) => setFilter("to", e.target.value || undefined)}
                className="mt-1 h-8 w-full border border-input bg-background px-2 font-mono text-[10px] text-foreground outline-none focus:border-primary/60"
              />
            </label>
          </div>

          <Select label="Officer" value={s.officer} options={OFFICERS} onChange={(v) => setFilter("officer", v)} />
          <Select label="Status" value={s.status} options={STATUSES} onChange={(v) => setFilter("status", v)} />
          <Select label="Investigation Stage" value={s.stage} options={STAGES} onChange={(v) => setFilter("stage", v)} />
          <Select label="Severity" value={s.severity} options={SEVERITIES} onChange={(v) => setFilter("severity", v)} />

          <div>
            <span className="label-meta">Intelligence Tags</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {TAGS.map((tag) => {
                const on = (s.tags ?? []).includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`border px-2 py-1 font-mono text-[10px] transition-colors ${
                      on
                        ? "border-ws bg-ws/15 text-ws"
                        : "border-khaki/30 text-khaki hover:border-ws/50 hover:text-foreground"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-3">
          <span className="label-official flex items-center gap-2 text-xs">
            <Zap className="size-3.5 text-gold" />
            Quick Intelligence
          </span>
          <div className="mt-2 grid gap-1.5">
            {QUICK.map((q) => {
              const on = s.quick === q;
              return (
                <button
                  key={q}
                  onClick={() => setFilter("quick", on ? undefined : q)}
                  className={`flex items-center justify-between border px-2.5 py-2 text-left font-mono text-[10px] transition-colors ${
                    on
                      ? "border-ws bg-ws/12 text-ws"
                      : "border-border text-muted-foreground hover:border-ws/45 hover:text-foreground"
                  }`}
                >
                  <span className="truncate">{q}</span>
                  <span className="label-meta !text-[9px]">RUN</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="border-t border-border px-3 py-2">
        <span className="label-meta">
          {activeCount === 0 ? "Statewide scope · no filters" : `${activeCount} filter(s) active`}
        </span>
      </div>
    </aside>
  );
}
