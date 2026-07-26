import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Download, FileText, Presentation, Share2, ShieldCheck } from "lucide-react";
import { StateOverviewPanel } from "@/components/policymaker/StateOverviewPanel";
import {
  GovEmptyState,
  GovErrorState,
  GovSkeleton,
} from "@/components/policymaker/GovStatePanels";
import { executiveReportsQuery, governanceDashboardQuery } from "@/lib/governance-api";
import { useGovernanceScope } from "@/lib/governance-scope";

export const Route = createFileRoute("/policymaker/reports")({
  head: () => ({
    meta: [
      { title: "Executive Reports — CORTEX Policymaker" },
      {
        name: "description",
        content:
          "Generate and preview official Karnataka policing reports — annual crime, district intelligence, policy evaluation, resource planning, cyber crime, women safety and forecast dossiers.",
      },
      { property: "og:title", content: "Executive Reports — CORTEX Policymaker" },
      {
        property: "og:description",
        content: "Official executive dossiers prepared for the DGP office and Home Department.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ExecutiveReportsPage,
});

function ExecutiveReportsPage() {
  const { filters, reset } = useGovernanceScope();
  const reports = useQuery(executiveReportsQuery(filters));
  const dashboard = useQuery(governanceDashboardQuery(filters));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [presentation, setPresentation] = useState(false);

  const list = reports.data?.reports ?? [];
  const selected = list.find((r) => r.id === selectedId) ?? list[0];
  const summary = dashboard.data?.summary;

  return (
    <div className="grid min-h-[calc(100vh-9rem)] grid-cols-1 gap-px bg-border lg:grid-cols-[288px_minmax(0,1fr)]">
      <div className="order-2 lg:order-1">
        <StateOverviewPanel summary={summary} />
      </div>

      <div className="order-1 min-w-0 lg:order-2">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-4 py-2.5">
          <h1 className="label-official text-xs">Executive Reports</h1>
          <button
            onClick={() => setPresentation((p) => !p)}
            className="flex items-center gap-1.5 border border-gold/60 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-gold transition-colors hover:bg-gold/10"
          >
            <Presentation className="size-3" />
            {presentation ? "Exit presentation" : "Presentation mode"}
          </button>
        </div>

        {reports.isLoading ? (
          <GovSkeleton rows={5} />
        ) : reports.isError ? (
          <div className="p-4">
            <GovErrorState onRetry={() => reports.refetch()} onChangeFilters={reset} />
          </div>
        ) : list.length === 0 ? (
          <div className="p-4">
            <GovEmptyState onReset={reset} />
          </div>
        ) : (
          <div
            className={`grid gap-px bg-border ${presentation ? "" : "lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)]"}`}
          >
            {!presentation && (
              <div className="bg-card">
                {list.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className={`block w-full border-b border-border px-4 py-2.5 text-left transition-colors hover:bg-elevated/50 ${
                      selected?.id === r.id ? "bg-elevated/60 border-l-2 border-l-gold" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="size-3.5 shrink-0 text-gold/80" />
                      <span className="truncate text-xs text-foreground">{r.title}</span>
                    </div>
                    <div className="label-meta mt-1 truncate">
                      {r.kind} · {r.period} · {r.pages} pp
                    </div>
                  </button>
                ))}
              </div>
            )}

            {selected && (
              <article className={`bg-card ${presentation ? "p-8" : "p-5"}`}>
                <header className="border-b border-gold/40 pb-3">
                  <div className="label-meta">{selected.classification}</div>
                  <h2
                    className={`mt-1 font-display font-semibold text-foreground ${presentation ? "text-2xl" : "text-lg"}`}
                  >
                    {selected.title}
                  </h2>
                  <div className="label-meta mt-1.5 flex flex-wrap gap-x-4">
                    <span>Prepared for {summary?.scopeLabel ?? "Karnataka statewide"}</span>
                    <span>{selected.period}</span>
                    <span>{new Date(selected.generatedAt).toLocaleString("en-IN")}</span>
                    <span className="label-tech">{selected.id}</span>
                  </div>
                </header>

                <p className="mt-4 text-xs leading-relaxed text-foreground">{selected.summary}</p>

                <ol className="mt-4 space-y-2">
                  {selected.sections.map((s, i) => (
                    <li
                      key={s}
                      className="animate-fade-in border-l-2 border-border pl-3"
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      <div className="label-official text-[10px]">{s}</div>
                      <div className="label-meta !text-[9px]">
                        Rendered from the Crime Intelligence Runtime
                      </div>
                    </li>
                  ))}
                </ol>

                <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  <button className="btn-exec flex items-center gap-1.5 px-3 py-1.5 text-[11px]">
                    <Download className="size-3" />
                    Download PDF
                  </button>
                  <button className="flex items-center gap-1.5 border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground">
                    <Share2 className="size-3" />
                    Share
                  </button>
                </div>

                <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-border pt-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-3.5 text-khaki" />
                    <span className="label-meta">Digital signature placeholder</span>
                  </div>
                  <span className="label-meta">Generated by CORTEX</span>
                </footer>
              </article>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
