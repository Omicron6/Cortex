import { useState } from "react";
import {
  ChevronDown,
  Download,
  LayoutDashboard,
  ListChecks,
  MapPin,
  Quote,
  ScanSearch,
  ShieldQuestion,
} from "lucide-react";
import type { IntelligenceQueryResult } from "@/lib/intelligence-types";
import { VizGrid } from "./Viz";
import { NetworkGraphView } from "./NetworkGraphView";

const bandTone: Record<string, string> = {
  high: "text-primary border-primary/50 bg-primary/10",
  medium: "text-warning border-warning/50 bg-warning/10",
  low: "text-maroon border-maroon/50 bg-maroon/10",
};

export function IntelligenceReportCard({
  report,
  onOpenDashboard,
}: {
  report: IntelligenceQueryResult;
  onOpenDashboard?: () => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <article className="border border-border bg-card">
      <header className="border-b border-border">
        <div className="flex items-start gap-3 px-4 py-3">
          <Quote className="mt-0.5 size-3.5 shrink-0 text-khaki" />
          <div className="min-w-0 flex-1">
            <div className="label-meta">Analyst query</div>
            <p className="mt-1 text-sm text-foreground">{report.question}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-khaki/12 px-4 py-2">
          <span className="label-official text-xs">Intelligence Report</span>
          <span className="label-meta">{report.queryId}</span>
          <span
            className={`ml-auto border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ${bandTone[report.confidenceBand]}`}
          >
            Confidence {report.confidence.toFixed(2)} · {report.confidenceBand}
          </span>
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex size-6 items-center justify-center border border-border text-muted-foreground transition-colors hover:text-primary"
            aria-label={open ? "Collapse report" : "Expand report"}
          >
            <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        </div>
      </header>

      <div className="px-4 py-3">
        <div className="label-meta">Executive summary</div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-foreground">
          {report.executiveSummary}
        </p>
      </div>

      {open && (
        <>
          <section className="border-t border-border px-4 py-3">
            <div className="label-official flex items-center gap-2 text-xs">
              <ScanSearch className="size-3.5 text-ws" />
              Patterns Found
            </div>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {report.patterns.map((p) => (
                <li key={p.label} className="border border-khaki/20 bg-surface/25 px-3 py-2">
                  <div className="font-display text-xs font-semibold">{p.label}</div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{p.detail}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="border-t border-border px-4 py-3">
            <div className="label-official flex items-center gap-2 text-xs">
              <ShieldQuestion className="size-3.5 text-khaki" />
              Evidence
            </div>
            <ul className="mt-2 divide-y divide-khaki/12">
              {report.evidence.map((e) => (
                <li key={e.id} className="flex gap-3 py-2">
                  <span className="font-mono text-[10px] text-khaki">{e.id}</span>
                  <div className="min-w-0">
                    <div className="text-xs text-foreground">{e.label}</div>
                    <p className="text-[11px] text-muted-foreground">{e.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="border-t border-border px-4 py-3">
            <div className="label-official flex items-center gap-2 text-xs">
              <MapPin className="size-3.5 text-ws" />
              Affected Districts
            </div>
            <table className="mt-2 w-full">
              <tbody>
                {report.affectedDistricts.map((d) => (
                  <tr key={d.district} className="border-b border-khaki/12">
                    <td className="py-1.5 text-xs text-foreground">{d.district}</td>
                    <td className="py-1.5 text-right font-mono text-[11px] text-muted-foreground">
                      {d.incidents} FIRs
                    </td>
                    <td
                      className={`w-16 py-1.5 text-right font-mono text-[11px] ${
                        d.change.startsWith("+") ? "text-maroon" : "text-success"
                      }`}
                    >
                      {d.change}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="border-t border-border">
            <div className="px-4 py-3">
              <div className="label-official text-xs">Visualizations</div>
              <div className="label-meta mt-0.5">Rendered from runtime-supplied series</div>
            </div>
            <VizGrid charts={report.charts} />
            {report.graph && (
              <div className="border-t border-border">
                <NetworkGraphView graph={report.graph} height={280} />
              </div>
            )}
          </section>

          <section className="border-t border-border px-4 py-3">
            <div className="label-official flex items-center gap-2 text-xs">
              <ListChecks className="size-3.5 text-gold" />
              Recommendations
            </div>
            <ul className="mt-2 space-y-2">
              {report.recommendations.map((r) => (
                <li key={r.id} className="border-l-2 border-gold/60 bg-gold/6 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-foreground">{r.action}</span>
                    <span className="label-meta shrink-0 !text-[9px]">{r.priority}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{r.rationale}</p>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <footer className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-2.5">
        <button className="btn-exec h-8 px-3">
          <Download className="size-3.5" />
          Download Report
        </button>
        <button
          onClick={onOpenDashboard}
          className="inline-flex h-8 items-center gap-1.5 border border-primary/60 px-3 font-mono text-[11px] uppercase tracking-[0.14em] text-primary transition-colors hover:bg-primary/10"
        >
          <LayoutDashboard className="size-3.5" />
          Open Dashboard
        </button>
        <span className="label-meta ml-auto">
          Generated {new Date(report.generatedAt).toISOString().slice(0, 16).replace("T", " ")} UTC
        </span>
      </footer>
    </article>
  );
}
