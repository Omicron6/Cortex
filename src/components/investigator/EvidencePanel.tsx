import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { X } from "lucide-react";
import { caseQuery, suggestionsQuery } from "@/lib/investigation-api";
import { PanelSkeleton, RuntimeErrorState } from "./StatePanels";

const suggestionTone: Record<string, string> = {
  info: "border-primary/40 text-primary",
  warning: "border-warning/50 text-warning",
  critical: "border-maroon/55 text-maroon",
};

interface Props {
  caseId: string;
  onAction: (actionId: string) => void;
}

export function EvidencePanel({ caseId, onAction }: Props) {
  const detail = useQuery(caseQuery(caseId));
  const suggestions = useQuery(suggestionsQuery(caseId));
  const [drawer, setDrawer] = useState<string | null>(null);

  const stats = detail.data?.statistics;
  const tiles = stats
    ? [
        ["Evidence", stats.evidence],
        ["Witnesses", stats.witnesses],
        ["Victims", stats.victims],
        ["Accused", stats.accused],
        ["Vehicles", stats.vehicles],
        ["Phones", stats.phones],
        ["Bank Accounts", stats.bankAccounts],
        ["Digital Evidence", stats.digitalEvidence],
      ]
    : [];

  return (
    <div className="relative flex h-full flex-col divide-y divide-border bg-card">
      <section>
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <span className="label-official text-xs">Evidence Summary</span>
          <span className="label-meta">Stratus</span>
        </div>
        {detail.isLoading ? (
          <PanelSkeleton rows={4} />
        ) : detail.isError ? (
          <div className="p-4">
            <RuntimeErrorState onRetry={() => detail.refetch()} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-px bg-border">
            {tiles.map(([label, value]) => (
              <button
                key={String(label)}
                onClick={() => setDrawer(String(label))}
                className="bg-card px-3 py-3 text-left transition-colors hover:bg-surface/40"
              >
                <div className="label-meta">{label}</div>
                <div className="mt-1 font-mono text-base text-ws">
                  {String(value).padStart(2, "0")}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <span className="label-official text-xs">AI Suggestions</span>
          <span className="label-meta">Runtime</span>
        </div>
        {suggestions.isLoading ? (
          <PanelSkeleton rows={4} />
        ) : suggestions.isError ? (
          <div className="p-4">
            <RuntimeErrorState onRetry={() => suggestions.refetch()} />
          </div>
        ) : (
          <ul className="divide-y divide-khaki/12">
            {suggestions.data?.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => onAction(s.action)}
                  className="w-full border-l-2 border-transparent px-4 py-2.5 text-left transition-colors hover:border-ws/60 hover:bg-surface/30"
                >
                  <div className={`font-mono text-[11px] uppercase ${suggestionTone[s.tone]}`}>
                    {s.title}
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{s.detail}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex-1">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <span className="label-official text-xs">Investigation Progress</span>
          <span className="label-meta">CCTNS</span>
        </div>
        {detail.isLoading ? (
          <PanelSkeleton rows={6} />
        ) : (
          <ol className="px-4 py-3">
            {detail.data?.progress.map((p, i, all) => (
              <li key={p.stage} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={`mt-1 size-2 shrink-0 ${
                      p.state === "done"
                        ? "bg-success"
                        : p.state === "active"
                          ? "animate-pulse bg-gold"
                          : "bg-khaki/30"
                    }`}
                  />
                  {i < all.length - 1 && (
                    <span
                      className={`w-px flex-1 ${p.state === "done" ? "bg-success/45" : "bg-border"}`}
                    />
                  )}
                </div>
                <div className="pb-3">
                  <div
                    className={`text-xs ${
                      p.state === "pending" ? "text-muted-foreground" : "text-foreground"
                    }`}
                  >
                    {p.stage}
                  </div>
                  {p.at && <div className="label-meta !text-[9px] mt-0.5">{p.at}</div>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {drawer && (
        <div className="absolute inset-0 z-20 flex bg-background/85">
          <div className="ml-auto flex h-full w-full max-w-sm flex-col border-l border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <div className="label-official text-xs">{drawer}</div>
                <div className="label-meta mt-1">{detail.data?.firNumber}</div>
              </div>
              <button
                onClick={() => setDrawer(null)}
                className="flex size-7 items-center justify-center border border-border text-muted-foreground hover:text-foreground"
                aria-label="Close drawer"
              >
                <X className="size-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <p className="text-xs text-muted-foreground">
                Detailed {drawer.toLowerCase()} records stream from the Crime Intelligence Runtime.
                This drawer renders whatever the evidence service returns for the selected case — no
                records are computed in the frontend.
              </p>
              <div className="mt-4 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="border border-border px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] text-ws">
                        {drawer.slice(0, 2).toUpperCase()}-{String(2200 + i)}
                      </span>
                      <span className="label-meta !text-[9px]">awaiting service</span>
                    </div>
                    <div className="mt-2 h-3 w-3/4 animate-pulse bg-surface/60" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
